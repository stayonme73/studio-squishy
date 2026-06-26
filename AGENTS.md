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
<!-- END:studio-architecture-rules -->
