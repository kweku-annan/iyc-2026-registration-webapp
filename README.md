# IYC-2026 — International Youth For Christ Camp Meeting

> **Event:** 23–26 December  
> **Theme:** The Rain of His Spirit  
> **Tagline:** Come, Experience the Power of the Holy Spirit

A single-event website for registration, SMS OTP verification, ticket delivery, gallery, testimonials, Paystack donations, and QR/ticket-code check-in on the day.

---

## Monorepo layout

```
/backend     FastAPI app (Python 3.12+)
/frontend    React + Vite + TypeScript + Tailwind
/docs        SPEC.md, AGENT_HANDOFF.md
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.12+ |
| Node | LTS (20+) |
| npm | 9+ |
| PostgreSQL | 15+ |

---

## Quick-start

### 1. Clone and copy env

```bash
git clone <repo-url>
cd iyc-2026-registration
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and SECRET_KEY
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run database migrations (once DB is set up)
alembic upgrade head

# Seed the settings row + first organizer account
python -m app.seed

# Start dev server
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local       # adjust VITE_API_URL if needed
npm install
npm run dev
# → http://localhost:5173
```

---

## Environment variables

See [`.env.example`](.env.example) for the full list with descriptions.

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ | — | PostgreSQL DSN |
| `SECRET_KEY` | ✅ | — | 32-byte hex, used for signing |
| `FRONTEND_ORIGIN` | ✅ | — | CORS allowed origin |
| `COOKIE_DOMAIN` | ✅ | — | Auth cookie domain |
| `SMS_PROVIDER` | ✅ | `console` | `console` or `mnotify` |
| `SMS_API_KEY` | production | — | mNotify API key |
| `SMS_SENDER_ID` | production | — | mNotify sender ID |
| `OTP_ENABLED` | — | `true` | Set `false` to skip OTP in dev |
| `DEFAULT_PHONE_REGION` | — | `GH` | ISO 3166-1 alpha-2 |
| `EVENT_TIMEZONE` | — | `Africa/Accra` | IANA timezone |
| `PAYSTACK_SECRET_KEY` | production | — | Paystack secret key |
| `PAYSTACK_PUBLIC_KEY` | production | — | Paystack public key |

---

## Running tests

```bash
cd backend
source .venv/bin/activate
pytest -v
ruff check app/ tests/
```

---

## Docs

- [`docs/SPEC.md`](docs/SPEC.md) — Full project specification (source of truth)
- [`docs/AGENT_HANDOFF.md`](docs/AGENT_HANDOFF.md) — Task list and working rules
