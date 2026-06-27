# Studio Plan + Wide Workspace Secure Checkout — Implemented (V1 partial)

**Status:** IMPLEMENTED on Project Summary (`/project-summary`) — wide horizontal workspace with checkout always visible in the second row. Discovery split-panel slide-out checkout remains **NOT IMPLEMENTED**.

**Related:** `docs/customer-journey-v1-locked.md` (Planned evolution) · `docs/recommendation-engine-philosophy-v1-locked.md` (6-step flow) · `AGENTS.md` (checkout panel pattern note)

---

## What shipped

Project Summary is a **single continuous workspace** — no approve-then-reveal phase swap:

1. **Top row (2 columns):** Our Recommendation (left) · Studio Bundles — Spark / Momentum / Growth (right)
2. **Second row (2 columns):** Customize Your Studio Plan with live pricing (left) · Secure Checkout — plan summary, payment form, disclaimer, Pay (right)
3. **Bottom row (full width):** Here's What We Heard — de-emphasized reference + Edit Discovery Answers

**Live pricing:** Customize selections feed `buildPaymentPlanSummaryFromPlan()` into embedded `SecureCheckoutGrid` via `planSummary` prop — checkout total updates as services change.

**Payment:** `saveApprovedStudioPlan()` runs on Pay (via `onBeforePayment`), not on a separate Approve step.

**Legacy URL:** `?phase=checkout` redirects to `/project-summary` (checkout is always visible).

**Shared component:** `src/components/payment/SecureCheckoutGrid.tsx` — `layout="embedded"` on Project Summary; `layout="full"` on `/payment`.

**Workflow:** Discovery → Project Summary (recommend · bundle · customize · pay) → Vision Intake

---

## Vision (original — discovery split panel)

**Flow on ONE workspace (no jarring page changes):**

1. Project Discovery → split layout after submit
2. Left: Studio Plan context (always visible) — services, included, additional, total
3. Right panel phases:
   - Phase A: Reviewing → Recommendations (current)
   - Phase B (FUTURE): Slide-out Secure Checkout — card, billing, agreement, Pay Now
   - After payment: panel closes → Studio Board

**Simplified customer journey (future locked):**

Studio Lobby → Studio Guide → Project Discovery → Studio Plan → Slide-out Secure Checkout → Studio Board

---

## ASCII layout diagram (Project Summary — shipped)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Project Summary header (unchanged — stays on summary copy)                │
├──────────────────────────────────┬───────────────────────────────────────────┤
│  Our Recommendation              │  Prefer a bundled option?                 │
│  services + brief Why? each      │  Spark $299 · Momentum $499/mo · Growth   │
├──────────────────────────────────┼───────────────────────────────────────────┤
│  Customize Your Studio Plan      │  Secure Checkout (embedded)               │
│  add/remove · live total         │  plan summary · form · disclaimer · Pay   │
├──────────────────────────────────┴───────────────────────────────────────────┤
│  Here's What We Heard — collapsed reference · Edit Discovery Answers         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## ASCII layout diagram (Discovery split — still planned)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     ONE WORKSPACE — post-discovery submit                    │
├─────────────────────────────────┬────────────────────────────────────────────┤
│  LEFT — Studio Plan context     │  RIGHT — phase panel (content swaps)       │
│  (always visible, stable column)│  (fixed width ~22rem, no layout reflow)    │
│                                 │                                            │
│  Your Studio Plan               │  ┌─ Phase A (current) ─────────────────┐   │
│  ─────────────────              │  │ Reviewing → Studio Recommendation  │   │
│  Services                       │  │ (Our Recommendation + optional     │   │
│    • [service]                  │  │  packages + Customize + Disclaimer)│   │
│    • [service]                  │  └────────────────────────────────────┘   │
│  Included / Additional          │  ┌─ Phase B (FUTURE — not built) ─────┐   │
│  Total: $____                   │  │ 🔒 Secure Checkout                   │   │
│                                 │  │ Review your Studio Plan and          │   │
│  (context never lost)           │  │ complete your purchase.              │   │
│                                 │  │ [card] [billing] [agreement] Pay Now│   │
│                                 │  └────────────────────────────────────┘   │
│                                 │                                            │
│                                 │  After payment → panel closes → Studio Board│
└─────────────────────────────────┴────────────────────────────────────────────┘
```

---

## Panel phases

| Phase | ID | Status | Location |
|-------|-----|--------|----------|
| Reviewing | `reviewing` | Implemented | Discovery split panel |
| Summary | `summary` | Implemented | Project Summary default (wide workspace) |
| Checkout | `checkout` | **Always visible** | Project Summary second row (embedded grid); Discovery split **NOT IMPLEMENTED** |

CSS custom property for discovery split wiring: `--bds-panel-phase: reviewing | summary | checkout`

Type reference: `PanelPhase` in `src/project-summary/types.ts`

---

## What stays unchanged

- `/payment` route and Secure Checkout page remain active (fallback / bookmarks)
- Recommendation Engine, Service Catalog, Discovery Summary business rules
- Recommendation, Not Direction copy structure
- No Stripe integration in this pass (sandbox + form UI only)

---

## Not shipped (future)

- Discovery split-panel slide-out checkout (left plan context + right checkout panel)
- Stripe live payment processing
- Post-payment auto-close panel → Studio Board (currently routes to Vision Intake per existing payment flow)
