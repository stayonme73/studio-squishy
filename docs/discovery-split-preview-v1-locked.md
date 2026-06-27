# Discovery Split Preview V1 — Locked

**Status:** Locked — the in-discovery split panel is a preview teaser, not Project Summary.

**Code reference:** `src/components/business-discovery-studio/DiscoverySummaryPlaceholder.tsx` · `DISCOVERY_SPLIT_PREVIEW_LABELS` in `src/project-summary/types.ts`

## Purpose

After Project Discovery submit, the split-screen right column answers one question: **"Here's what we prepared."**

It is a reassurance moment — not the decision page. Customers see a short intro, recommended service names only, a Next Step outline, and one CTA to open the full Studio Plan on Project Summary.

Preview is **not** the full report. One job: reassure — *"We've reviewed your Discovery and prepared your Studio Plan."*

## One screen, one question

| Screen | Route / location | Question it answers |
|--------|------------------|---------------------|
| Project Discovery | `/business-discovery-studio` | Tell us about your business. |
| Studio Plan Preview | In-discovery split panel (phase `summary`) | Here's what we prepared. |
| Project Summary | `/project-summary` | Review, customize, approve, and understand the investment. |
| Secure Checkout | `/payment` | Complete your purchase. |

If a screen answers the next screen's question, it carries too much responsibility.

## Screen roles (post-discovery)

| Screen | Route / location | Purpose | Content |
|--------|------------------|---------|---------|
| Discovery Split Preview | In-discovery split panel (phase `summary`) | Preview — "Here's what we prepared" | Intro + service names only + Next Step bullets + CTA |
| Project Summary | `/project-summary` | Detail + customer choice | Why?, packages, customize, pricing, disclaimer, approve |
| Secure Checkout | `/payment` | Official payment | Card, billing, agreement, Pay Now |

## Split panel content (locked)

```
YOUR STUDIO PLAN
(small label)

Studio Plan Preview

We've reviewed your Discovery and prepared a personalized Studio Plan based on what you shared.

Recommended Services

✓ [recommended services — names only]

Next Step

Review your complete Studio Plan to:
• See why each service was recommended
• Adjust your Studio Plan
• View pricing and your estimated investment
• Approve your Studio Plan before payment

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

Uses proposal tokens (clean card, eucalyptus headers) within the Discovery split column — see [decision-page-visual-language-v1.md](decision-page-visual-language-v1.md) and [the-studio-design-system-v1.md](the-studio-design-system-v1.md). Discovery board on the left keeps warm creative workspace styling.

**Project Summary header:** Full decision page uses a dedicated header band (nav + subtitle on solid surface; lobby blur below) — not the split panel. See header band rule in [decision-page-visual-language-v1.md](decision-page-visual-language-v1.md).

## Related docs

- [customer-journey-v1-locked.md](customer-journey-v1-locked.md) — post-discovery micro-flow
- [recommendation-not-direction-v1-locked.md](recommendation-not-direction-v1-locked.md) — customer choice on Project Summary
- [the-studio-design-system-v1.md](the-studio-design-system-v1.md) — color roles and shared patterns
