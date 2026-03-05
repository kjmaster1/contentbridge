from app.services.platforms.youtube import YouTubePlatform
from app.services.platforms.twitch import TwitchPlatform
from app.services.platforms.tiktok import TikTokPlatform
from app.models.platform_connection import PlatformType

def get_platform(platform_type: PlatformType):
    platforms = {
        PlatformType.youtube: YouTubePlatform(),
        PlatformType.twitch: TwitchPlatform(),
        PlatformType.tiktok: TikTokPlatform(),
    }
    platform = platforms.get(platform_type)
    if not platform:
        raise ValueError(f"Unknown platform: {platform_type}")
    return platform