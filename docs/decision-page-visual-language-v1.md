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
- **Backdrop:** Blurred Studio Lobby + light charcoal tint (~25%) — lobby stays visible; cards carry elevation

## Code references

- `src/app/project-summary.css` — Project Summary page scope
- `src/app/studio-utility-backdrop.css` — shared utility backdrop overlay
- `src/app/business-discovery-studio.css` — `.bds-summary-panel--proposal` split-panel shell

Discovery board tan/paper styling is unchanged.
