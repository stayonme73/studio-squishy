/** Vercel Preview / owner dry-runs — set on Preview env only, not Production. */
export function isPaymentSandboxPreviewFlagEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYMENT_SANDBOX === "1";
}

/**
 * True when the non-Stripe sandbox confirm path may run.
 * Local dev + unit tests; public preview when NEXT_PUBLIC_PAYMENT_SANDBOX=1.
 * Never invents paid truth by itself — callers must use server sandbox-confirm.
 */
export function isPaymentSandboxAvailable(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test" ||
    isPaymentSandboxPreviewFlagEnabled()
  );
}

/**
 * @deprecated Local paid mutation removed — use POST /api/payments/sandbox-confirm
 * after createCheckoutSession sandbox mode. Kept as a hard fail-closed stub.
 */
export function simulateSandboxPayment(): null {
  return null;
}
