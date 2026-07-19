# Auth Implementation Evidence Ledger

**Purpose:** Package-by-package evidence for Authentication Implementation. Chat is not the ledger.  
**Authority:** `docs/production-authentication-inspection-v1.md`  
**Parking Lot:** remains locked (`docs/parking-lot-locked-until-launch-blockers.md`)

---

## Package status

| # | Package | Status | Evidence date |
|---|---------|--------|---------------|
| 1 | Account Creation Foundation | **Cold-certified PASS** | 2026-07-19 |
| 2 | Email Verification | **Cold-certified PASS (live-delivery 2026-07-19)** | 2026-07-19 |
| 3 | Sign-in / Session Hardening | **Cold-certified PASS** | 2026-07-19 |
| 4 | Password Recovery | Not started | — |
| 5 | Project Claim / Ownership | Not started | — |
| 6 | Route / Data Protection | Not started | — |
| 7 | Truthful Intake → Auth → Board Handoff | Not started | — |
| 8 | Production Auth Certification | Not started | — |

---

## Package 1 — Account Creation Foundation (PASS)

Cold-cert (clean browser): new email signup → normalized identity → session → logout → sign-in → refresh → duplicate casing safe → wrong password safe → no customer seed dependency. Passwords scrypt-only; production staff seeds only; no Board claim certified.

---

## Package 2 — Email Verification (implementation complete; cold cert pending)

### Delivered

| Behavior | Evidence |
|----------|----------|
| Soft create keeps `emailVerifiedAt: null` | `createClientAccount` + signup API |
| Verification email via transactional adapter (Resend) | `sendSignupVerificationEmail` → `sendTransactionalEmail` |
| Store hashed token only (SHA-256); 256-bit raw entropy | `email-verification-tokens.ts` → `data/email-verification-tokens.json` |
| Expiry + single-use | TTL `AUTH_EMAIL_VERIFY_TOKEN_TTL_MINUTES` (default 60); `usedAt` |
| Resend supersedes prior active tokens | Documented policy; `supersededAt` on reissue |
| Successful verify sets `emailVerifiedAt` | `markEmailVerified` / `verifyEmailWithToken` |
| Clear recovery for missing / malformed / expired / used / superseded | `/verify-email` UI + API error codes |
| Pending copy after signup | `/verify-email/pending` |
| Resend rate-limited (account + request source); no enumeration | `resendVerificationEmail` + `auth-rate-limit.ts` |
| Links use allowlisted `NEXT_PUBLIC_SITE_URL` | `public-app-url.ts` (prod rejects missing / localhost) |
| Delivery failure keeps account; safe retry | Signup `verification.emailSent`; pending `delivery=failed` |
| No Board claim / route-protection work | Explicitly omitted |

### Unit tests

`src/lib/auth/email-verification.test.ts` + existing account-creation tests — **PASS** (2026-07-19).

### Explicit non-goals (this package)

- Customer Sign out control (Session Hardening)
- Board greeting placeholder cleanup
- Board hard gate / project claim
- Password recovery
- Parking Lot

### Cold certification checklist (next)

1. New account → pending screen with required copy  
2. Verification email received (Resend configured)  
3. Valid link verifies; `emailVerifiedAt` persists across refresh/sign-in  
4. Used / expired / malformed / missing / superseded links recover safely  
5. Resend works without revealing account existence  
6. Provider failure / not_configured leaves retry path  
7. Account Creation cold-cert path still intact  
8. No Board claim introduced  

### Cold certification evidence — 2026-07-19

**Status: functionally certified · live-delivery certification blocked by owner-side Resend configuration.**

Password Recovery and all later auth packages remain **blocked**. Parking Lot remains locked. Secrets must not be pasted into chat, committed, logged, or documented.

| Check | Result |
|-------|--------|
| Functional / recovery / security (no live mail) | **Certified** — see prior table |
| Pending copy truthfulness | **Fixed 2026-07-19** — branches on trusted Voice handoff passport (`awaiting-signin`) or local `current-campaign`; signup alone does not claim a project |
| Live Resend delivery happy path | **Blocked** — owner configures `RESEND_API_KEY`, `TRANSACTIONAL_EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL` locally, then restarts the dev server |

**Pending copy (authoritative):**

| Context | Lead |
|---------|------|
| Intake / project handoff or existing local campaign | “Check your email to verify your account. Your project is safe while verification is pending.” |
| Direct account creation (no trusted project state) | “Check your email to verify your account. Once verified, you can continue into The Studio.” |

Evidence: `src/lib/auth/verification-pending-context.ts` + `verification-pending-context.test.ts` (3/3 pass).

**Live-cert scope (owner config first — do not request secrets in chat):**

1. Brand-new non-seeded customer signup  
2. Exactly one real verification email  
3. Sender name/address correct (must match Resend-permitted sender / verified domain)  
4. Subject identifies The Studio  
5. Link uses configured `NEXT_PUBLIC_SITE_URL`  
6. Link verifies the correct account; `emailVerifiedAt` persists through refresh and sign-out/sign-in  
7. No duplicate send on refresh  
8. No Board claim or route-protection behavior introduced  

**Live-cert attempt — 2026-07-19 ~18:20Z (NOT PASS · provider auth)**

| Check | Result |
|-------|--------|
| `localhost:3000` responding | **PASS** (sign-up 200) |
| Resend env present (`RESEND_API_KEY`, `TRANSACTIONAL_EMAIL_FROM`, site URL) | **PASS** (presence only; domain `resend.dev`) |
| Brand-new customer `thestudio7273@gmail.com` | **Created** — `emailVerifiedAt: null`, soft session path intact |
| Real verification email delivered | **FAIL** — signup `verification.emailSent=false`, `deliveryCode=provider_error` |
| Direct Resend API probe (same local key) | **401 Unauthorized** — key rejected by Resend (format `re_…`, length 57; no key value recorded) |
| Delivery metadata | Recorded `success:false`, `code:provider_error`, `toDomain:gmail.com` — no raw token |
| Password Recovery / later packages | **Not started** |

**Live-cert resume — 2026-07-19 ~18:25Z (NOT PASS · Resend still 401)**

| Check | Result |
|-------|--------|
| Server restarted for this attempt | **PASS** — fresh `npm run dev`, sign-up 200 |
| Login as `thestudio7273@gmail.com` | **PASS** |
| App `POST /api/auth/verify-email/resend` | **FAIL delivery** — `deliveryFailed:true`, log `provider_error` |
| Direct Resend API with local key (key not printed) | **401 Unauthorized** — `re_…` length 57 still rejected |
| Account intact | **PASS** — user remains; `emailVerifiedAt` still null |
| Password Recovery | **Not started** |

**Owner action:** In the Resend dashboard, create a **new** API key, replace `RESEND_API_KEY` in `.env.local` (do not paste in chat), confirm `TRANSACTIONAL_EMAIL_FROM` is an allowed sender for that account, restart the server, then ask Scout to resend again to `thestudio7273@gmail.com`.

**Live-cert resume — 2026-07-19 ~18:42Z (SEND PASS · link confirm pending inbox)**

| Check | Result |
|-------|--------|
| Server | **PASS** (200) |
| Resend to `thestudio7273@gmail.com` | **PASS** — delivery log `success:true`, `providerMessageId=3cf59bd8-834b-4e1c-b2a5-7cb86140896b` |
| Configured sender | `The Studio <onboarding@resend.dev>` |
| Expected subject (app copy) | `Verify your Studio account` |
| Refresh pending does not re-send | **PASS** — delivery line count unchanged |
| Account still unverified until link opened | **PASS** — `emailVerifiedAt` still null |
| Fetch message body via Resend API | **Blocked by key policy** — `restricted_api_key`: “This API key is restricted to only send emails” |
| Password Recovery | **Not started** |

**Next (owner inbox):** Open Gmail for `thestudio7273@gmail.com`, confirm the message arrived (check spam), then either click the link or paste only the `http://localhost:3000/verify-email?token=…` URL so Scout can finish verify + persist checks.

Until the link is opened, live-delivery happy-path is **not fully closed**.

### Live-cert close — 2026-07-19 ~18:59Z · **PASS**

Owner clicked the verification link and reached **Email verified**.

| Check | Result |
|-------|--------|
| `emailVerifiedAt` set on `thestudio7273@gmail.com` | **PASS** — `2026-07-19T18:58:50.825Z` |
| Persists in user store after login | **PASS** |
| Sign-out clears session | **PASS** — session `401` / `user: null` |
| Sign-in returns same `emailVerifiedAt` | **PASS** — identical timestamp |
| Still `accountClass: customer`, `roles: [client]` | **PASS** |
| No Board claim / `emailVerified` proxy gate introduced | **PASS** (absent) |
| Password Recovery | **Not started** |

**Verdict: Email Verification package PASS.**  
Next package when Tagia authorizes: **Sign-in and Session Hardening**. Parking Lot remains locked.

---

## Package 3 — Sign-in and Session Hardening (PASS)

### Risk and dependency map (pre-edit)

| Pri | Risk | Action taken |
|-----|------|--------------|
| P0 | No `issuedAt` TTL | Validated against 7-day max in `parseSessionToken` |
| P0 | No login rate limit | Wired `auth-rate-limit` on email + request source |
| P0 | No customer Sign out UI | `CustomerSignOutButton` on Studio Board sidebar |
| P1 | `emailVerifiedAt` missing from session cookie | Added to `SessionPayload` / session API |
| P1 | Logout cookie option drift | Shared `clearSessionCookieOptions()` |
| P2 | Login 500 may leak internals | Sanitized client error |
| — | Board claim / route protection | **Out of scope — not touched** |

**Dependencies preserved:** custom HMAC cookie, file users, verified customer `thestudio7273@gmail.com`, Account Creation + Email Verification behavior.

**Out of scope / deferred:** multi-device session denylist (Password Recovery), Board hard gate (Claim), `/campaign-details` proxy (Route Protection).

### Delivered

| Item | Evidence |
|------|----------|
| Cookie TTL + `issuedAt` TTL | `session-lifetime.ts` + `parseSessionToken` |
| Login rate limit | `POST /api/auth/login` — 10/15m email, 30/15m source |
| Sign out UI + API | Board sidebar → `POST /api/auth/logout` |
| Verification truth on session | `emailVerifiedAt` on token + `GET /api/auth/session` |
| Uniform invalid credentials | Same `"Invalid credentials"` for wrong password / unknown email |
| Customer cannot become staff | `createClientAccount` roles/class unchanged; tests |
| Prod customer seeds | Still staff-only merge in production |

### Cold certification — 2026-07-19

| Check | Result |
|-------|--------|
| Correct sign-in (`thestudio7273@gmail.com`) | **PASS** — session includes `emailVerifiedAt` |
| Session read after login | **PASS** |
| Sign-out clears session | **PASS** — `401` / `user: null` |
| Wrong password / unknown email | **PASS** — both `401 Invalid credentials` |
| Damaged cookie | **PASS** — `401` |
| Cookie flags (dev) | **PASS** — HttpOnly, Secure=false, Path=/ |
| Login rate limit | **PASS** — `429` on 11th failed attempt (unique email) |
| Roles stay customer/client | **PASS** |
| No Board claim / emailVerified proxy gate | **PASS** (absent) |
| Unit tests | **PASS** — session + sign-in-hardening + account-creation |

**Verdict: Sign-in and Session Hardening PASS.**  
Password Recovery, Project Claim, and Parking Lot remain blocked until Tagia authorizes the next package.
