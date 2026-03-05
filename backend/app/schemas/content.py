from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TopContentResponse(BaseModel):
    id: str
    title: str
    platform: str
    content_type: str
    view_count: int
    engagement_rate: float
    published_at: Optional[datetime]

class GrowthDataResponse(BaseModel):
    recorded_at: datetime
    followers: int
    platform: str