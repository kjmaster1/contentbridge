from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from app.config import settings
from app.routers import creators, platforms, content, insights, notifications
from app.routers import auth as auth_router
from app.websockets.manager import manager
from app.auth import get_current_creator
from app.database import get_db
from jose import JWTError, jwt
from app.models.creator import Creator
from sqlalchemy.orm import Session
import asyncio
import json
import redis.asyncio as aioredis
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(redis_listener())
    app.state.redis_listener_task = task
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

async def redis_listener():
    import logging
    logger = logging.getLogger(__name__)
    logger.info("Redis listener started")
    r = aioredis.from_url(settings.redis_url)
    pubsub = r.pubsub()
    await pubsub.psubscribe("notifications:*")
    logger.info("Subscribed to notifications:*")
    async for message in pubsub.listen():
        logger.info(f"Redis message received: {message}")
        if message["type"] == "pmessage":
            creator_id = "unknown"
            try:
                channel = message["channel"].decode()
                creator_id = channel.split(":")[1]
                data = json.loads(message["data"])
                await manager.send_to_creator(creator_id, data)
            except json.JSONDecodeError as e:  # ADDED: Catch bad JSON
                logger.error(f"Redis JSON decode error for creator {creator_id}: {e}")
            except Exception as e:
                logger.error(f"Redis listener unexpected error: {e}")

app = FastAPI(
    title="ContentBridge API",
    description="A unified analytics and management platform for content creators.",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(creators.router)
app.include_router(platforms.router)
app.include_router(content.router)
app.include_router(insights.router)
app.include_router(notifications.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "contentbridge-api"}

@app.websocket("/ws/{creator_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    creator_id: str,
    token: str,
):
    # Validate JWT token before accepting connection
    db = next(get_db())
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        token_creator_id: str = payload.get("sub")
        if token_creator_id != creator_id:
            await websocket.close(code=4001)
            return
        creator = db.query(Creator).filter(Creator.id == creator_id).first()
        if not creator:
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return
    finally:
        db.close()

    await manager.connect(websocket, creator_id)
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to ContentBridge real-time updates",
            "creator_id": creator_id,
        })

        # Keep connection alive and listen for messages
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, creator_id)