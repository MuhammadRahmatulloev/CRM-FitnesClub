import json
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .models import User


def build_call_room_name(user_id_1, user_id_2):
    ids = sorted([int(user_id_1), int(user_id_2)])
    return f"call_{ids[0]}_{ids[1]}"


class VideoCallConsumer(AsyncWebsocketConsumer):

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

        self.room_group_name = build_call_room_name(self.user.id, self.other_user_id)
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Уведомить другого участника что кто-то подключился
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "call.signal",
                "data": {
                    "type": "user-joined",
                    "from": self.user.id,
                    "from_name": str(self.user),
                },
            },
        )

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            # Уведомить собеседника что звонок завершён
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "call.signal",
                    "data": {
                        "type": "call-ended",
                        "from": self.user.id,
                    },
                },
            )
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """
        Ожидаемые типы сообщений от фронта:
          - offer       { type, sdp }
          - answer      { type, sdp }
          - ice-candidate { type, candidate }
          - call-ended  { type }
        """
        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            return

        signal_type = payload.get("type")
        if signal_type not in ("offer", "answer", "ice-candidate", "call-ended"):
            return

        payload["from"] = self.user.id

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "call.signal",
                "data": payload,
            },
        )

    async def call_signal(self, event):
        data = event["data"]
        # Не отправлять сообщение обратно отправителю
        if data.get("from") == self.user.id and data.get("type") not in ("user-joined",):
            return
        await self.send(text_data=json.dumps(data))

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