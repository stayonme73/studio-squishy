# PRODUCTION-ASSURANCE-RIGHTS-APPROVED-FOR-USE-1 SEAL REPORT

**Package:** Materials must be cleared for use before production/release where required  
**Branch:** `assurance/rights-approved-for-use-1`  
**Starting tip:** `d4280c360417d8e01fa0088662fe0f18dda80c73`  
**Final verdict:** RIGHTS / APPROVED-FOR-USE CONTROL IS COMPLETE FOR CURRENT ACTIVE MENU  
**Status:** SEALED  
**Scout:** PARKED  
**Merge:** none  
**Doctrine:** Operational safeguard — not legal certainty

---

## Seal locks preserved

### Material decision lock

| Outcome | Preserved |
|---------|-----------|
| `APPROVED_FOR_USE` | yes |
| `CLARIFICATION_REQUIRED` | yes |
| `OWNER_POLICY_REVIEW` | yes |
| `BLOCKED_FROM_USE` | yes |

`submitted` ≠ `approved_for_use`. Required uncleared material must not become usable production input.

### Category policy lock (active menu)

| Category | Treatment |
|----------|-----------|
| customer-written text/copy | CLEARANCE NOT REQUIRED — factual-confirmation / document-reference; customer-authored; Acceptance Review / team review |
| logos / trademarks / brand assets | CLEARANCE REQUIRED — `logo-brand` |
| customer photos | CLEARANCE REQUIRED — `photo-video` |
| customer video clips | CLEARANCE REQUIRED — `photo-video` |
| customer music/audio | NOT ACCEPTED / NOT USED — no normal music intake; short-video `musicAllowed: false`; music capability unresolved |
| customer fonts | NOT ACCEPTED / NOT USED AS ROUTINE FILE INPUT — brand font/style references text-only; no font-file license validation |
| customer documents/data | CLEARANCE NOT REQUIRED — document-reference / factual-confirmation; Acceptance Review / team review |
| Studio-generated copy/assets | CLEARANCE NOT REQUIRED — bases `studio_generated` / `studio_controlled_licensed` / `provider_licensed`; no customer ownership attestation |

Do not silently expand music/font boundaries.

### Durable material authorization lock

`CampaignMaterialItem.useDecision` + `useAuthorization` on the campaign materials ledger. Preserves material ID, decision ID, outcome, authorization/provenance basis, `evaluatedAt`, reasons, `contentFingerprint`. Survives browser/session loss.

### Content replacement lock

`buildMaterialContentFingerprint` binds approval to content. Replacement A→B → `content_replaced` → `CLARIFICATION_REQUIRED` → demote `needs_clarification` where applicable. Prior authorization must not carry forward.

### Production / review / delivery lock

Uncleared required material cannot enter production as authoritative input. Unresolved rights hold cannot be waived by QA PASS or customer creative approval; blocks system Final Delivery where applicable. Customer approval ≠ Studio release authorization.

### Pre-acceptance bridge

Narrow only: known hard rights signal may prevent CLEAR; known material ambiguity may prevent CLEAR when acceptance requires resolution. Not duplicate per-material clearance.

### Owner-independence

Routine clear material: Owner action = **NONE**. Genuine gray area may route `OWNER_POLICY_REVIEW`. Ordinary missing authorization → clarification, not Tagia.

---

## Git

| Item | Value |
|------|--------|
| Commit | _(filled after package commit)_ |
| Message | _(filled after package commit)_ |
| Branch | `assurance/rights-approved-for-use-1` |
| Local HEAD | _(filled after push)_ |
| Origin HEAD | _(filled after push)_ |
| Ahead/behind | _(filled after push)_ |
| Merge | none |

---

## Final tests at seal

_(filled after final run)_

---

## Remaining material assurance gaps

Do not auto-start another assurance feature. Next: **ASSURANCE-LAYER-REASSESSMENT-1** — inspect the sealed chain (before payment → approved materials → internal QA → customer approval → exact final delivery) for any remaining material hole.

Deferred (not required for this P1 close): external plagiarism/trademark tools, legal AI, vendor moderation, music/font rights expansion.

---

## READY / SEALED

Scout PARKED.
