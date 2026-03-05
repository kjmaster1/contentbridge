from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from app.config import settings
from app.routers import creators, platforms, content, insights, notifications
from app.routers import auth as auth_router

app = FastAPI(
    title="ContentBridge API",
    description="A unified analytics and management platform for content creators.",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(creators.router)
app.include_router(platforms.router)
app.include_router(content.router)
app.include_router(insights.router)
app.include_router(notifications.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "contentbridge-api"}