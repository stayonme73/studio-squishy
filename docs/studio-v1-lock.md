# THE STUDIO — VERSION 1 LOCK

**Status:** Studio Board approved for wiring  
**Last updated:** June 13, 2026

> **LOCKED:** Changes to customer journey, approved visuals, or Phase 1 scope require explicit approval from Tagia.

---

## Customer journey

```
Welcome Hall
    ↓
Studio Guide
    ↓
Draft Room
    ↓
Studio Board
    ↓
Campaign Details
    ↓
Review Room
    ↓
Final Delivery
```

## Studio Board status

**APPROVED FOR WIRING**

## Do not change without approval

Explicit approval from **Tagia** is required for any change to:

- Customer journey
- Approved visuals (see list below)
- Phase 1 scope

**Approved visuals — locked:**

- Header artwork
- Sidebar artwork
- Typography
- Color palette
- Layout structure
- Membership Snapshot layout
- Campaign tracker layout

## Phase 1 priorities

1. Campaign Details
2. Review Room
3. Final Delivery

## Deferred to Phase 2

- Billing systems
- Editable Studio Notes
- Analytics
- Internal team dashboards
- Advanced memberships
- AI conversations

## Philosophy

Less is more.

The Studio should feel calm, premium, and easy to understand.

The customer should always know where their marketing request stands.

---

## Implementation notes (Phase 1 wiring)

Preserved here so today’s work is not lost. Visual lock above still applies.

| Area | Route | Status |
|------|-------|--------|
| Studio Board | `/studio-board` | Wired — campaign state, context-aware **Campaign Actions** |
| Campaign Details | `/campaign-details` | Wired — read-only overview, intake, journey, deliverables preview |
| Review Room | `/review-room` | Wired — A / B / C selection advances to Final Delivery |
| Final Delivery | `/deliverables` | Wired — copy/download deliverables, sidebar art, auto-deliver from Final Assets |
| Membership Snapshot | Studio Board | Phase 1 mock — hidden until campaign submitted |
| Studio Notes | Studio Board | Read-only — status-driven updates |
| Dev tools | Studio Board (+ details, review) | Local dev only — status jumps + **Reset campaign** |

**Key files**

- `src/config/studio-board.ts` — copy, routes, status content, journey stages
- `src/config/review-room.ts` — review room mock concepts
- `src/lib/studio-board-campaign.ts` — campaign CRUD + intake persistence
- `src/lib/studio-board-view.ts` — board + membership snapshot resolution
- `src/lib/campaign-details-view.ts` — campaign details view model
- `src/components/studio-board/StudioBoardScene.tsx` — board UI
- `src/components/campaign-details/CampaignDetailsScene.tsx` — details UI
- `src/components/review-room/ReviewRoomScene.tsx` — review UI
- `src/config/deliverables.ts` — final delivery copy + mock assets
- `src/components/deliverables/DeliverablesScene.tsx` — deliverables UI
- `src/app/deliverables.css` — deliverables styles
- `public/deliverables/deliverables-sidebar-v1.png` — approved sidebar art
- `src/app/studio-board.css` — board styles (do not redesign without approval)

**Dev status testing (local only)**

- URL: `?status=draft|concepts|review|delivery|delivered`
- Or use the bottom-right **Dev tools** panel → **Reset campaign** for a clean intake flow

## Final Delivery navigation (approved)

- **Do not** add Final Delivery to the permanent Studio Board sidebar.
- **Campaign Actions** card beneath Current Campaign — status-driven enable/disable.
- When **DELIVERED**, Current Campaign shows **VIEW DETAILS** + **VIEW DELIVERABLES**.
- Final Delivery page keeps its own contextual sidebar nav when the customer arrives.
