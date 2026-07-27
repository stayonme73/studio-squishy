# COMM-1 — Customer Communication and Follow-Up Access Inspection

**Package:** `COMM-1 — Customer Communication and Follow-Up Access Inspection`
**Status:** **COMPLETE** · owner decisions COMM-D1–COMM-D6 **LOCKED** · no product implementation · Hierarchy C #4 and Gate #7 remain **MISSING**
**Date:** 2026-07-26

### COMM-1 result (locked)

| Field | Value |
|---|---|
| Finding | Two-way customer project communication is **MISSING** |
| Approved model | **Option B** — Customer message form plus Studio reply record |
| Blocker classification | **REQUIRES PACKAGE SPLIT** |
| Hierarchy C #4 | Still **MISSING** (do not mark complete) |
| Gate #7 | Still **MISSING** (do not mark complete) |
| Product built in COMM-1 | **None** |

---

## 1. Protected tip and checklist authority

| Field | Value |
|---|---|
| Protected tip | `94712260aa2a5664def3b22b0556bb3d48656311` — `docs: refresh Master Launch List truth to tip eaf3c239` |
| Branch | `fix/discovery-responsive-layout` |
| Sync at inspection | **0 ahead / 0 behind** |
| Hierarchy C #4 | `Customer communication and follow-up access — MISSING` · **not started** (surface still missing after COMM-1) |
| Customer-One Gate #7 | `Customer can communicate with The Studio — MISSING` |
| Voice matrix | Doctrine V3 locked (behavior); **surface still Missing** (`STUDIO-VOICE-DEFINITION-AND-CUSTOMER-PRESENCE-DOCTRINE.md`) |

**Anti-loop:** Do not reopen Conversation Room certification, CR-5 / ARCHIVE-1, Voice definition, Intake handoff, Board arrival, or recommendation-engine work. Those are protected history. COMM-1 only settles whether a post-purchase customer↔Studio communication path exists and what the smallest truthful Customer-One model is.

---

## 2. Current communication inventory

### What exists (evidence-backed)

| Capability | Reality |
|---|---|
| Two-way customer project messaging / inbox | **MISSING** |
| Customer “message The Studio” CTA on Board | **MISSING** |
| Complaint / refund customer UI | **MISSING** (API + Owner Desk exist for refund/complaint after a record is created) |
| One-way Studio → customer status / notes | **LIVE** (Board timeline + derived studio note) |
| Project Record information-update requests | **LIVE** (structured field/material updates — **not** freeform support chat) |
| Staff outbound job communication outbox | **PARTIAL / INTERNAL** (`JobCommunicationRecord`, `pending_owner_send`, owner test-send) |
| Owner Desk complaint / refund folders | **LIVE INTERNAL** (`OwnerDecisionInteractionRecord`) |
| Transactional email (Resend) | **LIVE for auth only** (verify / reset) — **not** project messaging |
| Conversation Room Speak / Type dock | **LIVE** for journey conversation — **NOT** post-purchase follow-up |
| Help Center | **LIVE** policies/FAQ — **no** ticket / project message form |

### False friends (do not treat as COMM-1)

- Conversation Room Communication Glow / Voice Activity / typed dock
- Campaign materials “campaign message” cards
- Project Builder demo conversation thread
- Studio Kitchen client-contact fixtures
- Working-draft attribution history (pre-payment)
- Staff `JobInternalNote` / Kitchen owner notes

---

## 3. Customer-facing surfaces

| Surface | Finding | Classification |
|---|---|---|
| Studio Board (`StudioBoardScene`) | Help Center link; progress timeline (last activity lines); no message composer / inbox | **LIVE** one-way status · **MISSING** two-way comms |
| `CampaignProgressPanel` | Shows `ActivityFeedEntry[]` (`date` / `message`) from milestones | **LIVE** · **NOT COMMUNICATION** (system timeline) |
| `ActivityFeed.tsx` / `StudioNotePanel.tsx` | Orphan components not wired into live Board scene | **SCAFFOLD ONLY** |
| Project Record information updates | Customer can submit structured updates + optional `note?`; status visible | **LIVE** · **NOT COMMUNICATION** (field/change requests) |
| Help Center | Policies, FAQ, Quick Guide; FAQ states progress lives on Board, not automated email | **LIVE** journey help · **NOT** project messaging |
| Review / Final Delivery | Revision/approve/download flows; refund channel *names* exist; no general message UI | **PARTIAL** adjacent · **MISSING** general comms |
| Conversation Room dock | Speak/Type for Discovery→Intake journey; send does not create a durable staff-visible project message thread | **LIVE** journey · **NOT COMMUNICATION** for follow-up |
| Complaint entry UI | Listed missing in MLL / inventory | **MISSING** |
| Refund request customer UI | `POST …/jobs/[jobId]/refund-request` exists; **no customer component found calling it** | **PARTIAL** backend · **MISSING** customer UI |

**Board already contains a partial *status* surface (timeline / studio note), not a communication surface.**

---

## 4. Staff-facing surfaces

| Surface | Finding | Classification |
|---|---|---|
| File Room Owner Control Room — Needs Communication queue | Lists pending `JobCommunicationRecord` outbox items; **Mark test-sent** | **LIVE BUT INTERNAL** · Studio→customer outbound only |
| Owner Decision Desk (`OwnerDecisionFolderSurfaces`) | Complaint / refund / scope folders; shows `clientMessage`; owner actions | **LIVE BUT INTERNAL** · requires an interaction record first |
| Production workspace internal notes | Explicitly never client-visible | **LIVE BUT INTERNAL** |
| Studio Kitchen owner notes / contact block | Fixtures / demo | **SCAFFOLD / INTERNAL** |
| Owner QA | Journey QA seeds; no customer-message inbox | **LIVE BUT INTERNAL** · **NOT** COMM inbox |
| Decision Core outgoing communication | Enqueues lifecycle outbox templates | **PARTIAL** automation · not customer-initiated thread |

**Gap:** Staff can manage **outbound lifecycle notices** and **complaint/refund desk items**, but there is **no** general “customer sent a project message” inbox for freeform follow-up.

---

## 5. Data and storage

### Customer-visible / customer-writable (adjacent)

| Model | Location | Role |
|---|---|---|
| `StudioUpdate` / `studioNotes` | `src/config/studio-board.ts` | Studio→customer note lines |
| `ActivityFeedEntry` | `src/lib/campaign-record.ts` | Derived milestone timeline |
| `InformationUpdateRequest` | `src/lib/project-activity/types.ts` | Structured update requests + optional note; staff-only `suggestedClassification` |
| Materials submit | Materials APIs | Production files — not message attachments |

### Staff / system

| Model | Location | Role |
|---|---|---|
| `JobCommunicationRecord` | `src/lib/job-control/types.ts` | Outbound template messages; `channel: in_app_outbox \| test_email`; `deliveryStatus: pending_owner_send \| test_sent \| cancelled` |
| `JobActivityEvent` | same | Includes `client_communication` kind — activity log, not inbox |
| `JobInternalNote` | same | Internal only |
| `OwnerDecisionInteractionRecord` | `src/lib/campaign-tasks/owner-decision-interaction-types.ts` | `interactionKind` + `clientMessage` + status + optional `refundSnapshot` |
| Decision Core `CustomerInteractionKind` | `src/decision-core/types.ts` | Includes `complaint`, `refund_request`, `revision_message`, inquiry-like kinds — **effects exist; customer front doors mostly missing** |

### Storage medium

Campaign / tasks envelope persistence (server campaign store + tasks schema versions for `jobCommunicationRecords` / `ownerDecisionInteractions`). **No dedicated customer message-thread table or API.**

**Do not assume campaign notes, internal notes, intake answers, attribution logs, or activity feeds are customer communication.**

---

## 6. Authentication and project ownership

| Mechanism | Evidence | COMM implication |
|---|---|---|
| Proxy gate | `proxy.ts` protects `/studio-board`, `/feedback-studio`, `/review-room`, `/deliverables` → sign-in | Board entry requires signed-in session for those routes |
| Project Record gap | `/campaign-details` **not** in proxy matcher | Documented auth gap; not a safe COMM home until gated |
| Campaign ownership APIs | `canReadCampaign` / `requireReadableCampaign` (`clientUserId`, `clientCampaignIds`) | Live for campaign data APIs when called |
| MLL Auth lock | Purchased-room Auth Route/Data Protection **MISSING** · locked **before Customer-One** | External / trial readiness still depends on Auth package |
| Messaging ownership | No message store to protect | Cannot claim messaging is ownership-scoped until a message contract exists |

**COMM-1 does not implement purchased-room auth.**
Safe Customer-One placement: **authenticated Studio Board** (inherits existing proxy + ownership APIs). Do **not** place COMM on ungated Project Record. Full Customer-One readiness still lists Auth as a separate locked gate.

---

## 7. Email and notification capability

| Item | Finding |
|---|---|
| Resend adapter | `src/lib/transactional-email/providers/resend.ts` — requires `RESEND_API_KEY` + `TRANSACTIONAL_EMAIL_FROM` |
| Kinds supported | `email-verification` · `email-verification-resend` · `password-reset` only |
| Project / message notification email | **MISSING** |
| Owner “test-send” | Marks outbox test-sent; **not** live customer delivery product |
| Help Center FAQ | Progress is on Studio Board; **not** automated email notifications |
| `.env.example` | Documents transactional provider vars — working tree shows **DIRTY WIP** on this file; do not treat dirty edits as protected truth |

**Email is not required** for a truthful Customer-One in-app Board message path. Email can remain deferred. Do not select a paid provider in this package. Do not claim notifications work without a mechanism.

---

## 8. Follow-up access

| Path | Role today | Owns COMM? |
|---|---|---|
| Studio Board | Post-purchase home; Returning Client / handoff destination | **Intended owner** (surface missing) |
| Returning Client (Lobby) | Bridges to Board or sign-in→Board | Bridge only |
| Sign-in `from=` | Auth gate | Gate only |
| Account handoff | Intake → Board | Bridge only |
| Email deep links | Auth verify/reset only | **Not** COMM |
| Help Center | Policies | **Not** COMM |
| Conversation Room | Journey construction | **Not** post-purchase follow-up |

**Follow-up access for Customer-One** must mean: signed-in customer returns to **Studio Board** for the same project and can open the communication surface, see prior messages / status, and send another message without a parallel portal.

Do **not** create a separate customer portal.

---

## 9. Help Center boundary

| Concern | Owner surface |
|---|---|
| Journey / policy / FAQ help | Help Center (**LIVE**) |
| Technical product how-to | Help Center |
| Project-specific follow-up with The Studio | **Future COMM surface on Board** (MISSING) |
| Billing / refund / complaint | Future structured entry + Owner Desk (UI missing; desk **INTERNAL LIVE**) |
| Studio Voice on sensitive topics | V3: available on request; escalate money/trust to Tagia — **does not replace** a durable message record |

**Do not turn Help Center into the project message system** without owner approval. Board may link to Help for policies while hosting project communication separately.

---

## 10. Attachment boundary

| Capability | Classification |
|---|---|
| Message attachments | **MISSING** · **deferrable** for Customer-One |
| Materials file upload | **LIVE** for production materials — separate system |
| File Room staff uploads | **LIVE BUT INTERNAL** |

**Customer-One recommendation:** text-only project messages first. Route file needs to Materials / existing production intake. Do not casually make The Studio the permanent keeper of arbitrary customer files via COMM.

---

## 11. Mobile and desktop entry points

| Viewport | Natural COMM entry | Crowding risk |
|---|---|---|
| Desktop Board | Sidebar or project panel action (“Message The Studio” / project updates area) | Avoid competing with Materials / progress as primary |
| Phone / narrow Board | Same Board scene; responsive sidebar | Prefer panel/sheet over new route if possible |
| Conversation Room | **Exclude** from post-purchase COMM entry | Different job |

No visual redesign in COMM-1. Entry point recommendation: **Studio Board panel** (form vs thread UI decided in later package after owner decision).

---

## 12. Truth-question answers

| # | Question | Evidence-backed answer |
|---|---|---|
| 1 | What happens when the customer sends a message? | **Today: nothing durable for general follow-up.** No customer send path. Closest: information-update submit or (if wired) refund API. |
| 2 | Where is it stored? | **No general message store.** Closest patterns: project-activity requests; `OwnerDecisionInteractionRecord.clientMessage`; tasks envelope. |
| 3 | Who can read it? | N/A for missing inbox. Future: campaign-owned customer + staff with campaign access; never cross-customer. |
| 4 | How does Tagia know it arrived? | **No reliable general path today.** Owner Desk queues only after complaint/refund interaction exists; outbox is Studio→customer. |
| 5 | How does Tagia respond? | Outbound lifecycle outbox + desk actions for complaint/refund. **No general reply composer tied to a customer thread.** |
| 6 | Where does the customer see the response? | One-way Board timeline/studio note today. **No reply thread.** |
| 7 | How is the correct project identified? | Campaign id + ownership APIs when APIs are used. COMM must bind every message to `campaignId` (+ optional `jobId`). |
| 8 | Customer returns later? | Returning Client → Board. History would live on Board COMM surface — **not built**. |
| 9 | No response yet? | Must show truthful waiting state (e.g. “Message received — waiting for The Studio”). **Not built.** Must not fake replies. |
| 10 | Delivery / timing promised? | **Must not invent SLA.** Copy should be restrained (received / under review / replied). Owner decision on wording. |
| 11 | Email delivery fails? | N/A if in-app-only. If email added later: fail visibly; never claim sent without adapter success. Auth email already has delivery logging patterns. |
| 12 | Record retained? | Must be yes for project-linked COMM (campaign store / tasks envelope pattern). **Not built for general messages.** |
| 13 | Internal notes leak? | Risk if UI reuses `JobInternalNote` / ownerNotes. Must keep separate customer-visible thread fields. |
| 14 | Requires purchased-room auth first? | **Soft dependency.** Board proxy + ownership APIs exist; full Auth package still locked before Customer-One. Place COMM only on gated purchased rooms. Do not bypass Auth. |

---

## 13. Customer-One minimum options

| Option | Fit |
|---|---|
| **A — In-app project thread** | Desirable UX long-term; **not smallest**. Risk of fake-chat expectations; no existing thread store. |
| **B — Customer message form + Studio reply record** | **Best fit.** Customer submits project-linked message; staff responds via internal desk; Board shows status + replies. Extends known patterns (`OwnerDecisionInteractionRecord`, project-activity status, outbox discipline). |
| **C — Project-linked email bridge** | **Weak for V1.** Resend is auth-only; FAQ says Board not email; delivery/ops complexity. Defer. |
| **D — Controlled Customer-One manual follow-up** | Truthful interim if Tagia accepts off-system staff handling with Board instructions only. **Weak soft-opening proof**; does not close Gate #7 for external customers. |
| **E — Existing stronger path** | **None found.** |

---

## 14. Approved launch model (COMM-D1)

### **OPTION B — Customer message form + Studio reply record** — **APPROVED**

Customer-One communication must provide:

- a durable customer-authored project message
- sender identity
- project or campaign identity
- timestamp
- delivery status
- a durable Studio-authored reply
- customer-visible message history
- clear separation between customer, Studio staff, and system events

**Do not create:** simulated chat · AI-authored staff replies · typing indicators · live-agent claims · fake real-time behavior · automatic promises that someone is currently reading

**Customer-One behavior sketch (not built)**

1. Signed-in customer opens authenticated Studio Board → project communication panel/section
2. Submits text bound to `campaignId`
3. Sees confirmation: **Message sent to The Studio.**
4. Waiting state may say: **The Studio has not replied yet.**
5. Tagia/staff receives and replies through COMM-3 staff workflow
6. Customer returns to Board and reads reply + history

**Explicit non-goals for first build:** live chat, AI staff, fake typing indicators, email push, attachments, Help Center takeover, Conversation Room follow-up inbox.

---

## 15. Package dependencies

| Dependency | Relationship |
|---|---|
| Purchased-room Auth (Hierarchy C #6) | **Soft dependency for COMM-2 data design · hard dependency for customer-facing communication certification.** Do not implement Auth inside COMM packages. |
| Studio Board truth / Materials dual UX | Adjacent; do not absorb into COMM |
| Complaint / refund entry | May later share a **shell** only; records remain a **separate domain** (COMM-D3) |
| Email notifications | **COMM-5 deferred** unless Customer-One operations require it |
| ARCHIVE-1 / CR work | **Out of scope** — do not reopen |

---

## 16. Locked implementation sequence

| Package | Scope | Must not |
|---|---|---|
| **COMM-2** — Project communication data contract | Durable project communication records, ownership fields, attribution, statuses | Build Board panel or staff UI |
| **COMM-3** — Studio staff receive-and-reply workflow | Staff queue + customer-visible replies | Fake auto-replies; merge with complaint/refund records |
| **COMM-4** — Customer Studio Board communication surface | Board panel/section inside authenticated project context | Parallel portal; CR inbox; Help Center tickets |
| **COMM-5** — Notifications and email delivery | Deferred unless Customer-One ops require it | Claim email before mechanism exists |

Purchased-room authorization remains a **parallel launch dependency** and must be satisfied before customer-facing communication certification.

Do **not** combine into one monster package. **COMM-2 is not started** until Tagia authorizes after this checkpoint is protected.

---

## 17. Risks

- Labeling Voice output as staff replies
- Reusing internal notes fields in customer UI
- Placing COMM on ungated `/campaign-details`
- Promising response times or live support that do not exist
- Absorbing dirty Conversation Room dock WIP as “messaging”
- Building email before in-app truth
- Attachment creep vs file-retention doctrine
- Collapsing Help Center into tickets without owner approval

---

## 18. Owner decisions — LOCKED (Tagia 2026-07-26)

### COMM-D1 — Launch model — **answered**

**Approve Option B:** Customer message form plus Studio reply record.

Required durable fields/behaviors: customer-authored project message · sender identity · project/campaign identity · timestamp · delivery status · Studio-authored reply · customer-visible history · clear separation of customer / Studio staff / system events.

Forbidden: simulated chat · AI staff replies · typing indicators · live-agent claims · fake real-time · “someone is reading” promises.

### COMM-D2 — Customer location — **answered**

Communication belongs **inside the authenticated Studio Board project**.

Board is the follow-up home (returning-customer access, project identity, campaign context, customer-visible project information, post-Intake continuity).

Forbidden destinations: parallel customer portal · standalone communication destination · Conversation Room follow-up inbox · Help Center ticket inbox.

Future surface may be a **panel or project section**, but must remain in current project context.

### COMM-D3 — Record sharing boundary — **answered**

Reuse stable storage/attribution/ownership/outbox/status/audit patterns where appropriate.

**Do not** make general project communication a subtype of: complaint records · refund records · owner-decision interactions · internal Studio notes · campaign activity events · Intake answers.

Complaint/refund may later share a shell; records retain separate meanings and permissions.

### COMM-D4 — Timing and confirmation copy — **answered**

Minimum confirmation: **Message sent to The Studio.**
Waiting state may say: **The Studio has not replied yet.**

Do **not** promise: specific-hour response · same-day response · immediate support · live monitoring · email notification · staff availability.

Response-time promise only after Tagia defines and can operationally support it.

### COMM-D5 — Auth sequencing — **answered**

COMM-2 data-contract work **may proceed** before purchased-room authorization is implemented.

However:

- no customer-facing communication surface may be **certified** for Customer-One without protected project access
- every future message record must support customer identity and project ownership
- APIs must reject cross-project or cross-customer access
- temporary session-only identity must not become the permanent security model
- purchased-room authorization remains a **separate launch gate**

**Recorded rule:** Soft dependency for data design; **hard dependency for customer-facing certification.** Do **not** implement Auth inside COMM-2.

### COMM-D6 — Attachments — **answered**

**Defer attachments.** Customer-One communication launches **text-only** unless a later package proves attachments essential.

Reasons: file retention doctrine · storage responsibility · access control · malware/file-type risk · upload limits · deletion/retention policy · overlap with Materials We Still Need.

Do **not** add attachment fields to COMM-2 unless only as an explicitly unsupported future capability marker.

---

## 19. Explicit statement that nothing was built

COMM-1 created **only** this inspection document (plus owner-decision lock in this checkpoint).
**No product code, routes, UI, APIs, tests, or Master Launch List updates** were implemented. Dirty WIP was inspected only and **not** staged, cleaned, or absorbed.

---

## 20. Final recommendation (checkpoint)

1. **COMM-1 COMPLETE** — protect this documentation checkpoint.
2. **Option B APPROVED** — customer message form + Studio reply record inside authenticated Studio Board.
3. Hierarchy C #4 and Gate #7 remain **MISSING** until COMM-2→COMM-4 (and Auth for certification).
4. After this commit is protected and Tagia authorizes push, **await separate authorization** to open **COMM-2 — Project communication data contract**.
5. Keep email (COMM-5), attachments, Help Center tickets, and ARCHIVE-1 out of early builds.
6. Purchased-room Auth: soft for COMM-2 design · hard for customer-facing certification.

**Customer-One blocker classification:** **REQUIRES PACKAGE SPLIT** (COMM-2 → COMM-3 → COMM-4 → COMM-5 deferred), with staff-side workflow gap until COMM-3 and Auth hard-dependency for customer-facing certification.

---

## Appendix A — Classification table (selected)

| Element | Classification |
|---|---|
| Board timeline / studio note | **LIVE AND CUSTOMER-USABLE** (one-way status) · **NOT COMMUNICATION** |
| Board message CTA / inbox | **MISSING** |
| Project activity information updates | **LIVE AND CUSTOMER-USABLE** · **NOT COMMUNICATION** |
| Help Center | **LIVE AND CUSTOMER-USABLE** · **NOT COMMUNICATION** |
| Job communication outbox | **PARTIAL** · **LIVE BUT INTERNAL** |
| Owner Desk complaint/refund | **LIVE BUT INTERNAL** |
| Refund request API | **PARTIAL** · customer UI **MISSING** |
| Refund channel catalog | **SCAFFOLD ONLY** (named surfaces without UI) |
| Resend transactional email | **LIVE** auth-only · **NOT COMMUNICATION** |
| Conversation Room dock / glow | **LIVE** journey · **NOT COMMUNICATION** |
| `ActivityFeed.tsx` / `StudioNotePanel.tsx` orphans | **SCAFFOLD ONLY** |
| CR `StudioGuideCommPanel` / Runtime dirty edits | **DIRTY WIP** (adjacent; not COMM proof) |
| `.env.example` dirty edits | **DIRTY WIP** |
| Internal notes | **LIVE BUT INTERNAL** · **UNSAFE FOR CUSTOMER USE** if leaked |
| General customer↔Studio thread store | **MISSING** |

## Appendix B — Communication-related dirty WIP (inspect only)

| Path | Note |
|---|---|
| `M .env.example` | Env docs; may mention email vars — **not protected COMM** |
| `M src/components/studio-conversation-room/ConversationRoomRuntime.tsx` | Journey runtime WIP |
| `M src/components/studio-conversation-room/guide/StudioGuideCommPanel.tsx` | Journey dock WIP |

Strict keyword filter on Board / job-control / project-activity / transactional-email / Help Center / refund channels: **clean at tip** (no dirty product WIP in those trees except as listed above for CR dock / env).
