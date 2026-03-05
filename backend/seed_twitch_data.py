import sys
import os
from datetime import datetime, timedelta, timezone
import random

# Add the backend directory to the Python path so we can import our app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.creator import Creator
from app.models.platform_connection import PlatformConnection, PlatformType
from app.models.content import  ContentItem, ContentSnapshot
from app.models.analytics import AnalyticsSnapshot


def seed_data():
    db = SessionLocal()
    try:
        # 1. Get the first creator in the database
        creator = db.query(Creator).first()
        if not creator:
            print("No creators found. Please sign up first.")
            return

        # 2. Get their Twitch connection
        twitch_conn = db.query(PlatformConnection).filter(
            PlatformConnection.creator_id == creator.id,
            PlatformConnection.platform == PlatformType.twitch
        ).first()

        if not twitch_conn:
            print("No Twitch connection found. Please connect Twitch in the UI first.")
            return

        print(f"Seeding historical Twitch data for {creator.username}...")

        # 3. Generate 6 months of daily Growth Snapshots
        base_followers = 1200
        base_views = 45000

        for i in range(180, -1, -1):
            date = datetime.now(timezone.utc) - timedelta(days=i)

            # Simulate slight daily growth
            base_followers += random.randint(0, 3)
            base_views += random.randint(10, 150)

            snapshot = AnalyticsSnapshot(
                platform_connection_id=twitch_conn.id,
                followers=base_followers,
                total_views=base_views,
                total_content=random.randint(40, 50),
                recorded_at=date
            )
            db.add(snapshot)

        # 4. Generate some Top Performing Content (Past Streams)
        stream_titles = [
            "🔴 INSANE Minecraft Hardcore Survival - Day 100!",
            "Just Chatting & Reacting to new updates",
            "Speedrunning Minecraft 1.20 (World Record Pace?)",
            "Building the Ultimate Base | Chill Stream",
            "Viewer Games and Q&A!"
        ]

        for i, title in enumerate(stream_titles):
            # Space them out over the last few months
            published_date = datetime.now(timezone.utc) - timedelta(days=random.randint(15, 120))

            stream = ContentItem(
                creator_id=creator.id,
                platform_connection_id=twitch_conn.id,
                platform=PlatformType.twitch,
                platform_content_id=f"mock_twitch_id_{i}",
                content_type="stream",
                title=title,
                url=f"https://twitch.tv/videos/mock{i}",
                published_at=published_date
            )
            db.add(stream)
            db.flush()  # Get the stream ID

            # Create the stats snapshot for this stream
            views = random.randint(500, 5000)
            stats = ContentSnapshot(
                content_item_id=stream.id,
                view_count=views,
                like_count=int(views * 0.05),  # Simulate 5% engagement
                comment_count=int(views * 0.01),
                recorded_at=datetime.now(timezone.utc)
            )
            db.add(stats)

        db.commit()
        print("Successfully seeded historical Twitch data!")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()