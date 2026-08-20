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
- Recommendation philosophy — **Recommendation, Not Direction** (`docs/recommendation-not-direction-v1-locked.md`, `src/recommendation/RECOMMENDATION_PRINCIPLES.md`) — *The Studio recommends. The client decides.*
- Discovery split preview — in-discovery split panel is teaser-only (service list + CTA); full Why?, packages, customize, pricing, disclaimer, and approve on Project Summary (`docs/discovery-split-preview-v1-locked.md`)
- Recommendation Engine philosophy — **service-first, traceable Why?, bundles as optional shortcuts** (`docs/recommendation-engine-philosophy-v1-locked.md`) — locked post-discovery flow and Project Summary structure
- Studio Bundles — **fixed offerings** Spark / Momentum / Growth (`docs/studio-bundles-v1-locked.md`) — bundle contents not customizable; personalized solutions use Custom Studio Plan
- Production allocation rules
- Customer choice rules
- Discovery room badge offsets (`DISCOVERY_BADGE_OFFSET` in `src/config/business-discovery-studio.ts`) — do not modify without Tagia approval
- Route Map main screen — Room 2 hero + Choose Your Route panel + How It Works strip at `/route-map` (`docs/route-map-main-screen-v1-locked.md`) — **relocked 2026-07-09:** hero v2 artwork (`public/route-map/studio-route-map-hero-v2.png`), decorative highway markers disabled, Studio Route badge colors/labels, panel eyebrow labels removed, hero alt text and route-card aria-labels; do not modify without Tagia approval
- Route Map overlays — all decision surfaces at `/route-map` (`docs/route-map-overlays-v1-locked.md`) — **locked 2026-07-05:** opaque scrim/ivory panels; viewport-fit job shelves (4 lanes, no scroll @ 100% zoom); job detail at 74% with content-sized blocks; Secure Payment at 67% (auto-height sheet, no form scroll); shelf grid breakpoints frozen; do not modify without Tagia approval
- Help Center — policies, FAQ, and Quick Policy Guide at `/help-center` (`docs/help-center-v1-locked.md`) — **locked 2026-07-05:** content feature complete; production trigger (four conditions per job), refund eligibility (“may be approved” / “may be eligible”), per-job terminology frozen; do not modify without Tagia approval
- Studio Host Character Standard — canonical Studio Host / Guide identity (`docs/studio-host-character-standard-v1-locked.md`) — **LOCKED 2026-07-17 OWNER CERTIFIED · GOING FORWARD:** treat as the Character Design / Host Reference Standard (not “locking an image”); future artwork must depict the **same individual** — consistent facial features, proportions, hairstyle, expression; variations limited to pose, environment, and approved wardrobe; she is the Studio Guide (welcome + guide) — not product, mascot, or cartoon; art style / appearance / personality frozen; do not regenerate a “similar” person per scene; canonical appearance source is the final Lobby baseline (`docs/illustration/references/studio-lobby-baseline-image-1.png`); do not modify without Tagia approval
- Studio Lobby — Room 1 customer entrance at `/` · `/studio-lobby` (`docs/studio-lobby-v1-locked.md`) — **LOCKED · CLOSED 2026-07-17:** owner-certified; no further Lobby visual iteration; implement faithfully — preserve composition, hierarchy, lighting, customer flow, palette, premium feel; podium is primary interaction (entire kiosk surface); host is guide not primary click (identity: `docs/studio-host-character-standard-v1-locked.md`); blurred side panels are **presentation framing** (responsive layout), not hardcoded artwork; no pixel-perfect recreation — preserve experience across screens; production plate `public/welcome-hall/studio-lobby-scene.png` + baseline `docs/illustration/references/studio-lobby-baseline-image-1.png`; do not modify without Tagia approval. **Next: Route Map.**
- Studio Guidance Doctrine (`docs/studio-guidance-doctrine-v1-locked.md`) — **LOCKED 2026-07-18:** guide from user behavior, not assumptions; stay quiet when the customer progresses; brief voice help only after hesitation; Lobby V1 uses first-visit flag + ~8s podium hesitation; blocked audio fails silently; do not modify without Tagia approval.
- Studio Conversation Room + Framework — see **Conversation Room Machine Contract** block below (`docs/studio-conversation-room-foundation-v1-locked.md`, `docs/studio-conversation-framework-v1-locked.md`). Do not modify without Tagia approval.
- Studio Presence System — coordinated Communication Glow + Voice Activity Bar + tablet cues (`docs/studio-presence-system-v1-locked.md`, `src/config/studio-presence-system-v1.ts`). Light alone is not enough. Presence communicates real work whenever possible — decorative delays must never replace genuine system state. **Halo baton (one tablet):** gold when Studio speaks; teal when the customer answers. Do not modify without Tagia approval.
- Conversation Driver — only one active driver at a time (`docs/studio-conversation-driver-v1-locked.md`, `src/config/studio-conversation-driver-v1.ts`). Studio Voice default; customer may Take Control / Resume Voice. Do not modify without Tagia approval.
- Discovery conversation interface — Question → Answer → Got it → Next Question (`docs/discovery-question-1-v1.md`, `discoveryLiveQuestionsV1` in `src/config/discovery-question-1-v1.ts`). Customer Presentation: Speak / Type only — no mode, baton, or checkpoint chrome. Live list continues as conversation; do not invent dead “Ready to continue” stops between live questions. Discovery migration stays in_progress.
- Studio Review → Voice Tablet Migration — see **Studio Review Migration** block below (`docs/studio-review-to-voice-tablet-migration-v1-locked.md`, `src/config/studio-review-voice-tablet-migration-v1.ts`). Studio Review stays as working reference; remove one page at a time only after full tablet integration + cert gates. Update the ledger on every Voice-tablet package. Do not modify without Tagia approval.
- Build Your Project — pre-purchase workspace at `/project-builder` (`docs/project-builder-production-pattern-v1-locked.md`) — **locked 2026-07-11:** service card pattern, Learn More drawer sections, button behavior (Remove never primary), Project Summary placement, Best For header, Squishy message philosophy, one-screen workspace; reuse as template for remaining pre-purchase pages; do not modify without Tagia approval
- Studio Plan Pre-Checkout Flexibility (`docs/studio-plan-pre-checkout-flexibility-v1-locked.md`, `src/config/studio-plan-pre-checkout-flexibility-v1.ts`) — **LOCKED:** free refine before checkout; checkout confirms scope; after checkout, additions/removals are Project Changes — not silent edits. Studio Voice explains freedom on Studio Plan and the purchased-scope boundary before payment. Do not modify without Tagia approval.
- Launch readiness execution order (`docs/launch-readiness-execution-order-v1-locked.md`, `src/config/studio-launch-readiness-execution-order-v1.ts`) — **LOCKED 2026-08-15:** one active room at a time; do not skip ahead; technical PASS is not close. **Tagia closeout call 2026-08-17:** Room 1 is **COMPLETE EXCEPT DEFERRED EXTERNAL DOMAIN/EMAIL** — not a full CLOSED stamp. Authoritative executable tip `a49efd7`. Live Resend / branded sender / inbox proof remains **PARKED WITH EXTERNAL PREREQUISITE** (`d6974eb`) — not closed, do not fake, **does not block Room 2, Room 3, or Room 4**. **Tagia 2026-08-18:** Room 2 is **CLOSED**. **Tagia 2026-08-19:** Room 3 is **CLOSED** at `cd2a1e2`. Room 4A **CLOSED** at `9f9ac7c`. Room 4B **CLOSED** at `8c919e0` (classifications frozen). Room 4C Multi-Service Client Gauntlet — **OPEN**. Do not start Room 5. Do not reopen Room 1, Room 2, Room 3, or Room 4B unless new evidence. Do not modify the room order without Tagia approval.

**Browser zoom standard:** If a customer has to change their browser zoom to use The Studio, it's a bug.

**Customer-facing instructional text:** Instructions shown to clients must be complete sentences. Do not truncate with ellipses (`...`) or generate partial previews that force the client to infer missing information. If copy does not fit, shorten it intentionally in the source config or allow the container to grow — never clip instructional text.

**Visual design:** Before making visual decisions on new customer-facing pages, read [docs/the-studio-design-system-v1.md](docs/the-studio-design-system-v1.md) and [docs/decision-page-visual-language-v1.md](docs/decision-page-visual-language-v1.md). Every color has one job — match documented roles; note gaps as TBD rather than inventing palette values.

**Build order (locked — work priority):** Finish the customer-facing journey before wiring Discovery Mapping or Recommendation Engine scoring. Philosophy docs are locked; UI with mock data is fine. Do **not** implement scoring, mapping, or engine wiring until end-to-end journey verification (Discovery → Project Summary → payment → Project Details → Studio Board) is complete. **Project Summary wide workspace Secure Checkout** is implemented (embedded `SecureCheckoutGrid` in row 2); Discovery split-panel slide-out remains planned. **Help Center V1 is locked** (`docs/help-center-v1-locked.md`) — do not continue Help Center polish; next focus: Service Catalog, Pricing Engine, Recommendation Engine, checkout wiring, Project Summary live totals, end-to-end purchase testing. See `docs/customer-journey-v1-locked.md` (Build order) · `docs/studio-plan-slide-out-checkout-v1-planned.md` · `docs/discovery-mapping-v1-planned.md` (PAUSED).
<!-- END:studio-architecture-rules -->

<!-- BEGIN:launch-readiness-execution-order -->
# Launch readiness — standing execution order (LOCKED 2026-08-15)

**Authority:** `docs/launch-readiness-execution-order-v1-locked.md` · `src/config/studio-launch-readiness-execution-order-v1.ts`

Sequence control, **not** authorization to start multiple packages. One active room at a time. Do not skip ahead. Do not modify without Tagia approval.

| # | Room | Enter when |
|---|------|------------|
| 1 | Customer Life + Communication | **COMPLETE EXCEPT DEFERRED EMAIL.** Not a full CLOSED stamp. Yellow sticky at `d6974eb` does not block Room 2, Room 3, or Room 4. |
| 2 | Customer-facing truth + friction cleanup | **CLOSED.** Sections 1–5 closed. Last close tip `b3397a6`. |
| 3 | Owner Console | **CLOSED** at `cd2a1e2`. Section 1 `76b974f`. Section 2 `199e4a4`. Section 3 `cd2a1e2`. |
| 4 | Full business rehearsal | **Current.** Room 4A CLOSED at `9f9ac7c`. Room 4B **CLOSED** at `8c919e0` (classifications frozen). Room 4C Multi-Service Client Gauntlet — **OPEN**. Do not start Room 5. |
| 5 | Soft-opening preparation | Only after #4 passes |

Room 1 includes intake/materials, real upload storage/retrieval, Machine↔team handoff, Voice↔Machine↔customer communication, questions, Studio asks, acknowledgements, Resend/lifecycle email, Review/revision/re-review/approval/exact Final Delivery, return-later, watchdog, and chaotic failures.

A section closes only after **BUILD → BREAK → USE LIKE A CUSTOMER → FIX → RETEST**. Never **BUILD → TESTS GREEN → NEXT**. Do not silently carry launch blockers into the next room.

**Current board:** Room 1 is **COMPLETE EXCEPT DEFERRED EXTERNAL DOMAIN/EMAIL** — not a full CLOSED stamp. Authoritative executable torture-test tip `a49efd7`. Abandoned 3067 attempts do not count. **COME BACK LATER:** live Resend / branded sender / inbox proof is PARKED WITH EXTERNAL PREREQUISITE at `d6974eb` (`STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1`) — not closed, do not fake, **does not block Room 2, Room 3, or Room 4**. Room 2 is **CLOSED** (Section 5 close tip `b3397a6`; hash note `c46e191` is not the close). Room 3 is **CLOSED** at `cd2a1e2`. Room 4A is **CLOSED** at `9f9ac7c`. Room 4B is **CLOSED** at `8c919e0` — closeout `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/STUDIO-OPERATING-ROOM-4B-CLOSEOUT.md`. Frozen: short-form video / social graphics / print / marketing copy·email / campaign creative = **READY WITH EXPLICIT LIMITS**; carousel = **NOT ON LAUNCH MENU**. Room 4C Multi-Service Client Gauntlet — **OPEN** (`STUDIO-OPERATING-ROOM-4C-MULTI-SERVICE-CLIENT-GAUNTLET-1`). Scenario 1 not started at open. Do not start Room 5. Do not reopen completed Room 1, Room 2, Room 3, or Room 4B unless new evidence. No merge unless separately authorized.
<!-- END:launch-readiness-execution-order -->

<!-- BEGIN:conversation-room-machine-contract -->
# Conversation Room — machine contract (Package 2 + 3)

**Authority docs (read these; do not invent):**
- Hardware: `docs/studio-conversation-room-foundation-v1-locked.md`
- Presence: `docs/studio-presence-system-v1-locked.md` · `src/config/studio-presence-system-v1.ts`
- Framework: `docs/studio-conversation-framework-v1-locked.md`
- Config: `src/config/studio-conversation-room-v1.ts`, `src/config/studio-conversation-framework-v1.ts`
- Controllers: `src/lib/studio-conversation-framework/`
- UI: `src/components/studio-conversation-room/`
- Route: `/studio-conversation-room` (legacy `/studio-tablet` redirects here)

**Status:** Architecture + mobile customer layout implemented. Visual certification and commit require Tagia. **Do not start Package 4 (Voice Host / Conversation Engine) until Tagia explicitly certifies Package 3 and authorizes the next package.**

## Protected customer spine (states, not pages)

```
Lobby → Conversation Room → Payment → Intake → Studio Board
```

Inside the Conversation Room, journey phases are only:

`conversation` · `payment` · `intake` · `studio-board` · `completed` · `cancelled`

**Never journey phases:**
- Lobby — external room (`return-to-lobby` + session snapshot)
- Help — overlay (`helpOpen` / `open-help` / `close-help`)
- Review — temporary mode (`review` / `open-review` / `close-review` with `targetId` / `targetKind`)

## Hardware doctrine

**The hardware is timeless. The software communicates.**  
No permanent labels or baked UI on Workspace / Presentation Display / Communication Light orb. Meaningful content is runtime only (Presentation Manager + Presence System).

| Piece | Role |
|-------|------|
| Studio Tablet | One interactive portrait tablet — speak / type; Studio Voice leads |
| Voice Activity Bar | Who is speaking / audio health — runtime labels allowed |
| Communication Glow | Ambient Studio awake state — light + tablet reflection — no orb captions |

**Owner direction (2026-07-18):** Dual Workspace + Presentation tablets retired — too confusing. One tablet only.

**Presence principle:** The customer should never have to wonder whether the Studio is listening, speaking, thinking, or waiting. Communicate state continuously through multiple coordinated cues, not a single indicator. **Honesty:** Presence should communicate real work whenever possible — decorative delays must never replace genuine system state. **Baton:** On the one tablet — **gold** when Studio speaks, **teal** when the customer answers.

**Conversation Driver principle (internal):** Only one participant actively drives at a time. **Customer UI must not expose driver/baton language** — Speak or Type is enough; the conversation is the interface. **Permanent communication dock (locked):** Mic + type stay on the Conversation Room tablet on every screen — including after guide questions end — so the customer can always ask or speak. Do not remove. Typing is also the noisy-room escape hatch; answers auto-save. Attribution still records who captured the answer.

## Controllers (exist; no business brains yet)

| Controller | Job now |
|------------|---------|
| Conversation Controller | Stub channel — may emit `Hello.` |
| Presentation Manager | Sole customer surface gate |
| Navigation Controller | Spine forward/back + `return-to-lobby` |
| State Manager | Journey + flow + Help/Review modes |
| Voice Controller | Maps intent → Presence (Activity Bar + glow + light) |
| Help Center Panel | Closed overlay shell |

## Lobby round-trip

- Action: `return-to-lobby` / `navigateReturnToLobby`
- Preserves journey phase + flow step; does **not** cancel or complete
- Snapshot: `sessionStorage` key `studioConversationSession`
- Restore: `bootConversationRoomState` / `restoreSessionFromLobby`
- Destination: `/studio-lobby` — never an internal phase

## Customer layout (owner direction 2026-07-18)

- **Primary:** One Studio Tablet + Presence rail (Activity Bar + Communication Glow) beneath it
- Desktop and mobile share the same one-tablet layout (centered portrait tablet)
- No horizontal scroll / clipping / unreadably small hardware
- Halo marks the turn on that tablet (gold Studio / teal customer)

## Package roadmap (do not skip)

1. Lobby / foundation ✅  
2. Hardware ✅  
3. Conversation Framework ← **current; needs Tagia visual cert + commit**  
4. Conversation Engine / Voice Host — **not until Tagia says so**  
5. Payment Integration  
6. Intake Runtime  
7. Studio Board Handoff  

**Out of Package 3:** AI/LLM, forms, payment processing, intake rules, Board handoff, voice personality tuning.
<!-- END:conversation-room-machine-contract -->

<!-- BEGIN:pre-payment-working-draft-lock -->
# Pre-Payment Working Draft — HARD REQUIREMENT

**Authority:** `docs/studio-working-draft-persistence-v1-locked.md` · `src/config/studio-working-draft-v1.ts` · `src/lib/studio-working-draft/types.ts`

**Origin:** Customer completed work, pressed Back, and the system erased everything. That failure mode is forbidden in the new experience.

## Locked rule

> **Before payment, the customer can move backward, leave a panel, return to the Lobby, review details, and change the project without losing previously captured information.**

- Before payment: `status: working_draft` · `editable: true`  
- After confirmed payment: `status: purchased` · `editable_scope: false`  
- Post-payment changes must **not** silently mutate the original purchase — separate revision / scope-change / change-order records only.  
- **No automatic reset on Back.** Reset Project requires deliberate confirmation.  
- Material edits create attribution history events (customer / Voice / system) — never silent overwrite.  
- Do **not** rely on one component’s ephemeral React state. Durable working-project state + auto-save after meaningful changes + restore on Conversation Room return + stale-write protection.  
- Conversation Room `studioConversationSession` (phase + step only) does **not** satisfy this contract for answers/services.  

**Proof bar:** Not a happy-path click-through. Done when Back, Lobby round-trip, Help, Learn More, refresh, route change, Voice edit, and Reset confirmation are proven not to erase unrelated work. See locked doc Required tests.

**Experience intent:** *Nothing is final before payment, but nothing is accidentally lost either.*

Do not weaken this contract without Tagia approval.
<!-- END:pre-payment-working-draft-lock -->

<!-- BEGIN:studio-plan-pre-checkout-flexibility-lock -->
# Studio Plan — Pre-Checkout Flexibility

**Authority:** `docs/studio-plan-pre-checkout-flexibility-v1-locked.md` · `src/config/studio-plan-pre-checkout-flexibility-v1.ts`

> **Customers can freely build and refine their Studio Plan before checkout. Checkout confirms the selected scope. After checkout, additions or removals are managed through the Project Change process.**

- Before payment: add / remove / change route / update answers / review pricing — nothing finalized until checkout  
- Studio Voice explains this on Studio Plan review (`voiceBeforeCheckoutFreedom`)  
- On confirm → checkout, Voice explains the purchased-scope boundary (`voiceCheckoutTransition`)  
- After payment: Project Change process only — no silent scope edits  

Do not weaken this contract without Tagia approval.
<!-- END:studio-plan-pre-checkout-flexibility-lock -->

<!-- BEGIN:conversation-flow-rhythm-lock -->
# Conversation Flow Rhythm — when Voice acts

**Authority:** `docs/studio-conversation-flow-rhythm-v1-locked.md` · `src/config/studio-conversation-flow-rhythm-v1.ts`

Predictable Conversation Room order (do not reorder without Tagia):

1. **Welcome** — greet; Studio guides and does the work on their behalf  
2. **Discovery** — goal, deadline/situation, fit  
3. **Route Recommendation** — recommend best route; customer may choose another  
4. **Service Building** — recommend services; Learn More; add/remove/change  
5. **Project Review** — show everything; allow changes; confirm in/out of scope  
6. **Payment** — only after the customer confirms the project  
7. **Production Intake** — details needed to perform the work  
8. **Studio Board** — create project; preserve history, services, service details  

**Purposeful question rule (locked):**  
> Voice should never ask a question if the answer won't change what happens next.

If an answer does not influence route selection, service recommendations, pricing, feasibility, or production, it probably does not belong.

Package 4 Voice Host must follow this rhythm. Do not invent interrogation stages. Do not modify without Tagia approval.
<!-- END:conversation-flow-rhythm-lock -->

<!-- BEGIN:conversation-phase-gates-lock -->
# Conversation Phase Gates — which doors unlock

**Authority:** `docs/studio-conversation-phase-gates-v1-locked.md` · `src/config/studio-conversation-phase-gates-v1.ts` · `src/lib/studio-conversation-phase-gates/`

Rhythm is the hallway order. **Gates** decide whether Voice may advance.

**Important lock:** Voice may move **backward freely before payment**, but must **not skip a required gate** to feel faster. Speed = fewer pointless questions, not skipped understanding.

| Transition | Advance only when |
|------------|-------------------|
| Welcome → Discovery | Customer ready · input available · working draft created/restored |
| Discovery → Route | Goal · need character · deadline · Studio fit · no pending clarification |
| Route → Service Building | Route recommended · accepted/chosen · compatible with need |
| Service Building → Project Review | Services resolved · required Qs answered · inclusions/exclusions · pricing · deadline feasibility · no unconfirmed recommendation treated as selected |
| Project Review → Payment | Customer confirms services, declined, scope, price, deadline, exclusions, materials/responsibilities (**last fully editable checkpoint**) |
| Payment → Production Intake | Payment succeeded · purchased snapshot frozen · attribution/consent preserved |
| Production Intake → Studio Board | Production info complete · missing items marked · project record created · services on Board |

Missing info → Voice may **clarify**, **stop**, or **escalate** — never invent answers to unlock a gate. Block reasons + Presentation labels live in config.

Evaluator: `evaluateConversationPhaseGate(from, to, facts)`. Next package: **Discovery Decision Contract**. Do not modify without Tagia approval.
<!-- END:conversation-phase-gates-lock -->

<!-- BEGIN:studio-review-voice-tablet-migration-lock -->
# Studio Review → Voice Tablet Migration — passport stamps

**Authority:** `docs/studio-review-to-voice-tablet-migration-v1-locked.md` · `src/config/studio-review-voice-tablet-migration-v1.ts`

Studio Review (`OwnerQaPanel`, `?studioReview=1`) stays in place as the working reference while functions move into Voice’s tablet **one page at a time**.

**Locked rule:** As each Studio Review page is fully integrated into Voice’s tablet and certified, that specific page is removed from Studio Review. **Not before.** No bulk deletion.

**Fully integrated** means: tablet workflow · Presentation Display · unified working draft · Back/resume persistence · add/remove/change where applicable · action attribution · desktop cert · mobile cert · tests passing · owner approval.

**Sequence:** select one page → inspect → integrate into tablet → Presentation → working draft → test nav/edits/attribution → certify desktop + mobile → owner approval → remove **only that** Studio Review page → next.

**Ledger:** update `studioReviewVoiceTabletMigrationLedger` on every Voice-tablet package. Chat is not the ledger. Do not modify without Tagia approval.
<!-- END:studio-review-voice-tablet-migration-lock -->

<!-- BEGIN:recommendation-not-direction-lock -->
# Recommendation — locked principle

**Docs:** `docs/recommendation-not-direction-v1-locked.md` · `docs/recommendation-engine-philosophy-v1-locked.md` · **Engine:** `src/recommendation/RECOMMENDATION_PRINCIPLES.md`

**The Studio recommends. The client decides.**

The Recommendation Engine listens to Discovery answers and recommends **individual services** with traceable per-service Why? — not a package tier as primary output. Spark / Momentum / Growth are optional **fixed** Studio Bundles in Project Summary (not customizable). The engine guides; it never forces purchase. Clients may accept, remove, substitute, add, or build a custom plan from approved catalog services. Project Summary copy: **Our Recommendation** → **Prefer a bundled option?** → **Customize Your Studio Plan** → **Disclaimer** → **Approve** — see locked docs for verbatim structure.
<!-- END:recommendation-not-direction-lock -->

<!-- BEGIN:customer-journey-lock -->
# Customer journey — locked names

Customer-facing room names and routes are frozen in `src/config/customer-journey-v1.ts` and `docs/customer-journey-v1-locked.md`.

| Customer name | Route |
|---------------|-------|
| Studio Lobby | `/` · `/studio-lobby` |
| Studio Conversation Room | `/studio-conversation-room` (alias `/studio-tablet` → redirect) |
| Studio Guide / Route Map | `/route-map` (aliases `/studio-guide-prototype`, `/studio-guide`) |
| Build Your Project | `/project-builder` |
| Review and Confirm | `/checkout` (alias `/payment`) |
| Project Intake | `/route-map?step=intake` |
| Studio Board | `/studio-board` (auth-gated) |
| Project Record | `/campaign-details` |
| Review Room | `/feedback-studio` · `/review-room` |
| Final Delivery | `/deliverables` |
| Help Center | `/help-center` |

Legacy / quarantined paths redirect via `next.config.ts`, thin redirect pages, and `legacyRouteQuarantineV1` (e.g. `/project-summary`, `/project-details`, Discovery Room). Internal folder names may differ from customer names.

**Live Host commerce path:** Route Map → Build Your Project → Studio Plan (`view=studio-plan`) → Secure Checkout → Project Intake → Studio Board. See `docs/customer-journey-v1-locked.md` and `docs/host-journey-operating-runbook-v1.md`. Discovery split-panel slide-out checkout remains planned — see `docs/studio-plan-slide-out-checkout-v1-planned.md`.
<!-- END:customer-journey-lock -->

<!-- BEGIN:customer-journey-v1 -->
# Customer Journey V1 — locked terminology

**Doc:** `docs/customer-journey-v1-locked.md` · **Config:** `src/config/customer-journey-v1.ts`

Use these **customer-facing** names in UI copy, navigation, and metadata. Internal module names (e.g. `business-discovery-studio`, `CampaignRecord`) may differ.

| Step | Customer name | Former name | Route |
|------|---------------|-------------|-------|
| 1 | Studio Lobby | Welcome Hall | `/` |
| 2 | Studio Guide | Studio Guide | `/route-map` |
| 3 | Build Your Project | — | `/project-builder` |
| 4 | Review and Confirm | Secure Checkout | `/checkout` |
| 5 | Project Discovery | Discovery Room | `/route-map` (intake `?step=intake`) |
| 6 | Studio Board | Studio Board | `/studio-board` |
| 7 | Project Record | Campaign Record | `/campaign-details` |
| 8 | Review Room | Review Room | `/feedback-studio` |
| 9 | Final Delivery | Final Delivery | `/deliverables` |
| 10 | Help Center | Help Center | `/help-center` |

Deprecated flows live under `src/archive/` — do not delete. **Studio Review** (`OwnerQaPanel`) is dev-only (`NODE_ENV === "development"`).
<!-- END:customer-journey-v1 -->
