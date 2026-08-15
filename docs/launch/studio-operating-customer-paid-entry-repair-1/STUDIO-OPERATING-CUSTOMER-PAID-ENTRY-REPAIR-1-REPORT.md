# STUDIO-OPERATING-CUSTOMER-PAID-ENTRY-REPAIR-1 REPORT

**Package:** STUDIO-OPERATING-CUSTOMER-PAID-ENTRY-REPAIR-1  
**Branch:** `operating/design-renderer-proof-1`  
**Scout status:** PARKED — final-review ready · **no merge**  
**Customer:** Maya Brooks · Cedar & Bloom Home Organizing · `v2-rtu-flyer` · **$69**  
**Evidence:** `docs/launch/studio-operating-customer-paid-entry-repair-1/`  
**Rerun:** Lobby → Conversation Room → Promote Something Now → Make Me a Flyer $69 → hosted Stripe sandbox → payment → intake · **14/14 customer proofs PASS**

---

## 1. Root cause of checkout failure

Stripe itself was not broken. The sealed hosted-Checkout engine already worked. Maya’s Conversation Room checkout did not successfully *hand her into* it.

Three customer-facing kinks stacked:

1. **The pay control was below the fold.**  
   Checkout led with route copy, scope notes, a false “live card processing is not applied in this build” line, the $69 summary, and “What Happens Next: 1. Checkout confirmed.” The terms checkbox and the actual Stripe launch button sat under that stack. Maya (and the dry-run script) never reached a working pay action.

2. **The tablet CTA said “Show payment form”** while the panel was already checkout. That is not hosted Stripe. Combined with the “not applied in this build” line, a real customer reasonably stopped.

3. **Complete Checkout was a no-op without terms, with no visible error.**  
   The button was disabled until the buried checkbox was ticked. Playwright’s click on a disabled control failed silently. A customer who *did* find the button and clicked it got nothing.

Payment Truth / `createCheckoutSession` / Stripe test keys were not the kink. After the UI could reach the existing `startHostedCheckout` path, hosted Checkout opened immediately (`checkout.stripe.com/c/pay/cs_test_…`, $69, SKU `v2-rtu-flyer`).

---

## 2. Repair

**Customer checkout launch (no Payment Truth rewrite):**

- Reordered hosted checkout so **Confirm and continue** (terms + **Continue to secure checkout**) sits above “What Happens Next.”
- Conversation Room uses the existing payment-truth CTA: “Continue to secure checkout.”
- Removed the false “taxes and live card processing are not applied in this build” note. Customers now see the sealed Stripe honesty line.
- Unchecked terms now **tell the customer** they must confirm the plan, instead of silently disabling pay.
- Cancel / fail / pending copy is shown on the checkout panel from durable processor state (`planBridgeError`), not guessed.

**Post-failure honesty:**

- Sign-in no longer says “Your project has been created” merely because `from=/studio-board`.
- Board activity copy for job selection is now “Added to your Studio Plan,” not “created.”
- Account-choice after paid intake says the paid project is saved. Sign-in without durable paid state does not congratulate.

**Intake timing:** unchanged architecture. Intake already required `paymentReceivedAt`. Maya now actually reaches that door because payment can complete.

**No-logo flyer:** see section 6. Mapper technical assumption repaired. Not an Owner product-law gate.

---

## 3. Successful customer hosted-Checkout proof

Maya from Lobby:

| Step | Result |
|------|--------|
| Make Me a Flyer $69 on checkout | **PASS** · `pay-checkout.png` |
| Continue to secure checkout | Opens `checkout.stripe.com` |
| Hosted Stripe sandbox | Studio Plan · v2-rtu-flyer · **$69.00** · `hosted-stripe-checkout.png` |
| Test card 4242… · Pay | **PASS** · `hosted-stripe-card-filled.png` |
| Return to Studio | `stage=intake` · `studio-return-after-pay.png` |

Client did not invent paid truth. Stripe hosted Checkout charged the sandbox; Studio marked paid only after processor confirmation. Tablet then showed **Payment received** and **Services confirmed**.

---

## 4. Failed / cancelled-payment honesty proof

| Case | Result |
|------|--------|
| Unpaid `/sign-in?from=/studio-board` | “Sign in to open your Studio Board. If you have a purchased project…” — **no** “project has been created.” `sign-in-unpaid-honesty.png` |
| Hosted Checkout opened, then cancelled | Returns to Conversation Room **checkout**. Copy: “Checkout was cancelled. Your project is still saved — you can try payment again when ready.” `cancelled-checkout-return.png` |
| Cancelled path | Stays `stage=checkout`. Intake does **not** open. |

---

## 5. Intake proof

After confirmed payment, Maya lands on **Project Intake**. Tablet: Payment received · Services confirmed. Form: Flyer / Make Me a Flyer.

Failed/cancelled payment never masquerades as paid. Existing Payment Truth and post-pay architecture preserved.

---

## 6. No-logo contract finding / result

**Question:** Does sealed `v2-rtu-flyer` product law require a customer logo?

**Finding: NO — not product law.** Technical mapper/reasoner assumption only.

Evidence:

- `FLYER_PROOF_CONTRACT` promised output is one single-sided flyer, PNG + PDF. It never named a logo as a required input. This package recorded `customerLogoRequired: false`.
- Catalog client responsibility is “Final wording, prices, logo, images, and contact details **you want on the flyer**” — not “you must supply a logo to buy this SKU.”
- Intake materials hint already said: “If you do not have materials yet, say so — do not invent files.”
- Intake UI offers **I do not have this yet** / **I will provide this later**.

**Repair (mapper, not product rewrite):**

- No approved logo-brand material → wordmark-only flyer (business name as identity). No Harbor/test logo invented.
- Approved logo with a missing/broken file still fail-closes (`MISSING_REQUIRED_MATERIAL` / `BROKEN_ASSET_REFERENCE`).
- Reasoner, spec validation, and job design-QA no longer require a logo material when none was supplied.

**Maya rerun:** she reached intake and the truthful no-materials door. Full Machine render of her Cedar & Bloom flyer was **not** completed in this customer walk (intake still has remaining required sections). Unit proof: mapper + reasoner produce a valid wordmark-only spec without inventing a mark.

No Owner product-law gate. Do not stop.

---

## 7. Maya rerun result

From **Lobby**, not from checkout:

Lobby → Conversation Room opening → Promote Something Now → Make Me a Flyer $69 → hosted Stripe sandbox → successful Pay → Project Intake.

Customer proofs: **14/14 PASS**.

Studio Voice status questions were **not** faked. They remain unfinished.

---

## 8. Regression totals

| Suite | Result |
|-------|--------|
| Customer-style Maya rerun | **14/14 PASS** |
| Scoped vitest (payment + honesty + flyer mapper/proof + board copy + journey hydration + CR smoke + dispatch hook/observer) | **12 files · 100 tests PASS** |

Frozen Stripe Payment Truth tests still pass. Observer still fail-closes when an **approved** logo file is missing.

---

## 9. Remaining limits

Out of this package (known, unfinished):

- Studio Voice / Ask box still does not read live payment/status truth.
- Conversation Room jargon and STUDIO REVIEW chrome (dry-run polish).
- Maya’s flyer PNG was not produced in the customer walk because intake was not fully submitted. The no-logo **mapper** is repaired; production of her exact flyer is the next completed-system stretch after she finishes remaining intake fields.
- Materials-slot inference still treats the word “logo” in client responsibilities as a Board materials request. That delays production start if she has none; it does not rewrite SKU law and was not silently removed.
- Paid Activation Recovery remains queued **after** this customer pay-path works.

---

## 10. Commit state

**Ready to commit. Not merged.** Identity/render churn and unrelated `current-identity.json` folders are excluded from this package.

---

## 11. Can Paid Activation Recovery resume?

**Yes.** The genuine first customer blocker is repaired: a first-time Maya can select Make Me a Flyer $69, open hosted Stripe Checkout, pay in sandbox, return, and reach Project Intake without a false “project created” congratulation and without Owner intervention.

Resume the original list:

1. Paid Activation Recovery  
2. Customer status / Studio Voice  
3. Review handoff  
4. Truth cleanup  
5. Owner Console  
6. Full rehearsal  

Keep sprinkling customer-style dry runs **between** those back-office groups — not only at the end.
