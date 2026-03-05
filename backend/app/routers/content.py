from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.models.content import ContentItem, ContentSnapshot
from app.models.platform_connection import PlatformType
from app.auth import get_current_creator
from app.models.creator import Creator

router = APIRouter(prefix="/content", tags=["Content"])

class ContentSnapshotResponse(BaseModel):
    view_count: int
    like_count: int
    comment_count: int
    recorded_at: datetime

    model_config = {"from_attributes": True}

class ContentItemResponse(BaseModel):
    id: str
    platform: str
    content_type: str
    title: str
    thumbnail_url: Optional[str] = None
    url: Optional[str] = None
    duration_seconds: Optional[int] = None
    published_at: Optional[datetime] = None
    latest_views: int = 0
    latest_likes: int = 0
    latest_comments: int = 0
    engagement_rate: float = 0.0

    model_config = {"from_attributes": True}

@router.get("/", response_model=List[ContentItemResponse])
def get_content(
    platform: Optional[PlatformType] = None,
    content_type: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    query = db.query(ContentItem).filter(
        ContentItem.creator_id == current_creator.id
    )

    if platform:
        query = query.filter(ContentItem.platform == platform.value)
    if content_type:
        query = query.filter(ContentItem.content_type == content_type)

    items = query.order_by(desc(ContentItem.published_at)).offset(offset).limit(limit).all()

    result = []
    for item in items:
        latest_snapshot = db.query(ContentSnapshot).filter(
            ContentSnapshot.content_item_id == item.id
        ).order_by(desc(ContentSnapshot.recorded_at)).first()

        views = latest_snapshot.view_count if latest_snapshot else 0
        likes = latest_snapshot.like_count if latest_snapshot else 0
        comments = latest_snapshot.comment_count if latest_snapshot else 0
        engagement = round((likes + comments) / views * 100, 2) if views > 0 else 0.0

        result.append(ContentItemResponse(
            id=item.id,
            platform=item.platform,
            content_type=item.content_type.value,
            title=item.title,
            thumbnail_url=item.thumbnail_url,
            url=item.url,
            duration_seconds=item.duration_seconds,
            published_at=item.published_at,
            latest_views=views,
            latest_likes=likes,
            latest_comments=comments,
            engagement_rate=engagement,
        ))

    return result

@router.get("/{content_id}", response_model=ContentItemResponse)
def get_content_item(
    content_id: str,
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    item = db.query(ContentItem).filter(
        ContentItem.id == content_id,
        ContentItem.creator_id == current_creator.id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Content not found")

    latest_snapshot = db.query(ContentSnapshot).filter(
        ContentSnapshot.content_item_id == item.id
    ).order_by(desc(ContentSnapshot.recorded_at)).first()

    views = latest_snapshot.view_count if latest_snapshot else 0
    likes = latest_snapshot.like_count if latest_snapshot else 0
    comments = latest_snapshot.comment_count if latest_snapshot else 0
    engagement = round((likes + comments) / views * 100, 2) if views > 0 else 0.0

    return ContentItemResponse(
        id=item.id,
        platform=item.platform,
        content_type=item.content_type.value,
        title=item.title,
        thumbnail_url=item.thumbnail_url,
        url=item.url,
        duration_seconds=item.duration_seconds,
        published_at=item.published_at,
        latest_views=views,
        latest_likes=likes,
        latest_comments=comments,
        engagement_rate=engagement,
    )

@router.get("/{content_id}/history")
def get_content_history(
    content_id: str,
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    item = db.query(ContentItem).filter(
        ContentItem.id == content_id,
        ContentItem.creator_id == current_creator.id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Content not found")

    snapshots = db.query(ContentSnapshot).filter(
        ContentSnapshot.content_item_id == content_id
    ).order_by(ContentSnapshot.recorded_at).all()

    return {
        "content_id": content_id,
        "title": item.title,
        "history": [
            {
                "recorded_at": s.recorded_at,
                "view_count": s.view_count,
                "like_count": s.like_count,
                "comment_count": s.comment_count,
            }
            for s in snapshots
        ]
    }