import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models.platform_connection import PlatformConnection, PlatformType
from app.auth import get_current_creator
from app.models.creator import Creator
from app.services.platforms import get_platform
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.get("/youtube/connect")
def connect_youtube(current_creator: Creator = Depends(get_current_creator)):
    state = f"{current_creator.id}:{secrets.token_hex(16)}"
    platform = get_platform(PlatformType.youtube)
    auth_url = platform.get_auth_url(state)
    return {"auth_url": auth_url}

@router.get("/youtube/callback")
async def youtube_callback(code: str, state: str, db: Session = Depends(get_db)):
    creator_id = state.split(":")[0]
    creator = db.query(Creator).filter(Creator.id == creator_id).first()
    if not creator:
        raise HTTPException(status_code=400, detail="Invalid state")

    platform = get_platform(PlatformType.youtube)

    try:
        tokens = await platform.exchange_code(code)
        access_token = tokens["access_token"]
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3600)

        profile = await platform.get_profile(access_token)

        existing = db.query(PlatformConnection).filter(
            PlatformConnection.creator_id == creator_id,
            PlatformConnection.platform == PlatformType.youtube,
        ).first()

        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        if existing:
            existing.access_token = access_token
            existing.refresh_token = refresh_token
            existing.token_expires_at = token_expires_at
            existing.platform_username = profile.platform_username
            existing.platform_display_name = profile.platform_display_name
            existing.platform_thumbnail_url = profile.platform_thumbnail_url
            existing.is_active = True
        else:
            connection = PlatformConnection(
                creator_id=creator_id,
                platform=PlatformType.youtube,
                platform_user_id=profile.platform_user_id,
                platform_username=profile.platform_username,
                platform_display_name=profile.platform_display_name,
                platform_thumbnail_url=profile.platform_thumbnail_url,
                access_token=access_token,
                refresh_token=refresh_token,
                token_expires_at=token_expires_at,
            )
            db.add(connection)

        db.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect YouTube: {str(e)}")

    return RedirectResponse(url=f"{settings.frontend_url}/dashboard?connected=youtube")

@router.get("/twitch/connect")
def connect_twitch(current_creator: Creator = Depends(get_current_creator)):
    state = f"{current_creator.id}:{secrets.token_hex(16)}"
    platform = get_platform(PlatformType.twitch)
    auth_url = platform.get_auth_url(state)
    return {"auth_url": auth_url}

@router.get("/twitch/callback")
async def twitch_callback(code: str, state: str, db: Session = Depends(get_db)):
    creator_id = state.split(":")[0]
    creator = db.query(Creator).filter(Creator.id == creator_id).first()
    if not creator:
        raise HTTPException(status_code=400, detail="Invalid state")

    platform = get_platform(PlatformType.twitch)

    try:
        tokens = await platform.exchange_code(code)
        access_token = tokens["access_token"]
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3600)

        profile = await platform.get_profile(access_token)

        existing = db.query(PlatformConnection).filter(
            PlatformConnection.creator_id == creator_id,
            PlatformConnection.platform == PlatformType.twitch,
        ).first()

        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        if existing:
            existing.access_token = access_token
            existing.refresh_token = refresh_token
            existing.token_expires_at = token_expires_at
            existing.platform_username = profile.platform_username
            existing.platform_display_name = profile.platform_display_name
            existing.platform_thumbnail_url = profile.platform_thumbnail_url
            existing.is_active = True
        else:
            connection = PlatformConnection(
                creator_id=creator_id,
                platform=PlatformType.twitch,
                platform_user_id=profile.platform_user_id,
                platform_username=profile.platform_username,
                platform_display_name=profile.platform_display_name,
                platform_thumbnail_url=profile.platform_thumbnail_url,
                access_token=access_token,
                refresh_token=refresh_token,
                token_expires_at=token_expires_at,
            )
            db.add(connection)

        db.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect Twitch: {str(e)}")

    return RedirectResponse(url=f"{settings.frontend_url}/dashboard?connected=twitch")