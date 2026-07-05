# Studio Service Catalog — Integration Handoff

**Last updated:** July 2026  
**Branch context:** `fix/discovery-responsive-layout` (local catalog phases committed)

## Schema

- **`StudioServiceEntry` schema v3** — `CATALOG_SCHEMA_VERSION = 3`
- V2-ready optional fields normalized at export via `normalizeStudioServiceEntry`:
  - `reviewType`, `deliveryPackage`, `pricingDisplayType`, `qaChecklist`, `aiPromptRef`
- Fields exist in schema; only listed consumers are wired (see below).

## Committed integration phases

| Phase | Commit | Scope |
|-------|--------|-------|
| 2 | `c629f45` | Schema v3, normalization, intake + activation absorption, `SERVICE_CATALOG` assembly |
| 3A | `4a7d10b` | Route Map display → `route-map-display.ts` accessors |
| 3B-A | `5c23560` | Checkout / Project Summary pricing via `getCheckoutPriceDisplay` |
| 3B-B | `8a5884e` | Checkout timing via `getCheckoutTimingLabel` |
| 3C | `642772d` | Studio Board + Project Record — frozen plan authority; materials responsibilities frozen-only |
| 4 | `22b9b26` | Review Room + Final Delivery — `approved-plan-line` helpers; revision rounds aligned |
| 5 | *(pending)* | Docs refresh, `lineSkuId` dedupe, test hardening |

## Single source of truth

| When | Authority |
|------|-----------|
| Pre-approval | `SERVICE_CATALOG` via `@/catalog` |
| Post-approval | `campaign.approvedStudioPlan.lineItems` frozen by `buildServiceScopeSnapshot()` at approval |

Nothing on Studio Board, Review Room, or Final Delivery should change because the live catalog was edited after approval.

## Wired today

- Route Map shelf display (price, turnaround, intake template)
- Checkout / Project Summary pricing and timing labels
- Service Guide and plan approval snapshot (`buildServiceScopeSnapshot`)
- Studio Board / Project Record name fallback (`resolveClientFacingServiceName`)
- Materials slot **creation** flags (`requiresClientMaterials` / `requiresClientAccess`)
- Materials responsibility **copy** from frozen `clientResponsibilities` only (Phase 3C)
- Production task generation (catalog metadata at plan sync)
- Review Room / Final Delivery frozen plan-line lookups (`approved-plan-line.ts`)

## Normalized but not wired

| Field | Deferred consumer |
|-------|-------------------|
| `reviewType` | Review Room proofing layout |
| `deliveryPackage` | Final Delivery package shape |
| `pricingDisplayType` | Beyond existing Route Map seed overrides |
| `qaChecklist` | File Room QA panel (partial overlap with task config) |
| `aiPromptRef` | Internal production AI assist |

## Intentionally local (not catalog)

- Route Map road geometry (`ROUTE_MAP_JOB_META` in `route-map-v1.ts`)
- Deliverable section grouping (`deliverable-scope.ts` maps)
- Final Delivery mock package (`config/deliverables.ts`)
- Concept review content (`campaign-concepts.ts`)
- Studio Guide bundle definitions (`config/studio-guide.ts`) — bundles not catalog-wired
- Materials category heuristics (regex + SKU prefix defaults in `requirements.ts`)

## Structural debt (deferred)

- Monolithic `services.ts` / `RAW_SERVICE_CATALOG` (~2,500 lines) — physical split not started
- `catalog/v2/*` draft namespace — isolated from live `SERVICE_CATALOG`
- Compatibility re-export shims (`route-map-intake-v1.ts`, `v2/activation-map-draft.ts`)
- `compat.ts` legacy ID aliases and derived pricing

## Compatibility layers — do not remove

- `LEGACY_SERVICE_ID_ALIASES` / `resolveLegacyServiceId`
- `ServiceCatalogEntry` type alias (Recommendation Engine)
- `ApprovedStudioPlanLineItem` deprecated field reads (`serviceId`, `name`, `priceCents`)
- `LEGACY_RETIRED_SERVICES` (spark / momentum / growth campaign history)
- `RETIRED_ROUTE_MAP_REDIRECTS` (rm-j* → v2 RTU deep links)

## Test suites (catalog regression)

```bash
vitest run src/catalog/catalog-slice1.test.ts
vitest run src/catalog/green-services-activation.test.ts
vitest run src/catalog/route-map-display.test.ts
vitest run src/catalog/normalize.test.ts
vitest run src/catalog/catalog-import-boundary.test.ts
vitest run src/lib/plan-pricing.test.ts
vitest run src/lib/approved-plan-line.test.ts
vitest run src/lib/materials/requirements.test.ts
```

## Related docs

- [service-catalog-phase2.md](./service-catalog-phase2.md) — Phase 2 architecture (updated)
- [recommendation-not-direction-v1-locked.md](./recommendation-not-direction-v1-locked.md)
- [studio-bundles-v1-locked.md](./studio-bundles-v1-locked.md)
