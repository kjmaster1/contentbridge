import httpx
from typing import Optional
from datetime import datetime
from app.services.platforms.base import BasePlatform, PlatformProfile, PlatformStats, PlatformContent
from app.config import settings

class TwitchPlatform(BasePlatform):
    AUTH_URL = "https://id.twitch.tv/oauth2/authorize"
    TOKEN_URL = "https://id.twitch.tv/oauth2/token"
    API_BASE = "https://api.twitch.tv/helix"

    SCOPES = [
        "user:read:email",
        "user:read:follows",
    ]

    def get_auth_url(self, state: str) -> str:
        params = {
            "client_id": settings.twitch_client_id,
            "redirect_uri": settings.twitch_redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.SCOPES),
            "state": state,
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.AUTH_URL}?{query}"

    async def exchange_code(self, code: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(self.TOKEN_URL, data={
                "client_id": settings.twitch_client_id,
                "client_secret": settings.twitch_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.twitch_redirect_uri,
            })
            response.raise_for_status()
            return response.json()

    async def refresh_tokens(self, refresh_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(self.TOKEN_URL, data={
                "client_id": settings.twitch_client_id,
                "client_secret": settings.twitch_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            })
            response.raise_for_status()
            return response.json()

    def _get_headers(self, access_token: str) -> dict:
        return {
            "Authorization": f"Bearer {access_token}",
            "Client-Id": settings.twitch_client_id,
        }

    async def get_profile(self, access_token: str) -> PlatformProfile:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/users",
                headers=self._get_headers(access_token)
            )
            response.raise_for_status()
            data = response.json()

        if not data.get("data"):
            raise ValueError("No Twitch user found")

        user = data["data"][0]
        return PlatformProfile(
            platform_user_id=user["id"],
            platform_username=user["login"],
            platform_display_name=user["display_name"],
            platform_thumbnail_url=user.get("profile_image_url"),
        )

    async def get_stats(self, access_token: str, platform_user_id: str) -> PlatformStats:
        async with httpx.AsyncClient() as client:
            # Get follower count
            followers_response = await client.get(
                f"{self.API_BASE}/channels/followers",
                params={"broadcaster_id": platform_user_id},
                headers=self._get_headers(access_token)
            )
            followers_response.raise_for_status()
            followers_data = followers_response.json()

            # Get videos count
            videos_response = await client.get(
                f"{self.API_BASE}/videos",
                params={"user_id": platform_user_id, "first": 1},
                headers=self._get_headers(access_token)
            )
            videos_response.raise_for_status()
            videos_data = videos_response.json()

        followers = followers_data.get("total", 0)
        total_content = videos_data.get("pagination", {}).get("cursor") and \
            len(videos_data.get("data", [])) or len(videos_data.get("data", []))

        return PlatformStats(
            followers=followers,
            total_views=0,
            total_content=total_content,
        )

    async def get_content(self, access_token: str, platform_user_id: str) -> list[PlatformContent]:
        content = []
        cursor = None
        page_count = 0
        max_pages = 10

        async with httpx.AsyncClient() as client:
            while page_count < max_pages:
                params = {
                    "user_id": platform_user_id,
                    "first": 100,  # Max allowed by Twitch
                    "type": "archive",
                }
                if cursor:
                    params["after"] = cursor

                response = await client.get(
                    f"{self.API_BASE}/videos",
                    params=params,
                    headers=self._get_headers(access_token)
                )
                response.raise_for_status()
                data = response.json()

                for video in data.get("data", []):
                    published_at = None
                    if video.get("created_at"):
                        published_at = datetime.fromisoformat(
                            video["created_at"].replace("Z", "+00:00")
                        )
                    duration_seconds = self._parse_duration(video.get("duration", "0s"))

                    content.append(PlatformContent(
                        platform_content_id=video["id"],
                        content_type="stream",
                        title=video["title"],
                        description=video.get("description"),
                        thumbnail_url=video.get("thumbnail_url", "").replace("%{width}", "320").replace("%{height}",
                                                                                                        "180"),
                        url=video.get("url"),
                        duration_seconds=duration_seconds,
                        published_at=published_at,
                        view_count=video.get("view_count", 0),
                        like_count=0,
                        comment_count=0,
                    ))

                # Check if there is another page
                cursor = data.get("pagination", {}).get("cursor")
                page_count += 1
                if not cursor:
                    break

        return content

    def _parse_duration(self, duration: str) -> int:
        import re
        match = re.match(r'(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?', duration)
        if not match:
            return 0
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        return hours * 3600 + minutes * 60 + seconds