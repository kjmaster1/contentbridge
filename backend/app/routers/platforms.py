from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.platform_connection import PlatformConnection, PlatformType
from app.models.analytics import AnalyticsSnapshot
from app.schemas.platform import PlatformConnectionResponse, PlatformStatsResponse
from app.auth import get_current_creator
from app.models.creator import Creator
from app.workers.tasks import sync_creator, sync_connection

router = APIRouter(prefix="/platforms", tags=["Platforms"])

@router.get("/", response_model=List[PlatformConnectionResponse])
def get_connected_platforms(
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    connections = db.query(PlatformConnection).filter(
        PlatformConnection.creator_id == current_creator.id,
        PlatformConnection.is_active == True
    ).all()
    return connections

@router.get("/stats", response_model=List[PlatformStatsResponse])
def get_platform_stats(
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    connections = db.query(PlatformConnection).filter(
        PlatformConnection.creator_id == current_creator.id,
        PlatformConnection.is_active == True
    ).all()

    stats = []
    for connection in connections:
        latest_snapshot = db.query(AnalyticsSnapshot).filter(
            AnalyticsSnapshot.platform_connection_id == connection.id
        ).order_by(AnalyticsSnapshot.recorded_at.desc()).first()

        stats.append(PlatformStatsResponse(
            platform=connection.platform,
            platform_username=connection.platform_username,
            followers=latest_snapshot.followers if latest_snapshot else 0,
            total_views=latest_snapshot.total_views if latest_snapshot else 0,
            total_content=latest_snapshot.total_content if latest_snapshot else 0,
            avg_engagement_rate=latest_snapshot.avg_engagement_rate if latest_snapshot else 0.0,
            last_synced_at=connection.last_synced_at,
        ))

    return stats

@router.delete("/{platform}")
def disconnect_platform(
    platform: PlatformType,
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    connection = db.query(PlatformConnection).filter(
        PlatformConnection.creator_id == current_creator.id,
        PlatformConnection.platform == platform
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{platform} not connected"
        )

    connection.is_active = False
    db.commit()
    return {"message": f"{platform} disconnected successfully"}

@router.post("/sync")
def trigger_sync(
    current_creator: Creator = Depends(get_current_creator),
):
    sync_creator.delay(current_creator.id)
    return {"message": "Sync started", "creator_id": current_creator.id}

@router.post("/sync/{platform}")
def trigger_platform_sync(
    platform: PlatformType,
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    connection = db.query(PlatformConnection).filter(
        PlatformConnection.creator_id == current_creator.id,
        PlatformConnection.platform == platform,
        PlatformConnection.is_active == True
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{platform} not connected"
        )

    sync_connection.delay(connection.id)
    return {"message": f"{platform} sync started", "connection_id": connection.id}