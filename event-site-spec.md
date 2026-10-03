# Camp Meeting Event Website: Project Spec

Event dates: **23-26 December**. Language: **English only**. Audience: mostly mobile users in Ghana on mobile data.

## 1. Goal

A single-event website. Primary purpose: **registration**. Also: testimonials, Paystack donations, partner churches, photo gallery, programme/venue/FAQ, and **QR/ticket-code check-in** on the day. It is not a website for the whole organization.

## 2. Locked decisions

- Free event, open to donations. No attendance cap. One attendee type.
- Registration form stays open until the last day (26 Dec). The landing page stays live. After closing, clicking Register shows "registration has closed".
- No sign-in for attendees, but **the same person must not register twice**.
- Walk-ins can register and be checked in on the spot.
- Check-in is **once only** (not per day). Organizers see registered vs. checked-in counts.
- Each registrant gets a **personal QR code** and an **alphanumeric ticket code** (for people without smartphones). Volunteers scan the QR with a phone, which opens a page where they confirm attendance.
- Testimonials: public with name, anonymous with name stored privately, or anonymous with no name stored. Organizers choose which appear on the landing page. Anonymous entries (either anonymous mode) display a **random first name with an "Anonymous" tag** (e.g. "Grace (Anonymous)"). Returning attendees are prompted to share a testimony after registering. A "Share your testimony" button is on the landing page.
- Donations via Paystack. Anonymous donations allowed. **No running total on the public site.**
- Partner churches section (sponsors are still being sought, so keep it extensible).
- **SMS OTP verification is required at registration.** Confirmation (ticket code and ticket link) is sent by SMS via **mNotify** (account already exists). WhatsApp API and email confirmations are deferred: the WhatsApp Business API is paid per delivered message, and email is optional for later.
- **QR codes cost nothing** (generated in code, no third-party service), so the QR code stays alongside the alphanumeric ticket code.
- Form fields: keep to the basics. The final field list will be fixed before launch, so use normal columns and Alembic migrations (no JSON "extra fields" column).
- Camp provides accommodation and logistics. Special arrangements (e.g. hotel bookings) are handled by the team directly, so no form fields for them. Show contact details in the FAQ.
- Gallery photos are added by the developer (static assets, no upload UI).
- **Phone numbers accept international numbers.** The frontend defaults to Ghana (+233).
- **Admin, organizer and volunteer login are never linked from the public site.** Staff reach them at a hidden path (`/admin/login`; see section 5).
- The developer owns the Paystack account.
- Registration data is **kept indefinitely** (no automatic deletion). The privacy notice must say so, and organizers need an admin action to delete or anonymize a registrant on request.

## 3. Open decisions (do not assume; make them config or easy to change)

1. **Final registration fields.** Suggested basics: full name, phone, church, "attended before?" (and optional email). Confirm with the main organizer before registration opens; later additions should be optional so older records stay valid.
2. **OTP for international numbers.** Confirm with mNotify whether it delivers SMS to international numbers, and at what rate. If it does not, choose a fallback for non-Ghana numbers (e.g. email OTP, or registering them unverified and flagging them in admin). Keep the `SmsProvider` interface so the sender can be swapped.
3. **Later channels:** WhatsApp API (paid per message) and email confirmations. Not in the MVP.

## 4. Architecture

- **Frontend:** React + Vite + TypeScript + Tailwind, deployed to **Cloudflare Pages**. One app containing public pages, `/admin`, and `/check-in`.
- **Backend:** **FastAPI** (Python), SQLAlchemy 2.x, Alembic, Pydantic v2, **PostgreSQL**, deployed on **Railway**.
- **Domains:** custom domain with subdomains: `www.<domain>` (Cloudflare) and `api.<domain>` (Railway). Auth cookies use `Domain=.<domain>`, `Secure`, `HttpOnly`, `SameSite=Lax`, so they are same-site.
- **CORS:** allow only the frontend origin. Protect state-changing cookie-authenticated requests against CSRF (e.g. require a custom header plus SameSite).
- **Secrets** (Paystack, SMS, DB, signing keys) live only on Railway. Never in the frontend.
- **Timezone:** store UTC; the event timezone is Africa/Accra (UTC+0).
- **Link previews:** put static Open Graph meta tags (title, description, image) in `index.html` so WhatsApp previews work.

### Environment variables

`DATABASE_URL`, `SECRET_KEY`, `FRONTEND_ORIGIN`, `COOKIE_DOMAIN`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `SMS_PROVIDER` (`mnotify`), `SMS_API_KEY`, `SMS_SENDER_ID`, `OTP_ENABLED` (default `true`), `DEFAULT_PHONE_REGION` (`GH`), `EVENT_TIMEZONE`.

## 5. Roles

- **Organizer:** everything (dashboard, registrants, exports, settings, testimonial moderation, partners, donations, volunteer accounts).
- **Volunteer:** check-in page, registrant search, walk-in registration only.
- Attendees and donors need no account.

### Staff login access
- One login page at **`/admin/login`** serves organizers and volunteers, redirecting by role after sign-in (organizers to `/admin`, volunteers to `/check-in`).
- No link, button, or menu item to any staff page appears on the public site.
- Admin pages carry `<meta name="robots" content="noindex">`. Hiding the URL is not security: real protection is authentication, role checks on every endpoint, and login rate limiting.

## 6. Data model

**users**: id, username/email (unique), password_hash (argon2 or bcrypt), role (`organizer|volunteer`), is_active, created_at.

**settings** (single row): registration_open (bool), registration_closes_at (default 26 Dec, end of day), event_start, event_end, otp_enabled.

**registrations**
- id
- full_name
- phone_e164 (**UNIQUE**, normalized E.164; international numbers allowed, default region GH)
- church
- attended_before (bool)
- (other confirmed fields)
- ticket_code (**UNIQUE**, 8 chars, shown as `XXXX-XXXX`)
- ticket_token (**UNIQUE**, 16+ bytes url-safe, for the personal ticket page)
- source (`online|walk_in`)
- phone_verified_at (nullable)
- registered_at
- checked_in_at (nullable), checked_in_by (FK users, nullable)

**testimonials**
- id
- body
- privacy_mode (`public|anonymous_name_private|anonymous_no_name`)
- display_name (only when public)
- private_name (only when `anonymous_name_private`; **never returned by any public endpoint**)
- alias_name (random first name generated at submission for both anonymous modes, never the submitter's own name; displayed as "<alias> (Anonymous)")
- registration_id (nullable)
- consent (bool, required true)
- status (`pending|approved|rejected`)
- featured (bool)
- created_at

**donations**: id, reference (unique), amount_minor, currency (`GHS`), status (`pending|success|failed`), is_anonymous, donor_name (nullable), donor_email (nullable), created_at, paid_at.

**partners**: id, name, logo_url, website_url (nullable), location (nullable), sort_order, is_active.

**sms_log**: id, registration_id (nullable), to_phone, template, status, provider_response, created_at.

**otp_codes** (if OTP enabled): phone_e164, code_hash, expires_at, attempts, created_at.

## 7. Key rules and behaviors

### Registration
1. `GET /registration/status` returns open/closed (open only if `registration_open` and `now < registration_closes_at`).
2. Parse and normalize the phone to E.164 with the `phonenumbers` library, using `DEFAULT_PHONE_REGION=GH` so local numbers like `024...` resolve to `+233...`. International numbers with a `+` prefix are accepted. Enforce uniqueness at the **database level**. Frontend: a phone input with a country selector defaulting to Ghana (e.g. `react-phone-number-input`).
3. If the phone already exists: do not create a record. Respond "You're already registered" and resend the ticket link by SMS. Reveal no other personal data.
4. OTP is required (flag `OTP_ENABLED`, default on): send a code via mNotify, verify it (expiry, attempt limit, resend cooldown), then create the registration and set `phone_verified_at`. Rate-limit OTP sends per phone and per IP to control SMS spend.
5. Generate `ticket_code` from the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no I, L, O, 0, 1) using `secrets`. Retry on collision.
6. Send an SMS containing the ticket code and a short link to `/ticket/<ticket_token>`. Basic-phone users must be able to rely on the SMS text alone.
7. Success page shows the ticket (name, code, QR). Then prompt returning attendees (`attended_before = true`) to share a testimony.
8. Add rate limiting plus a honeypot field on the registration endpoint.

### Check-in
- The QR code encodes `https://www.<domain>/c/<ticket_code>`. That route **requires a logged-in volunteer or organizer**. Unauthenticated users see only a login prompt and no data.
- The page shows the name and a **Confirm check-in** button. Scanning alone never marks attendance.
- Confirming sets `checked_in_at` and `checked_in_by`. A second scan shows "already checked in at [time]". There is no per-day logic.
- Volunteers can also search by name, phone, or ticket code, and can type a ticket code manually.
- Volunteers scan with the phone's own camera app, so no in-app scanner is needed for the MVP.
- **Walk-ins:** a volunteer-only form creates a registration (`source = walk_in`) and checks the person in immediately. If the phone already exists, offer to check in the existing record instead. The walk-in form is not blocked by the public "registration closed" state.

### Testimonials
- Public submit endpoint stores the entry as `pending` and requires consent.
- Organizer moderation: **Approve / Reject**, then **Feature on landing page**. The landing page shows only `approved AND featured`.
- Public API output: `display_name` if public, otherwise `"<alias_name> (Anonymous)"`. `private_name` appears only in organizer views.

### Donations (Paystack)
- Backend initializes the transaction and returns the authorization URL (amount in the currency subunit; confirm exact details in Paystack docs).
- Paystack requires an email: for anonymous donors use a generic placeholder and store no name.
- Mark a donation `success` only after verifying the **webhook signature** (HMAC-SHA512 of the body using the secret key, from the `x-paystack-signature` header) and/or the verify-transaction API. Never trust the browser redirect.
- Totals are visible to organizers only.

## 8. API sketch

Public:
- `GET /registration/status`
- `POST /registrations`
- `POST /registrations/otp/send`, `POST /registrations/otp/verify` (if enabled)
- `GET /tickets/{ticket_token}`
- `GET /testimonials/featured`
- `POST /testimonials`
- `GET /partners`
- `POST /donations/initialize`
- `POST /webhooks/paystack`

Auth: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.

Volunteer or organizer:
- `GET /checkin/lookup?code=|q=`
- `POST /checkin/{registration_id}/confirm`
- `POST /checkin/walk-in`

Organizer:
- `GET /admin/stats` (registered, checked in, walk-ins, pending testimonials, donation count and total)
- `GET /admin/registrations?search=&status=` and `GET /admin/registrations/export.csv`
- `PATCH /admin/settings`
- `GET /admin/testimonials`, `PATCH /admin/testimonials/{id}` (status, featured)
- `CRUD /admin/partners`
- `GET /admin/donations`
- `CRUD /admin/users` (volunteer accounts)

## 9. Frontend

### Routes
`/` landing, `/register`, `/register/success`, `/ticket/:token`, `/testimony`, `/donate`, `/donate/thanks`, `/c/:code`, `/check-in`, `/admin/*`.

### Landing page sections (in order)
1. **Hero carousel**
2. About, countdown to 23 Dec, key info
3. Programme/schedule (and speakers if provided)
4. **Testimonials carousel** + "Share your testimony" button
5. **Gallery**
6. **Partner churches**
7. Donate section
8. Venue with map link, FAQ, contact details
9. Footer

### Carousels (Embla Carousel or similar)
- **Hero:** 3-5 full-bleed slides, event name, "23-26 December", persistent Register button. Slow autoplay, pause on hover/touch, respect `prefers-reduced-motion`. Load the first image eagerly; lazy-load the rest. Use a gradient overlay so text stays readable.
- **Testimonials:** swipeable cards (quote plus name or "Anonymous").
- **Partner churches:** logo strip, paged or slow scroll, driven by `GET /partners`.

### Gallery
- Grid or masonry showing 8-12 photos on the landing page, plus a "View all" view.
- Lightbox with swipe and keyboard support (e.g. yet-another-react-lightbox), optional captions.
- Photos are **static assets** in the frontend repo with a `gallery.json` manifest (`src`, `thumb`, `alt`, `caption`).
- Include a small script (e.g. using `sharp`) that converts originals to WebP in two sizes: ~400px thumbnails and ~1600px display images.
- Lazy-load all images and set explicit width/height to avoid layout shift.

### Admin and check-in UI
Large touch-friendly buttons, usable by non-technical organizers and volunteers on phones. Admin: dashboard cards, registrants table (search, filter, CSV export), registration open/close switch and close time, testimonial moderation (Approve / Reject / Feature), partners manager, donations list, volunteer accounts.

### Libraries
React Router, TanStack Query, React Hook Form + Zod, Embla Carousel, a lightbox library, `qrcode.react`, optionally shadcn/ui for admin components.

## 10. Design direction

Classic, sleek, distinctive. Use the **provided brand colors** as Tailwind theme tokens. Suggested typography: an elegant serif for headings (e.g. Cormorant Garamond or Playfair Display) with a clean sans-serif for body text. Mobile-first, generous spacing, subtle motion only. Keep pages light for mobile data.

## 11. Security and privacy

- HTTPS only; hash passwords; rate-limit registration, OTP, testimony, and donation-initialize endpoints.
- Collect minimal personal data and show a short privacy notice with consent on the registration form (Ghana Data Protection Act).
- Registration data is retained indefinitely by decision. State this plainly in the privacy notice, and provide an organizer-only delete/anonymize action for requests. (Indefinite retention may sit uneasily with the data-minimization and retention principles of Ghana's Data Protection Act, so keep collected fields minimal.)
- No personal data in logs. Organizer-only access to exports and private testimony names.
- Never expose `private_name` or registrant details through public endpoints.

## 12. Phases (today is 1 Oct; camp starts 23 Dec)

- **Phase 1 (target: within 1-2 weeks):** landing page (basic), registration with duplicate prevention, SMS confirmation, ticket page, registration-closed state, basic admin (registrants, export, open/close).
- **Phase 2 (target: mid-November):** hero/testimonial/partner carousels, gallery, testimonials with moderation, Paystack donations, programme, venue and FAQ.
- **Phase 3 (target: early December):** check-in (QR and ticket code), volunteer accounts, walk-ins, attendance stats, end-to-end dry run. **Feature freeze about 9 Dec.**
- Start now: Paystack verification, SMS sender-ID setup, domain purchase.

## 13. Tests the build must include

- Duplicate registration is rejected, including different phone formats of the same number (`024...` vs `+23324...`).
- Registration is refused after the close time and when `registration_open` is false.
- Second check-in attempt does not change `checked_in_at`.
- Unauthenticated access to `/c/{code}` and check-in endpoints reveals nothing.
- Paystack webhook with an invalid signature is rejected.
- Public testimonial endpoints never return `private_name` or non-featured entries, and anonymous entries show an alias with the "Anonymous" tag.
- Phone parsing: `024...`, `+23324...`, and `23324...` map to the same record; a valid international number is accepted; garbage is rejected.
- OTP: wrong code, expired code, and too many attempts are all rejected, and no registration is created without a verified OTP.
- Staff pages are not linked from any public page.

## 14. Working notes for the coding agent

Build in vertical slices (backend endpoint, frontend page, tests together). Keep a README with setup and env vars, a `.env.example`, a seed script for the first organizer account, and Alembic migrations from the start. Never commit secrets.
