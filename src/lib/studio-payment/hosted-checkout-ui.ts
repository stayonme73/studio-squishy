/**
 * Hosted Stripe Checkout UI contract.
 * The Studio never collects card/payment-method details — Stripe does.
 */

import {
  searchHasStudioPaymentSandbox,
  sessionHasStudioPaymentSandbox,
} from "./sandbox-query";

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
 *
 * Next.js inlines `process.env.NODE_ENV` and `process.env.NEXT_PUBLIC_*`
 * only as those exact member expressions. Do not read them from a copied
 * `process.env` bag on the client — that hides the cert sandbox fixture.
 */
export function isDeveloperCheckoutSandboxVisible(options?: {
  env?: NodeJS.ProcessEnv;
  search?: string | null;
}): boolean {
  const nodeEnv = options?.env ? options.env.NODE_ENV : process.env.NODE_ENV;
  const sandboxFlag = options?.env
    ? options.env.NEXT_PUBLIC_PAYMENT_SANDBOX
    : process.env.NEXT_PUBLIC_PAYMENT_SANDBOX;
  const devTools = options?.env
    ? options.env.NEXT_PUBLIC_DEV_TOOLS
    : process.env.NEXT_PUBLIC_DEV_TOOLS;

  const sandboxAvailable =
    nodeEnv === "development" ||
    nodeEnv === "test" ||
    sandboxFlag === "1";
  if (!sandboxAvailable) return false;

  if (devTools === "1") return true;

  const search = options?.search ?? null;
  if (searchHasStudioPaymentSandbox(search)) return true;
  if (search == null) return false;
  return sessionHasStudioPaymentSandbox();
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
