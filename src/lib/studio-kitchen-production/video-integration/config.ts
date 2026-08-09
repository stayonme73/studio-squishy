/**
 * Shotstack configuration — server-side only.
 * Never log, persist, or return raw API keys.
 */

import type { ShotstackEnvName } from "./types";

export const SHOTSTACK_API_KEY_ENV = "SHOTSTACK_API_KEY" as const;
export const SHOTSTACK_ENV_VAR = "SHOTSTACK_ENV" as const;

/** Default to sandbox until Owner explicitly switches to production. */
export const DEFAULT_SHOTSTACK_ENV: ShotstackEnvName = "stage";

export function readShotstackApiKey(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const key = env.SHOTSTACK_API_KEY?.trim();
  return key || undefined;
}

export function readShotstackEnv(
  env: NodeJS.ProcessEnv = process.env,
): ShotstackEnvName {
  const raw = env.SHOTSTACK_ENV?.trim().toLowerCase();
  if (raw === "v1" || raw === "prod" || raw === "production") return "v1";
  return DEFAULT_SHOTSTACK_ENV;
}

export function shotstackEditBaseUrl(envName: ShotstackEnvName): string {
  return `https://api.shotstack.io/edit/${envName}`;
}

export function shotstackIngestBaseUrl(envName: ShotstackEnvName): string {
  return `https://api.shotstack.io/ingest/${envName}`;
}

export function shotstackCredentialPresence(
  env: NodeJS.ProcessEnv = process.env,
): {
  configured: boolean;
  apiKeyPresent: boolean;
  envVarName: typeof SHOTSTACK_API_KEY_ENV;
  shotstackEnv: ShotstackEnvName;
} {
  const key = readShotstackApiKey(env);
  return {
    configured: Boolean(key),
    apiKeyPresent: Boolean(key),
    envVarName: SHOTSTACK_API_KEY_ENV,
    shotstackEnv: readShotstackEnv(env),
  };
}

export function redactSecretsForEvidence<T extends Record<string, unknown>>(
  obj: T,
): T {
  const clone = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(clone)) {
    if (/api[_-]?key|secret|authorization|x-api-key/i.test(key)) {
      clone[key] = "[redacted]";
    }
    if (typeof clone[key] === "string") {
      clone[key] = (clone[key] as string).replace(
        /[a-zA-Z0-9_\-]{20,}/g,
        (m) => (m.length > 40 ? "[redacted-token]" : m),
      );
    }
  }
  return clone as T;
}

export const DEFAULT_SUBMIT_RETRY: import("./types").RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 500,
};

export const DEFAULT_POLL_RETRY: import("./types").RetryPolicy = {
  maxAttempts: 60,
  baseDelayMs: 2000,
};

export const DEFAULT_DOWNLOAD_RETRY: import("./types").RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 750,
};

export const OWNER_SETUP_INSTRUCTIONS = {
  signupUrl: "https://dashboard.shotstack.io/register",
  pricingUrl: "https://shotstack.io/pricing",
  docsApiKeysUrl: "https://shotstack.io/docs/guide/getting-started/core-concepts/",
  minimumAccount:
    "Free developer account with stage (sandbox) API key. Pricing FAQ: 10 free credits valid 30 days. No paid plan required for first 15–30s smoke renders.",
  creditCardRequired: "UNVERIFIED for signup — Shotstack marketing states Start For Free / 10 free credits; confirm at dashboard if card is demanded.",
  credentialNeeded: "Stage environment API key (x-api-key header). Prefer stage over v1 until cert.",
  recommendedKeyName: "studio-kitchen-video-integration-1-stage",
  leastPrivilege:
    "Use the stage key only. Do not paste production (v1) key until Owner authorizes paid/commercial renders.",
  storeLocally: ".env.local (gitignored via .env*)",
  envLines: [
    "SHOTSTACK_API_KEY=<paste-stage-key-here-never-in-chat>",
    "SHOTSTACK_ENV=stage",
  ],
  doNotPasteKeyIntoChat: true,
  doNotPurchase: true,
} as const;
