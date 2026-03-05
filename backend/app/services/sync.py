from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models.platform_connection import PlatformConnection
from app.models.content import ContentItem, ContentSnapshot, ContentType
from app.models.analytics import AnalyticsSnapshot
from app.models.notification import Notification, NotificationType
from app.services.platforms import get_platform
from app.database import SessionLocal
import logging
import json
import redis
from app.config import settings

logger = logging.getLogger(__name__)

def send_websocket_notification(creator_id: str, message: dict):
    try:
        r = redis.from_url(settings.redis_url)
        result = r.publish(f"notifications:{creator_id}", json.dumps(message))
        logger.info(f"Published WebSocket notification to {creator_id}, subscribers: {result}")
    except Exception as e:
        logger.error(f"Failed to publish WebSocket notification: {e}")

def sync_platform_connection(connection_id: str):
    db = SessionLocal()
    try:
        connection = db.query(PlatformConnection).filter(
            PlatformConnection.id == connection_id
        ).first()

        if not connection or not connection.is_active:
            logger.warning(f"Connection {connection_id} not found or inactive")
            return

        platform = get_platform(connection.platform)

        # Refresh token if needed
        access_token = connection.access_token
        if connection.token_expires_at and connection.token_expires_at < datetime.now(timezone.utc):
            if connection.refresh_token:
                try:
                    tokens = platform.refresh_tokens(connection.refresh_token)
                    access_token = tokens["access_token"]
                    connection.access_token = access_token
                    if tokens.get("refresh_token"):
                        connection.refresh_token = tokens["refresh_token"]
                    db.commit()
                except Exception as e:
                    logger.error(f"Failed to refresh token for {connection_id}: {e}")
                    return

        # Sync channel stats
        try:
            stats = platform.get_stats(access_token, connection.platform_user_id)
            snapshot = AnalyticsSnapshot(
                platform_connection_id=connection.id,
                followers=stats.followers,
                total_views=stats.total_views,
                total_content=stats.total_content,
            )
            db.add(snapshot)
        except Exception as e:
            logger.error(f"Failed to sync stats for {connection_id}: {e}")

        # Sync content
        try:
            content_items = platform.get_content(access_token, connection.platform_user_id)
            for item in content_items:
                existing = db.query(ContentItem).filter(
                    ContentItem.platform_content_id == item.platform_content_id,
                    ContentItem.platform == connection.platform.value,
                ).first()

                if existing:
                    existing.title = item.title
                    existing.description = item.description
                    existing.thumbnail_url = item.thumbnail_url
                    existing.updated_at = datetime.now(timezone.utc)
                    content_item = existing
                else:
                    try:
                        content_type = ContentType(item.content_type)
                    except ValueError:
                        content_type = ContentType.video

                    content_item = ContentItem(
                        creator_id=connection.creator_id,
                        platform_connection_id=connection.id,
                        platform_content_id=item.platform_content_id,
                        platform=connection.platform.value,
                        content_type=content_type,
                        title=item.title,
                        description=item.description,
                        thumbnail_url=item.thumbnail_url,
                        url=item.url,
                        duration_seconds=item.duration_seconds,
                        published_at=item.published_at,
                    )
                    db.add(content_item)
                    db.flush()

                content_snapshot = ContentSnapshot(
                    content_item_id=content_item.id,
                    view_count=item.view_count,
                    like_count=item.like_count,
                    comment_count=item.comment_count,
                )
                db.add(content_snapshot)

        except Exception as e:
            logger.error(f"Failed to sync content for {connection_id}: {e}")

        connection.last_synced_at = datetime.now(timezone.utc)
        db.commit()

        # Send sync complete notification
        notification = Notification(
            creator_id=connection.creator_id,
            type=NotificationType.sync_complete,
            title=f"{connection.platform.value.capitalize()} sync complete",
            message=f"Your {connection.platform.value} data has been updated successfully.",
        )
        db.add(notification)
        db.commit()

        send_websocket_notification(connection.creator_id, {
            "type": "sync_complete",
            "platform": connection.platform.value,
            "message": f"{connection.platform.value.capitalize()} sync complete",
        })

        logger.info(f"Sync complete for connection {connection_id}")

    except Exception as e:
        logger.error(f"Sync failed for connection {connection_id}: {e}")
        db.rollback()
    finally:
        db.close()

def sync_all_connections_for_creator(creator_id: str):
    db = SessionLocal()
    try:
        connections = db.query(PlatformConnection).filter(
            PlatformConnection.creator_id == creator_id,
            PlatformConnection.is_active == True
        ).all()
        connection_ids = [c.id for c in connections]
    finally:
        db.close()

    for connection_id in connection_ids:
        sync_platform_connection(connection_id)