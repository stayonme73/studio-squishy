# COMM-4 — Customer Studio Board Communication Surface

**Package:** `COMM-4 — Customer Studio Board Communication Surface`
**Status:** Implemented customer Board messaging surface · Hierarchy C #4 / Gate #7 remain MISSING pending separate launch-list certification · **do not begin COMM-5**
**Date:** 2026-07-27

---

## 1. Protected tip and scope

| Field | Value |
|---|---|
| Base tip | `e19da6c337044f8443513f063ffe903f0bb44324` — COMM-3 protected |
| Branch | `fix/discovery-responsive-layout` |
| Scope | Authenticated customer **list + send** on Studio Board using COMM-2 records |
| Out of scope | Email · SMS · push · attachments · live chat · response-time promises · Help Center · complaint/refund · File Room redesign · Auth redesign · COMM-5 · MLL update |

Hierarchy C #4 and Gate #7 remain **MISSING** for full Customer-One certification until notifications (COMM-5) and purchased-room Auth certification land as separate packages. COMM-4 delivers the Board surface against existing campaign ownership.

---

## 2. COMM-1 through COMM-3 protected contracts

Inherited locks (not reopened):

- Option B message form + Studio reply record
- Board is the customer home
- Separate domain from complaint / refund / Intake / Help / email
- Roles `customer` / `studio_staff` · status `accepted` only · immutable · chronological stream
- Reply targets same-campaign customer message
- Body max 4,000 · idempotency · no attachments · no delivery/read/seen/email status
- Staff workflow remains File Room (`COMM-3`)

COMM-4 consumes:

- `createCustomerProjectMessage`
- `listProjectCommunicationForCustomer`
- `hasStudioReply`
- Staff replies already written by COMM-3

---

## 3. Studio Board surfaces inspected

| Surface | Verdict |
|---|---|
| `/studio-board` (`StudioBoardScene`) | **Selected** — authenticated customer project home; owns active campaign via `useCurrentCampaign` |
| Materials We Still Need row | Preserve — peer section below board grid |
| Project Snapshot / Progress / Current cards | Preserve — not replaced |
| Lobby / Conversation Room / Intake | Wrong room |
| Help Center / complaint / refund | Wrong domain |
| File Room | Staff-only reply side (COMM-3) |
| Owner Desk / Needs Communication | Wrong domain |

Board source files were clean at tip before COMM-4 edits (`StudioBoardScene.tsx`, `studio-board.css`).

---

## 4. Selected customer communication home

**OPTION A — Project detail communication section**

- Mount: `StudioBoardProjectCommunicationSection` as a full-width card **below** `sb-board-layout` inside `sb-main`
- Why: Board already resolves the active campaign; section reuses that campaign id; does not require a second dashboard or File Room navigation
- Not an inbox; one campaign stream only

---

## 5. Customer authorization

| Check | Mechanism |
|---|---|
| Session | `requireSession` |
| Pure client role | `isClientUser` (excludes owner/staff dual-role accounts) |
| Read | `canReadCustomerProjectCommunication` → `canReadCampaign` |
| Create | `canCreateCustomerProjectCommunication` → binding / allowlist / unbound+current (mirrors materials submit) |

Unauthorized → **401** (no session) or **403** (wrong role / other customer’s campaign).

**Auth hard gate result:** Existing purchased-room / campaign session **is sufficient** for secure campaign-scoped messaging. No demo bypass. No hard-coded customer identity in product code.

---

## 6. Customer identity and campaign ownership

| Concern | Source |
|---|---|
| Customer user id | Signed session `user.id` only |
| Campaign id | Board active campaign / trusted route param validated server-side |
| Ownership | `envelope.clientUserId` / `clientCampaignIds` / unbound+current |
| Display name | Session `displayName` or email when present — never invented |
| Sender role | Always `customer` from server — browser cannot choose `studio_staff` |

Arbitrary body fields (`customerUserId`, `senderUserId`, `senderRole`) are **ignored**.

---

## 7. Receive workflow

Customer GET returns customer-visible messages only:

- Labels: **You** / **The Studio**
- Body · timestamp · chronological order
- Per-customer-message awaiting / replied hints when accurate
- Empty: `No project messages yet.`
- Omits staff ids, idempotency keys, internal notes, complaint/refund/Intake domains

---

## 8. Send workflow

Composer on Board:

- Trim · max 4,000 · whitespace rejection · one submit · busy/success/error · composer reusable after success
- Success copy (protected): `Message sent to The Studio.`
- Awaiting copy (protected): `The Studio has not replied yet.`
- No delivered / read / seen / email / live / Host / Voice / AI claims

---

## 9. API or server-action boundary

**Narrow customer route** (staff COMM-3 route unchanged):

`GET|POST /api/campaigns/[campaignId]/project-communication/customer`

| Action | Behavior |
|---|---|
| GET | Session client + ownership → customer-safe message views |
| POST `customer_message` | Session-derived actor → `createCustomerProjectMessage` |
| POST `studio_reply` | **400 Unsupported action** on customer route |
| Staff route | Still staff-only; clients **403** |

---

## 10. Validation and idempotency

Delegated to COMM-2:

- Whitespace / over-limit → 400
- Idempotent replay → same record + `replayed: true`
- Conflicting key → **409**

---

## 11. Truthful states and copy

| State | Copy / behavior |
|---|---|
| Empty | `No project messages yet.` |
| Loading | Neutral “Loading project messages…” |
| Success | `Message sent to The Studio.` |
| Failure | Recoverable error — never success copy |
| Unreplied customer message | `The Studio has not replied yet.` |

---

## 12. Staff-reply display

Studio staff replies from COMM-3 appear in the same stream labeled **The Studio**. No staff user ids exposed to the customer API view.

---

## 13. Domain separation

No merge with Help Center, complaint, refund, Intake, outbox, Owner Desk, or email. Customer cannot invoke staff reply behavior on the customer route; staff route remains protected.

---

## 14. Board preservation

Communication is additive below the existing 2×3 board grid. Materials, progress, snapshot, welcome, sign-out, and campaign selection remain. Phone stacks with overflow visible; desktop constrains communication panel height with internal scroll.

---

## 15. Accessibility

- Textarea labeled `Message to The Studio`
- Focus-visible styles on textarea
- `aria-live` status for success/error
- Loading exposed via `aria-busy`
- Enter does not force-submit (form submit via button; multi-line textarea preserved)
- Duplicate submit guarded by busy + disabled control

---

## 16. Desktop and phone proof

Playwright smoke (`scripts/smoke-comm4-studio-board.mjs`, **not committed**): **38/38 passed**

- Desktop ~1440px · Phone ~390px
- UI send · exact success copy · You / The Studio · refresh persistence · no horizontal overflow
- File Room redirects customer to access-denied (staff reply UI absent)
- Unauth 401 · cross-customer 403 · spoofed identity ignored

---

## 17. Automated test evidence

```text
npx vitest run \
  src/lib/project-communication/access.test.ts \
  src/lib/project-communication/actions.test.ts \
  src/lib/project-communication/customer-ui.test.ts \
  src/lib/project-communication-staff-route.test.ts \
  src/lib/project-communication-customer-route.test.ts
```

**29 passed** (COMM-2 actions + COMM-3 staff route regression + COMM-4 access/route/ui contract).

---

## 18. Customer-One readiness impact

Unblocks customer-visible project messaging on Studio Board for owned campaigns. Full Customer-One communication certification still depends on purchased-room Auth package certification and COMM-5 notifications (deferred). Hierarchy C #4 / Gate #7 stay **MISSING** until those land.

---

## 19. Remaining dependencies

- Purchased-room Auth certification (hard for Customer-One cert; soft for this design package)
- COMM-5 notification handoff
- Optional: longer Board layout polish if communication volume grows

---

## 20. COMM-5 notification handoff

COMM-5 should notify customers when a Studio reply is accepted — without changing this Board stream contract. Do not implement here.

---

## 21. Explicit exclusions

Email · SMS · push · attachments · receipts · typing · WebSockets · live chat · response-time promises · complaint/refund merge · Help Center ticketing · File Room redesign · Owner Desk inbox · Auth redesign · Voice/Host/AI replies · automatic Studio replies · COMM-5 · MLL update · ARCHIVE-1 · unrelated Board cleanup.

---

## 22. Final recommendation

**Approve COMM-4 commit** after Tagia review of the staged boundary.

Do not push. Do not begin COMM-5. Do not update the Master Launch List in this package.
