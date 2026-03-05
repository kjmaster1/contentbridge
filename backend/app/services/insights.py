from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta, timezone
from app.models.platform_connection import PlatformConnection
from app.models.analytics import AnalyticsSnapshot
from app.models.content import ContentItem, ContentSnapshot
from app.models.creator import Creator


def calculate_insights_summary(db: Session, current_creator: Creator):
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

            # Safely get the string name
            platform_str = connection.platform if isinstance(connection.platform, str) else connection.platform.value
            platform_followers[platform_str] = latest.followers

    best_platform = max(platform_followers, key=platform_followers.get) if platform_followers else None

    all_content = db.query(ContentItem).filter(ContentItem.creator_id == current_creator.id).all()
    all_engagements = []

    for item in all_content:
        latest_snapshot = db.query(ContentSnapshot).filter(
            ContentSnapshot.content_item_id == item.id
        ).order_by(desc(ContentSnapshot.recorded_at)).first()

        if latest_snapshot and latest_snapshot.view_count > 0:
            engagement = (latest_snapshot.like_count + latest_snapshot.comment_count) / latest_snapshot.view_count * 100
            all_engagements.append(engagement)

    avg_engagement = round(sum(all_engagements) / len(all_engagements), 2) if all_engagements else 0.0

    return {
        "total_followers": total_followers,
        "total_views": total_views,
        "total_content": total_content,
        "avg_engagement_rate": avg_engagement,
        "best_performing_platform": best_platform,
    }


def get_audience_growth(db: Session, current_creator: Creator, days: int):
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

    connections = db.query(PlatformConnection).filter(
        PlatformConnection.creator_id == current_creator.id
    ).all()

    growth_data = []
    for conn in connections:
        snapshots = db.query(AnalyticsSnapshot).filter(
            AnalyticsSnapshot.platform_connection_id == conn.id,
            AnalyticsSnapshot.recorded_at >= cutoff_date
        ).order_by(AnalyticsSnapshot.recorded_at.asc()).all()

        for snap in snapshots:
            # Safely get the string name
            platform_str = conn.platform if isinstance(conn.platform, str) else conn.platform.value

            growth_data.append({
                "recorded_at": snap.recorded_at,
                "followers": snap.followers,
                "platform": platform_str
            })

    return growth_data


def get_top_content(db: Session, current_creator: Creator, limit: int):
    content_items = db.query(ContentItem).filter(
        ContentItem.creator_id == current_creator.id
    ).all()

    results = []
    for item in content_items:
        latest_snap = db.query(ContentSnapshot).filter(
            ContentSnapshot.content_item_id == item.id
        ).order_by(desc(ContentSnapshot.recorded_at)).first()

        if latest_snap:
            engagement = 0.0
            if latest_snap.view_count > 0:
                engagement = round((latest_snap.like_count + latest_snap.comment_count) / latest_snap.view_count * 100,
                                   2)

            # Safely get the string name
            platform_str = item.platform if isinstance(item.platform, str) else item.platform.value

            results.append({
                "id": item.id,
                "title": item.title,
                "platform": platform_str,
                "content_type": item.content_type,
                "view_count": latest_snap.view_count,
                "engagement_rate": engagement,
                "published_at": item.published_at
            })

    # Sort by view_count descending and apply the limit
    results.sort(key=lambda x: x["view_count"], reverse=True)
    return results[:limit]