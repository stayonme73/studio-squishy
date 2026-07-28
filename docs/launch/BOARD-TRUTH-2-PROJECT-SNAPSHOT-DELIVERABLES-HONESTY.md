# BOARD-TRUTH-2 — Project Snapshot Deliverables Honesty

## 1. Protected tip and scope

**Base tip:** `fc6ab3eca0aa1f9cb31f2b63c47907c1b1cc7357`
**Branch:** `fix/discovery-responsive-layout`
**Package:** Narrow Studio Board Project Snapshot truth repair only.

## 2. BOARD-TRUTH-1 decision

BOARD-TRUTH-1 classified Hierarchy C #5 as PARTIAL and identified one highest-impact Customer-One defect: Project Snapshot inventing Social Posts progress for non–Social Posts campaigns. This package implements that single repair. It does not reopen Board inspection.

## 3. Exact unsupported claim

Before repair, when a campaign had no `deliverablesProgress[0]` row, `ProjectSnapshotPanel` fell back to:

- label: **Social Posts**
- meta: **0 of 4 complete**
- progress bar toward 4
- **View deliverables →**

even when the campaign was not Social Posts and no files were released.

Related: `resolveDeliverablesRemainingSummary` returned **All deliverables complete** whenever the filtered remaining list was empty — including when no deliverables were defined.

## 4. Root cause

Hard-coded Social Posts fallback in `resolveDeliverablesSnapshot` inside `ProjectSnapshotPanel.tsx`, plus empty-list → completion in `resolveDeliverablesRemainingSummary`.

## 5. Real deliverable data sources

After repair, snapshot progress requires one of:

1. **Proven Social Posts campaign** via `isSocialPostsCampaign` + `resolveSocialPostsDeliveredCount` (RTU product total only after identity is proven)
2. **Approved Studio Plan line items** with matching `deliverablesProgress` rows
3. **Proven release counts** (`delivered > 0`) on a defined progress row

Package-quota assumptions alone are not snapshot evidence.

## 6. Non-Social-Posts behavior

Shows the existing empty copy:

> Deliverables appear here once your project begins.

No Social Posts label, no “0 of 4 complete”, no invented progress bar, no “View deliverables” link when nothing is released.

## 7. Social Posts behavior

Only when `isSocialPostsCampaign` is true:

- label: Social Posts
- delivered: from `deliverablesDelivered[v2-rtu-social-posts]`
- total: RTU product total (bound to proven SP identity)
- View deliverables only when delivered > 0 or fully complete

## 8. Empty and missing-data behavior

- No campaign: existing empty Board snapshot copy
- Has campaign, no proven deliverable data: unavailable empty copy
- Empty approved plan / no defined rows: summary returns `null` (not completion)

## 9. Completion truth

**All deliverables complete** only when defined deliverable rows exist and every row has `remaining === 0`.

## 10. Deliverables action truth

**View deliverables →** appears only when `showViewDeliverables` is true (released count > 0 or defined work fully complete). Destination route unchanged. No Package 7A wiring. Sidebar Final Delivery remains available separately.

## 11. Files changed

- `src/lib/studio-board-project-snapshot.ts` (new)
- `src/lib/studio-board-project-snapshot.test.ts` (new)
- `src/components/studio-board/ProjectSnapshotPanel.tsx`
- `src/lib/campaign-record.ts`
- `docs/launch/BOARD-TRUTH-2-PROJECT-SNAPSHOT-DELIVERABLES-HONESTY.md` (this file)

## 12. Tests

Focused: `npx vitest run src/lib/studio-board-project-snapshot.test.ts` → **10/10 PASS**

Preservation: first-minute, next-action, Package 4 focused suites → **37/37 PASS** across the four files run together.

## 13. Desktop proof

Ephemeral Playwright against disposable owned non–SP campaign @ ~1440px:

- no Social Posts
- no 0 of 4 complete
- unavailable empty copy present
- no View deliverables
- Materials present
- communication present
- no horizontal overflow

Disposable campaign file deleted after proof. Proof runner not committed.

## 14. Phone proof

Same campaign @ ~390px: same truth checks PASS; no horizontal overflow.

## 15. Protected systems left untouched

- COMM-4 / COMM-5 / acknowledgment
- Materials We Still Need workflow
- First-minute / Next Action / Package 4 overlays
- Package 7A contract
- Auth / page gating
- Review Room / Deliverables page internals
- Master Launch List

## 16. Explicit exclusions

No Board redesign, Auth, Materials dual UX, COMM, 7A Board wiring, Review/Delivery redesign, canned June-status cleanup, sidebar redesign, MLL update, or broad Board certification.

## 17. Customer-One impact

Removes a live Project Snapshot lie about deliverables. Customer-One can trust that snapshot progress means real plan/release evidence.

## 18. Remaining Board limits

- Hierarchy C #5 overall remains PARTIAL (Materials dual UX waiting; Auth still C #6; 7A not on Board; residual canned status templates elsewhere)
- This package does not certify full Board truth

## 19. Final recommendation

Approve BOARD-TRUTH-2 commit when Tagia accepts the staged boundary. Do not open Auth, Materials dual UX, or Package 7A next without a separate package instruction.
