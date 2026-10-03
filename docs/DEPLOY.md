# Deployment Guide — IYC-2026

> **Do not deploy this yourself.** These are instructions for the human operator.

## Architecture overview

```
Browser → Cloudflare Pages (frontend SPA)
              ↕ HTTPS to api.yourdomain.com
         Railway (FastAPI + Uvicorn)
              ↕ internal network
         Railway PostgreSQL add-on
```

| Service | Platform | URL pattern |
|---------|----------|-------------|
| Frontend | Cloudflare Pages | `https://www.yourdomain.com` |
| Backend API | Railway | `https://api.yourdomain.com` |
| Database | Railway PostgreSQL | internal only |

---

## Part 1 — Backend on Railway

### 1.1 Create the project

1. Log in to [railway.app](https://railway.app) and create a new **project**.
2. Inside the project, add a **PostgreSQL** service (click **+ Add** → **Database** → **PostgreSQL**).
3. Add a second service: **+ Add** → **GitHub Repo** → select this repository.
4. In the new service settings, set the **Root Directory** to `backend`.

Railway will detect the `backend/railway.json` and use Nixpacks to build.

### 1.2 Environment variables

In the backend service → **Variables**, add every key from the table below.

> [!IMPORTANT]
> Set these **before** the first deploy. The app will crash on startup if any required variable is missing.

| Variable | Source / value |
|----------|----------------|
| `DATABASE_URL` | Copy from the PostgreSQL service's **DATABASE_URL** variable (Railway auto-injects this if you link the services) |
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` — generate locally, paste here |
| `FRONTEND_ORIGIN` | `https://www.yourdomain.com` (no trailing slash) |
| `COOKIE_DOMAIN` | `yourdomain.com` (apex, no `www` or `api`) |
| `SMS_PROVIDER` | `mnotify` for staging/production; `console` for dev |
| `SMS_API_KEY` | Your mNotify API key |
| `SMS_SENDER_ID` | `IYC2026` (or your approved sender ID) |
| `OTP_ENABLED` | `true` |
| `DEFAULT_PHONE_REGION` | `GH` |
| `EVENT_TIMEZONE` | `Africa/Accra` |
| `PAYSTACK_SECRET_KEY` | Paystack test key for now (Phase 2) |
| `PAYSTACK_PUBLIC_KEY` | Paystack public test key (Phase 2) |
| `SEED_ORGANIZER_EMAIL` | Email for the first organizer account |
| `SEED_ORGANIZER_PASSWORD` | Strong password (≥ 16 characters) |

> [!CAUTION]
> `SECRET_KEY` and `SEED_ORGANIZER_PASSWORD` must never be committed to version control.
> After the first successful deploy and seed, you may remove `SEED_ORGANIZER_EMAIL` and `SEED_ORGANIZER_PASSWORD` from Railway for safety.

### 1.3 What happens on every deploy

The `railway.json` start command runs in order:

```bash
alembic upgrade head        # apply any pending migrations
python -m app.seed          # idempotent: skips if rows already exist
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Railway injects `$PORT` automatically. The app will be accessible at the Railway-assigned internal URL until you attach a custom domain.

### 1.4 Health check

Railway pings `GET /health` every 30 seconds. A 200 response keeps the deployment live. If it returns non-200 for longer than `healthcheckTimeout` (60 s), Railway rolls back.

---

## Part 2 — Frontend on Cloudflare Pages

### 2.1 Create the Pages project

1. In Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select this repository.
3. Set **Root directory** to `frontend`.
4. Set **Build command** to `npm run build`.
5. Set **Build output directory** to `dist`.

### 2.2 Environment variables

In the Pages project → **Settings** → **Environment variables**, add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.yourdomain.com` (no trailing slash) |
| `VITE_SITE_URL` | `https://www.yourdomain.com` (used for QR code generation) |

> [!IMPORTANT]
> Prefix all frontend env vars with `VITE_` — Vite only exposes variables with this prefix to the browser bundle.

### 2.3 SPA fallback

The file `frontend/public/_redirects` is included in the build output:

```
/* /index.html 200
```

This instructs Cloudflare Pages to serve `index.html` for every path that doesn't match a static file, allowing React Router to handle client-side navigation (e.g. `/register`, `/ticket/:token`, `/admin/*`).

---

## Part 3 — Custom domains

### 3.1 DNS setup (Cloudflare as DNS provider)

Add these records in Cloudflare DNS:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| `CNAME` | `www` | `<your-pages-project>.pages.dev` | ✅ Proxied |
| `CNAME` | `api` | `<your-railway-service>.railway.app` | ✅ Proxied |
| `CNAME` | `@` (apex) | `www.yourdomain.com` | ✅ Proxied (redirect rule) |

Add a **Redirect Rule** in Cloudflare: `yourdomain.com` → `https://www.yourdomain.com` (301 permanent).

### 3.2 Attach domains to services

**Cloudflare Pages:**
- Pages project → **Custom domains** → **Set up a custom domain** → enter `www.yourdomain.com`.

**Railway:**
- Backend service → **Settings** → **Networking** → **Custom domain** → enter `api.yourdomain.com`.
- Railway will show a CNAME target — make sure your Cloudflare DNS record points to it.

### 3.3 CORS and cookies

Once both custom domains are live, verify these Railway env vars match:

```
FRONTEND_ORIGIN=https://www.yourdomain.com
COOKIE_DOMAIN=yourdomain.com
```

`COOKIE_DOMAIN` must be the **apex domain** (without `www`). This allows the `session_token` cookie set by `api.yourdomain.com` to be read by `www.yourdomain.com` if they share the same apex.

> [!WARNING]
> If `COOKIE_DOMAIN` is wrong, logins will appear to succeed but every subsequent authenticated request will fail with 401 because the cookie won't be sent.

---

## Part 4 — Post-deploy smoke-test checklist

Run through this checklist after every production deploy. It covers all critical paths.

### A — Public flows

- [ ] `GET https://api.yourdomain.com/health` → `{"status": "ok"}`
- [ ] Visit `https://www.yourdomain.com` → landing page loads, no console errors
- [ ] `https://yourdomain.com` (apex) → redirects to `https://www.yourdomain.com`
- [ ] **Registration open/closed banner** shows correctly in the hero
- [ ] Click **Register Free** → `/register` loads, phone step is shown
- [ ] Enter a Ghanaian number (e.g. `0241234567`), submit → OTP request succeeds
  - In dev: check Railway logs for the printed OTP code
  - In staging/prod: receive real SMS on the number
- [ ] Enter OTP → proceeds to details step
- [ ] Fill details, submit → success, redirected to `/ticket/:token`
- [ ] Ticket page shows name, `XXXX-XXXX` code, and QR code
- [ ] Screenshot the QR → decode it → confirms `https://www.yourdomain.com/c/<code>`
- [ ] Submit same phone number a second time → receive "already registered" SMS, no duplicate row in DB

### B — Admin flows

- [ ] Navigate to `https://www.yourdomain.com/admin/login` directly (no link from public site)
- [ ] Log in with `SEED_ORGANIZER_EMAIL` / `SEED_ORGANIZER_PASSWORD`
- [ ] Dashboard shows correct stat counts
- [ ] Registrations table shows the test registration from step A
- [ ] Search by name → filters correctly
- [ ] Export CSV → file downloads with all expected columns
- [ ] Settings → toggle registration closed → save
- [ ] Registration page now shows "Registration is Closed"
- [ ] Toggle back to open → registration page shows CTA again

### C — Security spot checks

- [ ] `GET https://api.yourdomain.com/admin/stats` with no cookies → `401`
- [ ] `GET https://api.yourdomain.com/admin/stats` with volunteer cookie → `403`
- [ ] `PATCH https://api.yourdomain.com/admin/settings` with valid session but missing `X-CSRF-Token` → `403`
- [ ] Check `Set-Cookie` response header on `/auth/login` → must include `HttpOnly`, `Secure`, `SameSite=Lax`
- [ ] `GET https://www.yourdomain.com/admin/login` → `<meta name="robots" content="noindex">` present in source

### D — SMS (staging/production only)

- [ ] `SMS_PROVIDER=mnotify` in Railway env
- [ ] OTP SMS arrives within 30 seconds
- [ ] Registration confirmation SMS arrives within 30 seconds

---

## Appendix — Useful Railway CLI commands

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Link to an existing project
railway link

# View live logs
railway logs --tail

# Run a one-off command (e.g. manual seed)
railway run python -m app.seed

# Run a specific migration
railway run alembic upgrade head
```

## Appendix — Rollback procedure

1. In Railway → backend service → **Deployments** → click any previous deployment → **Redeploy**.
2. Database schema is **never** rolled back automatically. If the new migration is destructive, run `alembic downgrade -1` manually via `railway run` before redeploying the old image.
