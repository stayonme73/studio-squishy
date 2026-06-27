# Studio Plan + Slide-out Secure Checkout — Implemented (V1 partial)

**Status:** IMPLEMENTED on Project Summary (`/project-summary`) — inline checkout after approve. Discovery split-panel slide-out checkout remains **NOT IMPLEMENTED**.

**Related:** `docs/customer-journey-v1-locked.md` (Planned evolution) · `docs/recommendation-engine-philosophy-v1-locked.md` (6-step flow) · `AGENTS.md` (checkout panel pattern note)

---

## What shipped

After the client clicks **Approve Studio Plan** on Project Summary:

1. `saveApprovedStudioPlan()` persists the approved plan to campaign storage.
2. The page transitions to checkout phase (`?phase=checkout`) **without navigating away** from `/project-summary`.
3. The existing three-column Secure Checkout layout renders inline via shared `SecureCheckoutGrid`.
4. Header copy updates to Secure Checkout (`Complete Your Studio Plan`).
5. Back returns to Project Summary (summary phase).
6. `/payment` route unchanged — renders the same shared checkout component for direct links and bookmarks.

**Shared component:** `src/components/payment/SecureCheckoutGrid.tsx` (used by `/payment` and Project Summary).

**Workflow:** Discovery → Studio Review → Project Summary → Approve → Secure Checkout (inline) → Payment → Vision Intake

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
│  Project Summary header → Secure Checkout header (same route, phase swap)    │
├──────────────────────────────────────────────────────────────────────────────┤
│  THREE-COLUMN CHECKOUT (SecureCheckoutGrid)                                  │
│  ┌─────────────────┬──────────────────────┬─────────────────────────────┐    │
│  │ Your Studio Plan│ Secure Payment       │ What Happens Next           │    │
│  │ (approved plan) │ contact + card form  │ Payment → Vision Intake → … │    │
│  └─────────────────┴──────────────────────┴─────────────────────────────┘    │
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
| Summary | `summary` | Implemented | Project Summary default phase |
| Checkout | `checkout` | **Implemented** | Project Summary (`?phase=checkout`); Discovery split **NOT IMPLEMENTED** |

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
