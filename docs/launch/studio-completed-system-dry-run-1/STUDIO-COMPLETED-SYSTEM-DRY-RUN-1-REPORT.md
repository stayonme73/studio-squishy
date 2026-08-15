# STUDIO-COMPLETED-SYSTEM-DRY-RUN-1 REPORT

**Mode:** Customer-style rehearsal · observation only · no remediation · no merge  
**Customer:** Maya Brooks · Cedar & Bloom Home Organizing · first-time · not technical  
**SKU:** `v2-rtu-flyer` (customer name: **Make Me a Flyer**)  
**Run:** 2026-08-15 · `6ed80937-dbe5-4f7a-a789-163b462f279d`  
**Evidence:** `docs/launch/studio-completed-system-dry-run-1/`  
**Scout status:** PARKED

Maya’s $149 is her **offer price to her clients**, not The Studio’s flyer fee. The Studio charged **$69** for Make Me a Flyer. That is catalog truth, not a fact invention.

---

## A. CUSTOMER VERDICT

### CUSTOMER WOULD LIKELY GET STUCK

A non-technical first-time customer can enter, answer questions, land on the right marketing route, and put **Make Me a Flyer** on a plan.

She then hits checkout and **cannot finish paying** from the customer surface in this run. There is no hosted Stripe handoff visible, no customer “pay” control Maya can complete, and Project Intake never opens. Sign-in later tells her the project has been created even though payment did not complete.

I did **not** produce a flyer. I will not invent one.

---

## B. Journey — how far Maya got

| Step | Result |
|------|--------|
| Studio Lobby chooser (new vs returning) | Reached. Chose Let’s Get Started. |
| Conversation Room opening (name, need, business, deadline, materials) | Reached. Maya’s facts accepted. |
| Route: **Promote Something Now** (suggested) | Reached. Fits a promotional flyer. |
| Choose services: **Make Me a Flyer** $69 added | Reached. |
| Studio Plan → Checkout | Reached. |
| **Pay** | **STUCK.** Complete Checkout did not take Maya to Stripe. Developer sandbox CTA is not the normal customer journey and did not advance the stage. |
| Project Intake | **Not reached** (still `data-stage=checkout`). |
| Account / claim / Board as a paid customer | **Not reached as paid.** Direct Board visit → Sign In. Copy says the project was created. |
| Post-pay activation / dispatch / flyer / Review / Delivery | **Not reached.** |
| Leave and return (fresh browser) | Sign In again. Continuity cannot be proven without a paid, claimed project. |

Screens: `docs/launch/studio-completed-system-dry-run-1/customer-eyes/`

---

## C. Kinks (genuine only)

### BLOCKER

1. **Maya cannot complete payment from the customer checkout.**  
   Checkout honestly says taxes and live card processing are not applied in this build, and the tablet still offers **Show payment form** after the panel is already open. This rehearsal never reached Stripe hosted Checkout. Without a pay action that works, a paying customer stops here.  
   Evidence: `12-checkout.png`, `12b-payment-form.png`, `13-paid.png` (still checkout).

2. **Sign-in tells Maya the project was created after payment failed.**  
   `/sign-in?from=/studio-board` copy: *“Your project has been created…”*  
   Payment path in this run: `failed`. That is dishonest.  
   Evidence: `19-board.png`.

### IMPORTANT FRICTION

3. **Conversation Room asks Maya to operate a control deck, not just answer.**  
   Voice On/Off, mic, Type, Ask, Send, Continue, Speak/Type/Ask again under Studio Controls, Save for now, Change an answer, STUDIO REVIEW. A non-technical owner would reasonably ask “what am I supposed to do here?” Duplicate Speak/Type.  
   Evidence: `03-name.png`, `04-need.png`.

4. **Required error + Saved at the same time.**  
   Orange “REQUIRED This answer is required.” with a green “✓ Saved” on the same turn.  
   Evidence: `03-name.png`.

5. **Ask-the-Studio box does not answer.**  
   `handleSendMessage` only pulses Saved. No conversational reply, no payment/status truth. Maya can type “Did my payment go through?” and get a filed checkmark.  
   Evidence: `ConversationRoomRuntime.tsx` `handleSendMessage`; Voice questions on Sign-in had no Ask field.

6. **Customer words Maya is not expected to know:** Route, purchased scope, Project Change process. Background still says **BUSINESS DISCOVERY STUDIO**. Developer **STUDIO REVIEW** is visible on Lobby, Conversation Room, and Sign-in.

### MINOR POLISH

7. Route suggestion **Promote Something Now** is actually a good match for a flyer. Not a defect. Earlier script flag was overly literal.

8. Studio Plan tablet leans on Voice copy (“review the services, price, and timeline”) while the tablet itself does not clearly show the $69 flyer line. Checkout does.

### Not a defect (clarified)

- **$69 vs $149:** $69 is what Maya pays The Studio. $149 is her Back-to-School Reset offer. Catalog is consistent. A confused customer might still mix them up unless checkout copy names “Studio fee.”

---

## D. What worked

- First-time Lobby path exists (New vs Returning).
- Guided opening captured Maya / Cedar & Bloom / flyer request / no materials.
- Keyword route suggestion correctly highlighted **Promote Something Now**.
- Service shelf used customer name **Make Me a Flyer**, not the SKU id.
- Maya could add only the flyer and open Studio Plan / Checkout.
- Checkout showed one service and $69.
- Honesty line exists: live card processing is not applied in this build (awkward, but not a lie).
- Cross-device Board is auth-gated (claim/sign-in), not a silently empty board.

---

## E. What did not (customer-visible)

| Behavior | Evidence |
|----------|----------|
| No working customer pay control that finished the purchase | Still `stage=checkout` after Complete Checkout / sandbox attempts |
| Intake never opened | `14-intake.png` / `15-intake-filled.png` are still checkout |
| “Project has been created” on Sign-in without payment | `19-board.png` |
| Ask box files questions instead of answering | code + no Voice answers |
| STUDIO REVIEW chrome on customer screens | every capture |

---

## F. Studio Voice — seven questions

Package 4 Voice Host is **not** a completed status engine. Ask-box send **does not generate a reply**.

| Question | Could Voice truthfully answer from current Studio/Machine state? |
|----------|---------------------------------------------------------------------|
| Did my payment go through? | **NO / UNFINISHED** |
| Do you need anything else from me? | **NO / UNFINISHED** |
| Has anyone started working on my project? | **NO / UNFINISHED** |
| What is the status of my flyer? | **NO / UNFINISHED** |
| When will I be able to review it? | **NO / UNFINISHED** |
| Can I make changes after I see it? | **NO / UNFINISHED** (Help Center copy exists elsewhere; Voice does not retrieve it here) |
| Where do I go to see my finished file? | **NO / UNFINISHED** |

Do not treat this as “Voice got it wrong.” Treat it as **the connection is not built**.

---

## G. Owner dependency

Routine Tagia was **not** required to click anything in this run.

If Maya were live, she would likely **email Tagia from checkout** (“I can’t pay / is this a test?”) or from Sign-in (“it says my project was created”). That is Owner residue from a stuck customer, not Owner production labor.

---

## H. Actual flyer

**None.** Production never started because payment never completed.

I am not attaching a Harbor CERT fixture or generating a Cedar & Bloom flyer by injecting a logo. That would hide the customer stop.

If she *had* paid and reached intake with “no logo, no photos,” the sealed Machine flyer mapper still **fail-closes** on `MISSING_REQUIRED_MATERIAL` (approved logo required). That is the **next** completed-system boundary after money clears — not reached today.

**Visuals for Manager (what Maya actually received):**

- Entry: `customer-eyes/01-lobby.png`
- Guidance messiness: `customer-eyes/03-name.png`
- Right service, Studio price $69: `customer-eyes/10-services.png`
- Stuck checkout: `customer-eyes/12-checkout.png`
- Dishonest Sign-in: `customer-eyes/19-board.png`

---

## I. Completed-system boundary

### First customer stop (this run)

**Conversation Room checkout — first-time customer cannot complete Stripe payment and cannot reach Intake.**

Sandbox pay is a developer fixture (`?studioPaymentSandbox=1` / `NEXT_PUBLIC_DEV_TOOLS`), not what Maya is shown.

### Next known unfinished systems *if* payment had worked

1. **Studio Voice status** — Ask dock present; no campaign/payment/review readers (Package 4 / communication spine).  
2. **Machine flyer with no logo** — mapper requires approved `logo-brand` material; Maya supplied none.  
3. **Machine → Review QA bind** — still staff glue per whole-system audit.  
4. **Lifecycle email** — not live. Board is status home.  
5. **Paid activation recovery** — already-paid wake gaps remain. Claim/continuity is sealed but untestable here because there was nothing paid to recover.

---

## J. Recommendation (order only — no repair this package)

This dry run **should not reopen sealed design SKUs**.

It **should alter launch sequencing slightly:**

Do **not** start a large back-office package tomorrow under the belief that a first-time customer can already buy a flyer end-to-end.

The squeaky stair is **customer checkout → paid → Intake**, then honesty of “project created,” then (only after pay works) **no-logo Machine path** and Voice/status.

Claim/continuity remains important but was **not the first Maya-blocker** in this rehearsal.

**Suggested next if Tagia wants the customer spine to match “completed” claims:**

1. Honest first-time **Complete Checkout → Stripe test → Intake** on Conversation Room (or an equally customer-visible pay control).  
2. Then paid rehearsal of Maya’s flyer **including the no-logo case** (product policy: wordmark-only vs stop-and-ask).  
3. Then activation recovery / status spine as previously queued.

No merge. No remediation started.
