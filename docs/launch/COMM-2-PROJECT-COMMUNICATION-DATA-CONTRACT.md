# COMM-2 — Project Communication Data Contract

**Package:** `COMM-2 — Project Communication Data Contract`
**Status:** Implementation staged · awaiting Tagia commit approval · **no UI**
**Date:** 2026-07-26

---

## 1. Protected tip and package scope

| Field | Value |
|---|---|
| Base tip | `425ba82a80d7e5d486b3ecdbd5820f055c922687` — COMM-1 protected |
| Branch | `fix/discovery-responsive-layout` |
| Scope | Durable project-communication **domain contract + persistence** only |
| Out of scope | Board UI · staff UI · HTTP customer APIs · Auth implementation · email · attachments · complaint/refund merge |

Hierarchy C #4 and Gate #7 remain **MISSING** until COMM-3/COMM-4 (+ Auth for customer-facing certification).

---

## 2. Approved COMM-1 decisions (inherited)

| ID | Lock |
|---|---|
| COMM-D1 | Option B — customer message form + Studio reply record |
| COMM-D2 | Authenticated Studio Board is the communication home |
| COMM-D3 | Separate domain from complaint/refund/owner-decision/notes/intake/activity |
| COMM-D4 | Copy: “Message sent to The Studio.” / “The Studio has not replied yet.” |
| COMM-D5 | Soft Auth dependency for data design · hard for customer-facing certification |
| COMM-D6 | Attachments deferred |

---

## 3. Domain boundaries

**NEW domain:** `src/lib/project-communication/`

**Not extended:**

- `JobCommunicationRecord` (Studio→customer lifecycle outbox)
- `OwnerDecisionInteractionRecord` (complaint/refund desk)
- `InformationUpdateRequest` (project-activity field updates)
- `JobInternalNote` / intake answers / campaign activity events

**Pattern reuse only:** campaign-scoped JSON envelope under `data/`, write locks + atomic replace, idempotency replay/409, plain attribution fields.

---

## 4. Record schema

`ProjectCommunicationMessage`:

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Message identity |
| `campaignId` | string | Project ownership |
| `customerUserId` | string \| null | Owning customer account when known |
| `senderRole` | `customer` \| `studio_staff` | Explicit roles only |
| `senderUserId` | string | Real actor id |
| `senderDisplayName` | string? | Optional label |
| `body` | string | Trimmed plain text |
| `createdAt` | ISO string | Immutable creation time |
| `status` | `accepted` | System accepted into durable storage |
| `visibility` | `customer_visible` | Domain stores only customer-visible records |
| `replyToMessageId` | string \| null | Studio reply → same-campaign **customer** message answered (not a generic parent tree) |
| `idempotencyKey` | string | Scoped by campaign + senderUserId |
| `creationChannel` | `customer_board_form` \| `studio_staff_reply` | Source channel |
| `sourceContext` | `project_communication` | Domain marker |

Envelope: `ProjectCommunicationEnvelope` — `{ campaignId, messages[], updatedAt, version }`
File: `data/project-communication/{campaignId}.json` (gitignored `/data/`).

---

## 5. Sender attribution

Allowed: `customer`, `studio_staff`.

Forbidden as roles: `ai`, `host`, `voice`, ambiguous unowned `studio`.

Studio Voice journey output is **not** a staff reply and must not write into this domain.

---

## 6. Project ownership

- One envelope file per `campaignId`
- Customer creates require `customerUserId === senderUserId`
- Staff replies carry the project’s `customerUserId` for future Auth binding
- Cross-project list isolation is by separate files + campaignId checks
- Purchased-room Auth APIs (future) can wrap create/list without schema migration

---

## 7. Status truth

Only **`accepted`**: durable storage accepted the record.

Does **not** mean: delivered · read · seen · replied · pending human review.

Whether a Studio reply exists is derived via `replyToMessageId` / `hasStudioReply`, not a false message status.

---

## 8. Threading model

- **One ordered communication stream per campaign** (chronological; no nested conversation trees)
- Customer root messages: `replyToMessageId = null`
- On a **Studio staff** reply, `replyToMessageId` identifies the same-campaign **customer message being answered** — not a generic parent-message pointer and not a nest-under-Studio-reply tree
- Staff replies that target a missing id, another campaign, or a non-customer message are rejected
- Future back-and-forth may continue as additional chronological messages in the same campaign stream without nesting replies beneath Studio replies
- No separate conversation/thread ids for Customer-One
- Ordering: `createdAt` ascending, then `id`

---

## 9. Visibility model

- This domain stores **only** `customer_visible` project communication
- Internal notes remain in job-control / production workspace stores
- Customer and staff list helpers filter `visibility === "customer_visible"` (defense in depth)

---

## 10. Storage adapter

Same architectural pattern as project-activity:

- `readProjectCommunicationEnvelope`
- `writeProjectCommunicationEnvelope` (lock + atomic replace)
- `getOrInitializeProjectCommunication`

No new database provider.

---

## 11. API boundary

**CONTRACT AND STORE ONLY** for COMM-2.

No HTTP routes. COMM-3/COMM-4 own API surfaces with Auth enforcement.

Reason: cannot fake purchased-room Auth; exposing ungated routes would be unsafe.

---

## 12. Idempotency

- Key required (non-empty)
- Scope: `campaignId` envelope + `senderUserId` + `idempotencyKey`
- Same key + same payload → return original (`replayed: true`)
- Same key + different body/role/reply target → **409**

Does not rely on button disabling.

---

## 13. Validation

- Campaign id required (trimmed non-empty)
- Body required after trim; max **4000** characters
- Plain text only (no Markdown/HTML pipeline)
- Empty/whitespace rejected
- Staff reply requires existing customer message in the **same** campaign
- Sender role enforced by create path (customer vs staff functions)

---

## 14. Retention and immutability

Customer-One:

- Messages and replies are **immutable** after create
- No edit API
- No delete API
- No silent deletion
- Auditable via durable envelope history

---

## 15. Auth dependency

| Layer | Rule |
|---|---|
| Data design (COMM-2) | Soft dependency — ownership fields present |
| Customer-facing certification | **Hard dependency** — purchased-room Auth |
| Session-only identity | Must not become permanent security model |

COMM-2 does **not** implement Auth.

---

## 16. Attachments deferred

No attachment fields, upload tokens, MIME types, or storage URLs on the message type.

---

## 17. Test evidence

Focused Vitest: `src/lib/project-communication/actions.test.ts`

Covers: create customer · create staff reply · empty/over-limit · invalid campaign · cross-project isolation · internal-note exclusion · ordering · idempotent replay · conflict 409 · disk reread persistence · no complaint/refund/host/voice attribution · no attachments · foreign reply target rejected.

---

## 18. COMM-3 and COMM-4 handoff contracts

### COMM-3 (staff receive-and-reply)

Consume:

- `createStudioProjectReply`
- `listProjectCommunicationForStaff`
- `hasStudioReply`

Must:

- Use real staff `senderUserId`
- Never auto-attribute Voice/AI
- Keep complaint/refund on separate domains
- Enforce Auth/authorization at API boundary

### COMM-4 (customer Board surface)

Consume:

- `createCustomerProjectMessage`
- `listProjectCommunicationForCustomer`
- `PROJECT_COMMUNICATION_COPY` for confirmation/waiting strings
- Derive waiting state with `hasStudioReply` (not a fake “pending review” status)

Must:

- Live inside authenticated Studio Board project context
- Not open ungated Project Record as COMM home
- Text-only compose; no attachments

---

## 19. Explicit exclusions

No Board panel · no staff desk UI · no email · no notifications · no Auth package · no attachment support · no Master Launch List update · no CR/ARCHIVE reopen · no complaint/refund subtype · no simulated chat

---

## 20. Final readiness recommendation

**Approve COMM-2 commit** after staged-boundary review.

Then: push when authorized → open **COMM-3** (staff workflow) separately. Do not start COMM-4 until staff can truthfully reply.
