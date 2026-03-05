from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from app.database import get_db
from app.models.content import ContentItem, ContentSnapshot
from app.models.analytics import AnalyticsSnapshot
from app.models.platform_connection import PlatformConnection
from app.auth import get_current_creator
from app.models.creator import Creator

router = APIRouter(prefix="/insights", tags=["Insights"])

class GrowthDataPoint(BaseModel):
    recorded_at: datetime
    followers: int
    platform: str

class TopContentItem(BaseModel):
    id: str
    title: str
    platform: str
    content_type: str
    view_count: int
    engagement_rate: float
    published_at: Optional[datetime] = None

class InsightsSummary(BaseModel):
    total_followers: int
    total_views: int
    total_content: int
    avg_engagement_rate: float
    best_performing_platform: Optional[str]
    best_day_to_post: Optional[str]

@router.get("/summary", response_model=InsightsSummary)
def get_insights_summary(
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    connections = db.query(PlatformConnection).filter(
        PlatformConnection.creator_id == current_creator.id,
        PlatformConnection.is_active == True
    ).all()

    total_followers = 0
    total_views = 0
    total_content = 0
    platform_followers = {}

    for connection in connections:
        latest = db.query(AnalyticsSnapshot).filter(
            AnalyticsSnapshot.platform_connection_id == connection.id
        ).order_by(desc(AnalyticsSnapshot.recorded_at)).first()

        if latest:
            total_followers += latest.followers
            total_views += latest.total_views
            total_content += latest.total_content
            platform_followers[connection.platform.value] = latest.followers

    best_platform = max(platform_followers, key=platform_followers.get) \
        if platform_followers else None

    # Calculate best day to post based on engagement
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_content = db.query(ContentItem).filter(
        ContentItem.creator_id == current_creator.id,
        ContentItem.published_at >= thirty_days_ago
    ).all()

    day_engagement = {}
    for item in recent_content:
        if not item.published_at:
            continue
        day = item.published_at.strftime("%A")
        latest_snapshot = db.query(ContentSnapshot).filter(
            ContentSnapshot.content_item_id == item.id
        ).order_by(desc(ContentSnapshot.recorded_at)).first()

        if latest_snapshot and latest_snapshot.view_count > 0:
            engagement = (
                latest_snapshot.like_count + latest_snapshot.comment_count
            ) / latest_snapshot.view_count * 100
            if day not in day_engagement:
                day_engagement[day] = []
            day_engagement[day].append(engagement)

    best_day = None
    if day_engagement:
        avg_by_day = {
            day: sum(vals) / len(vals)
            for day, vals in day_engagement.items()
        }
        best_day = max(avg_by_day, key=avg_by_day.get)

    all_engagements = []
    for item in recent_content:
        latest_snapshot = db.query(ContentSnapshot).filter(
            ContentSnapshot.content_item_id == item.id
        ).order_by(desc(ContentSnapshot.recorded_at)).first()
        if latest_snapshot and latest_snapshot.view_count > 0:
            engagement = (
                latest_snapshot.like_count + latest_snapshot.comment_count
            ) / latest_snapshot.view_count * 100
            all_engagements.append(engagement)

    avg_engagement = round(
        sum(all_engagements) / len(all_engagements), 2
    ) if all_engagements else 0.0

    return InsightsSummary(
        total_followers=total_followers,
        total_views=total_views,
        total_content=total_content,
        avg_engagement_rate=avg_engagement,
        best_performing_platform=best_platform,
        best_day_to_post=best_day,
    )

@router.get("/growth", response_model=List[GrowthDataPoint])
def get_growth_data(
    days: int = 30,
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    connections = db.query(PlatformConnection).filter(
        PlatformConnection.creator_id == current_creator.id,
        PlatformConnection.is_active == True
    ).all()

    result = []
    for connection in connections:
        snapshots = db.query(AnalyticsSnapshot).filter(
            AnalyticsSnapshot.platform_connection_id == connection.id,
            AnalyticsSnapshot.recorded_at >= since
        ).order_by(AnalyticsSnapshot.recorded_at).all()

        for snapshot in snapshots:
            result.append(GrowthDataPoint(
                recorded_at=snapshot.recorded_at,
                followers=snapshot.followers,
                platform=connection.platform.value,
            ))

    return sorted(result, key=lambda x: x.recorded_at)

@router.get("/top-content", response_model=List[TopContentItem])
def get_top_content(
    limit: int = 10,
    platform: Optional[str] = None,
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    query = db.query(ContentItem).filter(
        ContentItem.creator_id == current_creator.id
    )
    if platform:
        query = query.filter(ContentItem.platform == platform)

    items = query.all()
    result = []

    for item in items:
        latest_snapshot = db.query(ContentSnapshot).filter(
            ContentSnapshot.content_item_id == item.id
        ).order_by(desc(ContentSnapshot.recorded_at)).first()

        if not latest_snapshot:
            continue

        views = latest_snapshot.view_count
        engagement = round(
            (latest_snapshot.like_count + latest_snapshot.comment_count) / views * 100, 2
        ) if views > 0 else 0.0

        result.append(TopContentItem(
            id=item.id,
            title=item.title,
            platform=item.platform,
            content_type=item.content_type.value,
            view_count=views,
            engagement_rate=engagement,
            published_at=item.published_at,
        ))

    result.sort(key=lambda x: x.view_count, reverse=True)
    return result[:limit]

@router.get("/content-type-breakdown")
def get_content_type_breakdown(
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    items = db.query(ContentItem).filter(
        ContentItem.creator_id == current_creator.id
    ).all()

    breakdown = {}
    for item in items:
        content_type = item.content_type.value
        if content_type not in breakdown:
            breakdown[content_type] = {
                "count": 0,
                "total_views": 0,
                "total_likes": 0,
            }

        latest_snapshot = db.query(ContentSnapshot).filter(
            ContentSnapshot.content_item_id == item.id
        ).order_by(desc(ContentSnapshot.recorded_at)).first()

        breakdown[content_type]["count"] += 1
        if latest_snapshot:
            breakdown[content_type]["total_views"] += latest_snapshot.view_count
            breakdown[content_type]["total_likes"] += latest_snapshot.like_count

    for content_type in breakdown:
        count = breakdown[content_type]["count"]
        breakdown[content_type]["avg_views"] = round(
            breakdown[content_type]["total_views"] / count, 0
        ) if count > 0 else 0

    return breakdown