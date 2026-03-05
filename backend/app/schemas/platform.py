from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.platform_connection import PlatformType

class PlatformConnectionResponse(BaseModel):
    id: str
    platform: PlatformType
    platform_username: str
    platform_display_name: Optional[str] = None
    platform_thumbnail_url: Optional[str] = None
    is_active: bool
    last_synced_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class PlatformStatsResponse(BaseModel):
    platform: PlatformType
    platform_username: str
    followers: int
    total_views: int
    total_content: int
    avg_engagement_rate: float
    last_synced_at: Optional[datetime] = None