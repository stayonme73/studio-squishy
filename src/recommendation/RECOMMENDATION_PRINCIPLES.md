# Recommendation Engine — principles (locked)

**Locked docs:**
- [Recommendation, Not Direction](../../docs/recommendation-not-direction-v1-locked.md) — customer choice
- [Recommendation Engine Philosophy V1](../../docs/recommendation-engine-philosophy-v1-locked.md) — engine output, flow, traceability

## Core principle

**The Studio recommends. The client decides.**

## Recommendation, Not Direction

- The engine **recommends** services from Discovery answers — it does not direct, restrict, or force purchase.
- Recommendations guide; clients may accept, remove, substitute, add, or build a custom plan from the approved catalog.
- This applies to every `RecommendationResult` the engine produces.

## Engine philosophy (V1 lock)

### Service-first, not package-first

- **Primary output:** individual Studio Services recommended from Discovery answers.
- **Deprecated as primary output:** selecting Spark / Momentum / Growth as the main recommendation.
- **Packages:** optional bundled shortcuts surfaced downstream (Project Summary) — never required to approve a plan.

### Traceability

- Every recommended service must carry a **Why?** traceable to something the client said during Discovery.
- Discovery Mapping links recommendation → discovery answer; Discovery Summary Model renders per-service copy.
- Collective rationale alone does not satisfy the traceability rule.

### Locked language

- **Use:** "Based on what you shared, we recommend…"
- **Never:** "You need this" · mandatory purchase framing · package tier as primary Discovery output

## Engine responsibilities

| Does | Does not |
|------|----------|
| Score Discovery answers against catalog `discoveryMapping` rules | Lock the client into recommended services |
| Recommend individual services with per-service rationale | Output a package tier as the primary recommendation |
| Rank and allocate included vs additional services | Block plan approval unless recommended services remain |
| Emit warnings (low confidence, dependencies, etc.) | Treat recommendations as mandatory line items |
| Optionally suggest a bundle shortcut (future) | Force package selection before checkout |

## Audit notes (v1 lock)

- `recommendFromDiscovery` returns suggestions only — no purchase or checkout side effects.
- `requiresApproval` flags cases needing human review; it does not force recommended SKUs.
- Customer choice (remove / swap / add) lives in Studio Plan Review and Project Summary UI, not in the engine.
- Discovery Mapping may be empty during implementation — mock data in Project Summary demonstrates the per-service Why? pattern until wired.

When adding engine behavior, verify it preserves **professional guidance + customer choice + traceable per-service rationale**.
