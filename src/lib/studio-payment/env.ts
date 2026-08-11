import { studioPaymentV1 } from "@/config/studio-payment-v1";

export type StripeMode = "test" | "live";

export type StripeSecretKeyStatus =
  | { status: "missing" }
  | { status: "invalid_format"; hint: string }
  | { status: "ok"; secret: string; mode: StripeMode };

export function readStripeSecretKey(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return env[studioPaymentV1.env.secretKey]?.trim() || undefined;
}

export function readStripeWebhookSecret(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return env[studioPaymentV1.env.webhookSecret]?.trim() || undefined;
}

export function readStripePublishableKey(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return env[studioPaymentV1.env.publishableKey]?.trim() || undefined;
}

/** Stripe Checkout Session API requires a secret key (sk_test_… / sk_live_…). */
export function looksLikeStripeSecretKey(value: string): boolean {
  return /^sk_(test|live)_/.test(value.trim());
}

export function inspectStripeSecretKey(
  env: NodeJS.ProcessEnv = process.env,
): StripeSecretKeyStatus {
  const secret = readStripeSecretKey(env);
  if (!secret) return { status: "missing" };
  if (!looksLikeStripeSecretKey(secret)) {
    const prefix = secret.slice(0, Math.min(7, secret.length));
    return {
      status: "invalid_format",
      hint: `STRIPE_SECRET_KEY must be a Stripe secret key (sk_test_… or sk_live_…). Current value does not look like one (starts with “${prefix}”).`,
    };
  }
  const mode: StripeMode = secret.startsWith("sk_live_") ? "live" : "test";
  return { status: "ok", secret, mode };
}

export function inferStripeMode(
  env: NodeJS.ProcessEnv = process.env,
): StripeMode {
  const explicit = env[studioPaymentV1.env.mode]?.trim().toLowerCase();
  if (explicit === "live") return "live";
  if (explicit === "test") return "test";
  const inspected = inspectStripeSecretKey(env);
  if (inspected.status === "ok") return inspected.mode;
  return "test";
}

export function isStripeConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return inspectStripeSecretKey(env).status === "ok";
}

/**
 * Live money must never run inside unit/CI tests.
 * Construction packages use test keys or the sandbox confirm path.
 */
export function assertStripeSafeForTests(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.NODE_ENV === "test" && inferStripeMode(env) === "live") {
    throw new Error(
      "STRIPE live mode is forbidden during tests — use test keys or unset STRIPE_SECRET_KEY",
    );
  }
}

export function stripeCredentialPresence(
  env: NodeJS.ProcessEnv = process.env,
): {
  configured: boolean;
  mode: StripeMode;
  secretKeyEnv: typeof studioPaymentV1.env.secretKey;
  webhookSecretEnv: typeof studioPaymentV1.env.webhookSecret;
  publishableKeyEnv: typeof studioPaymentV1.env.publishableKey;
  secretKeyStatus: StripeSecretKeyStatus["status"];
} {
  const inspected = inspectStripeSecretKey(env);
  return {
    configured: inspected.status === "ok",
    mode: inferStripeMode(env),
    secretKeyEnv: studioPaymentV1.env.secretKey,
    webhookSecretEnv: studioPaymentV1.env.webhookSecret,
    publishableKeyEnv: studioPaymentV1.env.publishableKey,
    secretKeyStatus: inspected.status,
  };
}
