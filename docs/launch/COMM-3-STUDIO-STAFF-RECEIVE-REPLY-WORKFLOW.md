# COMM-3 — Studio Staff Receive-and-Reply Workflow

**Package:** `COMM-3 — Studio Staff Receive-and-Reply Workflow`
**Status:** Implementation staged · awaiting Tagia commit approval · **no customer Board panel**
**Date:** 2026-07-27

---

## 1. Protected tip and scope

| Field | Value |
|---|---|
| Base tip | `d02bb49e84e49ff821961a3bdd7242787db9bd56` — COMM-2 protected |
| Branch | `fix/discovery-responsive-layout` |
| Scope | Authorized staff **receive + reply** using COMM-2 records |
| Out of scope | Customer Board panel · customer submit API · email · attachments · Auth package · Owner Desk merge · MLL update |

Hierarchy C #4 and Gate #7 remain **MISSING** until COMM-4 (+ Auth for customer-facing certification).

---

## 2. COMM-1 and COMM-2 contracts

Inherited locks: Option B · Board is customer home (COMM-4) · separate domain · accepted-only · `customer` / `studio_staff` · reply targets same-campaign customer message · attachments deferred · Auth soft for design / hard for customer certification.

COMM-3 consumes:

- `createStudioProjectReply`
- `listProjectCommunicationForStaff`
- `hasStudioReply`

---

## 3. Existing staff surfaces inspected

| Surface | Verdict |
|---|---|
| Owner Desk / sequential Owner Console | Decision folders; owner-only — wrong primary home |
| Needs Communication (`JobCommunicationRecord`) | Outbound lifecycle outbox — **wrong domain** |
| Project activity staff review | Field-change requests — not project messaging |
| File Room campaign page `/file-room/[campaignId]` | **Correct home** — campaign-scoped, staff/owner protected |
| Studio Review / Owner QA | Dev tooling — not product home |

---

## 4. Selected staff workflow home

**OPTION B — File Room campaign workspace**

- Route: `/file-room/[campaignId]`
- Component: `FileRoomProjectCommunicationSection` mounted in `FileRoomCampaignScene`
- Why: already owns campaign identity, staff/owner gate, assignment-scoped campaign access, post-purchase project context
- Not a global inbox
- Not customer-navigable (File Room layout + proxy require staff/owner)

---

## 5. Staff authorization

| Check | Mechanism |
|---|---|
| Session | `requireSession` |
| Internal role | `isInternalUser` / File Room `isStaffOrOwner` |
| Campaign scope | `canReadCampaign` (owner all; staff assignment-gated) |
| COMM-3 gate | `canAccessStaffProjectCommunication` / `canReplyStaffProjectCommunication` |

Clients are **always denied** even if they own the campaign.

Unauthorized → **401** (no session) or **403** (wrong role / unassigned).

---

## 6. Staff identity

Derived from signed session (`user.id`, `user.displayName` / email).

Never accepted from request body (`staffUserId` spoof ignored).

No Host / Voice / AI attribution.

---

## 7. Campaign and customer context

Staff panel shows:

- Campaign display name + campaign id
- Campaign status (via API)
- Customer account id (`clientUserId`) when bound
- Chronological customer-visible messages with sender labels and timestamps
- Derived reply state via `hasStudioReply` (`studioHasReplied`)

Does not invent missing preferred names.

---

## 8. Receive workflow

1. Staff opens File Room campaign
2. Section loads `GET /api/campaigns/{campaignId}/project-communication`
3. Stream lists customer + Studio messages in order
4. Customer messages show awaiting / replied labels from real records

---

## 9. Reply workflow

1. Staff selects a customer message
2. Enters plain text (max 4000)
3. `POST` action `studio_reply` with `replyToMessageId` + `idempotencyKey`
4. Success copy: **Reply saved to the project communication record.**
5. No delivered / notified / seen / email / live claims

---

## 10. Server boundary

`src/app/api/campaigns/[campaignId]/project-communication/route.ts`

- `GET` — list staff-visible stream + context
- `POST` — `studio_reply` only
- Uses COMM-2 store/actions
- No customer submit action in COMM-3

---

## 11. Validation and idempotency

Delegated to COMM-2: trim · empty reject · max length · same-campaign customer target · idempotent replay · conflict 409.

UI keeps a fresh idempotency key after successful save.

---

## 12. Truthful status and copy

Config: `src/config/project-communication-staff-v1.ts`

Uses COMM-D4 waiting language where applicable. No response-time promise.

---

## 13. Domain separation

Does not read/write:

- `JobCommunicationRecord`
- `OwnerDecisionInteractionRecord`
- complaint/refund
- project-activity requests
- internal notes
- Intake answers

---

## 14. Responsive behavior

Panel uses existing File Room utility layout (`fr-*` patterns): wrap, full-width textarea, flex actions — usable on desktop and phone within File Room. No staff-shell redesign.

File Room is the intentional staff surface (not a customer phone journey).

---

## 15. Test evidence

| Suite | Focus |
|---|---|
| `src/lib/project-communication/access.test.ts` | Owner/staff allow · client/unassigned deny |
| `src/lib/project-communication-staff-route.test.ts` | Auth rejection · list · session-derived reply · spoof ignored · idempotent replay · conflict · empty body |
| `src/lib/project-communication/actions.test.ts` | COMM-2 regression (13) |
| Focused File Room browser smoke (`scripts/smoke-comm3-file-room.mjs`, not committed) | Desktop 1440 + phone 390 · natural reply · confirmation · refresh persistence · unauthorized 401/403 · **36/36 PASS** |

**Browser defect caught and fixed before commit:** client section must import `types` only — not the package barrel (which re-exports Node `fs` store).

---

## 16. COMM-4 handoff

COMM-4 may add:

- Customer Board panel
- Customer create API using `createCustomerProjectMessage`
- Customer-visible confirmation copy from COMM-2

Must not:

- Reuse File Room staff panel for customers
- Skip purchased-room Auth for customer-facing certification

---

## 17. Explicit exclusions

No Board customer panel · no email · no attachments · no read receipts · no typing indicators · no sockets · no response-time promise · no complaint/refund merge · no Help Center tickets · no Auth implementation · no COMM-5 · no ARCHIVE-1 · no MLL update

---

## 18. Customer-One readiness impact

Staff can now operate the mailbox. Gate #7 still **MISSING** until customers can send/see on Board (COMM-4) and Auth certification holds.

---

## 19. Remaining dependencies

- COMM-4 customer Board surface
- Purchased-room Auth (hard for customer-facing certification)
- COMM-5 notifications (deferred)

---

## 20. Final recommendation

**Approve COMM-3 commit** after staged-boundary review. Then push when authorized. Open COMM-4 separately.
