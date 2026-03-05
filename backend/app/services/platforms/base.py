from abc import ABC, abstractmethod
from typing import Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class PlatformProfile:
    platform_user_id: str
    platform_username: str
    platform_display_name: str
    platform_thumbnail_url: Optional[str]

@dataclass
class PlatformStats:
    followers: int
    total_views: int
    total_content: int

@dataclass
class PlatformContent:
    platform_content_id: str
    content_type: str
    title: str
    description: Optional[str]
    thumbnail_url: Optional[str]
    url: Optional[str]
    duration_seconds: Optional[int]
    published_at: Optional[datetime]
    view_count: int
    like_count: int
    comment_count: int

class BasePlatform(ABC):
    @abstractmethod
    def get_auth_url(self, state: str) -> str:
        pass

    @abstractmethod
    def exchange_code(self, code: str) -> dict:
        pass

    @abstractmethod
    def refresh_tokens(self, refresh_token: str) -> dict:
        pass

    @abstractmethod
    def get_profile(self, access_token: str) -> PlatformProfile:
        pass

    @abstractmethod
    def get_stats(self, access_token: str, platform_user_id: str) -> PlatformStats:
        pass

    @abstractmethod
    def get_content(self, access_token: str, platform_user_id: str) -> list[PlatformContent]:
        pass