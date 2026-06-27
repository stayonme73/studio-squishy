# Discovery Split Preview V1 — Locked

**Status:** Locked — the in-discovery split panel is a preview teaser, not Project Summary.

**Code reference:** `src/components/business-discovery-studio/DiscoverySummaryPlaceholder.tsx` · `DISCOVERY_SPLIT_PREVIEW_LABELS` in `src/project-summary/types.ts`

## Purpose

After Project Discovery submit, the split-screen right column answers: **"Did The Studio understand me?"** / **"We listened."**

It is a confidence moment — not the decision page. Customers see a simple recommended service list and one CTA to open the full Studio Plan on Project Summary.

## Screen roles (post-discovery)

| Screen | Route / location | Purpose | Content |
|--------|------------------|---------|---------|
| Discovery Split Preview | In-discovery split panel (phase `summary`) | Preview — "We listened" | Service names only + CTA |
| Project Summary | `/project-summary` | Detail + customer choice | Why?, packages, customize, pricing, disclaimer, approve |
| Secure Checkout | `/payment` | Official payment | Card, billing, agreement, Pay Now |

## Split panel content (locked)

```
Your Studio Plan
Based on your Discovery, here's what we recommend:

✅ [recommended services — names only]

We've prepared a personalized Studio Plan based on your Discovery responses.

Review your recommendations, adjust your plan, and approve everything before payment.

[Review My Studio Plan →]
```

CTA navigates to `/project-summary` (same discovery/campaign context as existing journey wiring).

## Explicitly excluded from split panel

Do **not** show in the Discovery split preview:

- Per-service **Why?** copy
- Package cards (Spark / Momentum / Growth)
- Pricing or total investment
- Customize / add-remove controls
- Disclaimer
- Approve or checkout actions

Those belong on **Project Summary** only — see [recommendation-engine-philosophy-v1-locked.md](recommendation-engine-philosophy-v1-locked.md).

## Visual language

Uses proposal tokens (clean card, eucalyptus headers) within the Discovery split column — see [decision-page-visual-language-v1.md](decision-page-visual-language-v1.md). Discovery board on the left keeps warm creative workspace styling.

## Related docs

- [customer-journey-v1-locked.md](customer-journey-v1-locked.md) — post-discovery micro-flow
- [recommendation-not-direction-v1-locked.md](recommendation-not-direction-v1-locked.md) — customer choice on Project Summary
