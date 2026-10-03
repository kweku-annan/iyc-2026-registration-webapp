# Agent Handoff: Camp Meeting Event Website

You are building a single-event website (registration, SMS OTP, tickets, testimonials, Paystack donations, gallery, QR/ticket-code check-in) for a camp meeting running **23-26 December**.

**Read `docs/SPEC.md` completely before doing anything.** It is the source of truth for requirements, data model, rules, and API. This file tells you *how to work* and gives you an ordered list of tasks.

---

## 1. How to work

1. **Plan before coding.** For each task, write a short plan (files to create or change, approach, risks) and wait for approval on tasks marked **CHECKPOINT**. For other tasks, state your plan briefly and proceed.
2. **One task at a time.** Finish a task, run its tests, summarize what changed, and stop. Do not start the next task unprompted.
3. **Do not invent decisions.** If the spec is silent or ambiguous, ask. Spec section 3 lists open decisions; never silently pick one.
4. **Never guess third-party APIs.** For mNotify and Paystack, use only documentation I provide or that you can fetch. If you cannot confirm an endpoint, field, or signature scheme, say so and stop.
5. **Keep it simple.** No extra frameworks, no speculative features, no abstractions beyond what the spec calls for. The one deliberate abstraction is the `SmsProvider` interface.
6. **Tests are part of the task.** Business rules in spec section 13 must have tests. Run the full test suite before reporting a task done.
7. **Small, reviewable changes.** Prefer several focused commits. Don't reformat or refactor unrelated files.
8. **Secrets.** Never commit secrets. Use `.env` (git-ignored) and keep `.env.example` up to date.
9. **Report format** at the end of every task: what you built, how to run it, tests run and their results, anything you were unsure about, and deviations from the spec (there should be none unless approved).

## 2. Stack and conventions

- **Monorepo:**
  ```
  /backend     FastAPI app
  /frontend    React + Vite + TypeScript + Tailwind
  /docs        SPEC.md, this file
  ```
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, PostgreSQL, `phonenumbers`, pytest, ruff. Dependencies in `requirements.txt` (pinned). App structure: `app/main.py`, `app/core/` (config, security), `app/models/`, `app/schemas/`, `app/routers/`, `app/services/` (sms, otp, tickets, phones, paystack), `tests/`.
- **Frontend:** Node LTS, npm, React + Vite + TypeScript + Tailwind, React Router, TanStack Query, React Hook Form + Zod, Embla Carousel, `qrcode.react`, `react-phone-number-input`. Brand colors and fonts go in Tailwind theme tokens, never hard-coded.
- **Config** via environment variables only (see spec section 4). Fail fast at startup if required variables are missing.
- **Dev mode:** `SMS_PROVIDER=console` prints SMS and OTPs to the log. `SMS_PROVIDER=mnotify` is used in staging and production.
- **Money:** store amounts as integers in the currency subunit.
- **Time:** store UTC; the event timezone is Africa/Accra.
- **Errors:** return consistent JSON errors (`{"detail": "...", "code": "..."}`) with correct status codes. No stack traces to clients.
- **Code style:** type hints everywhere, small functions, comments only where the reason isn't obvious.

## 3. Things the human will supply (ask when needed; do not invent)

- Event name, tagline, venue, programme, FAQ and contact details (use clearly marked placeholders until provided).
- Brand colors, logo, fonts.
- mNotify API documentation, API key, and sender ID.
- Paystack test and live keys (later phase).
- Final registration fields (until confirmed, implement: full name, phone, church, "attended before?").
- Domain name.

---

## 4. Phase 1: Registration live (target: 1-2 weeks)

Each task below is a prompt you can be given as-is. Do them in order.

### T0: Scaffold
> Create the monorepo layout from section 2. Backend: FastAPI app with `GET /health`, config loading from env with validation, ruff and pytest set up, a working test for `/health`. Frontend: Vite + React + TypeScript + Tailwind, React Router with placeholder routes from the spec, an API client module reading `VITE_API_URL`. Add `.gitignore`, `.env.example` files, and a root README with run instructions. Do not build features yet.

### T1: Database and models
> Set up SQLAlchemy and Alembic. Implement the models `users`, `settings` (single row), `registrations`, `otp_codes`, and `sms_log` exactly as in spec section 6, with the UNIQUE constraints on `phone_e164`, `ticket_code`, and `ticket_token`. Create the initial migration. Add a seed script that creates the settings row (close time: end of 26 Dec Africa/Accra) and the first organizer user from env variables. Add tests that the unique constraints hold.

### T2: Phone normalization
> Implement `services/phones.py` using `phonenumbers`: parse any input with default region `GH`, return E.164 or raise a validation error. Add tests proving `024xxxxxxx`, `+23324xxxxxxx`, and `23324xxxxxxx` normalize to the same value, that a valid international number is accepted, and that invalid input is rejected.

### T3: Ticket codes
> Implement `services/tickets.py`: generate an 8-character `ticket_code` from the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` using `secrets` (display as `XXXX-XXXX`, store without the hyphen, accept either form on input, case-insensitive), and a url-safe `ticket_token` with at least 16 bytes of entropy. Add collision-retry logic at insert time and tests.

### T4: SMS provider interface
> Define a `SmsProvider` interface with `send(to_e164, message) -> result`. Implement `ConsoleSmsProvider` (logs only) and a stub `MnotifySmsProvider`. **Stop and ask me for the mNotify documentation before implementing the real calls.** Every send writes an `sms_log` row. Add tests using the console provider.

### T5: OTP
> Implement `POST /registrations/otp/send` and `POST /registrations/otp/verify` per spec section 7. Store only a hash of the code. Enforce expiry, a maximum number of attempts, a resend cooldown, and rate limits per phone and per IP. Return no information about whether a phone is already registered from these endpoints. Add tests for every rule.

### T6: Registration endpoint (CHECKPOINT)
> Implement `GET /registration/status` and `POST /registrations`: check open/closed state on the server, require a verified OTP for the phone, normalize the phone, create the registration with ticket code and token, send the confirmation SMS (ticket code plus link `/ticket/<token>`), and handle the duplicate case exactly as in spec section 7 (no new record, resend the ticket link, reveal no other data). Include the honeypot field and rate limiting. Implement `GET /tickets/{ticket_token}`. Tests: every item in spec section 13 that concerns registration. **Stop for review.**

### T7: Auth and roles
> Implement staff login/logout/me with argon2 or bcrypt password hashing, httpOnly Secure cookies (`SameSite=Lax`, configurable domain), CSRF protection for state-changing requests, login rate limiting, and role dependencies (`organizer`, `volunteer`). Tests: unauthenticated and wrong-role access to protected routes is rejected.

### T8: Admin API (CHECKPOINT)
> Implement `GET /admin/stats`, `GET /admin/registrations` (search, filters, pagination), `GET /admin/registrations/export.csv`, and `PATCH /admin/settings` (open/close switch and close time), organizer-only. Add the delete/anonymize registrant action. Tests for permissions and CSV contents. **Stop for review.**

### T9: Frontend foundation
> Set up Tailwind theme tokens from the brand colors I will provide, the heading serif plus body sans fonts, a layout shell, and shared components (button, input, form field, toast). Mobile-first. Light page weight. Include static Open Graph meta tags in `index.html`.

### T10: Landing page (basic) and registration flow
> Build the basic landing page (hero with event name and dates, short about, Register button, placeholder sections to be filled in Phase 2). Build `/register` as a multi-step flow: phone (country selector defaulting to Ghana) then OTP, then details, then success. Show the "registration has closed" state when the status endpoint says closed. Build `/ticket/:token` showing name, ticket code, and a QR code that encodes `https://<site>/c/<ticket_code>`. Handle all error states (duplicate, wrong code, rate-limited, offline) with clear messages.

### T11: Admin UI (CHECKPOINT)
> Build `/admin/login` (not linked from anywhere public, with `noindex`), the dashboard (counts), the registrants table (search, filter, export CSV), and the registration open/close controls. Large touch targets; usable by non-technical organizers. **Stop for review.**

### T12: Deployment
> Write `docs/DEPLOY.md` covering: Railway (backend plus PostgreSQL, env variables, migration command on deploy, health check), Cloudflare Pages (build command, `VITE_API_URL`, SPA fallback), custom domain with `www.` and `api.` subdomains, `COOKIE_DOMAIN`, CORS origin, and a post-deploy smoke-test checklist. Add whatever config files the platforms need. Do not deploy anything yourself.

---

## 5. Phase 2: Content and engagement (target: mid-November)

Same working rules. I will give each as a prompt when ready; the outline:

- **T13: Landing sections:** programme/schedule, speakers (optional), venue with map link, FAQ, contact, countdown.
- **T14: Carousels:** hero carousel, testimonial carousel, partner-church carousel (Embla; autoplay with pause on touch; honor `prefers-reduced-motion`; lazy-load).
- **T15: Gallery:** static assets with `gallery.json` manifest, an image processing script (WebP in ~400px and ~1600px), grid plus lightbox, a "View all" view.
- **T16: Testimonials:** backend tables and endpoints per spec, privacy modes, alias names, consent, moderation UI (Approve / Reject / Feature), the "Share your testimony" button, and the prompt after registration for returning attendees. Tests that `private_name` never leaks.
- **T17: Partners:** public list endpoint, admin CRUD, carousel integration.
- **T18: Donations (Paystack):** initialize endpoint, redirect flow, webhook with signature verification, return-page verification, anonymous donations, admin donations list. **Use only Paystack documentation I provide or that you can fetch. Use test keys only.**

## 6. Phase 3: Check-in (target: early December; freeze about 9 Dec)

- **T19: Volunteer accounts:** organizer UI to create and disable volunteers.
- **T20: Check-in flow:** `/c/:code` (requires staff login; shows name and a Confirm button; second scan shows "already checked in at ..."), manual code entry, search by name or phone.
- **T21: Walk-ins:** volunteer-only form that registers and checks in at once, handling an existing phone gracefully.
- **T22: Attendance stats:** registered vs. checked in, walk-ins, hourly arrivals, on the dashboard.
- **T23: Dry run:** an end-to-end test script and checklist covering registration, OTP, SMS, check-in, and donation flows, plus a load sanity check on registration and check-in.

---

## 7. Definition of done (every task)

- Code runs locally from the README instructions.
- New behavior has tests, and the whole suite passes.
- `ruff` (backend) and type-check/lint (frontend) pass.
- No secrets, no debug leftovers, no unused code.
- `.env.example` and docs updated if configuration changed.
- Task report delivered in the format from section 1.9.

## 8. Reviewer checklist (for the human, after each checkpoint)

- Try to register twice with the same number in different formats.
- Try registering after closing the form (via the API directly, not only the UI).
- Confirm a public endpoint never returns another person's data.
- Confirm no staff link appears on the public pages.
- Read the SMS text on a basic phone for clarity.
- Check page weight and speed on a throttled mobile connection.
