# Squishy Character Standards V1

**Status:** Locked — canonical reference for Squishy's default appearance and placement.
**Date:** July 2026
**Reconciles:** [`docs/illustration/master-reference.md`](illustration/master-reference.md)'s prior Squishy character lock (room-bound host, `squishy-new-*` assets) — see that document's reconciliation note. The room/environment content in that doc is a separate, still-open question, not resolved here.
**Scope:** Squishy's character appearance, default pose, and placement philosophy only. Does **not** authorize wiring Squishy into application code — see Governance below.

---

## The core decision

**Squishy has no fixed room.** He is not office-bound, does not have a desk, and does not host from a permanent position. He accompanies the customer through whatever Studio screen they're currently working in — a Studio guide who visits the workspace, not a character the customer visits.

This directly supersedes the prior lock's "host position at executive desk zone" rule.

---

## Canonical reference image

- **Documentation copy:** [`docs/illustration/references/squishy-studio-guide-v1.png`](illustration/references/squishy-studio-guide-v1.png) — the design-reference record of this standards doc.
- **Production copy:** `public/squishy/squishy-studio-guide-v1.png` — byte-identical copy, authorized for application use as of **July 2026** (Route Map main-screen implementation). Referenced by `src/components/route-map/RouteMapSquishyGuide.tsx`.
- **Pose B production copy:** `public/squishy/squishy-studio-guide-v2.png` — authorized for **Build Your Project** (`/project-builder`) as of **July 2026**. Referenced by `src/components/project-builder/ProjectBuilderSquishyGuide.tsx`.
- **Pose B source:** Founder-supplied reference image, `ChatGPT Image Jul 12, 2026, 07_09_42 AM.png` (1536×1024, scene background baked in).
- **Source (Pose A):** Founder-supplied reference image, `ChatGPT Image Jul 11, 2026, 06_58_03 PM.png`
- **Technical prep performed (no redraw):** Pose A — background removed (AI matting), tablet-back logo removed (content-aware inpainting). Pose B — scene-background matting via `scripts/prep-squishy-pose-b.mjs` (edge flood, floor/shadow strip, component cleanup). Verified against source outside matted regions.
- **Governance:** production use is now authorized for the pose/placement rules in this document. Any *new* pose, crop, or edit of the character still requires updating this document first — not a silent addition.

---

## Default pose — "Primary Studio Guide" (Pose A)

This is the approved pose for **Route Map** and general guidance surfaces that do not specify Pose B.

| Element | Lock |
|---|---|
| Character | Orange plush character, two-leaf sprout |
| Outfit | Green hoodie, denim overalls, green sneakers |
| Prop | Tablet, held naturally — signals he can look things up, review details, and explain results |
| Expression | Friendly, attentive, neutral smile |
| Body | Walking/standing, angled slightly toward the customer's work rather than squarely at the viewer |
| Proportions &amp; colors | Exactly as the canonical reference — never varied |

## Pose B — "Project Builder Guide"

Authorized for **Build Your Project** and later pre-purchase workspace pages.

| Element | Lock |
|---|---|
| Asset | `public/squishy/squishy-studio-guide-v2.png` |
| Prop | Tablet held at side |
| Body | Standing, one hand gesturing toward the workspace, tablet in the other hand |
| Scale | Match Route Map Squishy height tokens (`--rm-squishy-h` / `--pb-squishy-h`) |
| Placement | Right side of workspace, feet on floor band — same composition role as Route Map |

## Outfit lock

Never varies across contexts: green hoodie, denim overalls, green sneakers, tablet, two-leaf sprout, same proportions, same colors. Squishy is never re-dressed per screen.

## Default usage

Use Pose A (`squishy-studio-guide-v1.png`) on Route Map and general guidance surfaces.

Use Pose B (`squishy-studio-guide-v2.png`) on Build Your Project (`/project-builder`).

**Do not create additional poses without updating this document.**

## Placement rules

- Squishy accompanies the customer's workspace — never a fixed room, desk, or office.
- Keep him beside the work; never covering controls, prices, or summaries.
- Exactly one visible Squishy per screen.
- Orient him toward the relevant content/decision rather than squarely at the viewer.
- Scale may change by context; the character and pose stay fixed.

## Approved size range

**Not yet locked, and not to be decided from documentation alone.** Revision 5 of the pre-purchase design review (rendered screenshots, not the live artifact) found the placeholder-derived sizing used there (roughly a 2.6–3.4em-wide corner figure) reads as too small to register as present once judged in context against a full mockup. No numeric size range is approved yet — this needs a dedicated layout study, measured against a real composition, before implementation.

**Composition reference for that study** (not a lock — direction only, to be measured, not assumed):

- Squishy stands near the lower-right side of the Route Map
- Positioned beside the "How It Works" strip
- His feet align with the lower content area
- His head reaches roughly the bottom of, or just below, the "Choose Your Route" panel
- Visible without becoming the screen's main subject — the route choices and workspace stay the focal point

The next step is a dedicated wireframe scale study against this composition, not a number chosen in the abstract.

## Prohibited changes

- No new poses without updating this document first
- No new interpretations or redraws of the character
- No outfit, color, or proportion changes
- No AI-regeneration "for a slightly different angle" — technical prep (background removal, minor cleanup) only, on the one canonical source image

## Roadmap — proposed, not approved, not created

The following additional poses were discussed as a possible future "Core Squishy Set." **None exist yet. None are authorized for creation.** Recorded here only so the direction isn't lost:

- **Listening pose** — customer typing, long conversations, Squishy waiting
- **Explaining pose** — tablet slightly raised, one hand gesturing; feasibility results, checkout walkthrough
- **Celebration pose** — occasional use; project delivered, major milestone

Creating any of these requires an explicit decision and an update to this document — not a one-off generation.

---

## Governance

- This document governs Squishy's *character appearance and placement philosophy*. It is a design standard, not an implementation authorization.
- No application code has been changed as a result of this document.
- The canonical reference image lives only at `docs/illustration/references/squishy-studio-guide-v1.png` — a documentation asset. It must not be copied into `public/` or referenced by any `src/` component until a separate, explicit decision authorizes production implementation.
- Any future pose, outfit change, or room/environment decision must update this document (or supersede it explicitly, the way this document supersedes the prior lock) — never a silent overwrite.
