# COMM-5 — Customer Studio Reply Notification

**Package:** `COMM-5 — Customer Studio Reply Notification`
**Status:** Implementation staged · awaiting Tagia commit approval · Master Launch List unchanged
**Date:** 2026-07-27

---

## 1. Protected tip and scope

| Field | Value |
|---|---|
| Base tip | `696a78070fcde3036f10dc18f68d7c335a44c6a1` — COMM-4 protected |
| Branch | `fix/discovery-responsive-layout` |
| Scope | In-product Studio Board **new Studio reply** indicator + durable acknowledgment |
| Out of scope | Email · SMS · push · WebSockets · SSE · polling · read receipts · notification center · COMM-2/3/4 reopen · MLL update |

COMM-5 answers: how the customer knows The Studio replied without repeatedly opening the message panel — **on the Board only**.

---

## 2. COMM-1 through COMM-4 protected contracts

Inherited: Option B messaging · COMM-2 durable stream · COMM-3 File Room staff reply · COMM-4 Board list/send · roles `customer` / `studio_staff` · accepted-only · no attachments · no delivery/read/seen claims.

COMM-5 does not change message storage or staff workflow. It derives attention from existing `studio_staff` records plus a separate acknowledgment marker.

---

## 3. Existing notification patterns inspected

| Pattern | Verdict |
|---|---|
| Message `studioHasReplied` | Thread label only — not unread |
| Plan / checkout `acknowledgedAt` | Unrelated approval domain |
| Materials `blockingRequiredCount` | Model for campaign attention — not reused for messages |
| Board badges / Kitchen badges | Decorative or staff — wrong |
| localStorage / sessionStorage | Continuity only — not launch authority |

**No prior customer Studio-reply acknowledgment record existed.**

---

## 4. Selected notification boundary

In-product Studio Board indicator on the COMM-4 communication card header.

Not: email, SMS, push, sockets, global bell, inbox page.

---

## 5. Notification truth model

The system may know:

- a customer-visible `studio_staff` record exists
- its id and `createdAt`
- the customer’s last acknowledged Studio reply id for that campaign
- whether the newest Studio reply id differs from that marker

The system must not claim: read, seen, delivered, emailed, live staff, or response time.

---

## 6. Acknowledgment definition

Acknowledgment means only:

> The customer intentionally entered project messages after this Studio reply existed (via **View project messages**).

It does not mean the reply was read, understood, or agreed to. Staff must not see this as “read.”

---

## 7. Acknowledgment storage

New durable domain (does not overload COMM-2 message status):

```text
data/project-communication-ack/{campaignId}__{customerUserId}.json
```

Envelope fields: `version`, `campaignId`, `customerUserId`, `lastAcknowledgedStudioReplyId`, `lastAcknowledgedStudioReplyCreatedAt`, `acknowledgedAt`, `channel`, `updatedAt`.

Module: `src/lib/project-communication-ack/`.

---

## 8. Customer authorization

`requireSession` · `isClientUser` via `canReadCustomerProjectCommunication` · session-derived `user.id`.

---

## 9. Campaign ownership

Same binding rules as COMM-4 customer read. Cross-customer → 403. Spoofed `customerUserId` ignored.

---

## 10. Derivation from Studio replies

`hasNewStudioReply` when newest customer-visible `studio_staff` message id ≠ `lastAcknowledgedStudioReplyId` (or no ack).

Customer-only messages, internal notes, complaint/refund/Intake/activity/outbox do not produce the indicator.

---

## 11. Indicator location and copy

Location: COMM-4 section header on `/studio-board`.

| Copy | Text |
|---|---|
| `New reply from The Studio` | Indicator |
| `View project messages` | Explicit action |
| `Project messages` | Header when notice is active |

Calm border callout — no pulsing animation.

---

## 12. Acknowledgment trigger

Explicit **View project messages** click (scrolls thread + POSTs acknowledgment of newest Studio reply).

Not: Board route load, hidden mount, prefetch, below-fold visibility, or sending a customer message.

---

## 13. API or server-action boundary

Narrow route (COMM-4 customer route unchanged for send/list):

```text
GET|POST /api/campaigns/[campaignId]/project-communication/acknowledgment
```

- GET → `{ notification }`
- POST `acknowledge_studio_reply` → validates newest same-campaign `studio_staff` id

---

## 14. Multi-campaign behavior

Ack files are per `campaignId` + `customerUserId`. Acknowledging A does not clear B. Active Board campaign selects which thread/indicator shows.

---

## 15. Failure behavior

Ack save failure → error shown; indicator remains; thread/composer still usable. Notification load failure → neutral (no false “no new reply” claim via indicator); Board remains usable.

---

## 16. Accessibility

Text indicator (not color alone) · keyboard-reachable action · `role="status"` · no continuous animation · reduced-motion friendly scroll.

---

## 17. Desktop and phone proof

Playwright smoke (uncommitted): **24/24 PASS** — desktop ~1440 · phone ~390 · no-reply / new-reply / ack / persist / newer-reply / auth.

---

## 18. Automated test evidence

```text
npx vitest run src/lib/project-communication-ack/actions.test.ts \
  src/lib/project-communication-ack-route.test.ts \
  src/lib/project-communication/access.test.ts \
  src/lib/project-communication/actions.test.ts \
  src/lib/project-communication/customer-ui.test.ts \
  src/lib/project-communication-staff-route.test.ts \
  src/lib/project-communication-customer-route.test.ts
```

**36 passed** (COMM-5 + COMM-2/3/4 regression).

---

## 19. COMM-3 and COMM-4 regression proof

Staff route tests still pass. Customer send/list tests still pass. Board materials preserved in browser smoke.

---

## 20. Explicit exclusions

Email · SMS · push · browser notifications · WebSockets · SSE · rapid polling · notification center · global inbox · attachments · read/delivered/seen · typing · live agent · response-time promises · staff notify controls · Host/Voice/AI · complaint/refund merge · Help Center tickets · Board redesign · Auth redesign · MLL update · ARCHIVE-1.

---

## 21. Customer-One readiness impact

Completes the smallest honest “Studio replied” Board signal. Hierarchy C #4 / Gate #7 still require a **separate** Master Launch List certification pass — this package does not mark them complete.

---

## 22. Master Launch List recommendation

Do **not** update the MLL in this commit. After Tagia protects COMM-5, schedule a dedicated truth-refresh to decide Hierarchy C #4 / Gate #7 status against COMM-2…COMM-5 + Auth cert.

---

## 23. Remaining external-notification options

Future optional packages may add email/SMS/push **after** Board acknowledgment exists — separate contracts, never implied by this indicator.

---

## 24. Final recommendation

**Approve COMM-5 commit** after Tagia review of the staged boundary.

Do not push until authorized. Do not update the Master Launch List in this package.
