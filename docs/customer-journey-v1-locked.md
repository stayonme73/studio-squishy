# Customer Journey V1 — Locked

**Status:** Locked — customer-facing names and step order are frozen unless Tagia approves a business change.

**Code reference:** `src/config/customer-journey-v1.ts`

## Build order (locked)

**Status:** Locked build sequence — finish the customer experience before wiring intelligence. Philosophy docs are locked; UI with mock data is acceptable until step 4.

| # | Work item | Notes |
|---|-----------|-------|
| 1 | Finish Project Summary polish | Locked copy structure; mock data OK |
| 2 | Secure Checkout on Project Summary | **Done** — wide workspace with checkout always visible in row 2 via embedded `SecureCheckoutGrid`; `/payment` fallback kept |
| 3 | Verify complete customer journey | Discovery → Project Summary → payment → Vision Intake |
| 4 | Begin Discovery Mapping and Recommendation Engine wiring | **Deferred** until 1–3 complete |

**Paused (do not wire yet):** Discovery Mapping, Recommendation Engine scoring/mapping, and Discovery Summary engine integration. The Recommendation Engine should support a finished customer experience — not define it prematurely. See [discovery-mapping-v1-planned.md](discovery-mapping-v1-planned.md).

## Active journey (9 steps)

| # | Customer name | Former name | Route | Notes |
|---|---------------|-------------|-------|-------|
| 1 | Studio Lobby | Welcome Hall | `/` · `/studio-lobby` | `/welcome-hall` redirects to `/studio-lobby` |
| 2 | Studio Guide | Studio Guide | `/studio-guide-prototype` | `/studio-guide` redirects here |
| 3 | Secure Checkout | Payment | `/payment` | Three-column checkout UI archived; route unchanged |
| 4 | Project Discovery | Discovery Room | `/business-discovery-studio` | `/project-discovery` alias redirect |
| 5 | Studio Board | Studio Board | `/studio-board` | |
| 6 | Project Record | Campaign Record | `/studio-board?record=open` | `/campaign-details` redirects here |
| 7 | Review Room | Review Room | `/review-room` | `/feedback-studio` remains production review UI |
| 8 | Final Delivery | Final Delivery | `/deliverables` | |
| 9 | Help Center | Help Center | `/help-center` | |

## Post-discovery production path (not separate journey steps)

These routes sit between Project Discovery and Secure Checkout — not numbered journey rooms:

- **Project Summary** — `/project-summary` — post-discovery bridge; presents the locked [Recommendation Engine Philosophy](recommendation-engine-philosophy-v1-locked.md) flow as a **wide workspace** with two columns — **left:** **Our Recommendation** → **Discovery Summary** (collapsible reference) → **Customize Your Studio Plan**; **right:** **Studio Bundles** → **Secure Checkout** (embedded, disclaimer near Pay) — no separate Approve step — under [Recommendation, Not Direction](recommendation-not-direction-v1-locked.md) (*The Studio recommends. The client decides.*)
- **Studio Plan Review** — `/studio-plan-review`
- **Discovery Summary** (prototype/dev) — `/discovery-summary`

**Post-discovery micro-flow (not separate journey steps):**

1. Discovery — client answers
2. Studio reviews — split-panel animation (implemented)
3. **Discovery split preview** — recommended service names only + CTA to Project Summary — see [discovery-split-preview-v1-locked.md](discovery-split-preview-v1-locked.md)
4. **Project Summary** — per-service Why?, optional packages, customize with live pricing, Secure Checkout inline (same page)
5. Secure Checkout — payment (also at `/payment` for direct links)

Steps 3–5 are screen roles, not numbered journey rooms. The split preview must not duplicate Project Summary detail.

Architecture: Catalog → Recommendation Engine → Project Summary / Studio Plan Review → Secure Checkout → Project Record.

**Visual language:** Decision pages (Project Summary, Secure Checkout) use clean proposal styling — see [decision-page-visual-language-v1.md](decision-page-visual-language-v1.md). Creative pages (Discovery, Review Room) keep warm textured aesthetics.

## Removed from active flow (archived)

Do **not** delete — move to `src/archive/` and document here.

| Item | Former role | Archive location |
|------|-------------|------------------|
| Complete Your Order | Three-column payment page title + layout | `src/archive/payment/CompleteYourOrderCheckoutScene.tsx` — shared grid in `src/components/payment/SecureCheckoutGrid.tsx`; `/payment` + Project Summary reuse |
| Tell us what's on your mind | Standalone intake opening | `src/archive/draft-room/` — opening in Project Discovery |
| Draft Room begin page | Standalone intake wizard at `/draft-room?begin=1` | `src/archive/draft-room/DraftRoomIntakeScene.tsx` and related components |
| Draft Room intro plate | Illustrated room before intake | `src/archive/draft-room/DraftRoomScene.tsx` |
| Welcome Hall V3 showroom | Interactive lobby prototype | `src/archive/entrance/` |
| Welcome Hall interactive / IMAGE 1 scenes | Pre-V2 lobby prototypes | `src/archive/entrance/` |

## Legacy route redirects (public URLs preserved)

| Legacy route | Redirect |
|--------------|----------|
| `/welcome-hall` | `/studio-lobby` |
| `/project-discovery` | `/business-discovery-studio` |
| `/business_discovery_studio` | `/business-discovery-studio` |
| `/studio-guide` | `/studio-guide-prototype` |
| `/campaign-details` | `/studio-board?record=open` |
| `/draft-room/begin` | `/business-discovery-studio` |
| `/draft-room` | `/business-discovery-studio` |
| `/intake` | `/business-discovery-studio` |

## Dev-only tools

| Tool | Gating | Purpose |
|------|--------|---------|
| **Studio Review** (`OwnerQaPanel`) | `NODE_ENV === "development"` in `OwnerQaRoot` | Journey presets, shortcuts, reset campaign |

Studio Review is **not** shown in production builds.

## Archive policy

1. **Never delete** deprecated customer flows — move to `src/archive/`.
2. **Prefer re-exports** at original import paths when a route must stay live during transition.
3. **Do not redesign artwork** when archiving — move files as-is.
4. **Do not change** `DISCOVERY_BADGE_OFFSET`, recommendation engine, or catalog business rules as part of journey lock work.
5. Update this doc when adding to the archive.

## Planned evolution (Discovery split slide-out — not shipped)

**Doc:** `docs/studio-plan-slide-out-checkout-v1-planned.md`

A future journey simplification keeps the customer on **one workspace** after Project Discovery submit: Studio Plan context stays visible on the left while the right panel phases through Reviewing → Recommendations → **slide-out Secure Checkout** (card, billing, agreement, Pay Now). After payment, the panel closes and the customer continues to Studio Board.

**Future simplified path (when Discovery split checkout ships):**

Studio Lobby → Studio Guide → Project Discovery → Studio Plan → Slide-out Secure Checkout → Studio Board

**Shipped (Project Summary):**

- Wide horizontal workspace on `/project-summary` — recommend + bundles | customize + embedded Secure Checkout | heard reference.
- Live plan total in checkout updates as the client customizes services (`buildPaymentPlanSummaryFromPlan`).
- Plan persists on Pay via `saveApprovedStudioPlan()` — no Approve button or `?phase=checkout` phase swap.
- **Secure Checkout** at `/payment` remains active for bookmarks and direct links (full three-column grid).
- Discovery split-panel checkout UI is still **not implemented**.

## What this lock does *not* change

- Internal TypeScript names (`CampaignRecord`, `business-discovery-studio`, etc.)
- Service Catalog, Recommendation Engine, Discovery Summary business logic
- Discovery room badge offsets
