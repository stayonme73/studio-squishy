# Help Center V1 — LOCKED

**Status:** Founder approved — **Help Center Version 1 feature complete** effective 2026-07-05  
**Approved by:** Tagia  
**Route:** `/help-center`  
**Config sources:** `src/config/policies.ts` · `src/config/help-center.ts` · `src/components/help-center/`

## Change policy

Help Center V1 is **stable**. Do not reopen for cosmetic rewrites, layout passes, or wording polish unless explicitly requested by Tagia.

Future edits are limited to:

- verified bugs (broken anchors, incorrect links, rendering defects)
- legal or compliance updates
- intentional policy changes approved by Tagia

**Do not:** redesign the page, adjust spacing or visual style, rewrite FAQ copy for tone, or add new sections without an approved policy change.

Treat the Help Center as frozen. From this point forward, every development decision should move us closer to accepting and fulfilling real customer orders.

## Scope (locked)

| Section | Source | Notes |
|---------|--------|-------|
| Quick Policy Guide | `help-center.ts` → `HelpCenterQuickPolicyGuide` | Situation → summary → policy anchor |
| About The Studio | `policies.ts` → `aboutTheStudio` | Service-catalog model; workflow line |
| Studio Philosophy | `policies.ts` → `faq.philosophy` | Control, approval, ownership, recommend/decide |
| FAQ | `policies.ts` → `faq.items` + `help-center.ts` → `faqGroups` | Grouped by topic |
| Studio Policies | `policies.ts` → `policies.items` | Full policy text |

Customer workflow copy is standardized throughout:

**Route Map → Secure Checkout → Project Details → Studio Board → Review Room → Final Delivery**

Use **Project Record** (not Campaign Page) in customer-facing copy.

## Locked policy decisions

### 1. Production trigger (LOCKED)

Production does **not** begin simply because materials were submitted or received.

Production begins **per service** only when **all four conditions** are true for that service:

1. Payment has been received.
2. Project Details for that service are complete.
3. Required materials for that service have been reviewed and accepted.
4. The service has been moved into production.

**Only then** does payment for that service become non-refundable.

Do not replace “reviewed and accepted” with “received” in production-trigger copy.

### 2. Refund policy (LOCKED)

Keep operational flexibility — do **not** change “may be approved” or “may be eligible” to “will receive.”

**Preferred wording (standard refund path):**

> If production has not started on that service and the requirements of this policy are met, a refund may be approved.

**14-day Waiting on Client path:** a full refund **may be eligible** if production has not started on that service.

### 3. Per-service terminology (LOCKED meaning · customer noun)

Policies consistently reflect that production, refunds, and pauses are tracked **per purchased service**, not per customer account.

Room 2 Section 4 (`STUDIO-OPERATING-ROOM-2-MIXED-STATUS-AND-TERMINOLOGY-TRUTH-1`, Tagia 2026-08-18) authorized the customer-facing noun **service** for this same per-item rule. Internal code may still say job.

Examples locked in customer copy:

- Production is tracked per service.
- Production begins per service when all four conditions are met.
- Refund eligibility is determined per service.
- Waiting on Client pauses only that service.
- Other services continue independently.

This matches the Studio architecture and `src/config/job-control.ts` (`JOB_CONTROL_POLICY`: 48h reminder, 72h Waiting on Client, 14-day refund eligibility).

## Contextual links (locked behavior)

Help Center anchors are consumed from Studio Board and Project Record via `helpCenterHref()` and `helpCenterAnchor()`. Do not break `#faq-*` or `#policy-*` anchor IDs without updating all consumers.

Studio Board package summary link label: **Quick Policy Guide** → `#quick-guide`.

## Out of scope for Help Center V1

- Spark / Momentum / Growth package comparison table (bundles remain on Project Summary per `docs/studio-bundles-v1-locked.md`)
- Automated email notification promises (progress is in-app on Studio Board)
- Package-era “non-refundable once submitted” language

## Next priority (do not skip ahead)

Help Center is no longer a development focus. Shift immediately to launch-critical systems:

1. **Service Catalog** — single source of truth (`src/catalog/`)
2. **Pricing Engine**
3. **Recommendation Engine** — scoring and wiring (after journey verification)
4. **Checkout wiring**
5. **Project Summary / Live Totals**
6. **End-to-end purchase testing**

See `AGENTS.md` build order and `docs/customer-journey-v1-locked.md`.
