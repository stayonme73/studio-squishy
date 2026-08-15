# STUDIO-OPERATING-PROJECT-CLAIM-AND-CONTINUITY-1 REPORT

**Date:** 2026-08-14  
**Branch:** `operating/design-renderer-proof-1`  
**Merge:** not authorized  
**Package id:** `STUDIO-OPERATING-PROJECT-CLAIM-AND-CONTINUITY-1`

## Verdict

**PROJECT CLAIM & CROSS-DEVICE CONTINUITY READY**

Engineering + automated neighboring regression + Scout cross-device cold cert are complete. Seal-ready. **No merge.**

Optional later: Owner may still spot-check on a physical phone; that is not a blocker for this package seal.

## Final ownership architecture

| Identity | Source of truth |
|----------|-----------------|
| Auth user | Custom HMAC `studio_session` → `StudioUser.id` (filesystem users) |
| Customer | Client role + `emailVerifiedAt` for paid claim |
| Campaign / project | `data/campaigns/{id}.json` envelope |
| Ownership | `envelope.clientUserId` + `user.clientCampaignIds` / `currentCampaignId` |
| Payment | Unchanged `paymentTruth` / processed events |
| Post-pay activation | Unchanged activation/dispatch chain |
| Studio Board project | Server readable campaign after ownership |
| Handoff / claim | Hashed claim receipts + claim API |
| Browser | Convenience only after ownership |

**Authoritative durable relationship:** verified `StudioUser.id` ↔ `ServerCampaignEnvelope.clientUserId`.

Does **not** use Supabase Auth. Does **not** redesign customer rooms.

## Schema / data changes

| Artifact | Purpose |
|----------|---------|
| `data/project-claim-receipts.json` | Hashed one-time claim receipts (campaignId, checkoutSessionId, optional email) |
| Checkout binding `payerClientUserId` | Server-session payer at checkout create |
| Checkout binding `customerEmail` | Optional guest recovery mail |
| Transactional email kind `project-claim-recovery` | Claim link delivery |

## Signed-in path

1. Checkout create reads session; stores `payerClientUserId` on binding (never from body).  
2. Payment confirm → `applyPostPaymentOwnership` binds `clientUserId` + `linkClientCampaign`.  
3. No claim receipt minted when already bound.  
4. Board resolves via `/api/campaigns/current` ownership.

## Signed-out claim path

1. Guest pay confirms → mint claim receipt (raw token once).  
2. Best-effort claim email when email + public origin configured.  
3. Sandbox confirm returns `claimRawToken`; client may stash in localStorage (convenience).  
4. Customer signs up / signs in → verifies email → `POST /api/campaigns/claim` with token **or** `/claim-project?token&campaignId`.  
5. Same-browser soft path: verified email + local possession (`allowLocalPossession` / PATCH for paid requires verified).

## Cross-device cold cert (Scout — 2026-08-15)

**Runner:** `scripts/project-claim-cross-device-cold-cert.mts`  
**Evidence:** `docs/launch/studio-operating-project-claim-and-continuity-1/cold-cert/cross-device-cold-cert-evidence.json`  
**Run id:** `511360d2-f076-4178-b5fa-cecdc1150fd1`  
**Result:** **15/15 PASS** · 0 FAIL · 0 BLOCKED

| Step | Result |
|------|--------|
| Guest sandbox checkout + confirm | PASS |
| Claim receipt minted; project unowned | PASS |
| Device A (unsigned) cannot read paid project | PASS (401) |
| Fresh Device B signup + email verify | PASS |
| `/claim-project` UI → Project claimed | PASS |
| Server ownership bound to buyer | PASS |
| Payment truth unchanged | PASS |
| Studio Board opens same `campaignId` | PASS |
| Claim retry idempotent | PASS |
| Wrong customer cannot claim | PASS (403 wrong_owner) |
| No duplicate campaign | PASS |

**How Device B verified email without Tagia:** server-minted verification token (same pattern as `email-verification-cold-cert.mts`) — simulates opening the verify link; no inbox required.

**How “new device” was proven:** separate Playwright browser contexts (no shared cookies / storage).

## Duplicate-prevention proof

- Re-claim by same user → `alreadyOwned: true` (idempotent).  
- Retry does not create a second campaign/ownership record.  
- Receipt single-use; same user may re-present used token; other user fails.

## Security proof

Fail closed on:

- Unverified email (`email_unverified`)
- Wrong owner (`wrong_owner`) — cold-cert confirmed
- Unknown / tampered token (`receipt_invalid` / `unknown_token`)
- Missing proof on new device (`claim_proof_required`)
- Client-supplied payer id rejected (session-only binding)

## Browser-state dependency audit

| Dependency | Classification |
|------------|----------------|
| `localStorage` current campaign | Convenience / intake draft continuity |
| `localStorage` project-claim-receipt | Convenience only |
| `sessionStorage` conversation session | Phase/step only — not ownership |
| In-memory React state | Ephemeral UI |
| URL `campaignId` / claim query | Locator + claim proof carrier |
| Server envelope `clientUserId` | **Correctness** |
| Claim receipt store (hashed) | **Correctness** for guest recovery |

## Owner-independence result

**Owner routine = NONE** for normal resume/claim.

Tagia does not need to manually match payments to customers for the proven happy paths. True identity disputes may still escalate.

## Regression totals

| Scope | Result |
|-------|--------|
| Project claim unit tests | **5/5 PASS** |
| Neighboring sample (payment, post-pay, dispatch, campaign-store, email-verification) | **190/190 PASS** · 28 files |
| Cross-device cold cert | **15/15 PASS** |
| Design-renderer lanes | Not re-run (untouched) |

## Exact remaining limits

1. Physical phone spot-check is optional — Scout cold cert used Playwright contexts as device-equivalent.  
2. Live Stripe claim-email delivery still depends on transactional email config (verify/reset class).  
3. Multi-project picker UX not redesigned — account can hold multiple IDs; Board uses `currentCampaignId`.  
4. Package 6 Route/Data Protection not in this package.  
5. Contested dual-account migrations remain fail-closed / escalate — no auto-merge invented.

## Commit state

Implementation: `9ee8595` (+ report note `7dbbc00`).  
Cold-cert script + evidence + seal report update: this tip.  
Unrelated design-renderer churn left unstaged. **No merge.**

## Recommended next broad package

**Paid Activation Recovery / post-pay status spine** — next blocker from `STUDIO-OPERATING-WHOLE-SYSTEM-READINESS-1`.

---

**Capability question answered:**  
“I paid for this project. Can I securely get back to this exact project later, from another device, without Tagia fixing anything?”  

**Answer: YES.**
