"""Rate limiting and client abuse protection utilities.

Provides:
- Real client IP resolution aware of reverse proxies (Railway, Cloudflare).
- Thread-safe sliding window IP rate limiting with automatic pruning.
- Cloudflare Turnstile token verification for bot/spam protection.
"""

from __future__ import annotations

import logging
import math
import threading
import time
from collections import defaultdict
from typing import TYPE_CHECKING

import requests
from fastapi import Request

from app.core.config import settings
from app.core.exceptions import RateLimitError

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# Default limits
DEFAULT_WINDOW_SECONDS = 300  # 5 minutes
DEFAULT_MAX_REQUESTS = 5      # 5 requests per 5 minutes
DEFAULT_DAILY_WINDOW_SECONDS = 86400  # 24 hours
DEFAULT_DAILY_MAX_REQUESTS = 25       # 25 requests per day


def get_client_ip(request: Request) -> str:
    """Extract the real client IP address from request headers.

    Checks:
    1. CF-Connecting-IP (Cloudflare)
    2. X-Forwarded-For (First untrusted client IP in proxy chain)
    3. X-Real-IP
    4. request.client.host fallback
    """
    # 1. Cloudflare header
    cf_connecting_ip = request.headers.get("cf-connecting-ip")
    if cf_connecting_ip:
        ip = cf_connecting_ip.strip()
        if ip:
            return ip

    # 2. X-Forwarded-For (format: client, proxy1, proxy2...)
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        parts = [p.strip() for p in x_forwarded_for.split(",") if p.strip()]
        if parts:
            first_ip = parts[0]
            if first_ip.lower() != "unknown":
                return first_ip

    # 3. X-Real-IP
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        ip = x_real_ip.strip()
        if ip and ip.lower() != "unknown":
            return ip

    # 4. Direct client connection host
    if request.client and request.client.host:
        return request.client.host

    return "unknown"


class SlidingWindowRateLimiter:
    """Thread-safe sliding-window rate limiter with short and daily windows."""

    def __init__(
        self,
        window_seconds: int = DEFAULT_WINDOW_SECONDS,
        max_requests: int = DEFAULT_MAX_REQUESTS,
        daily_window_seconds: int = DEFAULT_DAILY_WINDOW_SECONDS,
        daily_max_requests: int = DEFAULT_DAILY_MAX_REQUESTS,
    ) -> None:
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self.daily_window_seconds = daily_window_seconds
        self.daily_max_requests = daily_max_requests

        self._lock = threading.Lock()
        self._storage: dict[str, list[float]] = defaultdict(list)

    def is_rate_limited(self, ip: str, now: float | None = None) -> tuple[bool, int, str]:
        """Check if an IP has exceeded rate limits.

        Returns:
            (is_limited, retry_after_seconds, error_detail)
        """
        current_time = time.time() if now is None else now

        with self._lock:
            # 1. Prune timestamps older than daily window
            timestamps = [
                t for t in self._storage[ip]
                if current_time - t < self.daily_window_seconds
            ]

            # 2. Check short window
            short_window_timestamps = [
                t for t in timestamps
                if current_time - t < self.window_seconds
            ]

            if len(short_window_timestamps) >= self.max_requests:
                oldest_in_window = short_window_timestamps[0]
                retry_after = max(1, math.ceil(self.window_seconds - (current_time - oldest_in_window)))
                self._storage[ip] = timestamps
                return (
                    True,
                    retry_after,
                    f"Too many requests from this IP. Please try again in {retry_after} seconds.",
                )

            # 3. Check daily window
            if len(timestamps) >= self.daily_max_requests:
                oldest_in_daily = timestamps[0]
                retry_after = max(1, math.ceil(self.daily_window_seconds - (current_time - oldest_in_daily)))
                self._storage[ip] = timestamps
                return (
                    True,
                    retry_after,
                    "Daily limit reached for this IP. Please try again tomorrow.",
                )

            # Record this request
            timestamps.append(current_time)
            self._storage[ip] = timestamps
            return False, 0, ""

    def clear(self) -> None:
        """Clear all stored rate limit history (primarily for tests)."""
        with self._lock:
            self._storage.clear()


# Global singleton rate limiter for SMS / registration flows
ip_rate_limiter = SlidingWindowRateLimiter()


def check_ip_rate_limit(ip_address: str) -> None:
    """Enforce IP rate limit, raising RateLimitError if exceeded."""
    is_limited, retry_after, detail = ip_rate_limiter.is_rate_limited(ip_address)
    if is_limited:
        raise RateLimitError(detail=detail, retry_after=retry_after)


def enforce_ip_rate_limit(request: Request) -> str:
    """Extract client IP and enforce rate limit. Returns the extracted IP."""
    ip_address = get_client_ip(request)
    check_ip_rate_limit(ip_address)
    return ip_address


def verify_turnstile(
    token: str | None,
    client_ip: str | None = None,
    expected_action: str = "registration",
) -> bool:
    """Verify a Cloudflare Turnstile CAPTCHA token according to canonical specification.

    If Turnstile is disabled or unconfigured in settings (e.g. dev/test mode),
    returns True immediately to keep local workflows painless.
    """
    if not settings.turnstile_enabled or not settings.turnstile_secret_key:
        return True

    if not token or not isinstance(token, str):
        logger.warning("Turnstile token missing or invalid type while Turnstile is enabled.")
        return False

    token_clean = token.strip()
    # Canonical length check: must not be empty and must not exceed 2048 chars
    if len(token_clean) == 0 or len(token_clean) > 2048:
        logger.warning("Turnstile token invalid length: %d", len(token_clean))
        return False

    try:
        response = requests.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "secret": settings.turnstile_secret_key,
                "response": token_clean,
                "remoteip": client_ip or "",
            },
            timeout=10.0,
        )
        if not response.ok:
            logger.error("Turnstile siteverify returned HTTP %s", response.status_code)
            return False

        data = response.json()
        if not bool(data.get("success", False)):
            logger.warning("Turnstile verification failed: %s", data.get("error-codes"))
            return False

        # Verify action if returned by Cloudflare
        returned_action = data.get("action")
        if returned_action and returned_action != expected_action:
            logger.warning("Turnstile action mismatch: expected %r, got %r", expected_action, returned_action)
            return False

        # Verify hostname if configured in settings
        configured_hostnames = {
            h.strip()
            for h in settings.turnstile_hostnames.split(",")
            if h.strip()
        } if getattr(settings, "turnstile_hostnames", "") else set()

        if configured_hostnames:
            returned_hostname = data.get("hostname")
            if returned_hostname not in configured_hostnames:
                logger.warning("Turnstile hostname mismatch: %r not in %r", returned_hostname, configured_hostnames)
                return False

        return True
    except Exception as exc:
        logger.error("Error communicating with Cloudflare Turnstile API: %s", exc)
        return False
