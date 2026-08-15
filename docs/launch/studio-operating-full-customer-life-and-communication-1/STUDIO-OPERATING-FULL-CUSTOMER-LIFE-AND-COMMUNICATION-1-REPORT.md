# STUDIO-OPERATING-FULL-CUSTOMER-LIFE-AND-COMMUNICATION-1 REPORT

**Package:** STUDIO-OPERATING-FULL-CUSTOMER-LIFE-AND-COMMUNICATION-1  
**Branch:** `operating/design-renderer-proof-1`  
**Scout status:** PARKED — final-review ready · **no merge**  
**Starting control:** paid-activation recovery `6e24e43` (Maya $69 flyer → hosted Stripe → honest intake → wake after pay). That path was **not reopened**.  
**Evidence:** `docs/launch/studio-operating-full-customer-life-and-communication-1/`

Maya fixture (unchanged): Maya Brooks · Cedar & Bloom Home Organizing · Back-to-School Reset · Make Me a Flyer / `v2-rtu-flyer` / Studio fee $69. No new customer facts.

---

## A. Overall verdict

**WORKS WITH LAUNCH BLOCKERS**

The Studio can remember Maya’s project, answer her ordinary questions from Machine truth, acknowledge an upload without treating it as approved for use, bind a sealed flyer identity through QA into Review, reopen Review after a revision, refuse a second included round, and fail closed on the wrong/older version.

The remaining launch issue is not “the pieces do not exist.” It is that **Maya is not guaranteed to be told unless she is looking at Studio Board or she asks Studio Voice.** In-app notices are created and queued. Email delivery is not confirmed. That is a real customer-life gap, not a cosmetic one.

No new paid tool was added. Make was not added. Canva was not reintroduced. Frozen customer rooms were not redesigned. Owner Console was not rebuilt.

---

## B. Maya journey

How far she traveled (this package plus sealed prior packages):

| Stage | Status |
|-------|--------|
| Pay $69 Make Me a Flyer | Sealed prior (hosted Stripe). Not re-run here. |
| Payment truth + paid activation / recovery | Sealed prior + still wakes on GET, reconcile, materials. |
| Project Intake still needed after pay | Voice now tells her this from the record. |
| Studio asks for / receives a material | Upload lands on the materials ledger; API returns a receipt; the materials panel shows it. Uploaded ≠ approved for use. |
| Production / Machine flyer identity | Existing renderer path. Observer success without a PNG hash is now a visible stall. |
| Internal QA → Review eligible | **Connected this package.** Sealed identity binds to a QA record and can open Review when intake is complete and materials are not blocking. |
| Maya asks questions while the project is moving | Voice answers from assembled Machine truth (payment, intake, production, materials, revision, approval, files). If it does not know, it says so. |
| One included revision round | Request is durable (`revision_requested`). A new Machine identity reopens Review and queues `revision_ready_again`. |
| Second revision | **Outside allowance.** Flyer / Custom Studio Plan includes **one** round. Voice reports zero remaining. Review gate blocks the extra request. |
| Approve exact version / Final Delivery | Existing fail-closed identity checks still hold. Older/wrong hash cannot silently win. |
| Leave and return | Paid recovery still wakes. Already-activated campaigns now also retry the QA→Review bind so a finished flyer cannot sit forever with no Review door. |
| Two live browsers / hosted Stripe / live mailbox | Not physically re-run in this package. Claim continuity remains sealed prior. |

She can travel **Pay → Intake → Upload receipt → Production → QA → Review → one revision → re-review → exact approval → final files** on Machine truth. She is **not** guaranteed a delivered email at the beats where a person off-site would reasonably expect one.

---

## C. Communication map

For each major event: what happened, who knew, who was told, where truth was stored, what happened next.

| Event | What happened | Who knew | Who was told | Where stored | What next |
|-------|---------------|----------|--------------|--------------|-----------|
| Payment confirmed | Stripe / payment truth | Machine | Board copy; Voice if asked | `paymentTruth` on campaign | Activation / routing / dispatch. Recovery retries if setup hiccups. |
| Setup after pay still moving | `pending_retry` or missing activation | Machine | Voice: recovering copy. Not a new charge. | `postPayActivation` | Automatic recover on GET / reconcile / materials. |
| Intake needed | Paid, intake incomplete | Machine | Voice: “we still need Project Intake.” Board next-step. | Campaign + job `intakeComplete` | Waiting on Maya. |
| Material requested | Required slot blocking | Machine + materials ledger | Voice + materials panel | Materials store + `materialsSummary` | Wait; do not start Review. |
| Maya uploads | PATCH materials; item `submitted` / stored | Machine | Receipt on API + materials panel. Voice: received, not approved for use. | Materials ledger | Team use-review. Production may still wait. Duplicate re-submit is refused; first file stays. |
| Wrong / unusable upload | `needs_clarification` or blocked | Machine | Voice unusable copy. Panel “needs your update.” | Same ledger | Maya must send a usable version. File did not vanish. |
| Production started | Job `productionStartedAt` | Machine | Voice: work started. Comms template `production_started` if job-control sync runs. | Job record | Watchdog if QA never appears. |
| Tool success, no artifact | Observer `ok` without PNG hash | Machine | Stall `tool_success_no_artifact` (retryable) | Dispatch observer | Retry production; do not open Review. |
| QA pass / identity bind | Machine binds hash → QA record → eligibility | Machine | In-app `ready_for_review` queued. Voice: Review is open. | QA records + job authorization + spine | Maya can open Review from Board. |
| QA fail | `qa_fail` without later pass | Machine | Voice holding / stall `qa_failed_unresolved` | QA records | Correction. Not an Owner desk item. |
| Ready for Review | Spine `ready_for_review` | Machine, Board, Voice | Maya if she opens Board or asks. Email not confirmed. | Job + comms outbox | Review room access still requires QA eligibility. |
| Maya asks a question | Ask dock → API → store | Machine | Voice reply on the tablet (“Studio Voice says:”) | `data/campaign-customer-life/{id}.json` receipts + campaign/tasks/materials | No invented status. |
| Revision requested | Review action | Machine | Voice: received. Comms `revision_requested`. | Spine + feedback + correction ledger | Machine must produce a new identity. |
| New version ready | Second bind, new hash | Machine | Comms `revision_ready_again`. Voice: new version ready. | New QA record + spine back to Review | Allowance already consumed for the first round. |
| Approved | Exact pin | Machine | Voice reports recorded identity. Comms `approved_for_delivery` when job-control syncs. | `customerApprovedArtifactAuthorization` | Delivery only if candidate matches pin. |
| Final files | Spine delivered / ready_for_delivery | Machine | Voice: Final Delivery on Board. | Delivery authorization + client files | Wrong/older file fail-closed. |
| Email / notification | Outbox row created | Machine | **Board / Voice only.** `pending_owner_send` is transport, not Owner Desk. | `jobCommunicationRecords` | No Resend/live SMTP in this package. |

---

## D. Studio Voice

Voice → Machine / shared project truth → Voice → Maya.

Signed Conversation Room Ask now calls `POST /api/studio-customer-life/ask` (session + campaign ACL). The tablet shows the reply. A memo skip that would have dropped the reply was repaired.

| Maya question | Result |
|---------------|--------|
| Did my payment go through? | Confirmed / not confirmed from `paymentTruth`. |
| Do you need anything else from me? | Intake, materials, or nothing waiting. |
| Did you receive my upload? | Received on ledger, or not found. Unusable if clarification/reject. Never “approved for use” from upload alone. |
| Has work started? | Recovering vs not started vs started. Payment alone is not production. |
| What is happening with my flyer? | Payment + intake + recovery + work + Review, from the same truth object. |
| Is anything holding it up? | Intake, materials, recovery, production, QA, revision, or Review-ready. |
| When can I review it? | Open or not. **Does not invent a date.** |
| Can I ask for changes? | Yes once Review is open. |
| How many changes do I have left? | Remaining of **1 included** for this SKU. |
| Did you receive my revision? | Spine `revision_requested` or not. |
| Is the new version ready? | Review open after the new identity. |
| Which version did I approve? | Exact work version + hash from the approval pin, or “not on the record yet.” |
| Where are my final files? | Final Delivery only when the spine says so. |

If the Machine has no matching fact, Voice says it will not guess and points Maya to Studio Board.

Gap: unsigned / failed-API fallback answers from the hydrated campaign only (no materials/tasks). Signed paid Maya uses the store. Do not treat local fallback as full truth.

---

## E. Upload / material loop

**Maya uploads → Studio receives → Machine knows → customer acknowledgement → team can use it (after use review, not from upload alone).**

Proof:

- Materials PATCH records the item and returns `receiptMessage` (uploaded is not approved for use).
- Materials panel shows that receipt.
- Existing panel copy still says received / under review.
- Valid optional file: `submitted` / stored; still on the ledger if Maya leaves and the store is re-read.
- Duplicate re-submit of an already submitted item: **visible refuse**; first file remains.
- Unusable: Voice uses the unusable copy; rights/use rules were not weakened (`studio-material-use` still separate from “we got the file”).
- Missing file: Voice “does not show a received upload yet.”
- Unsupported / too-large local file: existing 5 MB / preview guards on the panel. Payload validation still blocks secrets. No new invented file-type policy.

Team use of a logo/photo still requires clearance / `approved_for_use`. That is correct, not a black hole.

---

## F. Team handoff loop

Flyer production in this SKU is **Machine renderer**, not a hoped-for Slack ping.

| Step | Proof |
|------|--------|
| Assign | Dispatch identity + design-renderer observer (existing). |
| Receipt | Observer result `ok` + PNG hash, or stall if `ok` without hash. |
| Produce | Sealed renderer path (prior packages). |
| QA | Bind writes a QA pass from `.design-qa.json` / fail-closed evidence. Does **not** invent visual judgment. |
| Send to Review | Spine `ready_for_review` only if intake complete and materials not blocking. |
| QA fail | Stall `qa_failed_unresolved`; Review stays closed. |
| Correction | New identity (new hash) binds a new QA row. Idempotent on the same hash. |

Human work packets (assigned → returned) already exist on production workspace for staff jobs. They were not redesigned. Routine flyer does not wait for Tagia to notice the PNG.

---

## G. Revision loop

Catalog / plan truth: **one included correction round.** A second request is outside allowance. That was derived from sealed revision accounting, not invented.

Sequence proved:

1. Flyer identity binds → internal QA → Review eligible → `ready_for_review` + `ready_for_review` notice queued.
2. Maya’s revision request is the existing Review action (`revision_requested`, durable feedback, allowance consumed).
3. Voice: “Yes. The Studio received your revision request.”
4. **Repair:** a later Machine identity now **reopens** Review (`revision_ready_again`) instead of leaving the job stuck on `revision_requested`.
5. Voice: new version ready; remaining rounds update (0 after the included round).
6. Second revision: Voice reports none remaining; `canRequestJobRevision` blocked.

Customer tries to approve an older version: existing approved-delivery tests still fail closed (`BLOCKED_APPROVAL_MISMATCH`, hash/version/artifact). Revision clears prior approval pins so V1 cannot authorize V2.

---

## H. Approval / delivery

- Approval pin stores exact `workVersionId` / artifact ids / content SHA-256.
- Voice reports that identity; it does not say “the latest file.”
- Final Delivery eligibility requires that exact match.
- Wrong hash, wrong version, wrong artifact, superseded pin: blocked.
- Maya can leave and return: campaign + tasks envelopes are the authority, not the browser.

---

## I. Watchdog / recovery

Stalls are classified on one truth object. Routine Owner action remains **NONE**.

| Silent-stall case | Detected | Recovery |
|-------------------|----------|----------|
| Paid but setup asleep | Yes (prior package) | Automatic `recoverPaidOperatingChain` |
| Customer returns after pay | Yes | GET wake; already-clear campaigns now also retry QA→Review bind |
| Intake missing | Yes | Waiting on customer |
| Materials blocking | Yes | Waiting on customer |
| Upload sitting unreviewed | Yes | Retryable (team use-review). Machine does not auto-approve rights. |
| Production started, no QA | Yes | Retryable |
| Tool success, no artifact | Yes | Retryable |
| QA passed, Review not open | Yes | Retryable bind on dispatch + leave/return |
| QA failed, unresolved | Yes | Retryable correction |
| Revision requested, work not restarted | Yes | Retryable |
| Notice queued, email unconfirmed | Yes | Retryable/transport. Board remains truth. Not Tagia’s restart button. |
| Customer question unanswered | Ask no longer only pulses “Saved.” Unknown questions get an honest refusal. Receipt stored. | Connection repair |

No stall in this package was classified `true_owner_decision`.

---

## J. Owner-dependence map

| Moment | Classification |
|--------|----------------|
| Routine status, retries, upload ack, material receipt, QA bind, one revision, fail-closed delivery, ordinary Maya questions | **Machine** / **Studio Voice from Machine** |
| Logo/photo rights gray area | **Policy / Owner judgment** (existing material-use). Not opened here. |
| Extra revision beyond 1 included | **Policy already sealed** (block). Not a new Owner grant unless Tagia later grants extras through the existing ledger. |
| Live email to Maya’s inbox | **Legacy / transport residue.** `pending_owner_send` must not be treated as Owner Desk work. Lighting real email is an Owner decision gate for a later package. |
| Visual taste of the flyer | **Owner / customer Review** — Machine only binds sealed identity + pipeline QA evidence. |
| Frozen rooms, pricing, SKU, Host character | Untouched. |

Tagia should not have to babysit “did her payment start a job?” or “did QA open Review?” or “did Voice hear her question?” anymore.

---

## K. One-project-truth audit

Voice answers are assembled from campaign + materials + tasks. Phase for Voice, stalls, and status questions share `assembleCustomerLifeTruth`.

Allowed: different customer-safe wording. **Not allowed:** Voice saying paid while the campaign is unpaid, Review open while intake is incomplete, uploaded meaning approved, or an old hash as the approved file.

Residual contradiction risk:

- **Email vs Board:** outbox says queued; Maya’s mailbox says nothing. Wording on Voice/Board must stay “the project record,” not “we emailed you.” This package uses that discipline.
- **Unsigned fallback** can be thinner than the server (no tasks/materials). Signed Maya path is the authority.
- **Staff kitchen vs Board:** internal QA language stays internal. If Maya still hits Studio Review chrome in development, that is polish, not this package’s truth model.

---

## L. Tool gap classification

| Gap | Class | Note |
|-----|--------|------|
| Ask box did not answer | **Connection** | Fixed: Voice → store → reply. |
| Voice reply dropped by tablet memo | **Connection** | Fixed. |
| QA identity not opening Review | **Connection** | Fixed bind after observer / leave-return. |
| Revision never reopened Review | **Connection** | Fixed. |
| Upload receipt on API not shown | **Connection** | Fixed on materials panel. |
| Stall detection across the life loop | **Machine capability** | Added classification; recovery reuses paid wake + bind. |
| Human team ACK for staff work packets | **Already exists** (production workspace). Not missing for Machine flyer. |
| Delivered email | **Genuinely missing external transport** if Tagia wants inbox mail. **Not required** to own the business process. Board is the status home. Do **not** buy Resend/Make in this package. |

No outside tool is essential to close the Machine loop. A mail provider would be a **replaceable executor** for one TELL step, only after an Owner decision.

---

## M. Customer kinks

**BLOCKER**

- Maya may finish a beat (payment, Review ready, revision ready, files ready) and **not get a delivered email**. If she is not on Board and does not ask Voice, she can reasonably say “Why did nobody tell me what happened?” The project knows. The inbox does not.

**IMPORTANT FRICTION**

- Unsigned Ask fallback cannot see uploads or production tasks.
- `pending_owner_send` naming still sounds like Tagia must send it. That is internal; do not show it to Maya. Do not put those rows on Owner Desk as routine work.
- Required upload `submitted` still waits for Studio use-review. Honest, but she may ask “Is anybody looking at my file?” Voice/panel say received, not approved.
- A pre-existing job-communication test around “materials received → ready_for_queue” (sku `ma-flyer-v2`) was **not** treated as this flyer package; left untouched.

**MINOR POLISH**

- Studio Review development chrome / internal jargon if a tester lands there.
- Ask dock is still Speak / Type on every screen (locked). Guide-question Send remains the answer path; free questions answer after that.
- Two live devices and a real mailbox were not re-walked in this package.

Not a redesign pass. Rooms were not restyled beyond showing the Voice reply and the material receipt.

---

## N. Next recommendation

**Next broad package:** `STUDIO-OPERATING-CUSTOMER-NOTICE-AND-STATUS-HOME-1`

Purpose: close the remaining TELL gap without inventing a second source of truth.

- Keep Board as the customer truth surface.
- Decide, as **Owner**, whether three (or so) transactional emails are wanted at payment / Review ready / final files.
- If yes, that is an Owner tool-transport gate (provider as executor). If no, Voice + Board is the honest product.
- Do not make Owner Console Maya’s status page.

**Owner Console:** ready to begin **after this PARK is accepted**, as a staff/team visibility surface for retryable stalls (upload waiting for use-review, QA failed, production timeout). It should observe Machine truth, not become the restart button and not replace customer notice.

Do not skip several customer beats ahead into a full rehearsal until Tagia either accepts Board-only notice or authorizes outbound email.

---

## Success criteria

| Criterion | Result |
|-----------|--------|
| Voice answers from real project truth, or honestly does not know | YES |
| Voice does not invent payment, policy, timing, revision counts, files | YES |
| Upload cannot disappear; uploaded ≠ approved for use | YES |
| Closed Machine handoff for sealed flyer identity → QA → Review | YES |
| One revision in allowance; second blocked from catalog truth | YES |
| Exact approval identity; old version fail-closed | YES |
| Silent stalls classified; routine Owner = NONE | YES |
| No merge, no Make, no Canva, no new paid tool | YES |
| Outbound email closed-loop receipts | NO — launch blocker |

---

**READY FOR OWNER / MANAGER REVIEW**

**Scout PARKED.**
