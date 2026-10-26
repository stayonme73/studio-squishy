/**
 * PROJECT ALPHA — production cost telemetry.
 *
 * Purpose: answer "can we afford to sell it?" with measured provider usage,
 * not a guess. Token counts come from live API responses. Only the per-token
 * rates live here.
 *
 * These rates are published list rates transcribed from provider model pages.
 * They are NOT a billing statement. `ratesVerifiedAgainstLiveBilling` stays
 * false until someone reconciles a real invoice.
 */

export const STUDIO_PRODUCTION_COST_TELEMETRY_PACKAGE_ID =
  "STUDIO-OPERATING-PROJECT-ALPHA-PRODUCTION-COST-TELEMETRY-1" as const;

export type ProviderTokenRates = {
  /** USD per 1M text input tokens. */
  textInputPerMillion: number;
  /** USD per 1M cached text input tokens, when the provider bills one. */
  cachedTextInputPerMillion?: number;
  /** USD per 1M image input tokens (vision reads). */
  imageInputPerMillion?: number;
  /** USD per 1M text output tokens. */
  textOutputPerMillion?: number;
  /** USD per 1M image output tokens (generated pixels). */
  imageOutputPerMillion?: number;
  source: string;
};

export const STUDIO_PROVIDER_RATE_CARD_V1 = {
  schemaVersion: 1 as const,
  currency: "USD" as const,
  ratesVerifiedAgainstLiveBilling: false as const,
  transcribedAt: "2026-09-13" as const,
  note: "Published list rates transcribed from provider model pages. Not a billing statement. Reconcile against a real invoice before pricing decisions are final.",
  models: {
    "gpt-image-1": {
      textInputPerMillion: 5,
      cachedTextInputPerMillion: 1.25,
      imageInputPerMillion: 10,
      imageOutputPerMillion: 40,
      source: "developers.openai.com/api/docs/models/gpt-image-1",
    },
    "gpt-4.1-mini": {
      textInputPerMillion: 0.4,
      cachedTextInputPerMillion: 0.1,
      imageInputPerMillion: 0.4,
      textOutputPerMillion: 1.6,
      source: "developers.openai.com/api/docs/models/gpt-4.1-mini",
    },
    "claude-sonnet-4-5-20250929": {
      textInputPerMillion: 3,
      textOutputPerMillion: 15,
      source: "anthropic.com/pricing — Sonnet 4.5 standard context",
    },
  } as Record<string, ProviderTokenRates>,
} as const;

/**
 * gpt-image-1 bills generated pixels as image output tokens. When a response
 * omits usage, these documented per-size token counts let telemetry stay
 * honest instead of reporting zero.
 */
export const GPT_IMAGE_1_OUTPUT_TOKENS_BY_SIZE: Record<
  string,
  { low: number; medium: number; high: number }
> = {
  "1024x1024": { low: 272, medium: 1056, high: 4160 },
  "1024x1536": { low: 408, medium: 1584, high: 6240 },
  "1536x1024": { low: 400, medium: 1568, high: 6208 },
};

/** Working launch price for the flyer SKU under test. */
export const FLYER_SKU_ECONOMICS_V1 = {
  skuId: "v2-rtu-flyer" as const,
  priceCents: 6900,
  /**
   * Provider spend above this share of price is treated as a margin threat.
   * Chosen so a $69 flyer keeps at least ~85% for the business.
   */
  providerCostWarningShareOfPrice: 0.15,
  providerCostFailShareOfPrice: 0.3,
} as const;
