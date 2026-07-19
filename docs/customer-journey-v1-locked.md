# Customer Journey V1 — Locked

**Status:** Locked — customer-facing names are frozen unless Tagia approves a business change.  
**Host Journey certification (2026-07-17):** Conditionally ready → micro-corrections complete — **LOCKED for Studio Tablet package.** Live chain: Route Map → Build Your Project → Studio Plan → **Review and Confirm** → Project Intake → Studio Board (signed-in).  
**Code reference:** `src/config/customer-journey-v1.ts` · quarantine: `src/config/legacy-route-quarantine-v1.ts` · Host ops: `docs/host-journey-operating-runbook-v1.md`

## Build order (locked)

**Status:** Locked build sequence — finish the customer experience before wiring intelligence. Philosophy docs are locked; UI with mock data is acceptable until engine wiring is unpaused.

| # | Work item | Notes |
|---|-----------|-------|
| 1 | Finish live Host commerce path polish | Route Map → Builder → Checkout → Intake → Board |
| 2 | Secure Checkout honesty + Host runbook | **In progress / Host Journey corrections** — local confirm until processor ships |
| 3 | Verify complete Host journey | Production-like build + signed-in Board |
| 4 | Begin Discovery Mapping and Recommendation Engine wiring | **Deferred** until Host path certification |

**Paused (do not wire yet):** Discovery Mapping, Recommendation Engine scoring/mapping, and Discovery Summary engine integration. See [discovery-mapping-v1-planned.md](discovery-mapping-v1-planned.md).

## Active live commerce path (Host / iPad)

This is the path Hosts should operate. Quarantined Discovery / Project Summary routes must not be presented as live.

| # | Customer name | Route | Notes |
|---|---------------|-------|-------|
| 1 | Studio Lobby | `/` · `/studio-lobby` | Entrance; Lobby Guide voice is separate package |
| 2 | Route Map (Studio Guide front door) | `/route-map` | Sole live front door for new jobs |
| 3 | Build Your Project | `/project-builder?road=…` | Service selection workspace |
| 4 | Studio Plan | `/project-builder?…&view=studio-plan` | Review selected services |
| 5 | Review and Confirm | `/checkout` | Local confirm in this build (heading honest until live payment); `/payment` redirects here |
| 6 | Project Intake | `/route-map?step=intake` | Requires paid-state campaign |
| 7 | Studio Board | `/studio-board` | **Auth-gated** — Host must be signed in |
| 8 | Project Record | `/campaign-details` | Post-board record |
| 9 | Review Room | `/feedback-studio` · `/review-room` | |
| 10 | Final Delivery | `/deliverables` | |
| 11 | Help Center | `/help-center` | |

## Journey step table (config names)

Aligned with `customerJourneyV1.steps` — some historical “room” names now resolve to Route Map / Builder:

| # | Customer name | Former name | Route |
|---|---------------|-------------|-------|
| 1 | Studio Lobby | Welcome Hall | `/` · `/studio-lobby` |
| 2 | Studio Guide | Studio Guide | `/route-map` (aliases `/studio-guide-prototype`, `/studio-guide`) |
| 3 | Build Your Project | — | `/project-builder` |
| 4 | Review and Confirm | Secure Checkout | `/checkout` (alias `/payment`) |
| 5 | Project Discovery | Discovery Room | `/route-map` (intake via `?step=intake`) |
| 6 | Studio Board | Studio Board | `/studio-board` |
| 7 | Project Record | Campaign Record | `/campaign-details` |
| 8 | Review Room | Review Room | `/feedback-studio` |
| 9 | Final Delivery | Final Delivery | `/deliverables` |
| 10 | Help Center | Help Center | `/help-center` |

## Quarantined surfaces (not live client entry)

Direct navigation redirects to Route Map (`legacyRouteQuarantineV1`). Do **not** demo as the Host path:

| Route | Former role |
|-------|-------------|
| `/business-discovery-studio` · `/project-discovery` | Discovery Room |
| `/project-summary` · `/studio-plan-review` · `/discovery-summary` | Post-discovery plan / summary |
| `/project-details` | Standalone post-payment intake |
| `/payment` | Standalone payment URL → redirects to `/checkout` |
| `/studio-guide` | Legacy Guide → Route Map |

Architecture intent remains Catalog → Recommendation Engine → plan → checkout → intake → board. **Live UI today** is Route Map shelf + Project Builder + `/checkout` + Route Map intake.

**Checkout honesty (this build):** **Review and Confirm** records the Studio Plan locally and continues to Project Intake. Card payment processing is not connected. Automated stage emails are not sent. The “Secure Checkout” heading returns when live processing ships.

**Visual language:** Decision pages use clean proposal styling — see [decision-page-visual-language-v1.md](decision-page-visual-language-v1.md). Creative pages keep warm textured aesthetics where still live.

## Removed from active flow (archived)

Do **not** delete — move to `src/archive/` and document here.

| Item | Former role | Archive location |
|------|-------------|------------------|
| Complete Your Order | Three-column payment page title + layout | `src/archive/payment/CompleteYourOrderCheckoutScene.tsx` — shared grid in `src/components/payment/SecureCheckoutGrid.tsx` |
| Tell us what's on your mind | Standalone intake opening | `src/archive/draft-room/` |
| Draft Room begin page | Standalone intake wizard | `src/archive/draft-room/` |
| Draft Room intro plate | Illustrated room before intake | `src/archive/draft-room/` |
| Welcome Hall V3 showroom | Interactive lobby prototype | `src/archive/entrance/` |
| Welcome Hall interactive / IMAGE 1 scenes | Pre-V2 lobby prototypes | `src/archive/entrance/` |

## Legacy route redirects (public URLs preserved)

| Legacy route | Redirect / quarantine |
|--------------|------------------------|
| `/welcome-hall` | `/studio-lobby` |
| `/project-discovery` · `/business_discovery_studio` · `/business-discovery-studio` | Quarantine → `/route-map` |
| `/studio-guide` · `/studio-guide-prototype` | Route Map front door |
| `/draft-room` · `/draft-room/begin` · `/intake` | Quarantine → `/route-map` |
| `/project-summary` · `/studio-plan-review` · `/discovery-summary` · `/project-details` | Quarantine → `/route-map` |
| `/payment` | `/checkout` (or quarantine front door — see `next.config.ts`) |

## Dev-only tools

| Tool | Gating | Purpose |
|------|--------|---------|
| **Studio Review** (`OwnerQaPanel`) | `NODE_ENV === "development"` in `OwnerQaRoot` | Journey presets, shortcuts, reset campaign |

Studio Review is **not** shown in production builds (`npm run build` + `npm run start`). Prefer production-like serve for Host projection.

## Archive policy

1. **Never delete** deprecated customer flows — move to `src/archive/`.
2. **Prefer re-exports** at original import paths when a route must stay live during transition.
3. **Do not redesign artwork** when archiving — move files as-is.
4. **Do not change** `DISCOVERY_BADGE_OFFSET`, recommendation engine, or catalog business rules as part of journey lock work.
5. Update this doc when adding to the archive.

## Planned evolution (Discovery split slide-out — not shipped)

**Doc:** `docs/studio-plan-slide-out-checkout-v1-planned.md`

A future journey simplification may restore a Discovery → Studio Plan → slide-out Secure Checkout workspace. That path is **not** the live Host chain today.

**Shipped Host path:** Route Map → Project Builder (+ Studio Plan view) → `/checkout` → Route Map intake → Studio Board (signed in).

## What this lock does *not* change

- Internal TypeScript names (`CampaignRecord`, `business-discovery-studio`, etc.)
- Service Catalog, Recommendation Engine, Discovery Summary business logic
- Discovery room badge offsets
- Route Map / Lobby visual locks (see AGENTS.md)
