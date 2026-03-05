from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.models.notification import Notification, NotificationType
from app.auth import get_current_creator
from app.models.creator import Creator

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class NotificationResponse(BaseModel):
    id: str
    type: NotificationType
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    query = db.query(Notification).filter(
        Notification.creator_id == current_creator.id
    )
    if unread_only:
        query = query.filter(Notification.is_read == False)

    return query.order_by(desc(Notification.created_at)).limit(limit).all()

@router.patch("/{notification_id}/read")
def mark_as_read(
    notification_id: str,
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.creator_id == current_creator.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}

@router.patch("/read-all")
def mark_all_as_read(
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.creator_id == current_creator.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

@router.get("/unread-count")
def get_unread_count(
    current_creator: Creator = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    count = db.query(Notification).filter(
        Notification.creator_id == current_creator.id,
        Notification.is_read == False
    ).count()
    return {"unread_count": count}