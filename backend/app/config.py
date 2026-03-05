from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080

    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str

    twitch_client_id: str
    twitch_client_secret: str
    twitch_redirect_uri: str

    redis_url: str = "redis://localhost:6379/0"
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()