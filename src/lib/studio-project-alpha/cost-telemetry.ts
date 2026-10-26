/**
 * Production cost telemetry — measured provider usage per job.
 *
 * Every billable call records provider, model, purpose, and the token usage the
 * provider reported. Cost is derived from the configured rate card. A call whose
 * usage could not be read is marked `usageReported: false` so the total is never
 * silently understated.
 */

import { AsyncLocalStorage } from "node:async_hooks";

import {
  GPT_IMAGE_1_OUTPUT_TOKENS_BY_SIZE,
  STUDIO_PROVIDER_RATE_CARD_V1,
  type ProviderTokenRates,
} from "@/config/studio-production-cost-telemetry-v1";

export type ProviderCallPurpose =
  | "image_generation"
  | "vision_creative_director"
  /** Reading the text actually present in generated or composed pixels. */
  | "vision_text_audit"
  | "creative_reasoning"
  | "studio_manager_guidance"
  /** Customer conversation text. Facts are checked before anything is spoken. */
  | "studio_voice_conversation";

export type ProviderCallUsage = {
  textInputTokens: number;
  cachedTextInputTokens: number;
  imageInputTokens: number;
  textOutputTokens: number;
  imageOutputTokens: number;
};

export type ProviderCallRecord = {
  provider: "openai" | "anthropic";
  model: string;
  purpose: ProviderCallPurpose;
  attempt: number;
  httpStatus: number;
  billable: boolean;
  usageReported: boolean;
  /**
   * True when the rate card has no entry for this model, so its cost priced to
   * zero. Without this flag a missing rate is indistinguishable from a free call
   * and the reported total silently understates real spend.
   */
  rateMissing: boolean;
  usageEstimatedFrom?: string;
  usage: ProviderCallUsage;
  costUsd: number;
  at: string;
};

export type ProviderCostLedger = {
  calls: ProviderCallRecord[];
};

function emptyUsage(): ProviderCallUsage {
  return {
    textInputTokens: 0,
    cachedTextInputTokens: 0,
    imageInputTokens: 0,
    textOutputTokens: 0,
    imageOutputTokens: 0,
  };
}

export function createProviderCostLedger(): ProviderCostLedger {
  return { calls: [] };
}

/**
 * Ledgers are bound to the async context of the collecting call, not to a module
 * global. A module global would attribute one request's spend to whichever
 * request happened to be collecting at the time — in a server handling two jobs
 * at once, that is silently wrong billing data.
 */
const ledgerStorage = new AsyncLocalStorage<ProviderCostLedger[]>();

let unattributedCalls = 0;

/**
 * Collect provider calls made during `run`, scoped to that call's async context.
 * Nested collection is supported: a call is recorded on the inner ledger and on
 * every enclosing one, so an outer collector still totals the whole request.
 */
export async function collectProviderCost<T>(
  run: () => Promise<T>,
): Promise<{ result: T; ledger: ProviderCostLedger }> {
  const ledger = createProviderCostLedger();
  const chain = [...(ledgerStorage.getStore() ?? []), ledger];
  const result = await ledgerStorage.run(chain, run);
  return { result, ledger };
}

/**
 * Billable calls made outside any collection scope. Above zero means some real
 * spend was never attributed to a request, so reported totals are a floor.
 */
export function unattributedProviderCallCount(): number {
  return unattributedCalls;
}

export function resetUnattributedProviderCallCount(): void {
  unattributedCalls = 0;
}

function ratesFor(model: string): ProviderTokenRates | undefined {
  return STUDIO_PROVIDER_RATE_CARD_V1.models[model];
}

export function priceProviderUsage(
  model: string,
  usage: ProviderCallUsage,
): number {
  const rates = ratesFor(model);
  if (!rates) return 0;
  const perMillion = (tokens: number, rate: number | undefined) =>
    tokens > 0 && rate ? (tokens / 1_000_000) * rate : 0;
  return (
    perMillion(usage.textInputTokens, rates.textInputPerMillion) +
    perMillion(usage.cachedTextInputTokens, rates.cachedTextInputPerMillion) +
    perMillion(usage.imageInputTokens, rates.imageInputPerMillion) +
    perMillion(usage.textOutputTokens, rates.textOutputPerMillion) +
    perMillion(usage.imageOutputTokens, rates.imageOutputPerMillion)
  );
}

/**
 * gpt-image-1 documents a fixed output-token count per size and quality.
 * Used only when a response omits usage.
 */
export function documentedImageOutputTokens(
  size: string,
  quality: "low" | "medium" | "high",
): number | null {
  return GPT_IMAGE_1_OUTPUT_TOKENS_BY_SIZE[size]?.[quality] ?? null;
}

export function recordProviderCall(input: {
  provider: "openai" | "anthropic";
  model: string;
  purpose: ProviderCallPurpose;
  attempt: number;
  httpStatus: number;
  billable?: boolean;
  usage?: Partial<ProviderCallUsage>;
  usageEstimatedFrom?: string;
}): ProviderCallRecord {
  const usage = { ...emptyUsage(), ...input.usage };
  const usageReported = Object.values(usage).some((value) => value > 0);
  const rateMissing = ratesFor(input.model) === undefined;
  const record: ProviderCallRecord = {
    rateMissing,
    provider: input.provider,
    model: input.model,
    purpose: input.purpose,
    attempt: input.attempt,
    httpStatus: input.httpStatus,
    billable: input.billable ?? input.httpStatus < 400,
    usageReported,
    usageEstimatedFrom: input.usageEstimatedFrom,
    usage,
    costUsd: priceProviderUsage(input.model, usage),
    at: new Date().toISOString(),
  };
  const chain = ledgerStorage.getStore();
  if (chain?.length) {
    for (const ledger of chain) ledger.calls.push(record);
  } else if (record.billable) {
    unattributedCalls += 1;
  }
  return record;
}

/** Usage block as returned by the Anthropic Messages API. */
export type AnthropicUsagePayload = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
};

/**
 * Meter one Anthropic Messages call. Cache-creation tokens are counted as normal
 * input because the rate card carries no write-premium rate, so a heavily cached
 * call reads slightly low rather than being dropped entirely.
 */
export function recordAnthropicCall(input: {
  model: string;
  purpose: ProviderCallPurpose;
  attempt?: number;
  httpStatus: number;
  usage?: AnthropicUsagePayload | null;
}): ProviderCallRecord {
  const usage = input.usage ?? undefined;
  return recordProviderCall({
    provider: "anthropic",
    model: input.model,
    purpose: input.purpose,
    attempt: input.attempt ?? 1,
    httpStatus: input.httpStatus,
    usage: {
      textInputTokens:
        (usage?.input_tokens ?? 0) + (usage?.cache_creation_input_tokens ?? 0),
      cachedTextInputTokens: usage?.cache_read_input_tokens ?? 0,
      textOutputTokens: usage?.output_tokens ?? 0,
    },
  });
}

export type ProviderCostSummary = {
  totalCalls: number;
  billableCalls: number;
  callsMissingUsage: number;
  /**
   * Calls whose model has no rate-card entry. Any value above zero means
   * `totalCostUsd` is a floor, not the real spend.
   */
  callsMissingRate: number;
  imageGenerationCalls: number;
  imageGenerationCostUsd: number;
  /** Creative Director inspections and pixel text audits together. */
  visionReviewCalls: number;
  visionReviewCostUsd: number;
  /**
   * Creative Director inspections alone — creative judgement.
   *
   * Split out from the combined vision figures so neither leg can hide behind the
   * other: a director call that priced at zero would otherwise be invisible in a
   * `visionReviewCostUsd` propped up by OCR spend.
   */
  creativeDirectorCalls: number;
  creativeDirectorCostUsd: number;
  /**
   * Pixel text audit (OCR) alone — integrity enforcement, and it scales with the
   * number of layers checked rather than with attempts.
   */
  textAuditCalls: number;
  textAuditCostUsd: number;
  reasoningCalls: number;
  reasoningCostUsd: number;
  /** Cost incurred by attempts after the first — Studio corrections. */
  retryCostUsd: number;
  totalCostUsd: number;
  byModel: Record<string, { calls: number; costUsd: number }>;
};

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function summarizeProviderCost(
  ledger: ProviderCostLedger,
): ProviderCostSummary {
  const byModel: Record<string, { calls: number; costUsd: number }> = {};
  let imageCalls = 0;
  let imageCost = 0;
  let visionCalls = 0;
  let visionCost = 0;
  let directorCalls = 0;
  let directorCost = 0;
  let textAuditCalls = 0;
  let textAuditCost = 0;
  let reasoningCalls = 0;
  let reasoningCost = 0;
  let retryCost = 0;
  let total = 0;
  let billable = 0;
  let missingUsage = 0;
  let missingRate = 0;

  // Attempt numbers come from the internal correction loop, which may already
  // have prior attempts from earlier production. Retry cost means "spent after
  // the first serious attempt of this run", so normalize to the lowest seen.
  const firstAttempt = ledger.calls.length
    ? Math.min(...ledger.calls.map((call) => call.attempt))
    : 1;

  for (const call of ledger.calls) {
    const bucket = (byModel[call.model] ??= { calls: 0, costUsd: 0 });
    bucket.calls += 1;
    bucket.costUsd = round6(bucket.costUsd + call.costUsd);
    total += call.costUsd;
    if (call.billable) billable += 1;
    if (!call.usageReported) missingUsage += 1;
    if (call.rateMissing) missingRate += 1;
    if (call.attempt > firstAttempt) retryCost += call.costUsd;
    if (call.purpose === "image_generation") {
      imageCalls += 1;
      imageCost += call.costUsd;
    } else if (
      call.purpose === "vision_creative_director" ||
      call.purpose === "vision_text_audit"
    ) {
      visionCalls += 1;
      visionCost += call.costUsd;
      if (call.purpose === "vision_text_audit") {
        textAuditCalls += 1;
        textAuditCost += call.costUsd;
      } else {
        directorCalls += 1;
        directorCost += call.costUsd;
      }
    } else {
      reasoningCalls += 1;
      reasoningCost += call.costUsd;
    }
  }

  return {
    totalCalls: ledger.calls.length,
    billableCalls: billable,
    callsMissingUsage: missingUsage,
    callsMissingRate: missingRate,
    imageGenerationCalls: imageCalls,
    imageGenerationCostUsd: round6(imageCost),
    visionReviewCalls: visionCalls,
    visionReviewCostUsd: round6(visionCost),
    creativeDirectorCalls: directorCalls,
    creativeDirectorCostUsd: round6(directorCost),
    textAuditCalls,
    textAuditCostUsd: round6(textAuditCost),
    reasoningCalls,
    reasoningCostUsd: round6(reasoningCost),
    retryCostUsd: round6(retryCost),
    totalCostUsd: round6(total),
    byModel,
  };
}

export type SkuMarginVerdict = {
  skuId: string;
  priceUsd: number;
  costPerSeriousAttemptUsd: number;
  projected: Record<"attempts1" | "attempts2" | "attempts3", number>;
  projectedShareOfPrice: Record<"attempts1" | "attempts2" | "attempts3", number>;
  worstCaseShareOfPrice: number;
  verdict: "no_material_threat" | "watch" | "material_threat";
  reasoning: string;
};

/**
 * One "serious attempt" is one generated visual plus its Creative Director
 * inspection — the unit that repeats when the Studio corrects itself.
 */
export function evaluateSkuMargin(input: {
  skuId: string;
  priceCents: number;
  warningShareOfPrice: number;
  failShareOfPrice: number;
  costPerSeriousAttemptUsd: number;
  fixedCostUsd?: number;
}): SkuMarginVerdict {
  const priceUsd = input.priceCents / 100;
  const fixed = input.fixedCostUsd ?? 0;
  const at = (attempts: number) =>
    round6(fixed + input.costPerSeriousAttemptUsd * attempts);
  const projected = {
    attempts1: at(1),
    attempts2: at(2),
    attempts3: at(3),
  };
  const share = (value: number) => round6(value / priceUsd);
  const projectedShareOfPrice = {
    attempts1: share(projected.attempts1),
    attempts2: share(projected.attempts2),
    attempts3: share(projected.attempts3),
  };
  const worst = projectedShareOfPrice.attempts3;
  const verdict =
    worst >= input.failShareOfPrice
      ? "material_threat"
      : worst >= input.warningShareOfPrice
        ? "watch"
        : "no_material_threat";
  return {
    skuId: input.skuId,
    priceUsd,
    costPerSeriousAttemptUsd: round6(input.costPerSeriousAttemptUsd),
    projected,
    projectedShareOfPrice,
    worstCaseShareOfPrice: worst,
    verdict,
    reasoning:
      verdict === "material_threat"
        ? `Three serious attempts consume ${(worst * 100).toFixed(1)}% of the ${priceUsd.toFixed(2)} price — provider cost is a margin threat at this price.`
        : verdict === "watch"
          ? `Three serious attempts consume ${(worst * 100).toFixed(1)}% of the ${priceUsd.toFixed(2)} price — tolerable but worth watching as retry rate rises.`
          : `Three serious attempts consume ${(worst * 100).toFixed(1)}% of the ${priceUsd.toFixed(2)} price — provider cost does not materially threaten margin at this price.`,
  };
}
