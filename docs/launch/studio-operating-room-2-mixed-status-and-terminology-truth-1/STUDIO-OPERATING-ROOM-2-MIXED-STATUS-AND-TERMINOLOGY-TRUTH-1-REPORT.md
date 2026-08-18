# STUDIO-OPERATING-ROOM-2-MIXED-STATUS-AND-TERMINOLOGY-TRUTH-1 REPORT

**Package:** STUDIO-OPERATING-ROOM-2-MIXED-STATUS-AND-TERMINOLOGY-TRUTH-1  
**Room:** 2 — Customer-facing truth + friction cleanup  
**Status:** PARK for Manager  
**Section 4 closed:** **NO**  
**Do not auto-advance:** yes  
**Merge:** no  
**Owner routine:** NONE

Maya fixture: Cedar & Bloom Home Organizing · Make Me a Flyer $69 · unique sandbox email. Sections 1–3 were not reopened except to stamp Section 3 closed at `3328807` as Tagia directed.

Live evidence: `docs/launch/studio-operating-room-2-mixed-status-and-terminology-truth-1/customer-walk/`

Prior closes remain: Section 1 `45b09b1` · Section 2 `e609203` · Section 3 `3328807`.

---

## State-by-state Board / Project Record findings

Live Maya walk used current-status surfaces only (next action, Project status panel, Current Status metrics, Project Record overview). Upcoming journey-rail labels were not treated as current.

| State | Board / Record current language | Result |
|------|----------------------------------|--------|
| Paid / intake needed | Waiting on Project Intake · Complete Project Intake | PASS |
| Intake received | Project Intake Received | PASS |
| Production underway | Building Concepts | PASS |
| QA / Review not ready | Building Concepts (Review not claimed ready) | PASS |
| Review ready | Ready for Review · Open Review Room | PASS |
| Revision underway | Revision in progress · no Open Review Room | PASS |
| Revised version ready | Ready for Review | PASS |
| Approved | Approved — preparing files · no Open Review Room | PASS |
| Final Delivery ready | Final Delivery ready · Open Final Delivery | PASS |

Different wording is used on Voice (sentence form) vs Board (status labels). Meaning agrees.

---

## Status-hierarchy result

**PASS after fix.** Purchased-service spine now wins over stale `READY_FOR_REVIEW` campaign status.

- Review ready does not keep “Project Intake Received” or “Building Concepts” as the current status. Those remain recorded/complete history.
- Revision underway no longer looks like Review is the next customer action.
- Approved and Final Delivery ready mark Review complete on the journey rail. Review is not an unfinished requirement.

The live hole: `project-status` sync mapped a `revision_requested` spine back to `ready_for_review` because campaign status was still READY_FOR_REVIEW and persist checks skipped revision. Board then said Open Review Room while the Machine spine said revision. Fixed by preserving `revision_requested` in `deriveSpineStatus`. Presentation overlay on Board / Project Record / next-action reads that spine.

---

## Terminology residue found / fixed

**Fixed (customer-visible):**

- Help Center FAQ/policies/Quick Guide: `job` → `service` while keeping the per-item (not per-account) rule.
- Refund request on Board: “Which service is this request about?” and matching policy notes.
- Continuity risk line: “At least one service is waiting on you.”
- Voice material request: “this service,” not “this job.”
- Incomplete-intake Current Status: **Waiting on Project Intake** (payment is history, not the current meaning).
- Job-status labels aligned with Board: Building Concepts, Ready for Review, Revision in progress, Approved — preparing files, Final Delivery ready.
- Update History: historical Review “Action needed” clears after approval; internal QA / Machine / hash details stripped; “Studio queue” and “file version” headlines softened.

**Intentionally left (internal / unreachable):**

- Code identifiers (`jobId`, `jobRecords`, `jobLabel` keys, Owner Console, Kitchen, Decision Core evaluator messages).
- Idea Wall “EVERY CAMPAIGN STARTS WITH AN IDEA” is not on the live Board scene.
- `formatCampaignTitle` no longer appends “Campaign”; Board title is the business name.

---

## Help Center cleanup

**PASS.** Customer-visible Help Center copy reachable from Board no longer says “each job” or “per job.” Policy meaning is preserved: production, refunds, and Waiting on Client are still tracked per purchased service, not per account. Soft refund language (“may be approved” / “may be eligible”) is unchanged. This was not a Help Center rewrite. Locked doc section 3 records Tagia’s Section 4 authorization of the customer noun **service**.

---

## Update History findings

Useful project updates remain (payment, intake, submitted for review, revision requested, approved, files ready).

Operational residue removed from customer detail: internal QA, Machine flyer identity, hashes, release checks, candidate language. Historical “Action needed: review this version” no longer stays current after approval. Audit events remain in the activity store.

---

## Dormant vs live concept / strategy labels

**Dormant for launch RTU customers.** `feedbackStudio.previewSections["campaign-strategy-launch"]` is still “Campaign Strategy & Launch Plan.” Catalog SKU `cp-001` is **Campaign Launch Kit**, launch status **limited**, not the Maya flyer path. Not churned. If a customer later buys that limited SKU, the section label is the catalog name, not a Maya Board contradiction.

---

## Cross-surface agreement

For the same project state, Board Current Status, next action, Project Record status, and purchased-service status labels now use the same current noun.

Studio Voice stays sentence-form and names the same meaning (intake needed, producing, ready for Review, revision in progress, preparing files, Final Delivery ready). Help Center policy copy now says service, matching Board refund language.

A customer can ask “What is happening with my project right now?” and get one coherent current answer, with history underneath.

---

## Stale-tab / mixed-state negative tests

**PASS.**

- Tab kept Review-ready copy before the state advanced.
- Fresh Board after revision showed **Revision in progress**, not Open Review Room.
- Reloaded earlier tab followed current revision state.
- Delivery-ready current status did not treat Review as unfinished.
- Notification-failed / Resend path was not reopened. Board remains the source of truth.

---

## Actual customer-eyes walk

Maya signed in to Studio Board and walked nine mixed states plus Help Center, refund copy, and stale-tab reload.

**Pauses / defects found on the live walk:**

1. First pass used a leftover 3066 without the overlay and treated journey-rail “Ready for Review” as current. Walk was corrected to current-status surfaces and a fresh server.
2. Revision still showed Open Review Room because `project-status` sync dropped `revision_requested`. Fixed, then retested.

Terms changed: job → service on Help Center / refund / continuity; Board current labels aligned; revision persist; Update History operational details.

Residues left: internal job identifiers, limited Campaign Strategy catalog labels, Idea Wall unused heading, Resend at `d6974eb`.

No remaining current-status contradiction on the scoped walk.

---

## Defects found / fixed

1. Board / Record followed coarse `campaignStatus`, so revision and post-approval still said Ready for Review / Open Review Room.
2. `deriveSpineStatus` did not persist `revision_requested`, so Board sync rewrote it to Review-ready.
3. Help Center and refund copy still said “job.”
4. Update History kept Review action-needed and Machine/QA detail after later states.
5. Paid incomplete intake Current Status still said Payment Received while the next action was intake.

---

## Automated totals

**136 / 136 PASS** on the scoped mixed-status / Board / Help / history / refund suite.

## Live customer-walk totals

**17 / 17 PASS.**

## Remaining Room 2 residue

- Live Resend / branded sender remains parked at `d6974eb` and does not block this section.
- Campaign Strategy preview labels remain for limited SKU `cp-001` (dormant on the Maya flyer path).
- Owner Console still uses job language (out of scope).
- Board shows one current project; mixed projects on one returning Board are still a later whole-customer sweep concern, not a contradiction inside one project.

## Owner dependence

**NONE.** Maya could read current status without Tagia explaining Campaign, job, task, QA, release checks, or candidate.

## Final commit / push / sync

Park tip recorded after this report. Pushed to `operating/design-renderer-proof-1`. **No merge.**

## Recommendation for the final Room 2 whole-customer sweep

Do **not** start it automatically. After Manager close, the remaining Room 2 slice is a **whole-customer truth/friction sweep** of the live spine (Lobby → Conversation Room → payment → intake → Board → Review → Final → Delivery → return later) as one returning customer, still without Owner Console and without reopening Resend.
