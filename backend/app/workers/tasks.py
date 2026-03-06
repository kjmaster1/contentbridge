import asyncio

from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "contentbridge",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "sync-all-creators-daily": {
            "task": "app.workers.tasks.sync_all_creators",
            "schedule": crontab(hour=6, minute=0),
        },
    },
)


@celery_app.task(name="app.workers.tasks.sync_creator")
def sync_creator(creator_id: str):
    from app.services.sync import sync_all_connections_for_creator
    asyncio.run(sync_all_connections_for_creator(creator_id))
    return {"status": "complete", "creator_id": creator_id}


@celery_app.task(name="app.workers.tasks.sync_connection")
def sync_connection(connection_id: str):
    from app.services.sync import sync_platform_connection
    asyncio.run(sync_platform_connection(connection_id))
    return {"status": "complete", "connection_id": connection_id}


@celery_app.task(name="app.workers.tasks.sync_all_creators")
def sync_all_creators():
    from app.database import SessionLocal
    from app.models.creator import Creator

    creator_ids = []

    with SessionLocal() as db:
        creators = db.query(Creator).filter(Creator.is_active == True).all()
        creator_ids = [c.id for c in creators]

    for creator_id in creator_ids:
        sync_creator.delay(creator_id)

    return {"status": "complete", "synced": len(creator_ids)}
