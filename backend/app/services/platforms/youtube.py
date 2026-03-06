import httpx
from typing import Optional
from datetime import datetime, timezone
from app.services.platforms.base import BasePlatform, PlatformProfile, PlatformStats, PlatformContent
from app.config import settings

class YouTubePlatform(BasePlatform):
    AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    API_BASE = "https://www.googleapis.com/youtube/v3"

    SCOPES = [
        "https://www.googleapis.com/auth/youtube.readonly",
        "openid",
        "email",
        "profile",
    ]

    def get_auth_url(self, state: str) -> str:
        params = {
            "client_id": settings.google_client_id,
            "redirect_uri": settings.google_redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.AUTH_URL}?{query}"

    async def exchange_code(self, code: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(self.TOKEN_URL, data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.google_redirect_uri,
            })
            response.raise_for_status()
            return response.json()

    async def refresh_tokens(self, refresh_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(self.TOKEN_URL, data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            })
            response.raise_for_status()
            return response.json()

    async def get_profile(self, access_token: str) -> PlatformProfile:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/channels",
                params={"part": "snippet,statistics", "mine": "true"},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            data = response.json()

        if not data.get("items"):
            raise ValueError("No YouTube channel found for this account")

        channel = data["items"][0]
        snippet = channel["snippet"]

        return PlatformProfile(
            platform_user_id=channel["id"],
            platform_username=snippet.get("customUrl", channel["id"]),
            platform_display_name=snippet["title"],
            platform_thumbnail_url=snippet.get("thumbnails", {}).get("default", {}).get("url"),
        )

    async def get_stats(self, access_token: str, platform_user_id: str) -> PlatformStats:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/channels",
                params={"part": "statistics", "id": platform_user_id},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            data = response.json()

        if not data.get("items"):
            raise ValueError("Channel not found")

        stats = data["items"][0]["statistics"]
        return PlatformStats(
            followers=int(stats.get("subscriberCount", 0)),
            total_views=int(stats.get("viewCount", 0)),
            total_content=int(stats.get("videoCount", 0)),
        )

    async def get_content(self, access_token: str, platform_user_id: str) -> list[PlatformContent]:
        async with httpx.AsyncClient() as client:
            # Get uploads playlist ID
            channel_response = await client.get(
                f"{self.API_BASE}/channels",
                params={"part": "contentDetails", "id": platform_user_id},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            channel_response.raise_for_status()
            channel_data = channel_response.json()
            if not channel_data.get("items"):
                return []

            uploads_playlist_id = channel_data["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

            # Loop through pages to get ALL video IDs
            video_ids = []
            page_token = None
            page_count = 0
            max_pages = 10

            while page_count < max_pages:
                params = {
                    "part": "contentDetails",
                    "playlistId": uploads_playlist_id,
                    "maxResults": 50,
                }
                if page_token:
                    params["pageToken"] = page_token

                playlist_response = await client.get(
                    f"{self.API_BASE}/playlistItems",
                    params=params,
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                playlist_response.raise_for_status()
                playlist_data = playlist_response.json()

                for item in playlist_data.get("items", []):
                    video_ids.append(item["contentDetails"]["videoId"])

                page_token = playlist_data.get("nextPageToken")
                page_count += 1

                if not page_token:
                    break  # No more pages left!

            if not video_ids:
                return []

            # Fetch full video details in chunks of 50 (YouTube API limit per request)
            content = []
            for i in range(0, len(video_ids), 50):
                chunk = video_ids[i:i + 50]
                videos_response = client.get(
                    f"{self.API_BASE}/videos",
                    params={
                        "part": "snippet,statistics,contentDetails",
                        "id": ",".join(chunk),
                    },
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                videos_response.raise_for_status()
                videos_data = videos_response.json()

                for video in videos_data.get("items", []):
                    snippet = video["snippet"]
                    stats = video.get("statistics", {})
                    duration = video.get("contentDetails", {}).get("duration", "PT0S")
                    duration_seconds = self._parse_duration(duration)
                    content_type = "short" if duration_seconds <= 60 else "video"

                    published_at = None
                    if snippet.get("publishedAt"):
                        published_at = datetime.fromisoformat(
                            snippet["publishedAt"].replace("Z", "+00:00")
                        )

                    content.append(PlatformContent(
                        platform_content_id=video["id"],
                        content_type=content_type,
                        title=snippet["title"],
                        description=snippet.get("description"),
                        thumbnail_url=snippet.get("thumbnails", {}).get("medium", {}).get("url"),
                        url=f"https://youtube.com/watch?v={video['id']}",
                        duration_seconds=duration_seconds,
                        published_at=published_at,
                        view_count=int(stats.get("viewCount", 0)),
                        like_count=int(stats.get("likeCount", 0)),
                        comment_count=int(stats.get("commentCount", 0)),
                    ))

        return content

    def _parse_duration(self, duration: str) -> int:
        import re
        match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration)
        if not match:
            return 0
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        return hours * 3600 + minutes * 60 + seconds