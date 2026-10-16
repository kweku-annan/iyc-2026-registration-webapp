"""FastAPI application entry point."""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

# ── Logging ────────────────────────────────────────────────────────────────────
# Configure the root logger once at startup so all module-level loggers
# (e.g. app.services.sms) emit records instead of being silently discarded.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)

from app.core.config import settings
from app.core.exceptions import AppError, RateLimitError
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.health import router as health_router
from app.routers.partners import router as partners_router
from app.routers.registrations import router as registrations_router
from app.routers.tickets import router as tickets_router
from app.routers.testimonials import router as testimonials_router
from app.routers.donations import router as donations_router
from app.routers.webhooks import router as webhooks_router
from app.routers.checkin import router as checkin_router
from app.routers.gallery import router as gallery_router, admin_router as admin_gallery_router

_is_production = settings.environment.lower() == "production"

app = FastAPI(
    title="IYC-2026 API",
    description="Backend for the International Youth For Christ Camp Meeting 2026.",
    version="0.1.0",
    # Disable auto-generated API docs in production to avoid leaking endpoint
    # structure and schema details to the public internet.
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

# Ensure uploads directory exists and mount it
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(BACKEND_DIR, "uploads"))
GALLERY_THUMBS_DIR = os.path.join(UPLOAD_DIR, "gallery", "thumbs")
GALLERY_FULL_DIR = os.path.join(UPLOAD_DIR, "gallery", "full")
os.makedirs(GALLERY_THUMBS_DIR, exist_ok=True)
os.makedirs(GALLERY_FULL_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
# Also mount /gallery/thumbs and /gallery/full so legacy or direct image links never 404
app.mount("/gallery/thumbs", StaticFiles(directory=GALLERY_THUMBS_DIR), name="gallery-thumbs")
app.mount("/gallery/full", StaticFiles(directory=GALLERY_FULL_DIR), name="gallery-full")

# ── Global exception handler ──────────────────────────────────────────────────

@app.exception_handler(AppError)
async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    """Convert AppError subclasses to {"detail": ..., "code": ...} JSON."""
    headers: dict[str, str] = {}
    # RFC 7231: include Retry-After on 429 responses so clients/monitoring
    # know when they may retry (60 seconds is a safe conservative default).
    if isinstance(exc, RateLimitError):
        headers["Retry-After"] = "60"
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": exc.code},
        headers=headers or None,
    )

# ── Middleware ─────────────────────────────────────────────────────────────────

# Security headers — applied to every response regardless of route.
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# CORS — allow only the configured frontend origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(settings.frontend_origin).rstrip("/")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(health_router)
app.include_router(partners_router)
app.include_router(registrations_router)
app.include_router(tickets_router)
app.include_router(testimonials_router)
app.include_router(donations_router)
app.include_router(webhooks_router)
app.include_router(checkin_router)
app.include_router(gallery_router)
app.include_router(admin_gallery_router)

