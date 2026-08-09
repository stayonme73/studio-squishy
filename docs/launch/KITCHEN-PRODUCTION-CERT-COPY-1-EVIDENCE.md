# KITCHEN-PRODUCTION-CERT-COPY-1 — Evidence

**Status:** Internal certification evidence (not a customer record)  
**Label:** CERTIFICATION FIXTURE / INTERNAL TEST  
**Package:** `src/lib/studio-kitchen-production/cert-copy/`  
**Control tip base:** KITCHEN-PRODUCTION-CAPABILITY-1 (`9083bf4`)

---

## Hard distinction

CONTRACT READY (from Production Capability) ≠ CUSTOMER READY.

This package evaluates whether copy-led contracts can produce work worth charging for under a challenging brief.

---

## Certification fixture

**Business:** Harbor & Oak Home Services (synthetic)  
**Challenge:** Plainspoken local trade voice + hard prohibited claims (no “energy bills in half”, no “#1”, no same-day-everywhere) + required price/window/CTA facts.

Full brief: `certCopyCustomerBrief` in `src/lib/studio-kitchen-production/cert-copy/fixture.ts`.

---

## SKUs tested

| SKU | Name |
|-----|------|
| `em-001` | Email Campaign Build |
| `cc-001` | Marketing Copywriting Project |
| `v2-rtu-email-kit` | Make My Email Campaign Kit |
| `v2-rtu-sms-kit` | Make My Text Message Campaign Kit |

---

## Forced QA failure (em-001 first pass)

**First draft defects (preserved, not silently replaced):**

1. Three emails (scope limit is two)
2. Unsupported “cut energy bills in half”
3. Unsupported “same-day service everywhere”
4. Corporate/AI tone (“synergy”, “revolutionize”, etc.)
5. Email 2 missing booking URL/phone CTA
6. Missing required $189 + offer window dates

**QA path proven in tests:**

`qa_fail` (`production_correction`) → copy `needs_revision` → producer reclaim → corrected draft → `qa_pass`  

Owner escalation on QA fail events: **not required** (`owner_not_required` / `role_action`).

---

## Corrected / final deliverables

Artifacts live in `src/lib/studio-kitchen-production/cert-copy/drafts.ts`:

- `emailCampaignCorrectedDraft` — 2 emails, plainspoken, facts + CTAs
- `marketingCopyFinalDraft` — 3 short-form assets, ≤750 words
- `emailKitFinalDraft` — paste-ready kit (client sends)
- `smsKitFinalDraft` — 4 SMS + sequence note (client sends)

Deterministic content checks: `content-qa.ts` / `certCopyQaSummary()`.

---

## Software tests

`src/lib/studio-kitchen-production/cert-copy/cert-copy.test.ts`

Covers fixture labeling, contract resolution, content QA fail/pass, QA workflow routing, Comms projection of QA fail/pass without owner_decision for ordinary production_correction.

---

## Runtime QA gate (pre-seal correction)

Copy-family (`copy_channels`) QA pass now requires the shared evaluator in
`src/lib/studio-kitchen-production/copy-quality/`:

`brief + produced copy → evaluateCopyQuality → judgment attestations → qa_pass evidence`

Checklist attestation alone is rejected for `copy_channels` copy/qa phases.

Certification wrappers in `cert-copy/content-qa.ts` call the **same** evaluator — not a bypass.

Honest boundary: prohibited claims, CTA, facts, scope counts, and tone patterns are
deterministic. Brand voice and grammar still require structured judgment attestations
(not fake full NLP).
