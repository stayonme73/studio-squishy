# Discovery Mapping — Planned (V1)

**Status:** PAUSED — do not wire Discovery Mapping or Recommendation Engine scoring until the customer journey is complete.

**Related:** [Customer Journey V1 — Build order](customer-journey-v1-locked.md#build-order-locked) · [Recommendation Engine Philosophy (locked)](recommendation-engine-philosophy-v1-locked.md) · `src/recommendation/RECOMMENDATION_PRINCIPLES.md` · [Discovery engine alignment audit](discovery-engine-alignment-audit.md) · [Discovery decision matrix](discovery-decision-matrix.md)

---

## Why paused

The Recommendation Engine should support a **finished customer experience**, not define it prematurely. Build the experience first, then connect intelligence.

Philosophy and copy structure are locked. Project Summary may use mock data that demonstrates the per-service Why? pattern until wiring begins.

---

## Dependencies (must complete first)

| # | Prerequisite | Doc |
|---|--------------|-----|
| 1 | Finish Project Summary polish | [recommendation-engine-philosophy-v1-locked.md](recommendation-engine-philosophy-v1-locked.md) |
| 2 | Build Secure Checkout experience (slide-out panel) | [studio-plan-slide-out-checkout-v1-planned.md](studio-plan-slide-out-checkout-v1-planned.md) |
| 3 | Verify complete customer journey: Discovery → Project Summary → payment | [customer-journey-v1-locked.md](customer-journey-v1-locked.md) |

**Step 4 (this doc):** Begin Discovery Mapping and Recommendation Engine wiring — link Discovery answers → catalog `discoveryMapping` rules → per-service Why? in Project Summary / Discovery Summary Model.

---

## Scope when unpaused (not started)

- Wire catalog `discoveryMapping` rules to Discovery tile answers (exact-string contract per [discovery-decision-matrix.md](discovery-decision-matrix.md))
- Connect Recommendation Engine output to Project Summary (replace mock data)
- Discovery Summary Model copy from engine `RecommendationResult`
- Preserve **Recommendation, Not Direction** — engine recommends; client decides

Do **not** implement scoring, mapping, or engine logic while status is PAUSED.
