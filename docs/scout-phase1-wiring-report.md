# Scout / Cursor Report — Studio Board Phase 1 Wiring

**Project:** studio-squishy  
**Date:** June 13, 2026  
**Author:** Scout (Cursor Agent)  
**For:** Tagia → handoff to Chat or future sessions

---

## Executive summary

Phase 1 wiring was implemented for **The Studio Board** customer journey after visual design was approved. The board no longer feels “fake” — **View Details**, **Review Room**, and supporting infrastructure are live. Approved visuals (header, sidebar, typography, layout) were **not redesigned**.

**Storage:** Campaign state persists in browser `localStorage` (no backend yet).

**Governance:** See `docs/studio-v1-lock.md` — changes to journey, visuals, or Phase 1 scope require explicit approval from Tagia.

---

## What was built

### 1. Campaign Details (`/campaign-details`) — Priority 1

Read-only progress screen for customers checking status.

**Shows:**
- Campaign Overview (name, status, ETA, created date, plan type)
- Original Request (Draft Room idea + prompt)
- Intake Summary (Goal, Audience, Timeline, Budget)
- Campaign Journey (horizontal progress tracker)
- Deliverables Preview (waiting message OR links when ready)
- Studio Updates (status-driven notes, read-only)

### 2. Review Room (`/review-room`) — Priority 2

When status is `READY_FOR_REVIEW`:
- Three mock concepts (A / B / C)
- Choosing one saves selection and advances to **Final Delivery**
- Redirects back to Studio Board

### 3. Campaign data model

- Extended `CampaignRecord` with `intake` snapshot (idea, audience, action, deadline)
- Intake persisted on Draft Room submit
- `selectCampaignOption()` for review flow
- `clearCampaignState()` for dev/testing reset

### 4. Dev tools (local development only)

Bottom-right panel on Studio Board, Campaign Details, Review Room:
- Jump status: `?status=draft|concepts|review|delivery|delivered`
- **Reset campaign** — clears localStorage for fresh intake testing

Not shown in production builds.

### 5. Studio Notes — Phase 1 read-only

- Composer removed
- Copy: “Updates appear here automatically.”
- Notes driven by `statusContent.*.studioNotes` in config

### 6. Membership Snapshot — context-aware mock

- **No campaign:** empty message (no fake “1 left” usage)
- **Active campaign:** Phase 1 mock values from config
- Sidebar plan bar: `0 of 2` vs `1 of 2` campaigns used accordingly

### 7. Studio Board polish (no visual redesign)

- Greeting shows name only when a campaign exists
- Shared `JourneyRail` component extracted for reuse
- `useCurrentCampaign` hook with dev status URL support

### 8. Documentation

- `docs/studio-v1-lock.md` — V1 lock, journey, priorities, implementation index

### Not built (Phase 1 deferrals)

- `/deliverables` — still placeholder (linked when Delivered)
- `/account`, billing, live membership API
- Editable Studio Notes composer
- Analytics / internal dashboards

---

## Customer journey (wired paths)

```
Welcome Hall → Studio Guide → Draft Room → Studio Board
                                              ↓
                                    Campaign Details (read-only)
                                              ↓
                                    Review Room (A/B/C pick)
                                              ↓
                                    Final Delivery (/deliverables — placeholder)
```

---

## Campaign status flow

```
DRAFT_RECEIVED
    ↓
BUILDING_CONCEPTS
    ↓
READY_FOR_REVIEW
    ↓
FINAL_ASSETS_IN_PROGRESS
    ↓
DELIVERED
```

Dev override: `updateCampaignStatus()` via URL param or dev panel.

---

## Files created (new)

| File | Purpose |
|------|---------|
| `src/lib/studio-board-dev-status.ts` | Dev status query param mapping |
| `src/lib/use-current-campaign.ts` | Shared campaign hook + dev status apply |
| `src/lib/campaign-details-view.ts` | Campaign Details view model |
| `src/config/review-room.ts` | Review Room copy + mock concepts A/B/C |
| `src/components/studio-board/JourneyRail.tsx` | Reusable journey progress tracker |
| `src/components/studio-board/StudioBoardDevStatus.tsx` | Dev tools panel |
| `src/components/campaign-details/CampaignDetailsScene.tsx` | Campaign Details UI |
| `src/components/review-room/ReviewRoomScene.tsx` | Review Room UI |
| `src/app/campaign-details.css` | Campaign Details styles |
| `src/app/review-room.css` | Review Room styles |
| `docs/studio-v1-lock.md` | V1 lock + implementation index |
| `docs/scout-phase1-wiring-report.md` | This report |

---

## Files modified (existing)

| File | Changes |
|------|---------|
| `src/config/studio-board.ts` | `CampaignIntakeSnapshot`, `campaignDetails` copy, membership `emptyHint`, read-only notes copy |
| `src/lib/studio-board-campaign.ts` | Intake persistence, `clearCampaignState`, `selectCampaignOption` |
| `src/lib/studio-board-view.ts` | `resolveMembershipSnapshot()` |
| `src/components/studio-board/StudioBoardScene.tsx` | Shared hook, JourneyRail import, read-only notes, membership empty state, dev panel, greeting logic |
| `src/app/studio-board.css` | Read-only notes, dev tools styles, membership empty |
| `src/app/studio-board/page.tsx` | Suspense wrapper for search params |
| `src/app/campaign-details/page.tsx` | Wired to `CampaignDetailsScene` |
| `src/app/review-room/page.tsx` | Wired to `ReviewRoomScene` |
| `src/app/globals.css` | Import campaign-details + review-room CSS |

---

## Key code snippets

### Campaign record + intake (`src/config/studio-board.ts`)

```typescript
export type CampaignIntakeSnapshot = {
  idea: string;
  audience: string;
  action: string;
  deadline: string;
  submittedAt: string;
};

export type CampaignRecord = {
  campaignId: string;
  campaignName: string;
  campaignStatus: CampaignStatus;
  // ...
  intake?: CampaignIntakeSnapshot;
  createdAt: string;
  updatedAt: string;
};
```

### Persist intake on submit (`src/lib/studio-board-campaign.ts`)

```typescript
export function createCampaignFromIntake(payload: DraftIntakePayload): CampaignRecord {
  return {
    campaignId: crypto.randomUUID(),
    campaignName: campaignNameFromIdea(payload.idea),
    campaignStatus: "DRAFT_RECEIVED",
    intake: {
      idea: payload.idea.trim(),
      audience: payload.audience.trim(),
      action: payload.action.trim(),
      deadline: payload.deadline.trim(),
      submittedAt: payload.submittedAt,
    },
    // ...
  };
}

export function clearCampaignState() {
  window.localStorage.removeItem("studio-squishy:current-campaign");
  window.localStorage.removeItem("studio-squishy:last-draft");
  dispatchCampaignUpdated();
}
```

### Dev status URL params (`src/lib/studio-board-dev-status.ts`)

```typescript
export const DEV_STATUS_QUERY_MAP: Record<string, CampaignStatus> = {
  draft: "DRAFT_RECEIVED",
  concepts: "BUILDING_CONCEPTS",
  review: "READY_FOR_REVIEW",
  delivery: "FINAL_ASSETS_IN_PROGRESS",
  delivered: "DELIVERED",
};
```

### Membership empty vs active (`src/lib/studio-board-view.ts`)

```typescript
export function resolveMembershipSnapshot(campaign: CampaignRecord | null) {
  if (!campaign) {
    return { isActive: false, campaignsUsed: 0, /* emptyHint shown in UI */ };
  }
  return { isActive: true, campaignsUsed: 1, campaignsRemaining: 1, /* mock values */ };
}
```

---

## How to test

1. Run `npm run dev`
2. Open `/studio-board`
3. If stale data: click **Reset campaign** in dev tools (bottom-right)
4. Submit via Draft Room → return to Studio Board
5. **VIEW DETAILS** → verify intake + journey
6. Dev panel → **Review & Approval** → **REVIEW CAMPAIGNS** → pick A/B/C
7. Dev panel → **Delivered** → **VIEW DELIVERABLES** (placeholder page)

---

## Zip export

All Phase 1 wiring source files are bundled at:

**`docs/scout-phase1-wiring-export.zip`**

To regenerate locally:

```powershell
Compress-Archive -Path @(
  "src/lib/studio-board-dev-status.ts",
  "src/lib/use-current-campaign.ts",
  "src/lib/campaign-details-view.ts",
  "src/lib/studio-board-campaign.ts",
  "src/lib/studio-board-view.ts",
  "src/config/studio-board.ts",
  "src/config/review-room.ts",
  "src/components/studio-board/JourneyRail.tsx",
  "src/components/studio-board/StudioBoardDevStatus.tsx",
  "src/components/studio-board/StudioBoardScene.tsx",
  "src/components/campaign-details/CampaignDetailsScene.tsx",
  "src/components/review-room/ReviewRoomScene.tsx",
  "src/app/campaign-details/page.tsx",
  "src/app/campaign-details.css",
  "src/app/review-room/page.tsx",
  "src/app/review-room.css",
  "src/app/studio-board/page.tsx",
  "src/app/studio-board.css",
  "src/app/globals.css",
  "docs/studio-v1-lock.md"
) -DestinationPath "docs/scout-phase1-wiring-export.zip" -Force
```

---

## Next recommended work (Phase 1 remainder)

1. **Final Delivery** (`/deliverables`) — read-only asset list when `DELIVERED`
2. Wire deliverables link from Campaign Details + board CTA end-to-end
3. Optional: seed demo campaign for QA without Draft Room each time

---

*End of Scout report.*
