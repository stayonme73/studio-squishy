# STUDIO-OPERATING-PROJECT-CLAIM-AND-CONTINUITY-1 REPORT

**Date:** 2026-08-14  
**Branch:** `operating/design-renderer-proof-1`  
**Merge:** not authorized  
**Package id:** `STUDIO-OPERATING-PROJECT-CLAIM-AND-CONTINUITY-1`

## Verdict

**PROJECT CLAIM & CROSS-DEVICE CONTINUITY READY** — with cold-cert limits below.

Implementation + unit/neighboring regression are complete. Owner desktop/phone cross-device cold cert remains the human gate before treating this as production-sealed.

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

## New-device proof (implemented)

- Without localStorage, recovery requires claim receipt (email link or preserved token).  
- Guessed campaign IDs without receipt → `claim_proof_required` / access denied.  
- Unit coverage: guest mint → verified claim → wrong user blocked.

## Duplicate-prevention proof

- Re-claim by same user → `alreadyOwned: true` (idempotent).  
- Retry does not create a second campaign/ownership record.  
- Receipt single-use; same user may re-present used token; other user fails.

## Security proof

Fail closed on:

- Unverified email (`email_unverified`)
- Wrong owner (`wrong_owner`)
- Unknown / tampered token (`receipt_invalid` / `unknown_token`)
- Missing proof on new device (`claim_proof_required`)
- Client-supplied payer id rejected (session-only binding)

Paid soft claim via PATCH also requires `emailVerifiedAt`.

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

Durable server truth wins after ownership.

## Owner-independence result

**Target Owner routine = NONE** for normal resume/claim.

Tagia should not need to manually match payments to customers for the happy paths above. True identity disputes (stolen email, contested ownership) may still escalate — that is the intended stop, not a routine chore.

## Regression totals

| Scope | Result |
|-------|--------|
| Project claim unit tests | **5/5 PASS** |
| Neighboring sample (payment, post-pay, dispatch, campaign-store, email-verification) | **190/190 PASS** · 28 files |
| Design-renderer lanes | Not re-run (untouched) |

## Exact remaining limits

1. **Cold cert pending** — Owner must prove second-browser / phone path with real verify + claim email (or sandbox token handoff).  
2. Claim email delivery blocked if transactional email / `NEXT_PUBLIC_SITE_URL` not configured (same class as verify/reset).  
3. Multi-project picker UX not redesigned — account can hold multiple IDs; Board still uses `currentCampaignId`.  
4. Package 6 Route/Data Protection not in this package.  
5. Existing ambiguous dual-account migrations (two verified accounts claiming one payment without receipt) remain fail-closed / escalate — no auto-merge invented.

## Commit state

Scoped implementation committed as `9ee8595` on `operating/design-renderer-proof-1` (claim lib, payment confirm/create wiring, claim API, claim page, Board resume, auth ledger). Unrelated design-renderer `current-identity` / render churn left unstaged. **No merge.**

## Recommended next broad package

**Paid Activation Recovery / post-pay status spine** — next blocker from `STUDIO-OPERATING-WHOLE-SYSTEM-READINESS-1` after claim/continuity.

---

**Capability question answered:**  
“I paid for this project. Can I securely get back to this exact project later, from another device, without Tagia fixing anything?”  

**Target answer: YES** — after owner cold cert of the claim-link / Board resume path.
