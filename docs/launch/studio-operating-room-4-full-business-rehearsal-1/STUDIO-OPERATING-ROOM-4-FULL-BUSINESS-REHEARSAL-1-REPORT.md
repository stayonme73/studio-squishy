# STUDIO-OPERATING-ROOM-4-FULL-BUSINESS-REHEARSAL-1 REPORT

**Package:** `STUDIO-OPERATING-ROOM-4-FULL-BUSINESS-REHEARSAL-1`  
**Close rule:** RUN BUSINESS → BREAK IT → RECOVER → RETEST → CLOSE  
**Park:** Manager review. Do not auto-start Room 5. Do not merge.  
**Live evidence:** `docs/launch/studio-operating-room-4-full-business-rehearsal-1/customer-board-walk/board-walk-evidence.json`

---

## Final Room 4 verdict

**ROOM 4 REHEARSAL READY WITH BLOCKERS**

One Maya Brooks / Cedar & Bloom flyer life completed Lobby → payment honesty → intake → materials friction → production → deliberate stall recover → QA fail/pass → Owner pricing judgment → Review → revision → approval → Final Delivery → return later, without Tagia becoming the routine dispatcher.

Blockers below are explicit remaining limits, not fake closes.

---

## Customer / project fixture

| Field | Value |
|-------|--------|
| Customer | Maya Brooks |
| Business | Cedar & Bloom Home Organizing |
| Offer | Back-to-School Reset ($149 customer offer) |
| Studio SKU | Make Me a Flyer · `v2-rtu-flyer` · $69 |
| Production | Certified design renderer path only |
| Live campaign | `maya-r4-live-1787179086434` |
| Payment honesty | Front door to Stripe handoff; paid chain uses sealed processor-confirmed $69 fixture (no live Stripe recert) |

---

## Complete chronology

1. Lobby → Conversation → route/service → Studio Plan → Stripe handoff (unpaid until confirm)
2. Signed-in Board on sealed paid fixture; Voice asks for Project Intake
3. Optional materials while intake still open: GIF rejected, PNG stored, duplicate kept first
4. Intake written on same campaign; leave/return continuity
5. Injected production stall → `recoverPaidOperatingChain` clears without Owner
6. Flyer PNG produced on certified renderer
7. Owner pricing exception raised once → desk → Tagia approves once → Machine carries
8. Owner leave/return: handled stays handled
9. QA fail bind → Review not exposed → Voice truthful
10. QA pass → Review ready; failed notice transport does not steal Board truth
11. Two browsers same Maya story; Review Version 1
12. Ask question (no revision spend) → request revision → Version 2
13. Approve Version 2; stale Version 1 cannot win
14. Exact Final Delivery PNG+PDF; fresh browser return later preserves approval

---

## Results by scout section

### Front door
**PASS.** Lobby start clear. Flyer $69 visible. Checkout names Stripe and stays unpaid until Stripe confirms. What Happens Next / Board truth present. Live Stripe click-through not reopened.

### Payment / intake continuity
**PASS.** Same campaign after sign-in. Intake missing → Voice asks for Project Intake. Intake submitted on same campaign; no duplicate project.

### Materials
**PASS.** Unsupported GIF rejected. Optional PNG stored with checksum. Duplicate kept first. Received ≠ approved (Voice/Board language). Exercised before intake so optional picker stays available when production finishes quickly.

### Communication
**PASS.** Board composer + API fallback after Next memory restart. Questions: need anything else, what's happening, did you get my file / revision / approval. Board remains source of truth when email is retrying.

### Production
**PASS.** Certified `v2-rtu-flyer` renderer. Real PNG/PDF bound to campaign. No Canva/Make/CapCut.

### Deliberate failure / recovery
**PASS.** `pending_retry` stall injected; recover cleared without Owner. Routine Owner action NONE.

### QA fail → fix → pass
**PASS.** QA fail keeps Review closed; Voice says finishing / Review not open (no internal jargon). Premature Review URL does not expose proof. QA pass opens Review on same project.

### Owner decision
**PASS.** One pricing exception. Desk shows judgment case, not routine. Tagia approves once; Machine briefing confirms. Customer life not cancelled. Owner return later: handled stays handled.

### Review / revision / approval / Final / Delivery
**PASS.** Version identity, Ask question without spending revision, included revision → Version 2, approve shown version, stale prior blocked (422), exact PNG+PDF delivery, five-slot classification correct.

### Customer return later
**PASS.** Fresh context: same project, approval history, files, no fake unfinished Review action.

### Owner return later
**PASS.** Handled pricing folder stayed handled; no duplicate fake Owner work from routine fallout.

### Stale-tab
**PASS.** Second browser aligned on review-ready truth; stale approve after approval rejected.

### Communication-failure
**PASS.** `delivery_failed` notice; Board/Voice still Review-ready. Branded email not reopened.

### Waiting states
**PASS with note.** Intake wait, production/stall, QA hold, revision, Owner judgment each had coherent next action. Production after intake can finish so fast that Voice already says Review-ready — truthful if Machine finished, but surprising. Logged as friction, not a false-ready.

---

## Customer friction findings

| Finding | Severity |
|---------|----------|
| Board-is-source-of-truth copy still below pay CTA (Room 2 known) | Acceptable / known |
| Optional materials picker disappears once Review-ready if customer waits | Important friction — walk now uploads before intake |
| Voice can say Review-ready immediately after intake when renderer already finished | Surprising but truthful |
| Long-lived Next on :3066 can restart under memory and drop an in-flight Board POST | Harness uses API fallback; product still recovers |

No blocking “guess what to do” after fixes in this package.

---

## Owner friction findings

| Finding | Severity |
|---------|----------|
| Prior walk residue can crowd Today's Desk if prefixes are not hidden | Fixed: hide `maya-room4-rehearsal-` and `maya-r4-live-` after rehearsal |
| Tagia decides once on pricing; Machine carries aftermath | PASS — not routine dispatch |

Routine Owner dispatch: **NONE** for this life outside the intentional pricing judgment.

---

## System truth matrix (sample stages)

| Stage | Machine / spine | Board | Voice | Owner | Review / Final |
|-------|-----------------|-------|-------|-------|----------------|
| Paid, no intake | awaiting intake | Intake needed | Intake needed | — | Closed |
| After intake / produce | ready_for_review | Review path | Review ready; email secondary | — | Eligible after QA pass |
| QA fail | not review-eligible | Review closed | Finishing / not open | — | No proof |
| Owner pricing | exception open → carried | Project continues | Unchanged life | Judgment once | — |
| After revision | Version 2 ready | Review V2 | Change applied | — | V2 shown |
| Approved | ready_for_delivery | Final ready | Final files ready | Handled stays | Exact files |

Different wording OK. Different truth not observed on the green run.

---

## Defects found / fixed in this package

1. **Tasks envelope torn JSON under concurrent Review PATCH** → atomic write + campaign write lock + read retry; Review route returns 503 on SyntaxError instead of empty 500.
2. **Walk / desk residue** from prior Room 4 attempts blocked Owner folder open → hide historical prefixes; robust openNamedFolder; live id `maya-r4-live-`.
3. **Materials picker race** after fast production → upload before intake; wait for Add more after load.
4. **Board composer POST lost on Next memory restart** → API fallback for project questions.
5. **QA Voice check** updated to customer-safe copy (no “internal quality check” jargon).

---

## Automated totals

| Suite | Result |
|-------|--------|
| Room 4 package lock tests | PASS |
| campaign-tasks `store-io` concurrent write | PASS |
| Owner live-desk hide prefixes | PASS (updated) |

(Related Room 1/2/3 sequence tests previously green when Room set to 4.)

---

## Live rehearsal totals

| Metric | Value |
|--------|--------|
| Checks | **49 PASS / 0 FAIL / 0 BLOCKED** |
| Cracks with Owner REQUIRED | None on green run |
| Intentional Owner judgment | One pricing exception — decided once |
| Email | NOT YET CERTIFIED (`d6974eb`) — neither pass nor fail |

---

## Owner dependence result

**Tagia is not the routine operator for this life.**  
Routine cracks recovered by Machine. One genuine pricing judgment landed on the desk; Machine carried aftermath. No Owner required for materials, stall, QA, revision, delivery, or return later.

---

## Explicit remaining limits

1. Branded Resend / domain / inbox proof still **PARKED** at `d6974eb` — do not fake; does not block this rehearsal.
2. Live Stripe click-through not re-certified (already sealed; honesty preserved).
3. Room 4 section is **parked for Manager** — not a CLOSED stamp; do not start Room 5.
4. After customer revision to promote CTA headline, “Back-to-School Reset” may leave the design-spec headline line while phone/web/$149/business remain — accepted for this revision intent; still monitor offer-line retention.
5. Do not merge until separately authorized.

---

## Final work commit / push

See git tip after this report lands. Branch: `operating/design-renderer-proof-1` (or current feature branch). Push when committed. **No merge.**

---

## Verdict line (exact)

**ROOM 4 REHEARSAL READY WITH BLOCKERS**
