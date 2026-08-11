# HOSTED CHECKOUT SINGLE-ENTRY FLOW — REPORT

**Package:** STUDIO-OPERATING-PAYMENT-TRUTH-1 addendum  
**Defect:** Studio collected card details, then redirected to Stripe for a second entry  
**Status:** HOSTED CHECKOUT SINGLE-ENTRY FLOW UNBLOCKED  
**Scout:** PARKED  
**Git:** No commit · No push · No merge  

---

## Classification

| Surface | Class | Disposition |
|---------|-------|-------------|
| Studio card number / exp / CVV / ZIP inputs | **LEGACY** | Removed from hosted-checkout UI |
| Studio contact form (name/email/phone) on checkout | **LEGACY** (not required for hosted redirect) | Removed from hosted-checkout UI |
| Test pay with sandbox confirm | **SANDBOX FIXTURE** | Hidden unless `NEXT_PUBLIC_DEV_TOOLS=1` or `?studioPaymentSandbox=1` |
| Complete Checkout → Stripe URL redirect | **CURRENT HOSTED-CHECKOUT REQUIREMENT** | Unchanged authority path |

---

## Required flow (restored)

Studio Plan review → confirm acknowledgment → **Complete Checkout** → Stripe-hosted Checkout (card once) → webhook/reconcile paid truth → return to Studio.

Studio checkout now shows only: plan/services, amount, confirmation checkbox, Complete Checkout, Stripe security note.

---

## Security

- Studio UI no longer presents card fields on the hosted path.
- No Studio handlers persist, log, or transmit card PAN/CVC (legacy inputs were never wired to a processor; they were presentation-only and are gone).
- Card entry remains inside Stripe Checkout.

---

## Files changed

- `src/components/payment/SecureCheckoutGrid.tsx`
- `src/config/payment.ts`
- `src/lib/studio-payment/hosted-checkout-ui.ts` (+ test)
- `src/lib/studio-payment/index.ts`
- `src/lib/studio-payment/payment-truth.test.ts`
- this report

---

## Tests

```text
npx vitest run \
  src/lib/studio-payment/hosted-checkout-ui.test.ts \
  src/lib/studio-payment/payment-truth.test.ts
```

Proves: no card fields in SecureCheckoutGrid source; sandbox hidden from normal customer flow; amount/CLEAR/webhook payment-truth regressions green.

---

## Owner resume

Restart smoke from Studio checkout review → Complete Checkout → enter test card **once** on Stripe.

---

## Return

**HOSTED CHECKOUT SINGLE-ENTRY FLOW UNBLOCKED**

Scout PARKED.
