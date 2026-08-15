# STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1 REPORT

**Package:** STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1  
**Room:** 1 — Customer Life + Communication (this section only)  
**Branch:** `operating/design-renderer-proof-1`  
**Scout status:** PARKED WITH EXTERNAL PREREQUISITE — **not closed**  
**Protected checkpoint:** `d6974eb`  
**Previous section:** STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1 = **CLOSED** (`07c1434`)  
**Merge:** no merge

Maya fixture (unchanged): Maya Brooks · Cedar & Bloom Home Organizing · Back-to-School Reset · Make Me a Flyer / `v2-rtu-flyer` / Studio fee **$69**. No new customer facts. No Canva. No Make. No Owner Console. No Room 2. No whole-customer torture test started.

---

## A. What this package is

Maya can already see Review on Studio Board and ask Voice. She could still miss a beat if she was not looking. This package lights the **existing** Resend adapter for **existing** `JOB_COMMUNICATION_TEMPLATES`, and retries failed transport without making Tagia the mail clerk.

`pending_owner_send` means awaiting authorized transport, **not** Tagia.

Board remains the source of truth. Email is a nudge.

---

## B. What is wired

| Piece | Behavior |
|---|---|
| Copy | `JOB_COMMUNICATION_TEMPLATES` only — no invented claims |
| Transport | Existing `sendTransactionalEmail` / Resend adapter |
| Queue fact | `pending_owner_send` = awaiting authorized transport |
| Success | `sent` |
| Failure | `delivery_failed`, retryable, Owner routine = NONE |
| Missing recipient | Fail closed (`missing_recipient`), notice remains recoverable |
| Missing config | `not_configured` → `delivery_failed`, never fake success |
| Watchdog | Detect waiting / failed retry / missing authorized notice → enqueue from existing templates → retry transport |
| Wake hooks | Review bind, Board job GET/PATCH, materials, `POST /api/operating/lifecycle-watchdog` |
| Customer links | Locked Studio Board / Review Room / Project Intake / Final Delivery URLs when origin is configured |
| Receipt | created / attempted / sent / failed / retry pending. **No** open/read confirmation claimed |
| Duplicate | Same communication id is not sent again after `sent` |

Customer-facing copy already fixed in this section: materials notice says **Project Intake**, not “Project Details”. Email signoff is **The Studio**, not Tagia.

---

## C. Automated totals

**51 / 51 PASS** on the Room-1 communication set:

- `src/lib/studio-lifecycle-email/lifecycle-email.test.ts` — 10
- `src/lib/studio-kitchen-comms/kitchen-comms.test.ts` — 9
- `src/lib/job-control/communication.test.ts` — 6
- `src/lib/studio-customer-life/maya-voice-machine-communication.test.ts` — 8
- `src/lib/studio-customer-life/maya-life.test.ts` — 18

Automated 51/51 is **not** close.

Proven in those drills: send → `sent`; provider failure → `delivery_failed` then retry; duplicate suppressed after success; missing recipient; missing config not fake-success; Voice still says Review is open when email failed; watchdog waiting / failed / missing-notice recover; Board links in template body; no open/read invention.

---

## D. Live Maya walk

Live walk script: `scripts/studio-operating-resend-lifecycle-notifications-and-watchdog-1-board-walk.mts`

**Real Maya recover (in-process on the paid fixture):**

- Campaign `maya-resend-review-202608152045` was created as Maya Brooks / Cedar & Bloom / Make Me a Flyer $69.
- Paid recovery + Review bind **did enqueue a durable ready-for-review notice.**
- That is: project event → durable notice record. Transport did not complete.

**Stopped before inbox close:**

1. **Resend runtime env is missing** on this machine. Presence check (values not printed):
   - `RESEND_API_KEY` = missing from `.env.local` and process env
   - `TRANSACTIONAL_EMAIL_FROM` = missing from `.env.local` and process env
2. Playwright Board navigation timed out against a wedged Next on `:3066`. Next was restarted for the walk. A later full live-send attempt was not completed in this session.

### Results table (honesty)

| Gate | Result |
|---|---|
| Real Resend send proof | **BLOCKED** — no API key / from address on the running environment |
| Inbox proof | **BLOCKED** — nothing was handed to Resend |
| Sender / recipient / subject / template | Sender cannot be certified. Intended recipient is the local safe test inbox `thestudio7273@gmail.com`. Review-ready subject remains `Ready for review` from the existing template. Body uses that template + Board/Review Room links + “— The Studio” |
| Live failure / retry | Unit + injectable adapter **PASS**. Live unauthorized-from Resend reject **not run** (needs key) |
| Duplicate suppression | Unit **PASS** (`sent` records are not sent again) |
| Missing recipient | Unit **PASS** — durable `missing_recipient`, Owner action false, campaign not crashed |
| Missing-config | Unit **PASS** — `not_configured` recorded as `delivery_failed`, never `sent` |
| Watchdog | Unit **PASS** for waiting / failed retry / missing authorized notice recover. Sweep is wired with `onlyCampaignIds`. No Owner Console |
| Board / Voice agreement | Unit **PASS**: Review eligible stays true when email is `delivery_failed`. Voice copy remains `You can review it now. Open the Review Room from your Studio Board.` |
| Communication receipt | created / sendAttempted / sent / failed / retry pending recorded. `openOrReadConfirmed` is always **false** |
| Owner-dependence | **Target NONE** is encoded. Not certified for CLOSE until a real send/retry walk with Resend env passes |
| Customer-facing defects found/fixed | Materials copy now says Project Intake. Email now includes locked customer-surface links and Studio (not Tagia) signoff |

**Live-walk totals this session:** 1 real Maya recover notice created; remaining live Resend/inbox/Board screenshot gates BLOCKED.

---

## E. Owner setup (deferred — do not fake)

Live inbox certification is **intentionally deferred** until The Studio has a purchased and verified business domain and business-email identity.

Do **not** keep pushing local `resend.dev` onboarding sender as branded Studio identity. Do not paste secrets into chat. Do not add another email provider.

When that identity exists, return to **this same package** at checkpoint `d6974eb` and finish the deferred gates.

---

## F. Owner routine

**Target: NONE.** Routine project email must not become a Tagia send task.

Cannot certify NONE as a close fact until the real inbox + retry walk completes.

Genuine exception visibility stays later in Owner Console. This package does not start Owner Console.

---

## G. Remaining limits

- Live Resend accept + inbox visual check still required for CLOSE.
- Restricted Resend keys cannot GET `/emails/{id}`; inbox proof is the Gmail inbox, not a Resend dashboard tour.
- Open/read receipts are not implemented and must not be claimed.
- Browser zoom / visual Board screenshot of the new Maya resend campaign was not captured this session.

---

## H. Close rule

This package **does not close** on 51/51.

Close only after: BUILD → BREAK → CUSTOMER-USE → FIX → RETEST → CLOSE, including one real lifecycle message in the safe test inbox.

**Verdict: PARKED WITH EXTERNAL PREREQUISITE. Not closed. Do not fake branded sender, inbox, or live reject/retry against a temporary sender. Return to this same package after Studio domain + business-email identity. Ledger: `docs/launch/studio-operating-room-1-customer-life-closeout-v1.md`.**

---

## I. Next Room-1 recommendation

Live inbox certification is **intentionally deferred**. Do not keep pushing it.

The next non-domain-dependent Room 1 section is:

`STUDIO-OPERATING-ROOM-1-WHOLE-CUSTOMER-LIFE-TORTURE-TEST-1`

Do **not** start Owner Console or Room 2. Do not merge. Do not call this Resend package CLOSED.

---

## J. Git

**Commit:** `f437f98`  
**Branch:** `operating/design-renderer-proof-1`  
**Local / remote:** 0 / 0 (this tip)  
**Push:** `07c1434..f437f98` to `origin/operating/design-renderer-proof-1`  
**Merge:** none
