# STUDIO-OPERATING-VOICE-MACHINE-AND-CUSTOMER-COMMUNICATION-1 REPORT

**Package:** STUDIO-OPERATING-VOICE-MACHINE-AND-CUSTOMER-COMMUNICATION-1  
**Room:** 1 — Customer Life + Communication (this section only)  
**Branch:** `operating/design-renderer-proof-1`  
**Scout status:** PARKED — ready for Manager review · **no merge**  
**Close rule used:** BUILD → BREAK → CUSTOMER-USE → FIX → RETEST → CLOSE  
**Previous section:** Materials Upload & Receipt = CLOSED (`d340eee`)

Maya fixture (unchanged): Maya Brooks · Cedar & Bloom Home Organizing · Back-to-School Reset · Make Me a Flyer / `v2-rtu-flyer` / Studio fee **$69**. No new customer facts. No Canva. No Make. No Owner Console rebuild. Review/Revision package was not started.

---

## A. Overall verdict

**READY FOR MANAGER CLOSE — LIVE MAYA BOARD COMMUNICATION LOOP PASSED**

Maya signed in, opened Studio Board with no internal ID, asked real project questions, and received answers from the Machine / project record. Studio asked her for Project Intake. She replied. The Studio acknowledged the reply without pretending intake was done. After intake was on the record, a fresh browser asked again and the waiting state had cleared. She then sent a real file and was told it was received and still being checked for use — not approved.

Owner routine = **NONE**.

This package did not open Review, Owner Console, Room 2, or the full email/notification package.

---

## B. Maya questions asked and answers received

Live Board walk evidence: `docs/launch/studio-operating-voice-machine-and-customer-communication-1/customer-board-walk/board-walk-evidence.json`

| Maya asked | Answer received | Source of truth |
|---|---|---|
| Did my payment go through? | Payment is confirmed. She does not need to pay again. | `campaign.paymentTruth.status === "confirmed"` |
| Do you need anything else from me? *(intake incomplete)* | Yes. Project Intake is still needed. | `isIntakeComplete(campaign)` |
| Did you receive my file? *(before upload)* | No received upload is on the record yet. | materials ledger received/stored count |
| Has work started yet? | Production has not started. | flyer job `productionStartedAt` |
| What is happening with my flyer? | Payment confirmed, intake still needed, no file yet, not assigned, work not started, QA not recorded, waiting on Maya for intake, Review not open. | assembled Machine truth |
| Is anything holding it up? | Project Intake. | waiting-on-customer stall |
| When will I be able to review it? | Review is not open. No invented date. | review eligibility on job/QA records |
| Can I make changes after I see it? | Yes, once it is in Review. It is not in Review yet. | review eligibility + revision rules |
| What is Tagia's favorite color? | Will not guess. That is not on the project record. | unknown intent / no Machine fact |
| Did my payment go through? *(second time)* | Same confirmed-payment answer. | same Machine record |
| I can finish Project Intake from here. | Received her reply. Intake waiting did not silently clear. | Studio-request response + still-open stall |
| Do you need anything else from me? *(after intake, fresh browser)* | Nothing waiting on her right now. | intake complete; no customer stall |
| What is happening with my project? *(return)* | Payment confirmed, intake on file, still not assigned/started, QA not recorded. | same Machine record |
| Did you receive my file? *(after Board upload)* | Yes, received. Still being checked for use. Received ≠ approved. | stored material, `reviewStatus !== approved_for_use` |

Studio Voice / Board answers are the same function: `askCustomerLifeFromStore` → `assembleCustomerLifeTruth` → `answerCustomerLifeQuestion`. Conversation Room Ask uses `POST /api/studio-customer-life/ask`. Board questions now call that same Machine lookup after the message is saved on the project.

---

## C. Studio → Machine lookup proof

Loop proved:

**Maya asks → Studio checks → Machine/shared record → Studio answers Maya**

- Questions were **not** pre-fed to Voice.
- Payment, materials, production, timelines, revision counts, QA, Review, and delivery were answered only from records that exist today.
- If the live lookup cannot be reached, Studio now says it cannot guess (Conversation Room no longer answers from an empty local materials fallback).
- Unknown facts stay unknown. They are recorded as `waiting_for_studio`, then `stalled` if they sit unanswered past 24 hours. They do not disappear.

Staff project-communication replies remain human staff only (COMM lock). Machine answers are a separate customer-visible “Answer from the project record.” Voice is not impersonating a staffer.

---

## D. Studio asks Maya → Maya responds loop

Legitimate missing information: **paid flyer, Project Intake not on the record.**

Proved:

1. Machine knows intake is missing (`waiting_on_customer` / `awaiting_intake`).
2. Board shows **The Studio needs something from you** and asks only for intake — not for payment, business name, or other facts already on file.
3. Maya replies in project communication.
4. Studio acknowledges: her reply is attached to the project.
5. Waiting does **not** clear from the typed reply alone.
6. After intake is on the record, `Do you need anything else from me?` becomes: nothing waiting on her.
7. Fresh browser sees the cleared waiting state.

---

## E. Message acknowledgement proof

Board no longer only flashes “Saved.”

Locked COMM-4 string remains: **Message sent to The Studio.**

In addition Maya now sees:

- the question is on the correct project
- the Machine answer, or an honest “will not guess”
- whether it is answered, waiting on her, waiting on The Studio, or still unanswered
- if she is answering a Studio request: the reply was received, and whether the waiting state actually cleared

`pending_owner_send` is not used as that acknowledgement.

---

## F. Material communication

Sealed Materials capability used as-is.

After Maya uploaded a real PNG on Board:

> Yes. We received your file. It is still being checked for use. Received is not the same as approved for use.

Stored / submitted is not collapsed into approved for use. `needs_clarification` still uses the unusable-material copy.

---

## G. Board / Voice / Machine agreement

Board is the customer truth surface. Voice explains it.

Same campaign compared across:

- Machine `assembleCustomerLifeTruth`
- Studio Voice / Board Machine answer
- Studio Board next-action / visibility (intake needed vs nothing waiting on Maya)

Different wording is allowed. Contradictory facts were not found for payment, intake, file received vs approved, work started, or Review-not-open.

After intake, Voice may also report a Studio-side stall if the design-renderer observer recorded tool success without a flyer file identity. That is existing production-observer residue, not a Voice invention. It did not reopen this communication section into the renderer package.

---

## H. Waiting / stalled communication behavior

| State | Meaning |
|---|---|
| answered | Machine had the fact and answered |
| waiting_for_customer | Studio request still open on the project (intake, required materials, usable-file request) |
| waiting_for_studio | Customer asked something the record does not have |
| stalled | That unanswered question is still on the ledger after 24 hours |

No “reply within 4 minutes” promise. A routine unanswered question is durable on `data/campaign-customer-life/{campaignId}.json`.

---

## I. Customer return-later proof

Fresh Playwright browser context (empty cookies / storage):

- Sign in again → same Cedar & Bloom project on `/studio-board` (no campaign ID in the URL)
- Intake waiting had cleared
- Status question still matched the Machine record
- File question after upload still distinguished received vs approved

---

## J. Resend / email current-state map

Inspected only. Full lifecycle email was **not** built.

| Kind today | What happens |
|---|---|
| Email verification / resend | Resend |
| Password reset | Resend |
| Project-claim recovery | Resend |
| Job-control notices (`payment_received`, materials, production started, Review, revision, delivery, refund windows, …) | Durable **in-app outbox** |
| Those outbox rows | `pending_owner_send` = **transport**, not Tagia sending by hand |
| Studio Voice / Board Machine answers | In-app on the project. Not emailed |
| Customer Board messages | Project-communication ledger. Not emailed |
| Routine project-life email | **MISSING** — later Email/Notifications section |

**`pending_owner_send` must not mean Tagia is the routine mail clerk.** Kitchen already classifies authorized template rows as `awaiting_authorized_transport`.

Narrow Voice/customer-loop fixes in this package did not add a provider or wire those notices to Resend.

---

## K. Machine / team state available today

Machine can answer, when the job record actually has it:

- Has production been assigned? (`workPackets` assignment)
- Has production started? (`productionStartedAt`)
- Is it waiting, and on whom?
- Has QA happened? (flyer QA records: not recorded / failed / passed)

It will not invent assignment, start, QA, or Review readiness.

---

## L. Owner-dependence result

**OWNER ROUTINE = NONE**

Routine Maya questions do not require Tagia to look up payment, check whether a file arrived, tell her project status, relay her message to the team, ask the team what is happening, or tell her that production started.

True policy/exception judgments remain later / Owner Desk.

---

## M. Customer friction found and fixed before leaving this section

The live walk found a defect automated tests initially missed:

1. **Unknown questions were swallowed as if Maya had answered the Studio’s intake request.** “What is Tagia’s favorite color?” received the intake-reply acknowledgement instead of “I will not guess.” Fixed: a `?` question is still a question. Only a non-question reply is treated as answering a Studio request. Retested: PASS.

Also fixed in this section before close:

2. Conversation Room asked the Machine, then **fell back to a local campaign with empty materials** if the lookup failed — that could guess file/production facts. Lookup failure now fails closed.
3. Board questions persisted but only confirmed “Message sent.” Machine answers are now attached to the same project message.
4. Received-file copy now says the file is **still being checked for use**, so received cannot be heard as approved.

---

## N. Automated regression totals

Related files, all green:

| File | Tests |
|---|---|
| `maya-life.test.ts` | 15 |
| `maya-voice-machine-communication.test.ts` | 8 |
| `project-communication-customer-route.test.ts` | 6 |
| `client-file-store.test.ts` | 7 |
| `kitchen-comms.test.ts` | 9 |
| **Total** | **45 passed / 0 failed** |

Tests green was **not** used as close.

---

## O. Live customer-walk totals

Script: `scripts/studio-operating-voice-machine-and-customer-communication-1-board-walk.mts`

**22 passed / 0 failed / 0 blocked** after the unknown-question fix.

Customer path: sign in → Board → ask → real Machine answers → answer a Studio request → leave → fresh browser → ask again → upload file → ask about the file.

---

## P. Remaining limits

- Review / revision / re-review / approval / Final Delivery are **not** this package. Voice will not invent a Review date or open that loop.
- Routine outbound project-life email is still missing. Board + Voice are the customer path today.
- Human staff replies on COMM remain a separate later/staff path.
- Design-renderer observer can still record “tool success, no flyer identity.” Honest, not closed here.
- Full Conversation Room Voice Host personality is not this package. This is the communication loop against project truth.

---

## Q. Final commit / sync

**Commit:** `7731d40`  
**Branch:** `operating/design-renderer-proof-1`  
**Merge:** NO  

Local/remote recorded after push.

---

## R. Recommendation for the next Room 1 section

Stay in **Room 1: Customer Life + Communication**.

Next section to open only after Manager close of this one:

**Review + Revision full loop**

Do not start Email/Notifications + watchdog, Room 2, Owner Console, or soft opening from this package.

---

## Where we are on the board

Room 1: Customer Life + Communication

- ✅ Paid entry
- ✅ Project claim / return
- ✅ Paid activation recovery
- ✅ Materials + real uploads
- ➡️ NOW PARKED: Studio Voice + Machine + Customer Communication
- ⬜ Review + Revision full loop
- ⬜ Email/Notifications + watchdog/failure drills
- ⬜ Final Room-1 customer-life torture test
