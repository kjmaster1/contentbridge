from app.services.platforms.base import BasePlatform, PlatformProfile, PlatformStats, PlatformContent

class TikTokPlatform(BasePlatform):
    """
    TikTok platform integration.
    Architecture is ready — pending TikTok API access approval.
    """

    def get_auth_url(self, state: str) -> str:
        raise NotImplementedError("TikTok integration pending API access approval")

    def exchange_code(self, code: str) -> dict:
        raise NotImplementedError("TikTok integration pending API access approval")

    def refresh_tokens(self, refresh_token: str) -> dict:
        raise NotImplementedError("TikTok integration pending API access approval")

    def get_profile(self, access_token: str) -> PlatformProfile:
        raise NotImplementedError("TikTok integration pending API access approval")

    def get_stats(self, access_token: str, platform_user_id: str) -> PlatformStats:
        raise NotImplementedError("TikTok integration pending API access approval")

    def get_content(self, access_token: str, platform_user_id: str) -> list[PlatformContent]:
        raise NotImplementedError("TikTok integration pending API access approval")