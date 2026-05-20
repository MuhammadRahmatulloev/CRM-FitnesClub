from django.urls import path
from .consumers import ChatConsumer
from .video_consumer import VideoCallConsumer

websocket_urlpatterns = [
    path("ws/chat/<int:user_id>/", ChatConsumer.as_asgi()),
    path("ws/call/<int:user_id>/", VideoCallConsumer.as_asgi()),
]