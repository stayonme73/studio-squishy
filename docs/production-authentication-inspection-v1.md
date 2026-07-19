# Package 2: Production Authentication Inspection v1

**Status:** Inspection complete · Owner path approved · **Email provider APPROVED** · Account Creation **PASS** · Email Verification **PASS** · Sign-in / Session Hardening **PASS** · Next when authorized: **Password Recovery**  
**Date:** 2026-07-19  
**Prerequisite:** Package 1 Intake Reliability v1 cold-certified PASS  
**Evidence ledger:** `docs/auth-implementation-evidence-ledger.md`  
**Non-implementation note:** Password Recovery, Project Claim, Route Protection, and Truthful Handoff remain **separate** packages — do not start until Tagia authorizes.

**Authority / context**

- Launch blocker #1 — `docs/final-cedric-usability-report-2026-07-19.md`
- Sequence — `docs/parking-lot-locked-until-launch-blockers.md` (Parking Lot remains locked; reopen trigger unchanged)
- Guidance map — `docs/studio-voice-guidance-map-v1.md`
- Email provider brief — `docs/email-provider-service-dependency-brief-v1.md` (**APPROVED**)
- Evidence ledger — `docs/auth-implementation-evidence-ledger.md`

---

## Owner decisions (recorded 2026-07-19)

### Path approval (in principle)

> **For V1, harden and extend the existing custom HMAC cookie and file-backed user system. Do not introduce Clerk, Auth0, NextAuth, Lucia, or another authentication framework.**

### 1. Staff seed policy — **APPROVED**

Production seeds are for **owner/admin staff accounts only**.

| Rule | Requirement |
|------|-------------|
| Customer seeds in production | **Forbidden** |
| Test/demo customer seeds | Development or test environments only |
| Shared passwords on production seeds | **Forbidden** |
| Seed credentials in the repository | **Forbidden** for production secrets |
| Existing seed users | Clearly classified as **staff**, **test**, or **migration-only** |
| Public customers | Must enter through the **real account-creation flow** |

### 2. `/campaign-details` protection — **APPROVED**

`/campaign-details` **joins the authentication/proxy gate** because it exposes customer, campaign, payment, intake, and project information.

**Do not protect only the visible page while leaving its data endpoints reachable.**

**Inspection findings (verify before Package 6 cert):**

| Surface | Today | Required |
|---------|-------|----------|
| Page `/campaign-details` | **Not** in `proxy.ts` matcher | Add to client auth gate + `SAFE_RETURN_PATHS` |
| Data via `useCurrentCampaign` | Local + `GET/PATCH /api/campaigns/current` | Auth + ownership |
| `GET/POST …/api/campaigns/{id}/project-activity` | Used by Project Record UI | Auth + ownership on every read/write |
| Direct URL | Page loads without proxy redirect | Must redirect unsigned users to sign-in with `from=` |
| Another customer’s campaign | Ownership via `clientUserId` / claim rules | Must 403; never show foreign project |

**Locked rule**

> Authentication proves who the customer is. Ownership authorization proves which project they may access.

### 3. Email verification — **APPROVED**

**Soft during account creation, hard before Board claim or project access.**

| Moment | Policy |
|--------|--------|
| Account creation / begin sign-in | Soft — customer may create an account without leaving to verify first |
| Permanent claim / exposure of purchased project | Hard — must **not** permanently claim or expose to an unverified email |
| Enter Studio Board | Hard — email must be verified |
| After verify | Return to intended Board destination (`from=` allowlist) — **no journey restart** |
| Resend | Available |
| Expired / already-used links | Clear recovery paths |
| Pending verification copy | Do **not** say the project was lost; do **not** recreate it |

### 4. Email provider — **APPROVED 2026-07-19**

| Role | Provider |
|------|----------|
| Primary | **Resend** |
| Fallback (documented only) | **Postmark** — do **not** integrate in V1 |

**V1 send scope only:** account email verification · resend-verification · password-reset.

**Boundaries:** internal transactional-email adapter; no direct Resend SDK calls from auth flows; no silent delivery failure; no token logging; no raw provider errors to customers; separate dev/prod sender config; verified sending domain required before production certification.

Authority: `docs/email-provider-service-dependency-brief-v1.md`.

---

## Recommended V1 authentication path

**Evolve the existing custom auth stack. Do not introduce Clerk, Auth0, NextAuth, or Lucia for V1.**

### Service Dependency Rule (applied)

| Existing capability | Evidence | Recommendation |
|---------------------|----------|----------------|
| Custom HMAC session cookie | `src/lib/auth/session.ts`, cookie `studio_session` | Keep; harden |
| File-backed users | `src/lib/auth/users.ts` → `data/studio-users.json` | Keep shape; harden storage |
| Role + campaign ownership | `roles.ts`, `campaign-store/access.ts`, `clientUserId` | Keep; this is the product model |
| Route gate via Next.js 16 `proxy.ts` | root `proxy.ts` | Keep; extend matcher carefully |
| Supabase (optional) | `.env.example` — **storage only** | Do **not** adopt Supabase Auth solely because storage exists |
| Email / IdP vendors | None in `package.json` | Add **only** transactional email delivery after owner approval — not a full IdP |

**V1 production path (owner-aligned)**

1. Keep signed httpOnly cookie sessions (`SESSION_SECRET` + HMAC-SHA256).
2. Keep email/password for clients; staff/owner via production staff seeds (not customer seeds).
3. Add **account creation** for public customers (`roles: ["client"]`).
4. One-way password hashing (Argon2id or bcrypt) — never plaintext, never reversible encryption.
5. Soft signup → hard verify before Board claim (owner decision §3).
6. Transactional email for verify + password reset only (provider TBD — decision brief).
7. Customer-visible sign-out → `POST /api/auth/logout`; session invalidation / rotation per security requirements.
8. Enforce session lifetime via `issuedAt` + max age (not cookie `maxAge` alone).
9. Anonymous pre-payment → local campaign → auth → verified claim remains the ownership bridge.
10. `/campaign-details` + its campaign APIs join auth **and** ownership checks.

---

## Security requirements (must be covered before Implementation approval)

These are **required** in the blueprint and must be proven in the certifiable packages below. No Authentication Implementation without them.

| Requirement | Expectation |
|-------------|-------------|
| Password hashing | Secure one-way hash (Argon2id preferred or bcrypt); **never** plaintext, “plain hashes,” or reversible encryption |
| Cookie flags | httpOnly; `Secure` in production; `SameSite=Lax` (or stricter if justified); path `/`; explicit max age |
| Cookie / session expiration | Cookie max age **and** server-side `issuedAt` TTL validation |
| Session rotation | Remint cookie on login, privilege/ownership change, password change; invalidate on logout |
| Rate limiting | Login, signup, verify-resend, password-reset request |
| Duplicate email | Unique constraint; clear customer message; no account enumeration leaks beyond policy |
| Email normalization | Canonicalize before store/lookup (trim + lowercase at minimum) |
| Verification tokens | Expiring; **one-time use**; clear expired / already-used recovery |
| Password-reset tokens | Expiring; **one-time use**; invalidate sessions on successful reset |
| Logout / session invalidation | Customer UI + server clear; password change clears prior sessions |
| Ownership checks | On **every** customer project read or write (pages + route handlers + APIs) |
| Safe return URLs | Existing `SAFE_RETURN_PATHS` allowlist only; invalid → Board |
| Audit logging | Auth events without passwords, tokens, or sensitive form contents |

---

## Current state summary (inspection)

### Provider and session

Custom HMAC cookie `studio_session` — not NextAuth/Clerk/Auth0. Plaintext password compare today. `issuedAt` written but not validated. Logout API exists; no customer UI.

### Seeded login

`src/lib/auth/studio-users.seed.json` → `data/studio-users.json`. Dev passwords `dev-only`. **No in-app sign-up.** Under owner decision §1, production may keep **staff-only** seeds with secrets **outside** the repo; customer seeds stay non-production.

### Ownership bridge

Local campaign + Intake → sign-in → `PATCH /api/campaigns/current` claim sets `clientUserId` / `clientCampaignIds`. Unsigned sync skips on 401/403.

### Route protection today

`proxy.ts` client routes: Board, feedback, review-room, deliverables. **`/campaign-details` missing** from matcher. Campaign APIs (except carefully handled `/current`) require auth in proxy; ownership must still be enforced in handlers.

---

## Authentication Implementation packages (certifiable boundaries)

**Do not build all of authentication in one giant pass.**

| # | Package | Status |
|---|---------|--------|
| 1 | **Account Creation Foundation** | **Cold-certified PASS (2026-07-19)** |
| 2 | **Email Verification** | **Cold-certified PASS (2026-07-19)** |
| 3 | **Sign-in and Session Hardening** | **Cold-certified PASS (2026-07-19)** |
| 4 | **Password Recovery** | Later |
| 5 | **Project Claim and Ownership** | Later |
| 6 | **Route and Data Protection** | Later |
| 7 | **Truthful Intake → Authentication → Board Handoff** | Later |
| 8 | **Production Authentication Certification** | Last |

Active road: **Password Recovery** (when Tagia authorizes) → Project Claim → …

Parking Lot remains locked (reopen trigger unchanged).

**Email Verification resend policy:** Issuing a new verification email **supersedes** all prior unused tokens for that account (single active challenge).

---

## Files and systems affected (unchanged inventory)

### Auth core

- `src/lib/auth/session.ts`, `users.ts`, `roles.ts`, `require-session.ts`
- `src/lib/auth/studio-users.seed.json` (dev/test classification; production secrets out of repo)
- `data/studio-users.json` (runtime)

### HTTP / UI

- `src/app/api/auth/login|logout|session/route.ts` (+ future signup / verify / reset)
- `src/app/sign-in/page.tsx`, `src/components/auth/SignInScene.tsx`
- `src/components/shared/ClientAccessStatePanel.tsx`

### Route protection / ownership / Board / Project Record

- `proxy.ts`, `src/config/access-control.ts`
- `src/app/api/campaigns/current/route.ts`, `…/project-activity`, other campaign handlers
- `src/lib/campaign-store/*`, `src/lib/use-current-campaign.ts`
- `src/components/campaign-details/*`
- `src/lib/studio-voice-board-handoff.ts`
- Conversation Room handoff + working draft (must not break)

---

## Security and data-migration risks

1. Plaintext passwords today — must be gone before public host  
2. Seed credentials in git — production secrets must leave the repo (owner §1)  
3. No token TTL / rate limits today  
4. First-claimer / unverified claim — mitigated by owner §3 hard verify before Board claim  
5. Paid Intake only in `localStorage` until verified claim — must not tell customer the project is lost  
6. `/campaign-details` ungated page — owner §2  
7. Filesystem user store — multi-instance later if hosting requires  

---

## Test and rollback plan

### Test plan (high level)

1. Cold **new** email (not seed) creates account → verify → claim → Board  
2. Soft signup without verify cannot permanently claim / see Board project  
3. Staff production seed path (no customer seeds)  
4. Foreign campaign access → 403  
5. `/campaign-details` direct URL + APIs gated  
6. `from=` allowlist / open-redirect fallback  
7. Handoff Voice truthful for signed-out vs signed-in  
8. Logout + password reset invalidate sessions  
9. Expired / reused verify and reset links recover clearly  
10. Pre-payment working draft persistence unchanged  
11. Audit logs contain no passwords/tokens/sensitive intake  

### Rollback

1. Feature-flag signup/verify; keep staff seed login for internal cert only  
2. Version session payload if algorithm changes  
3. Backup user store before hash migration  
4. If mailer outage: pause verify/reset sends with clear customer copy — **never** revert to plaintext passwords  

---

## Explicit non-goals / do not invent

- Do **not** write Email Verification / Password Recovery / Claim / Route Protection in the Account Creation Foundation pass  
- Do **not** adopt Clerk / Auth0 / NextAuth / Lucia / Supabase Auth  
- Do **not** integrate Postmark in V1 (fallback docs only)  
- Do **not** use Resend for marketing or unrelated notifications  
- Do **not** put customer seeds in production  
- Do **not** weaken pre-payment working-draft persistence  
- Do **not** reopen the Parking Lot  

---

## Appendix — Ownership bridge (target)

```text
Unsigned journey (local)
  working draft + current-campaign localStorage
    → payment + intake (local)
    → handoff passport
    → sign-up or sign-in (soft verify OK to create account)
    → email verified (hard)
    → claim purchased project (ownership)
    → /studio-board (+ /campaign-details when needed)
```

**Verdict:** Owner path approved. Email provider approved (Resend). **Account Creation PASS. Email Verification PASS. Sign-in / Session Hardening PASS (2026-07-19).** Next when authorized: Password Recovery. Project Claim and Parking Lot stay locked.
