from sqlalchemy import Column, String, DateTime, Boolean, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base

class PlatformType(str, enum.Enum):
    youtube = "youtube"
    twitch = "twitch"
    tiktok = "tiktok"

class PlatformConnection(Base):
    __tablename__ = "platform_connections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_id = Column(String, ForeignKey("creators.id"), nullable=False, index=True)
    platform = Column(Enum(PlatformType), nullable=False)
    platform_user_id = Column(String, nullable=False)
    platform_username = Column(String, nullable=False)
    platform_display_name = Column(String, nullable=True)
    platform_thumbnail_url = Column(String, nullable=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("Creator", back_populates="platform_connections")
    content_items = relationship("ContentItem", back_populates="platform_connection")
    analytics_snapshots = relationship("AnalyticsSnapshot", back_populates="platform_connection")