import json
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .models import Message, User

SIGNAL_TYPES = ('call_request', 'call_ended_notify')


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = await self.get_authenticated_user()
        self.other_user_id = self.scope["url_route"]["kwargs"]["user_id"]

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.other_user = await self.get_other_user()
        if self.other_user is None or self.other_user.id == self.user.id:
            await self.close(code=4004)
            return

        self.room_group_name = Message.build_room_name(self.user.id, self.other_user.id)
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            return

        action = payload.get("action")

        if action == "message_delete":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.message",
                    "message": {
                        "action":     "message_deleted",
                        "id":         payload.get("id"),
                        "sender_id":  self.user.id,
                        "created_at": "",
                    },
                },
            )
            return

        if action == "message_edit":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.message",
                    "message": {
                        "action":     "message_edited",
                        "id":         payload.get("id"),
                        "content":    payload.get("content", ""),
                        "sender_id":  self.user.id,
                        "created_at": "",
                    },
                },
            )
            return

        file_type = payload.get("file_type") or "text"

        if file_type in SIGNAL_TYPES:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.message",
                    "message": {
                        "id":          None,
                        "content":     "",
                        "file_url":    "",
                        "file_type":   file_type,
                        "file_name":   "",
                        "sender_id":   self.user.id,
                        "sender_name": str(self.user),
                        "receiver_id": self.other_user.id,
                        "created_at":  "",
                    },
                },
            )
            return

        file_url  = payload.get("file_url") or ""
        file_name = payload.get("file_name") or ""
        content   = (payload.get("message") or payload.get("content") or "").strip()

        if not content and not file_url:
            await self.send(text_data=json.dumps({"error": "Empty message."}))
            return

        message = await self.create_message(content, file_url, file_type, file_name)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "message": {
                    "id":          message.id,
                    "content":     message.content or "",
                    "file_url":    self._build_file_url(message),
                    "file_type":   message.file_type,
                    "file_name":   message.file_name or "",
                    "is_edited":   False,
                    "sender_id":   message.sender_id,
                    "sender_name": str(message.sender),
                    "receiver_id": message.receiver_id,
                    "created_at":  message.created_at.isoformat(),
                },
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    def _build_file_url(self, message):
        if message.file and message.file.name:
            return f"http://127.0.0.1:8000{message.file.url}"
        return ""

    @database_sync_to_async
    def get_other_user(self):
        return User.objects.filter(id=self.other_user_id).first()

    @database_sync_to_async
    def get_authenticated_user(self):
        query_string = self.scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [None])[0]
        if not token:
            return AnonymousUser()
        jwt_auth = JWTAuthentication()
        try:
            validated_token = jwt_auth.get_validated_token(token)
            return jwt_auth.get_user(validated_token)
        except (InvalidToken, TokenError):
            return AnonymousUser()

    @database_sync_to_async
    def create_message(self, content, file_url, file_type, file_name):
        message = Message(
            sender=self.user,
            receiver=self.other_user,
            content=content or None,
            file_type=file_type,
            file_name=file_name or None,
        )
        if file_url:
            message.file.name = file_url
        message.save()
        return Message.objects.select_related("sender", "receiver").get(id=message.id)