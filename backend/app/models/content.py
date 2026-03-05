from sqlalchemy import Column, String, DateTime, Integer, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base

class ContentType(str, enum.Enum):
    video = "video"
    short = "short"
    stream = "stream"
    clip = "clip"

class ContentItem(Base):
    __tablename__ = "content_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_id = Column(String, ForeignKey("creators.id"), nullable=False, index=True)
    platform_connection_id = Column(String, ForeignKey("platform_connections.id"), nullable=False)
    platform_content_id = Column(String, nullable=False)
    platform = Column(String, nullable=False)
    content_type = Column(Enum(ContentType), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    url = Column(String, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    creator = relationship("Creator", back_populates="content_items")
    platform_connection = relationship("PlatformConnection", back_populates="content_items")
    snapshots = relationship("ContentSnapshot", back_populates="content_item")

class ContentSnapshot(Base):
    __tablename__ = "content_snapshots"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    content_item_id = Column(String, ForeignKey("content_items.id"), nullable=False, index=True)
    view_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    share_count = Column(Integer, default=0)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    content_item = relationship("ContentItem", back_populates="snapshots")