from sqlalchemy import Column, String, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    platform_connection_id = Column(String, ForeignKey("platform_connections.id"), nullable=False, index=True)
    followers = Column(Integer, default=0)
    total_views = Column(Integer, default=0)
    total_content = Column(Integer, default=0)
    avg_engagement_rate = Column(Float, default=0.0)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    platform_connection = relationship("PlatformConnection", back_populates="analytics_snapshots")