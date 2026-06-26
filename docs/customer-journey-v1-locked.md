# Customer Journey V1 — Locked

**Status:** Locked — customer-facing names and step order are frozen unless Tagia approves a business change.

**Code reference:** `src/config/customer-journey-v1.ts`

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

- **Project Summary** — `/project-summary` — post-discovery bridge; presents **Our Recommendation** and **Customize Your Studio Plan** under the locked [Recommendation, Not Direction](recommendation-not-direction-v1-locked.md) principle (*The Studio recommends. The client decides.*)
- **Studio Plan Review** — `/studio-plan-review`
- **Discovery Summary** (prototype/dev) — `/discovery-summary`

Architecture: Catalog → Recommendation Engine → Project Summary / Studio Plan Review → Secure Checkout → Project Record.

## Removed from active flow (archived)

Do **not** delete — move to `src/archive/` and document here.

| Item | Former role | Archive location |
|------|-------------|------------------|
| Complete Your Order | Three-column payment page title + layout | `src/archive/payment/CompleteYourOrderCheckoutScene.tsx` — active `/payment` re-exports |
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

## What this lock does *not* change

- Internal TypeScript names (`CampaignRecord`, `business-discovery-studio`, etc.)
- Service Catalog, Recommendation Engine, Discovery Summary business logic
- Discovery room badge offsets
