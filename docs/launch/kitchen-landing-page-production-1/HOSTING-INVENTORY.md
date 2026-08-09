# Hosting inventory — rm-j005 publish path

**Question:** Can existing Studio infrastructure already publish standalone customer landing pages owner-independently, or do we genuinely need Netlify (or equivalent static host)?

**Scope:** Existing repo + current stack only. No new accounts created in this check.

**Date:** 2026-08-09  
**Package:** KITCHEN-LANDING-PAGE-PRODUCTION-1

---

## Candidate paths inspected

| Path | Present? | Can host public rm-j005 pages owner-independently? | Verdict |
|------|----------|-----------------------------------------------------|---------|
| **Studio Next.js app (Vercel-capable)** | App is Next.js; `.env.example` mentions Vercel for preview/sandbox flags; no `vercel.json`, no customer-page deploy API | Only by adding per-job Studio routes/releases — **forbidden** by package gates (customer page ≠ Studio product) | **REJECT** for rm-j005 delivery |
| **Supabase Storage** | Wired for File Room | Explicitly **private** bucket; docs/env: “Do not expose storage URLs or configure public buckets”; download via authenticated File Room paths | **REJECT** — private delivery vault, not public campaign host |
| **`public/` static assets** | Studio app static files | Requires Studio source/deploy per asset; not a customer campaign URL product | **REJECT** |
| **Resend** | Transactional email adapter | Auth verify/reset only — not hosting | **N/A** |
| **Make / CapCut / Canva / Shotstack / ElevenLabs** | Kitchen tools elsewhere | No public HTML page hosting | **N/A** |
| **Netlify Deploy API** | Adapter written in this package; credentials **not** yet in `.env.local` | Fits: standalone static HTML → public URL + deploy ID without Studio release | **CANDIDATE — needs Owner account** |
| **Other static hosts (Cloudflare Pages, GitHub Pages, S3/R2, Firebase, Vercel Blob)** | Not present in repo/env/adapters | Would also be a new account/integration | **Not existing infrastructure** |

---

## Hard boundaries from existing doctrine

1. **Customer landing page ≠ Studio platform route** — do not deliver rm-j005 by shipping a new Studio release per customer.
2. **Supabase File Room is private infrastructure** — wrong product shape for a public campaign CTA page.
3. Catalog promises “approved Studio page-delivery method” — that method is **not yet productized** in prior stack; Kitchen generation exists, public host does not.

---

## Decision

**Existing Studio infrastructure cannot cleanly publish standalone customer landing pages owner-independently.**

Therefore:

- **Netlify earns its seat** as the narrowest free-tier-capable static-host candidate already adapted in-package.
- Equivalent approved static-host APIs could substitute later; none exist wired today.
- Owner action remains: create Netlify free account + token/site ID in `.env.local` (see `OWNER-NETLIFY-SETUP.md`).

**Suggested tool-ledger row**

| Tool | Job | Status |
|------|-----|--------|
| Netlify (Deploy API) | Public static host for rm-j005 campaign HTML | **PENDING OWNER ACCOUNT** — not optional if we want live URL proof without violating Studio/File Room boundaries |

---

## What this check does *not* authorize

- Buying paid hosting without Owner say-so
- Opening Supabase public buckets
- Hardcoding customer pages into The Studio app
- Declaring Customer Ready
