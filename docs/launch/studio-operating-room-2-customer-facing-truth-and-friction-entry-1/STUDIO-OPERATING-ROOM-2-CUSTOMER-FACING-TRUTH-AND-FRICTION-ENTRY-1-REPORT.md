# STUDIO-OPERATING-ROOM-2-CUSTOMER-FACING-TRUTH-AND-FRICTION-ENTRY-1

**Package:** STUDIO-OPERATING-ROOM-2-CUSTOMER-FACING-TRUTH-AND-FRICTION-ENTRY-1  
**Room:** 2 — Customer-facing truth + friction cleanup  
**Status:** PARKED FOR MANAGER  
**Room 2 closed:** **NO**  
**Do not auto-advance:** yes  
**Merge:** no  
**Owner routine:** NONE

Maya fixture (unchanged, not recertified here): Maya Brooks · Cedar & Bloom Home Organizing · Back-to-School Reset · Make Me a Flyer / `v2-rtu-flyer` / Studio fee **$69**.

This is **cleanup and truth certification**, not a visual redesign. First section only.

---

## Doorway from Room 1 (Tagia closeout call 2026-08-17)

Room 1 is **COMPLETE EXCEPT DEFERRED EXTERNAL DOMAIN/EMAIL**. No full CLOSED stamp.

| Field | Value |
|---|---|
| Authoritative executable tip | `a49efd7` |
| Abandoned 3067 attempts | Non-authoritative — do not count, do not reopen |
| Yellow sticky | Branded domain / business email / live Resend inbox at `d6974eb` |
| Blocks Room 2? | **No** |

Do not reopen payment, uploads, Voice, production, QA, Review, revision, delivery, or the torture test unless new evidence exposes a real defect. Do not reopen Resend. Do not start Owner Console.

---

## Scope (this section)

Lobby / entry → Conversation Room → recommendation / service selection → project review → payment handoff.

Method: **CUSTOMER-USE → FIND FRICTION/TRUTH DEFECTS → FIX → BREAK → RETEST → PARK FOR MANAGER**

---

## Defects found and fixed (in scope)

1. **Checkout told customers emails are off “in this build.”**  
   Live Conversation Room checkout reuses `SecureCheckoutGrid`, which prints `payment.whatsNext.emailReassurance`. That sentence was internal and also untrue: notices can queue; Board is the source of truth; branded inbox is the Room 1 yellow sticky, not “emails are off.”  
   **Fix:** Board-source-of-truth courtesy-notice copy. No “this build.” No fake inbox certification.

2. **Checkout error copy leaked Stripe env and secret-key formats.**  
   `processorCredentialsInvalid` named `STRIPE_SECRET_KEY` / `sk_test_` / `sk_live_`. Dev also appended the format hint to the customer-visible message. `processorSessionFailed` asked customers to “check Stripe credentials” and could append raw Stripe errors in development. Missing Checkout Session URL used an internal Stripe sentence.  
   **Fix:** Customer copy is retry-or-contact. Session create no longer forwards env hints or Stripe exception text to the customer.

3. **Stale “card processing is not connected in this build” freeze.**  
   Live `payment.summary.cardProcessingDisclosureNote` already said Stripe confirms the amount. The plan-summary test still expected the old unfinished-build sentence. Project Builder copy still claimed local-only checkout and disconnected cards, even though `/project-builder` redirects into Conversation Room. Also dropped “server-side” from the live disclosure.  
   **Fix:** Tests and residue copy match Stripe-hosted checkout. Redirected Project Builder page was not redesigned.

4. **Tablet checkout CTA competed with the real pay button.**  
   Both the tablet “open panel” control and the Stripe continue button said “Continue to secure checkout.” The first click only opens the panel.  
   **Fix:** Tablet CTA is **Open checkout**. Stripe submit stays **Continue to secure checkout**.

---

## In-scope copy that already stood (no redesign)

- Lobby entry: guided conversation / Sign In / Board / Help Center. No Squishy. No “this build.”
- Conversation Room route: “Suggested starting point” + “You can choose a different path.” Direct Route display override already avoids Squishy.
- Checkout security notes already name Stripe and unpaid-until-confirmed.

---

## Recorded for later Room 2 sections (not this spine)

Do not jump. Do not redesign now.

- Studio Board **Ask Squishy**
- Quarantined `/route-map` Direct Route tagline still names Squishy in source (customer path redirects to Conversation Room)
- Help / refund-request “Squishy chat” residue
- Redirected Project Builder Squishy companion
- Kitchen / Owner Console Squishy language (staff / later rooms)

---

## Automated retest

Targeted vitest **48 / 48 PASS** on closeout, Room 2 entry, payment honesty, plan-summary, and payment-truth.

Green checks are **not** a Room 2 close.

**Park commit:** `90dcc84` on `operating/design-renderer-proof-1`.

---

## What this package did **not** do

- Fully close Room 1
- Close or rewrite `d6974eb`
- Certify branded sender / real inbox / live Resend reject-retry
- Start Owner Console
- Start later Room 2 sections (Board, intake, Review, delivery)
- Visual redesign
- Merge

---

## Next

Manager review of this first Room 2 section. Do not auto-advance.
