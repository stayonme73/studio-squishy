# STUDIO-OPERATING-ROOM-2-CUSTOMER-FACING-TRUTH-AND-FRICTION-ENTRY-1

**Package:** STUDIO-OPERATING-ROOM-2-CUSTOMER-FACING-TRUTH-AND-FRICTION-ENTRY-1  
**Room:** 2 — Customer-facing truth + friction cleanup  
**Status:** CLOSED  
**Room 2 closed:** **NO**  
**Section 1 closed:** **YES**  
**Do not auto-advance:** yes  
**Merge:** no  
**Owner routine:** NONE

Tagia closed this section 2026-08-17 on the customer-eyes evidence. Close tip **`45b09b1`**. Earlier PARK checkpoint **`90dcc84` is not the close**.

The Board-as-source-of-truth copy sitting below the pay button remains a **non-blocking friction note**, not a Section 1 blocker.

Walk customer (first-time, nontechnical): Jordan · Hale Weekend Bakery · Saturday farmers-market flyer · Make Me a Flyer / `v2-rtu-flyer` / Studio fee **$69**. No new paid order. Stopped at hosted Stripe and cancelled back.

Evidence: `docs/launch/studio-operating-room-2-customer-facing-truth-and-friction-entry-1/customer-eyes/`

---

## Doorway from Room 1

Room 1 is **COMPLETE EXCEPT DEFERRED EXTERNAL DOMAIN/EMAIL**. No full CLOSED stamp. Authoritative executable tip `a49efd7`. Yellow sticky `d6974eb` does **not** block Room 2.

Do not reopen Room 1 capabilities unless new evidence. Do not reopen Resend. Do not start Owner Console.

---

## Scope (this section only)

Lobby / entry → Conversation Room → recommendation / service selection → project review → payment handoff.

Method: **CUSTOMER-USE → FIND → FIX → BREAK → RETEST → PARK FOR MANAGER**

---

## Provisional corrections from the first park (Manager accepted)

1. Checkout no longer says emails are off “in this build.”
2. Checkout errors no longer leak Stripe env / key formats / raw processor text.
3. Stale “card processing isn't connected” copy/tests aligned with hosted Stripe.
4. Tablet **Open checkout** is not the pay action. Real CTA remains **Continue to secure checkout**.

Those still stand. They were not the close stamp.

---

## Final customer-eyes walk

**Result:** **30 / 30 PASS**. Non-blocking pauses: **1**. Blocking pauses: **0**. Did **not** complete payment.

| Beat | What the customer could see / do |
|---|---|
| Lobby | New to The Studio / Let’s Get Started is the first-time start. Returning Client is a separate Sign In. No Squishy. |
| Conversation | Speak and Type are both present. Dock submit during questions now says **Continue**, matching the tablet. |
| Recommendation | Suggested starting point. Customer can choose a different path. Jordan continued with Promote Something Now. |
| Services | Make Me a Flyer at **$69**. Details show Included and The Studio Does Not Offer. |
| Studio Plan | Selected service and $69. Revisions / We'll Need open beside the tablet. |
| Payment handoff | Open checkout opens the panel. Continue to secure checkout opened hosted Stripe (`checkout.stripe.com`). Project stayed unpaid until then. |
| Cancel / Back | Returned to checkout unpaid. Copy: checkout was cancelled; project is still saved. Stage stayed checkout, not intake. |

### Fixes found on the walk (then retested)

5. **Deadline date rules were shown as if every customer had typed a calendar date.**  
   The tablet always showed the compact-number date hint, even after picking “Within 2 weeks.” Leftover typing could beat the chip. Hard-nav rejected relative choices as invalid dates.  
   **Fix:** Date-format hint only when “I have a specific date” is selected. A selected duration chip wins over leftover typed text. Hard-nav accepts relative deadline choices.

6. **Dock Send and tablet Continue looked like two different actions while answering.**  
   **Fix:** While a guide question is open, the dock button uses the same **Continue** label as the tablet. After questions, it still says Send for free-ask.

7. **The type-field placeholder clipped on the narrow rail.**  
   **Fix:** The type field is a wrapping textarea so the instructional placeholder can fully appear.

### Customer friction log

| Where | Kind | Blocking? | Note |
|---|---|---|---|
| Payment handoff | what-next | **No** | Tablet already says intake comes next. Board-is-source-of-truth copy lives in What Happens Next, **below** Continue to secure checkout, so a first-timer can miss it unless they scroll. |

No in-scope blocking defect remained after the deadline / Continue / placeholder fixes. That below-fold next-step copy is recorded, not treated as a close-blocker, and not a jump to a later section.

---

## Later Room 2 residue (handed to Section 2)

Recorded here so Section 2 does not rediscover the same list. Section 2 is authorized to work these:

- Studio Board **Ask Squishy**
- Help Center legacy chat / “this version” email language
- Redirected Project Builder companion
- Quarantined `/route-map` Direct Route tagline still names Squishy in source
- Kitchen / Owner Console Squishy language (staff / later rooms — do not jump)

The front-door walk did not encounter those surfaces.

---

## Automated retest

Targeted vitest **54 / 54 PASS** (closeout, Room 2 entry, honesty, plan-summary, payment-truth, guide answer/hard-nav).

Live customer-eyes walk **30 / 30 PASS**.

Green checks were **not** the close. Tagia closed on the customer-eyes evidence at **`45b09b1`**. `90dcc84` remains an earlier PARK checkpoint.

---

## What this package did **not** do

- Fully close Room 1
- Close or rewrite `d6974eb`
- Complete a new paid order
- Start Owner Console
- Visual redesign
- Merge

---

## Next

**CLOSED.** Authorized next package: `STUDIO-OPERATING-ROOM-2-RETURNING-CUSTOMER-BOARD-AND-HELP-CENTER-TRUTH-1`. Do not reopen this section unless new evidence.
