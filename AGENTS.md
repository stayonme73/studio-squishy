<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:studio-architecture-rules -->
# The Studio — architecture

**Service Catalog** (`src/catalog/`, import via `@/catalog`) is the single source of truth for services, deliverables, pricing, dependencies, categories, service class (signature / core / essential), discovery triggers, and governance fields. `StudioServiceEntry` (schema v2) is the canonical shape; `ServiceCatalogEntry` remains an alias for Recommendation Engine compat. **Recommendation Engine** (`src/recommendation/`, import via `@/recommendation`) reads Discovery answers and the catalog, applies deterministic rules, and produces the approved recommendation object. **Discovery Summary Model** (`src/discovery-summary/`, import via `@/discovery-summary`) maps `RecommendationResult` into customer-facing view-model copy — titles, explanations, investment labels, timeline, next-step CTA, and warnings — without re-scoring or duplicating catalog rules. Downstream pages consume the Campaign Record — they do not rebuild business logic.

**No business logic in UI components.** Components render data they receive. They do not decide what services to recommend, what deliverables exist, or how pricing is calculated. Keep business rules in the Service Catalog and Recommendation Engine; keep customer-facing presentation copy in the Discovery Summary Model.

**Faithful implementation.** Faithfully implement the architecture already designed. If a business rule appears missing, ask before creating one — do not invent business rules independently.

**Business rule freeze.** Do **not** freeze software architecture — caching, performance, DB indexing, API shape, maintainability, testing, and scalability should continue to evolve as needed.

Do **freeze business rules** unless validated by real customer experience or an intentional business decision:

- Studio Services
- Customer terminology
- Production classes (Signature / Core / Essential)
- Discovery philosophy
- Recommendation philosophy
- Production allocation rules
- Customer choice rules
- Discovery room badge offsets (`DISCOVERY_BADGE_OFFSET` in `src/config/business-discovery-studio.ts`) — do not modify without Tagia approval

**Browser zoom standard:** If a customer has to change their browser zoom to use The Studio, it's a bug.
<!-- END:studio-architecture-rules -->

<!-- BEGIN:customer-journey-lock -->
# Customer journey — locked names

Customer-facing room names and routes are frozen in `src/config/customer-journey-v1.ts` and `docs/customer-journey-v1-locked.md`.

| Customer name | Route |
|---------------|-------|
| Studio Lobby | `/` · `/studio-lobby` |
| Studio Guide | `/studio-guide-prototype` |
| Secure Checkout | `/payment` |
| Project Discovery | `/business-discovery-studio` |
| Project Summary | `/project-summary` (post-discovery bridge) |
| Studio Board | `/studio-board` |
| Project Record | `/studio-board?record=open` |
| Review Room | `/review-room` |
| Final Delivery | `/deliverables` |
| Help Center | `/help-center` |

Legacy paths redirect via `next.config.ts` and thin redirect pages. Internal folder names (e.g. `business-discovery-studio`, `studio-plan-review`) may differ from customer names.
<!-- END:customer-journey-lock -->

<!-- BEGIN:customer-journey-v1 -->
# Customer Journey V1 — locked terminology

**Doc:** `docs/customer-journey-v1-locked.md` · **Config:** `src/config/customer-journey-v1.ts`

Use these **customer-facing** names in UI copy, navigation, and metadata. Internal module names (e.g. `business-discovery-studio`, `CampaignRecord`) may differ.

| Step | Customer name | Former name | Route |
|------|---------------|-------------|-------|
| 1 | Studio Lobby | Welcome Hall | `/` |
| 2 | Studio Guide | Studio Guide | `/studio-guide-prototype` |
| 3 | Secure Checkout | Payment | `/payment` |
| 4 | Project Discovery | Discovery Room | `/business-discovery-studio` |
| 5 | Studio Board | Studio Board | `/studio-board` |
| 6 | Project Record | Campaign Record | `/studio-board?record=open` |
| 7 | Review Room | Review Room | `/review-room` |
| 8 | Final Delivery | Final Delivery | `/deliverables` |
| 9 | Help Center | Help Center | `/help-center` |

Deprecated flows live under `src/archive/` — do not delete. **Studio Review** (`OwnerQaPanel`) is dev-only (`NODE_ENV === "development"`).
<!-- END:customer-journey-v1 -->
