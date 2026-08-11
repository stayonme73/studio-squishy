/**
 * Hosted Stripe Checkout UI contract.
 * The Studio never collects card/payment-method details — Stripe does.
 */

/** Input name attributes that must not appear on Studio hosted-checkout surfaces. */
export const HOSTED_CHECKOUT_FORBIDDEN_FIELD_NAMES = [
  "cardNumber",
  "expDate",
  "cvv",
  "zipCode",
  "paymentMethod",
  "card",
  "cvc",
  "cc-number",
] as const;

/**
 * Developer sandbox fixture visibility — never the normal customer journey.
 * Requires sandbox availability plus an explicit developer opt-in.
 */
export function isDeveloperCheckoutSandboxVisible(options?: {
  env?: NodeJS.ProcessEnv;
  search?: string | null;
}): boolean {
  const env = options?.env ?? process.env;
  const sandboxAvailable =
    env.NODE_ENV === "development" ||
    env.NODE_ENV === "test" ||
    env.NEXT_PUBLIC_PAYMENT_SANDBOX === "1";
  if (!sandboxAvailable) return false;

  if (env.NEXT_PUBLIC_DEV_TOOLS === "1") return true;

  const search = options?.search ?? null;
  if (search == null) return false;
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  return params.get("studioPaymentSandbox") === "1";
}

export function markupContainsForbiddenCardFields(markup: string): boolean {
  const lower = markup.toLowerCase();
  for (const name of HOSTED_CHECKOUT_FORBIDDEN_FIELD_NAMES) {
    if (lower.includes(`name="${name.toLowerCase()}"`)) return true;
    if (lower.includes(`autocomplete="cc-`)) return true;
  }
  if (lower.includes("card number") && lower.includes("<input")) return true;
  return false;
}
