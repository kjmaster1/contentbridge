from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

# Dependencies
from app.routers.auth import get_current_creator
from app.database import get_db

# Models & Schemas
from app.models.creator import Creator
from app.schemas.insights import InsightsSummaryResponse
from app.schemas.content import GrowthDataResponse, TopContentResponse

# Services
from app.services import insights as insights_service

router = APIRouter(prefix="/insights", tags=["Insights"])

@router.get("/summary", response_model=InsightsSummaryResponse)
def get_insights_summary(
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Fetch the aggregated top-level stats for the dashboard."""
    return insights_service.calculate_insights_summary(db, current_creator)


@router.get("/growth", response_model=List[GrowthDataResponse])
def get_growth_chart_data(
    days: int = Query(30, ge=1),
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Fetch time-series follower data for the growth chart."""
    return insights_service.get_audience_growth(db, current_creator, days)


@router.get("/top-content", response_model=List[TopContentResponse])
def get_top_performing_content(
    limit: int = Query(5, ge=1, le=500),
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Fetch the highest viewed content across all platforms."""
    return insights_service.get_top_content(db, current_creator, limit)