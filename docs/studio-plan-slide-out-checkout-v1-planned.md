# Studio Plan + Slide-out Secure Checkout — Planned (V1)

**Status:** NOT IMPLEMENTED — layout prep only. Do not build checkout UI, Stripe integration, or payment flows from this doc until Tagia approves implementation.

**Related:** `docs/customer-journey-v1-locked.md` (Planned evolution) · `AGENTS.md` (checkout panel pattern note)

---

## Vision (verbatim intent)

**Flow on ONE workspace (no jarring page changes):**

1. Project Discovery → split layout after submit
2. Left: Studio Plan context (always visible) — services, included, additional, total
3. Right panel phases:
   - Phase A: Reviewing → Recommendations (current)
   - Phase B (FUTURE): Slide-out Secure Checkout — card, billing, agreement, Pay Now
   - After payment: panel closes → Studio Board

**Simplified customer journey (future locked):**

Studio Lobby → Studio Guide → Project Discovery → Studio Plan → Slide-out Secure Checkout → Studio Board

(No separate `/payment` page in future — but **do not** remove or replace the payment page until this is implemented and approved.)

---

## ASCII layout diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     ONE WORKSPACE — post-discovery submit                    │
├─────────────────────────────────┬────────────────────────────────────────────┤
│  LEFT — Studio Plan context     │  RIGHT — phase panel (content swaps)       │
│  (always visible, stable column)│  (fixed width ~22rem, no layout reflow)    │
│                                 │                                            │
│  Your Studio Plan               │  ┌─ Phase A (current) ─────────────────┐   │
│  ─────────────────              │  │ Reviewing → Recommendations        │   │
│  Services                       │  │ (Our Recommendation + Customize)   │   │
│    • [service]                  │  └────────────────────────────────────┘   │
│    • [service]                  │                                            │
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

## Why this design

**Context never lost.** Today, confirming a plan often means leaving the discovery workspace for a separate payment page. The customer loses sight of their Studio Plan — services, customizations, and total — at the moment they decide to purchase.

The slide-out checkout keeps the Studio Plan visible on the left while payment happens in the right panel on the same workspace. No full-page navigation, no jarring context switch. After Pay Now succeeds, the checkout panel closes and the customer lands on Studio Board with continuity preserved.

---

## Checkout panel header (future copy)

- 🔒 Secure Checkout
- "Review your Studio Plan and complete your purchase."

---

## Panel phases

| Phase | ID | Status | Right panel content |
|-------|-----|--------|---------------------|
| Reviewing | `reviewing` | Implemented | Animated “Reviewing your goals…” state |
| Summary | `summary` | Implemented (placeholder) | Our Recommendation + Customize Your Studio Plan |
| Checkout | `checkout` | **NOT IMPLEMENTED** | Secure Checkout form (card, billing, agreement, Pay Now) |

CSS custom property for future wiring: `--bds-panel-phase: reviewing | summary | checkout`

Type reference: `PanelPhase` in `src/project-summary/types.ts`

---

## What stays unchanged until implementation

- `/payment` route and Secure Checkout page remain active
- Recommendation Engine, Service Catalog, Discovery Summary business rules
- Recommendation, Not Direction copy structure
- No Stripe, payment form, or slide-out checkout UI in this prep pass

---

## Layout prep (this branch)

Minimal structure only — no payment integration:

- Right panel `bds-scene__panel-phase-slot` supports phase content swapping without reflow
- Left column `bds-plan-context` skeleton reserved for Studio Plan (services / total placeholders)
- Panel width `--bds-split-panel: clamp(18rem, 28vw, 22rem)` verified adequate for future checkout form

---

## Implementation gate

Tagia: *"I wouldn't tell Scout to build this yet."*

Do not implement Phase B (checkout panel) until explicitly requested after layout prep and journey docs are reviewed.
