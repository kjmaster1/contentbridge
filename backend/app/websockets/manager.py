from fastapi import WebSocket
from typing import Dict, Set
import logging
import json

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Map of creator_id -> set of active WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, creator_id: str):
        await websocket.accept()
        if creator_id not in self.active_connections:
            self.active_connections[creator_id] = set()
        self.active_connections[creator_id].add(websocket)
        logger.info(f"WebSocket connected for creator {creator_id}. "
                   f"Total connections: {len(self.active_connections[creator_id])}")

    def disconnect(self, websocket: WebSocket, creator_id: str):
        if creator_id in self.active_connections:
            self.active_connections[creator_id].discard(websocket)
            if not self.active_connections[creator_id]:
                del self.active_connections[creator_id]
        logger.info(f"WebSocket disconnected for creator {creator_id}")

    async def send_to_creator(self, creator_id: str, message: dict):
        if creator_id not in self.active_connections:
            return
        disconnected = set()
        for websocket in self.active_connections[creator_id]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send WebSocket message: {e}")
                disconnected.add(websocket)
        for websocket in disconnected:
            self.disconnect(websocket, creator_id)

    async def broadcast(self, message: dict):
        for creator_id in list(self.active_connections.keys()):
            await self.send_to_creator(creator_id, message)

    def get_connection_count(self, creator_id: str) -> int:
        return len(self.active_connections.get(creator_id, set()))

manager = ConnectionManager()