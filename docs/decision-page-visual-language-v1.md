# Decision Page Visual Language V1

**Status:** Approved for Project Summary and shared utility backdrop tuning.

## Principle

| Page type | Aesthetic | Examples |
|-----------|-----------|----------|
| Creative workspace | Warm, textured, artistic | Project Discovery, Review Room |
| Professional proposal | Clean, high contrast, readable | Project Summary, Secure Checkout |
| Operational dashboard | Structured, scannable | Studio Board |

Discovery is a creative workspace. Project Summary is a professional proposal. Studio Board is an operational dashboard.

## Decision page tokens (Project Summary)

- **Card surface:** `#FFFFFF` / `#F8F9FA` — not cream or tan
- **Primary text:** `#2B2B2B`
- **Section headers:** Eucalyptus green `#2e5e4e` (Studio utility standard)
- **Primary button:** Eucalyptus green
- **Secondary button:** White with charcoal border
- **Accents:** Warm orange, gold, coral (subtle — list markers, warnings, links)
- **Backdrop:** Blurred Studio Lobby + light charcoal tint (~25%) — lobby stays visible below the header band; cards carry elevation

## Header band (decision pages)

Project Summary (and future slide-out Secure Checkout) use a **dedicated header band** across the top:

- Solid or lightly translucent white surface — title, subtitle, Back, and Help Center always readable
- Blurred Studio Lobby begins **below** the band (not behind header text)
- Subtitle is two lines: context (“The Studio reviewed your Discovery answers.”) + review CTA

Code: `studio-utility-scene--header-band` · `studio-utility-header-band` · `StudioUtilityBackdrop` `placement="below-header"` · `project-summary-header-band` in `project-summary.css`

## Code references

- `src/app/project-summary.css` — Project Summary page scope
- `src/app/studio-utility-backdrop.css` — shared utility backdrop overlay
- `src/app/business-discovery-studio.css` — `.bds-summary-panel--preview` split-panel teaser (proposal tokens; not full Project Summary)

Discovery board tan/paper styling is unchanged.

## Discovery split preview (not Project Summary)

The in-discovery split panel is a **preview teaser** only — service names + CTA. Full Why?, packages, customize, pricing, disclaimer, and approve live on Project Summary. Locked: [discovery-split-preview-v1-locked.md](discovery-split-preview-v1-locked.md).
