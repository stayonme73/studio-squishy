# Recommendation Engine — principles (locked)

**Locked doc:** `docs/recommendation-not-direction-v1-locked.md`

## Core principle

**The Studio recommends. The client decides.**

## Recommendation, Not Direction

- The engine **recommends** services from Discovery answers — it does not direct, restrict, or force purchase.
- Recommendations guide; clients may accept, remove, substitute, add, or build a custom plan from the approved catalog.
- This applies to every `RecommendationResult` the engine produces.

## Engine responsibilities

| Does | Does not |
|------|----------|
| Score Discovery answers against catalog `discoveryMapping` rules | Lock the client into recommended services |
| Rank and allocate included vs additional services | Block plan approval unless recommended services remain |
| Emit warnings (low confidence, dependencies, etc.) | Treat recommendations as mandatory line items |

## Audit notes (v1 lock)

- `recommendFromDiscovery` returns suggestions only — no purchase or checkout side effects.
- `requiresApproval` flags cases needing human review; it does not force recommended SKUs.
- Customer choice (remove / swap / add) lives in Studio Plan Review and Project Summary UI, not in the engine.

When adding engine behavior, verify it preserves **professional guidance + customer choice**.
