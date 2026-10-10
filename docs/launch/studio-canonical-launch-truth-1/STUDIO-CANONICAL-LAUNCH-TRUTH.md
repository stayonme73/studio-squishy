# STUDIO CANONICAL LAUNCH TRUTH

**Record:** `STUDIO-CANONICAL-LAUNCH-TRUTH-1`  
**Owner ruling:** Tagia · 2026-10-10  
**Config:** `src/config/studio-canonical-launch-truth-v1.ts`  
**Status:** **CURRENT LAUNCH AUTHORITY**  
**Publish:** none · **Deploy:** none · **Merge:** none · **Push:** none

This is the one current authority for:

- the canonical customer-facing launch menu
- current launch prices
- publish state
- certification and freeze state
- which older records are superseded

Other records may point here. They must not independently contradict it. This record and its config import nothing, so there is no circular authority.

Price rule: the three prices below must equal the owner price lock in `docs/launch/studio-customer-journey-condense-1/THREE-PACKAGE-REVISION-TRUTH-V1-LOCKED.md` (2026-10-04). A test checks this (`src/lib/studio-canonical-launch-truth/canonical-launch-truth.test.ts`).

---

## Canonical launch menu

The Studio launches through the **three-package door only**. Customer-facing launch package count: **3**.

| Package | Launch price | Paid after 20% Studio Thank-You | Revision rounds | Launch publish state | Certification / freeze | Record |
|---|---|---|---|---|---|---|
| Clip Repurposing | **$399** | $319.20 | 3 | **UNPUBLISHED** | Proven end to end in Stripe test mode, with explicit limits. Owner frozen 2026-10-09. | `THREE-PACKAGE-CLIP-REPURPOSING-399-RECORD.md` |
| Short-Form Video Editing | **$249** | $199.20 | 3 | **UNPUBLISHED** | Proven end to end in Stripe test mode, with explicit limits. Owner frozen 2026-10-09. | `THREE-PACKAGE-SHORT-FORM-VIDEO-EDITING-249-RECORD.md` |
| Social & Promo Graphics | **$199** | $159.20 | 3 | **UNPUBLISHED** | Certified and frozen with explicit limits, 2026-10-10. | `../studio-social-promo-signed-in-delivery-proof-1/STUDIO-SOCIAL-PROMO-GRAPHICS-CERTIFICATION-FREEZE.md` |

**Nothing is deployed publicly.** The Studio runs on localhost only. No publication is authorized by this record.

---

## The old 11-service shelf

The old Launch Now shelf (the original nine, Short-Form Video Editing at $349, Clip Repurposing at $549) is **not** part of the customer-facing launch menu.

It stays as history and internal reference. It must not:

- drive the public launch menu
- drive customer checkout
- override current package prices
- leak old prices through Studio Voice
- create a second customer purchase path

Historical service and catalog rows were not deleted or rewritten.

## Clip publish state

For launch truth, Clip Repurposing is **UNPUBLISHED**. The 26 September $549 publish record is preserved as superseded history. It does not define the launch state. The launch offer for Clip is the three-package $399 offer.

## Short-Form launch truth

The three-package Short-Form offer is **$249**. The historical $349 Short-Form service and its 2026-09-25 freeze remain historical evidence. They are not rewritten. Their local evidence files are quarantined; see `../studio-operating-short-form-video-editing-build-1/STUDIO-OPERATING-SHORT-FORM-EVIDENCE-QUARANTINE-2026-10-10.md`.

---

## Menu enforcement (2026-10-10)

The records-only pass listed three code gaps. Canonical menu enforcement closed them:

1. Studio Voice service-fit, price, and scope answers (`src/lib/studio-customer-life/voice-shelf-truth.ts`) now answer only from the three packages in this record. The 11-service shelf is no longer read. A customer's own saved purchase is quoted from their project record, never as a current price.
2. New customer checkout (`POST /api/payments/checkout-session`) accepts only the three-package `condensed_offer`. Old-shelf `studio_plan` and `paid_cycle` purchases are refused with HTTP 410. Confirming or reconciling a session that already exists is unchanged. The legacy price math (`deriveCheckoutAmountCents`) is kept for history and internal harnesses.
3. The Conversation Room's old-shelf steps (route, services, plan, checkout) send the customer to the three-package door `/`. A Stripe return for an existing session is left alone so it can finish.

The three old-shelf configs (`studio-internal-sell-now-register-v1.ts`, `studio-public-shelf-honesty-v1.ts`, `studio-menu-readiness-and-demand-freeze-v1.ts`) keep their historical values and carry an explicit non-authority stamp pointing here.

Remaining, not a menu or purchase path: `/final-delivery-room` (owner Clip proof page) still says $549 in its page meta description.

Gates: `src/lib/studio-canonical-menu-enforcement/enforcement.ts`.

---

## Superseded historical records

Preserved unchanged except for a SUPERSEDED notice pointing here:

| Record | What it said | Status now |
|---|---|---|
| `studio-operating-short-form-video-editing-build-1/STUDIO-OPERATING-SHORT-FORM-VIDEO-EDITING-CERTIFICATION-FREEZE.md` | $349 Short-Form certified and frozen, 2026-09-25 | Historical. Evidence quarantined. |
| `studio-operating-short-form-video-editing-public-publish-1/…PUBLIC-PUBLISH.md` | $349 Short-Form published, public 10, 2026-09-25 | Superseded for launch |
| `studio-operating-clip-repurposing-build-1/STUDIO-OPERATING-CLIP-REPURPOSING-CERTIFICATION-FREEZE.md` | $549 Clip certified and frozen, 2026-09-25 | Historical |
| `studio-operating-clip-repurposing-price-correction-1/…PRICE-CORRECTION.md` | Clip $599 → $549, 2026-09-25 | Historical |
| `studio-operating-clip-repurposing-public-publish-1/…PUBLIC-PUBLISH.md` | $549 Clip published, public 11, 2026-09-26 | Superseded for launch |
| `studio-operating-public-shelf-honesty-1/…PUBLIC-SHELF-HONESTY.md` | Customer-visible choices = 11 | Superseded for launch |
| `studio-operating-menu-readiness-and-demand-freeze-1/…MENU-READINESS-AND-DEMAND-FREEZE.md` | Public launch menu frozen at 11 / 11, 2026-09-27 | Superseded for launch |
| `src/config/studio-internal-sell-now-register-v1.ts` | Public 11 / internal 11 | Legacy shelf state. Historical values kept. Stamped non-authority (2026-10-10 menu enforcement). |
| `src/config/studio-public-shelf-honesty-v1.ts` | Customer-visible 11 | Same |
| `src/config/studio-menu-readiness-and-demand-freeze-v1.ts` | Menu 11 | Same |
| `src/config/studio-short-form-video-editing-public-publish-v1.ts` | Public 10 | Legacy shelf state. Not launch authority. Values unchanged. |
| `src/config/studio-clip-repurposing-public-publish-v1.ts` | Public 11 | Same |
| `src/config/studio-clip-repurposing-price-correction-v1.ts` | Public 10 | Same |

Already consistent, left as is: the 2026-10-02 Clip wiring closeout (“Clip remains unpublished”) and the 2026-10-04 owner price lock.

---

## Carried forward unchanged

Open shared launch blocker: **laptop approval** (Review Room approval controls hidden on laptop). Not fixed.

Unchanged findings: lifecycle email contradiction, live Stripe, tax, legal / privacy, hosting / publish, recovery scheduling, emergency stop.
