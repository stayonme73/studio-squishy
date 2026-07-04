# Legacy Route Quarantine V1 — Link Matrix

Audit date: 2026-07-04  
Scope: Active client-facing navigation only. Legacy components preserved under `src/components/` and `src/archive/`; route pages redirect to Route Map or active destinations.

## Quarantine redirects (direct URL)

| Old destination | Correct destination | Mechanism |
|-----------------|---------------------|-----------|
| `/business-discovery-studio` | `/route-map` | App page redirect (prior pass) |
| `/project-discovery` | `/route-map` | App page redirect |
| `/business_discovery_studio` | `/route-map` | App page redirect |
| `/draft-room` | `/route-map` | next.config / prior pass |
| `/intake` | `/route-map` | prior pass |
| `/project-summary` | `/route-map` | App page + next.config |
| `/studio-plan-review` | `/route-map` | App page + next.config |
| `/discovery-summary` | `/route-map` | App page + next.config |
| `/payment` | `/route-map` | App page + next.config |
| `/project-details` | `/route-map?step=intake` | App page + next.config → intake step |
| `/studio-guide` | `/route-map` | App page + next.config |
| `/studio-guide-prototype` | `/route-map` | App page + next.config |
| `/review-room` | `/feedback-studio` | next.config |

## Active navigation replacements

| Source | Old target | New target |
|--------|------------|------------|
| Studio Board sidebar — New Campaign | `/draft-room`, `/studio-guide-prototype?package=` | `/route-map` |
| Studio Board — DRAFT_RECEIVED CTA | Studio Guide + `/payment` | `/route-map` |
| Studio Board — PAYMENT_RECEIVED materials CTA | `/project-details` | `/route-map?step=intake` (via `resolveIntakeEditHref`) |
| Project Snapshot — View plan | `/project-summary` | `/studio-board?record=open` |
| Project Snapshot — View payment details | `/payment` | `/route-map` |
| DISCOVERY_COMPLETE primary route | `/project-summary` | `/route-map` |
| Help Center back (`from=payment`) | `/payment` | `/route-map` |
| Studio Guide redirect (plan state) | `/project-summary` | `/route-map` |
| `paymentHref()` / `paymentIntakeHref()` | `/payment`, `/project-details` | `/route-map`, `/route-map?step=intake` |
| Owner QA checkout preset (dev) | `/payment` | `/route-map` |
| Campaign Record / Brief edit links | `/project-details` (legacy) | `/route-map?step=intake` |

## Preserved active flows (unchanged)

| Entry | Destination |
|-------|-------------|
| Route Map job shelf → job detail → Choose This Job | In-scene Route Map checkout |
| Route Map Test Payment | In-scene service-specific intake |
| Studio Board sidebar — Review Room | `/feedback-studio` |
| Studio Board sidebar — Final Delivery | `/deliverables` |
| Project Record drawer — edit materials | `resolveIntakeEditHref()` |
| Secure CheckoutGrid post-payment (Route Map) | `/route-map?step=intake` |

## Config source of truth

- `src/config/legacy-route-quarantine-v1.ts` — active front door + quarantine list
- `src/lib/intake-edit.ts` — intake edit / post-payment resolver
- `src/config/studio-board.ts` — board route constants
- `next.config.ts` — server redirects for bookmarked legacy URLs
