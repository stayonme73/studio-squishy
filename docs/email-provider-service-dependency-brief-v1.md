# Email Provider — Service Dependency Brief v1

**Status:** **APPROVED 2026-07-19** — Resend primary / Postmark documented fallback only  
**Date:** 2026-07-19  
**Parent:** `docs/production-authentication-inspection-v1.md`  
**Purpose:** Choose transactional email for verification + password reset only — not an identity platform.  
**Wire-in:** Adapter scaffolded in Account Creation Foundation; **Email Verification package** sends first messages (awaiting cold certification).

---

## Service Dependency Rule (applied)

| Question | Answer |
|----------|--------|
| Do we already have email sending? | **No** — no mailer in `package.json` or `.env.example` |
| Is Supabase already a dependency? | Optional **storage only** — adopting Supabase Auth/email would expand an optional vendor into identity. **Rejected** for V1 auth email. |
| Is a full IdP justified? | **No** — owner approved custom HMAC + file users |
| What are we buying? | **Transactional delivery** (verify + reset) — smallest possible new dependency |

---

## V1 volume assumptions

| Use | Expected V1 volume |
|-----|-------------------|
| Email verification (signup + resend) | Low hundreds–low thousands / month early |
| Password reset | Sparse |
| Marketing / newsletters | **Out of scope** |

V1 does not need high-volume marketing infrastructure.

---

## Candidates compared

| Criteria | **Resend** (recommended) | **Postmark** (fallback) | Amazon SES | SendGrid |
|----------|--------------------------|-------------------------|------------|----------|
| Transactional reliability | Strong; SES-backed infrastructure with managed DX | Excellent; transactional-first reputation | Strong if you operate it | Mixed; heavier product |
| Verify + reset delivery | First-class API | First-class API | DIY templates + bounce ops | Capable but broader surface |
| Domain auth (SPF/DKIM/DMARC) | Dashboard-guided DNS | Dashboard-guided DNS | Manual / AWS console heavy | Dashboard |
| Dev / test mode | API keys + test addresses; free tier for low volume | Servers / test modes; paid entry | Sandbox → production request | Multiple products |
| Pricing @ V1 volume | Free tier ~3k/mo then modest Pro | Higher per-email; fine at low V1 | Cheapest raw send | Often overkill |
| API / SDK footprint | Small TypeScript SDK; fits Next.js | Clean HTTP/SDK; slightly more “enterprise” | AWS SDK weight + IAM | Large historical SDK |
| Delivery logs | Dashboard + webhooks | Excellent logs/analytics | CloudWatch / DIY | Dashboard |
| Retry behavior | API retries + webhook events | Strong transactional retry posture | You design retries | Configurable |
| Vendor lock-in | Thin send wrapper easy to swap | Thin send wrapper easy to swap | AWS account gravity | Higher product lock-in |
| Env vars | Few (`RESEND_API_KEY`, from-domain) | Few (`POSTMARK_SERVER_TOKEN`, from) | Many (region, creds, config sets) | Key + optional marketing junk |
| Outage fallback | Switch adapter → Postmark | Switch adapter → Resend or SES | Needs pre-built adapter | Heavier cutover |
| Data / privacy | Process content of verify/reset emails; DPA available | Same; transactional-focused | AWS DPA / region choice | Broader marketing heritage |

---

## Recommendation

### Primary: **Resend**

**Why it fits The Studio V1**

1. **Smallest new surface** for a Next.js/TypeScript app with no existing mailer.  
2. Clear API for verification and password-reset messages only.  
3. Free tier covers early V1 volume while domain DNS is configured.  
4. Easy to wrap behind an internal `sendTransactionalEmail()` so the auth packages never import vendor types deep into claim logic.  
5. Aligns with “email delivery only — not identity platform.”

### Fallback: **Postmark**

**Why**

1. Transactional-only reputation when inbox placement for reset/verify must be bulletproof.  
2. Same thin-adapter pattern — swap provider without changing Account Creation / Claim packages.  
3. Prefer Postmark over raw SES for V1 fallback so the Studio does not take on bounce/complaint/IP ops yet.

### Explicitly not recommended for V1 primary

| Option | Why not |
|--------|---------|
| Amazon SES as primary | Cheapest, but ops burden (sandbox exit, bounce handling, IAM) violates “smallest dependency” for V1 |
| SendGrid | Marketing-heavy footprint; larger lock-in than needed |
| Supabase email/auth | Expands optional storage vendor into identity — conflicts with owner IdP rejection |

---

## Required environment variables (proposed — not wired)

**Resend (primary)**

```text
RESEND_API_KEY=
TRANSACTIONAL_EMAIL_FROM=Studio <noreply@your-verified-domain>
# optional:
RESEND_WEBHOOK_SECRET=
```

**Postmark (fallback)**

```text
POSTMARK_SERVER_TOKEN=
TRANSACTIONAL_EMAIL_FROM=Studio <noreply@your-verified-domain>
# optional:
POSTMARK_WEBHOOK_SECRET=
```

Shared app vars (already relevant):

```text
NEXT_PUBLIC_SITE_URL=   # absolute links in verify/reset emails
SESSION_SECRET=         # unchanged — sessions stay custom
```

---

## Domain authentication checklist (before production sends)

1. Verify sending domain at the chosen provider  
2. Publish SPF + DKIM (and plan DMARC)  
3. Use a Studio-branded `noreply@` (or similar) on that domain  
4. Confirm links in emails use `NEXT_PUBLIC_SITE_URL`  
5. Test deliverability to major inboxes in staging  

---

## Outage fallback plan

1. Auth code talks only to an internal mail adapter interface.  
2. Primary = Resend; if provider outage or sustained bounce spike, flip env to Postmark adapter.  
3. Customer-facing copy during outage: verification/reset temporarily delayed — **never** claim the project is lost; **never** disable password hashing or skip verify-before-Board.  
4. Queue or retry pending verify/reset sends when delivery returns (implementation detail in Email Verification / Password Recovery packages).

---

## Data / privacy notes

- Emails contain: display name (optional), one-time links, Studio branding — **not** passwords, session secrets, or Intake field dumps.  
- Tokens in links must be opaque, expiring, one-time (see inspection security table).  
- Logs: message id, template kind, recipient user id/email hash or email as needed for support — **no** raw tokens in audit logs.  
- Retain provider DPAs before production.

---

## Owner decision requested

| Choice | Status |
|--------|--------|
| Primary provider | **APPROVED — Resend** (2026-07-19) |
| Fallback provider | **APPROVED — Postmark** (documented only; not integrated in V1) |
| Scope | Verification + resend-verification + password-reset only |
| Wire into code | Adapter allowed in Account Creation Foundation scaffolding; **Email Verification package** sends first messages |

### V1 scope lock

- Do **not** use the provider for marketing, newsletters, promotional campaigns, or unrelated Studio notifications.
- Implement Resend behind an internal transactional-email adapter.
- Auth logic must **not** call the Resend SDK throughout the app.
- Keep provider-specific config isolated so Postmark can replace Resend later.
- Do **not** integrate Postmark now.
- Do **not** silently fail when delivery fails; do **not** log tokens; do **not** expose raw provider errors to customers.
- Keep development and production sender configuration separate.
- Require a verified sending domain before production certification.

See also: `docs/production-authentication-inspection-v1.md` (owner decisions + package boundaries).
