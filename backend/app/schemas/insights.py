from pydantic import BaseModel
from typing import Optional

class InsightsSummaryResponse(BaseModel):
    total_followers: int
    total_views: int
    total_content: int
    avg_engagement_rate: float
    best_performing_platform: Optional[str]
    best_day_to_post: Optional[str] = None