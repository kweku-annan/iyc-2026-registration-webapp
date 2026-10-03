"""FastAPI application entry point."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import AppError
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

app = FastAPI(
    title="IYC-2026 API",
    description="Backend for the International Youth For Christ Camp Meeting 2026.",
    version="0.1.0",
)

# ── Global exception handler ──────────────────────────────────────────────────

@app.exception_handler(AppError)
async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    """Convert AppError subclasses to {"detail": ..., "code": ...} JSON."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": exc.code},
    )

# ── Middleware ─────────────────────────────────────────────────────────────────

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

