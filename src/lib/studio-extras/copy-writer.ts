/**
 * Studio-written copy for Review Request Kit and Ad Creative.
 * Written by the Studio's text model from customer facts, then checked.
 * There is no template fallback: a template is not Studio-quality writing.
 */

import { copyCreativeWritingAvailable } from "@/config/studio-production-team-workforce-v1";
import { loadStudioLocalEnv } from "@/lib/studio-production-team-workforce/anthropic-runtime";
import {
  recordAnthropicCall,
  type AnthropicUsagePayload,
} from "@/lib/studio-project-alpha/cost-telemetry";

export type ReviewMessagesCopy = {
  kind: "review_messages";
  text: string;
  email: { subject: string; body: string };
  thankYou: { subject: string; body: string };
  card: { headline: string; line: string };
};

export type AdCopy = {
  kind: "ad_copy";
  options: { headline: string; primaryText: string }[];
  /**
   * A model reply can arrive short or long. `checkAdCopy` requires exactly
   * three beats before any graphic is made.
   */
  graphic: { theme: string; beats: readonly string[] };
};

export type ExtrasCopyFacts = {
  businessName: string;
  offer: string;
  cta: string;
  reviewLink?: string;
  contact?: string;
  mustNot?: string;
};

export type ExtrasWriterUsage = {
  inputTokens: number;
  outputTokens: number;
};

/** Provider problems. These are not copy-quality failures. */
export type ExtrasWriterFailureCategory =
  | "authentication"
  | "billing"
  | "rate_limit"
  | "network"
  | "unavailable";

export type ExtrasCopyResult<T> =
  | {
      ok: true;
      copy: T;
      attempts: { outcome: "passed" | "failed"; reasons: string[] }[];
      usage: ExtrasWriterUsage;
    }
  | {
      ok: false;
      code: "WRITER_UNAVAILABLE" | "COPY_QA_EXHAUSTED" | "WRITER_PROVIDER_FAILURE";
      category?: ExtrasWriterFailureCategory | "missing_credentials";
      httpStatus?: number | null;
      attempts: { outcome: "failed" | "writer_unavailable"; reasons: string[] }[];
      message: string;
      usage: ExtrasWriterUsage;
    };

const PROHIBITED = [
  /\b5[- ]?star\b/i,
  /★/,
  /\bguarantee(d)?\b/i,
  /#1\b/,
  /\bbest in\b/i,
  /\b100%/,
  /\{\{|\}\}|\[(?:name|link|business)[^\]]*\]/i,
  /lorem ipsum/i,
];

const REVIEW_INCENTIVE = /\b(discount|coupon|gift card|reward|raffle|giveaway|% off|in exchange|for free)\b/i;
const REVIEW_GATING = /\b(only if|if you (loved|liked|were happy)|unhappy|bad experience|contact us (first|instead))\b/i;
const PRICE_OR_PERCENT = /\$\s?\d[\d,.]*|\d+\s?%/g;
const DRAFT_MAX_TOKENS = 1500;
const PROBE_MAX_TOKENS = 16;
/** One try plus one retry. Authentication and billing are not retried. */
const TRANSIENT_TRY_LIMIT = 2;
const EMPTY_USAGE: ExtrasWriterUsage = { inputTokens: 0, outputTokens: 0 };

/** A period that ends a sentence is not part of the price. `$189.00` stays intact. */
function priceToken(raw: string): string {
  const compact = raw.replace(/\s/g, "");
  return /^\$\d[\d,]*\.$/.test(compact) ? compact.slice(0, -1) : compact;
}

function factNumbers(facts: ExtrasCopyFacts): Set<string> {
  const blob = [facts.offer, facts.cta, facts.contact ?? ""].join(" ");
  return new Set((blob.match(PRICE_OR_PERCENT) ?? []).map(priceToken));
}

function invented(text: string, facts: ExtrasCopyFacts): string[] {
  const allowed = factNumbers(facts);
  return (text.match(PRICE_OR_PERCENT) ?? [])
    .map(priceToken)
    .filter((m) => !allowed.has(m));
}

function mustNotHits(text: string, facts: ExtrasCopyFacts): string[] {
  return (facts.mustNot ?? "")
    .split(/[.\n;]/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 4)
    .filter((p) => text.toLowerCase().includes(p.toLowerCase()));
}

function unsupportedPlaces(text: string, facts: ExtrasCopyFacts): string[] {
  const blob = [facts.businessName, facts.offer, facts.cta, facts.contact ?? "", facts.reviewLink ?? ""]
    .join(" ")
    .toLowerCase();
  const hits = new Set<string>();
  for (const match of text.matchAll(/\b(?:in|for|near|across|around|serving|throughout)\s+([A-Z][a-z]{2,})\b/g)) {
    const word = match[1] ?? "";
    if (!blob.includes(word.toLowerCase())) hits.add(word);
  }
  return [...hits];
}

function shared(text: string, facts: ExtrasCopyFacts): string[] {
  const reasons: string[] = [];
  for (const re of PROHIBITED) if (re.test(text)) reasons.push(`prohibited claim or placeholder (${re.source})`);
  const inv = invented(text, facts);
  if (inv.length) reasons.push(`invented numbers not in the customer's facts: ${inv.join(", ")}`);
  const places = unsupportedPlaces(text, facts);
  if (places.length) reasons.push(`uses a place the customer did not supply: ${places.join(", ")}`);
  const hits = mustNotHits(text, facts);
  if (hits.length) reasons.push(`uses wording the customer said to avoid: ${hits.join(", ")}`);
  return reasons;
}

export function checkReviewMessages(copy: ReviewMessagesCopy, facts: ExtrasCopyFacts): string[] {
  const link = (facts.reviewLink ?? "").trim();
  const reasons: string[] = [];
  const all = [copy.text, copy.email.subject, copy.email.body, copy.thankYou.subject, copy.thankYou.body, copy.card.headline, copy.card.line].join("\n");
  if (!copy.text?.trim() || copy.text.length > 320) reasons.push("text message must be 1–320 characters");
  if (!copy.text.includes(link)) reasons.push("text message must include the review link exactly");
  if (!copy.email.body.includes(link)) reasons.push("email must include the review link exactly");
  if (!copy.email.subject.trim() || copy.email.subject.length > 80) reasons.push("email subject must be 1–80 characters");
  if (copy.email.body.length < 120 || copy.email.body.length > 1200) reasons.push("email body must be 120–1200 characters");
  if (!copy.thankYou.body.trim() || copy.thankYou.body.length > 700) reasons.push("thank-you follow-up must be 1–700 characters");
  if (!copy.card.headline.trim() || copy.card.headline.length > 40) reasons.push("card headline must be 1–40 characters");
  if (!copy.card.line.trim() || copy.card.line.length > 110) reasons.push("card line must be 1–110 characters");
  if (!all.toLowerCase().includes(facts.businessName.toLowerCase().split(/\s+/)[0] ?? "")) {
    reasons.push("messages must name the business");
  }
  if (REVIEW_INCENTIVE.test(all)) reasons.push("review requests must not offer an incentive");
  if (REVIEW_GATING.test(all)) reasons.push("review requests must not filter who is asked to review");
  reasons.push(...shared(all.replace(link, ""), facts));
  return reasons;
}

/**
 * Graphic beats are joined with commas, then split again for the layout.
 * A comma inside a beat would become an extra beat. Drop those commas.
 * "March 10 – April 15, 2026" stays readable as "March 10 – April 15 2026".
 */
export function normalizeAdCopyBeats(copy: AdCopy): AdCopy {
  return {
    ...copy,
    graphic: {
      theme: copy.graphic?.theme ?? "",
      beats: (copy.graphic?.beats ?? []).map((beat) => beat.replace(/,/g, "").replace(/\s{2,}/g, " ").trim()),
    },
  };
}

export function checkAdCopy(copy: AdCopy, facts: ExtrasCopyFacts): string[] {
  const reasons: string[] = [];
  if (!Array.isArray(copy.options) || copy.options.length !== 3) reasons.push("exactly 3 headline and main-text options");
  for (const [i, o] of (copy.options ?? []).entries()) {
    if (!o.headline?.trim() || o.headline.length > 40) reasons.push(`option ${i + 1} headline must be 1–40 characters`);
    if (!o.primaryText?.trim() || o.primaryText.length > 125) reasons.push(`option ${i + 1} main text must be 1–125 characters`);
  }
  const headlines = new Set((copy.options ?? []).map((o) => o.headline.trim().toLowerCase()));
  if (headlines.size !== (copy.options ?? []).length) reasons.push("options must be genuinely different");
  const beats = copy.graphic?.beats ?? [];
  if (beats.length !== 3) reasons.push("graphic needs exactly 3 beats");
  beats.forEach((beat, index) => {
    if (!beat?.trim() || beat.length > 28) reasons.push(`beat ${index + 1} must be 1–28 characters`);
    if (beat?.includes(",")) reasons.push(`beat ${index + 1} cannot contain a comma`);
  });
  if (!copy.graphic?.theme?.trim() || copy.graphic.theme.length > 90) reasons.push("graphic theme must be 1–90 characters");
  const all = [
    ...(copy.options ?? []).flatMap((o) => [o.headline, o.primaryText]),
    copy.graphic?.theme ?? "",
    ...beats,
  ].join("\n");
  reasons.push(...shared(all, facts));
  return reasons;
}

function systemPrompt(kind: "review_messages" | "ad_copy"): string {
  const common = `You are The Studio's copywriter. Write for a small local business using only the facts given.
Do not invent prices, percentages, dates, cities, contact details, awards, ratings, guarantees, or claims.
Plain, warm, specific language. No placeholders. Return ONLY JSON.`;
  if (kind === "review_messages") {
    return `${common}
Write a review-request kit:
{"kind":"review_messages","text":"<one SMS, <=320 chars, includes the review link exactly>",
"email":{"subject":"<=80 chars","body":"<120-1200 chars, includes the review link exactly>"},
"thankYou":{"subject":"<=80 chars","body":"<=700 chars thank-you follow-up after a customer reviews>"},
"card":{"headline":"<=40 chars for a printed QR card","line":"<=110 chars under the headline"}}
Never offer an incentive for a review. Never ask only happy customers. Never mention star counts.`;
  }
  return `${common}
Write static ad copy:
{"kind":"ad_copy","options":[{"headline":"<=40 chars","primaryText":"<=125 chars"} x3, genuinely different angles],
"graphic":{"theme":"<=90 chars one-line offer statement","beats":["<=28 chars","<=28 chars","<=28 chars"]}}
Beats are three short phrases for the ad graphic. A beat cannot contain a comma. If a supplied date has a comma before the year, omit that comma in the beat. Include the call to action in at least one option.`;
}

function parse<T>(text: string): T | null {
  const fenced = text.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
  try {
    return JSON.parse(fenced?.[1]?.trim() ?? text.trim()) as T;
  } catch {
    return null;
  }
}

/**
 * Standalone Extra production reads the same gitignored local env Next loads.
 * Unit tests skip this so they cannot pick up the owner credential.
 * A key already in the process is left as it is.
 */
export function ensureStudioExtrasRuntimeEnv(repoRoot = process.cwd()): void {
  if (process.env.NODE_ENV === "test") return;
  loadStudioLocalEnv(repoRoot);
}

function writerModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929";
}

function providerMessage(category: ExtrasWriterFailureCategory): string {
  switch (category) {
    case "authentication":
      return "The Studio's writer could not sign in.";
    case "billing":
      return "The Studio's writer account cannot be billed right now.";
    case "rate_limit":
      return "The Studio's writer is receiving too many requests right now.";
    case "network":
      return "The Studio's writer could not be reached.";
    case "unavailable":
      return "The Studio's writer is unavailable right now.";
  }
}

export function classifyExtrasWriterFailure(
  status: number | null,
  errorType: string,
  message: string,
): ExtrasWriterFailureCategory {
  const type = errorType.toLowerCase();
  const text = message.toLowerCase();
  if (status === 401 || type === "authentication_error") return "authentication";
  if (
    status === 402 ||
    type.includes("billing") ||
    /credit balance|insufficient credit|payment required|billing/.test(text)
  ) {
    return "billing";
  }
  if (status === 403 || type === "permission_error") return "authentication";
  if (status === 429 || type === "rate_limit_error") return "rate_limit";
  if (status === null) return "network";
  return "unavailable";
}

function retriesProviderFailure(category: ExtrasWriterFailureCategory, status: number | null): boolean {
  if (category === "authentication" || category === "billing") return false;
  if (status !== null && status >= 400 && status < 500 && status !== 408 && status !== 429) return false;
  return category === "rate_limit" || category === "network" || category === "unavailable";
}

type WriterReply =
  | { ok: true; text: string; usage: ExtrasWriterUsage }
  | {
      ok: false;
      category: ExtrasWriterFailureCategory;
      httpStatus: number | null;
      usage: ExtrasWriterUsage;
    };

function usageFrom(data: { usage?: AnthropicUsagePayload }): ExtrasWriterUsage {
  return {
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

function addUsage(left: ExtrasWriterUsage, right: ExtrasWriterUsage): ExtrasWriterUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
  };
}

async function request(input: {
  kind: "review_messages" | "ad_copy";
  facts: ExtrasCopyFacts;
  correction: string | null;
  maxTokens: number;
  userText?: string;
}): Promise<WriterReply> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model = writerModel();
  if (!apiKey) {
    return { ok: false, category: "authentication", httpStatus: null, usage: EMPTY_USAGE };
  }
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: input.maxTokens,
        temperature: input.userText ? 0 : 0.4,
        system: input.userText ? "Reply with the single word ok." : systemPrompt(input.kind),
        messages: [
          {
            role: "user",
            content: input.userText
              ? input.userText
              : input.correction
                ? `${JSON.stringify(input.facts)}\n\nYour previous draft failed Studio copy QA: ${input.correction}. Write a corrected draft. JSON only.`
                : JSON.stringify(input.facts),
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      let errorType = "";
      let errorMessage = "";
      try {
        const body = (await response.json()) as { error?: { type?: string; message?: string } };
        errorType = body.error?.type ?? "";
        errorMessage = body.error?.message ?? "";
      } catch {
        errorType = "";
        errorMessage = "";
      }
      recordAnthropicCall({ model, purpose: "creative_reasoning", httpStatus: response.status });
      return {
        ok: false,
        category: classifyExtrasWriterFailure(response.status, errorType, errorMessage),
        httpStatus: response.status,
        usage: EMPTY_USAGE,
      };
    }
    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: AnthropicUsagePayload;
    };
    recordAnthropicCall({
      model,
      purpose: "creative_reasoning",
      httpStatus: response.status,
      usage: data.usage,
    });
    return {
      ok: true,
      text: data.content?.find((c) => c.type === "text")?.text ?? "",
      usage: usageFrom(data),
    };
  } catch {
    return { ok: false, category: "network", httpStatus: null, usage: EMPTY_USAGE };
  }
}

/** One short call. Stops on the first authentication, billing, rate-limit, or network result. */
export async function probeExtrasWriterConnection(): Promise<
  | {
      ok: true;
      httpStatus: number;
      model: string;
      usage: ExtrasWriterUsage;
    }
  | {
      ok: false;
      category: ExtrasWriterFailureCategory | "missing_credentials";
      httpStatus: number | null;
      model: string;
      usage: ExtrasWriterUsage;
    }
> {
  ensureStudioExtrasRuntimeEnv();
  const model = writerModel();
  if (!process.env.ANTHROPIC_API_KEY?.trim() || !copyCreativeWritingAvailable()) {
    return {
      ok: false,
      category: "missing_credentials",
      httpStatus: null,
      model,
      usage: EMPTY_USAGE,
    };
  }
  const reply = await request({
    kind: "ad_copy",
    facts: { businessName: "connectivity", offer: "", cta: "" },
    correction: null,
    maxTokens: PROBE_MAX_TOKENS,
    userText: "ok",
  });
  if (!reply.ok) {
    return {
      ok: false,
      category: reply.category,
      httpStatus: reply.httpStatus,
      model,
      usage: reply.usage,
    };
  }
  if (reply.usage.outputTokens > PROBE_MAX_TOKENS) {
    return {
      ok: false,
      category: "unavailable",
      httpStatus: 200,
      model,
      usage: reply.usage,
    };
  }
  return { ok: true, httpStatus: 200, model, usage: reply.usage };
}

/** Two copy-quality attempts. Provider failures do not use those attempts. */
export async function writeExtrasCopy<T extends ReviewMessagesCopy | AdCopy>(
  kind: T["kind"],
  facts: ExtrasCopyFacts,
  budget: number,
): Promise<ExtrasCopyResult<T>> {
  ensureStudioExtrasRuntimeEnv();
  if (!process.env.ANTHROPIC_API_KEY?.trim() || !copyCreativeWritingAvailable()) {
    return {
      ok: false,
      code: "WRITER_UNAVAILABLE",
      category: "missing_credentials",
      httpStatus: null,
      attempts: [{ outcome: "writer_unavailable", reasons: ["Studio writer is not available"] }],
      message: "The Studio's writer is not available right now.",
      usage: EMPTY_USAGE,
    };
  }
  const attempts: { outcome: "passed" | "failed"; reasons: string[] }[] = [];
  let correction: string | null = null;
  let usage = EMPTY_USAGE;
  let transientTries = 0;
  let requests = 0;
  const requestCap = Math.max(0, budget) + 1;
  for (let qaUsed = 0; qaUsed < budget; ) {
    if (requests >= requestCap) {
      return {
        ok: false,
        code: "WRITER_PROVIDER_FAILURE",
        category: "unavailable",
        httpStatus: null,
        attempts: [],
        message: providerMessage("unavailable"),
        usage,
      };
    }
    requests += 1;
    const reply = await request({ kind, facts, correction, maxTokens: DRAFT_MAX_TOKENS });
    usage = addUsage(usage, reply.usage);
    if (!reply.ok) {
      const retry = retriesProviderFailure(reply.category, reply.httpStatus);
      transientTries += 1;
      if (!retry || transientTries >= TRANSIENT_TRY_LIMIT || requests >= requestCap) {
        return {
          ok: false,
          code: "WRITER_PROVIDER_FAILURE",
          category: reply.category,
          httpStatus: reply.httpStatus,
          attempts: [],
          message: providerMessage(reply.category),
          usage,
        };
      }
      continue;
    }
    const parsedRaw = parse<T>(reply.text);
    const parsed = parsedRaw && (parsedRaw as { kind?: string }).kind === "ad_copy"
      ? (normalizeAdCopyBeats(parsedRaw as AdCopy) as T)
      : parsedRaw;
    const reasons = !parsed || parsed.kind !== kind
      ? ["reply was not the expected JSON"]
      : kind === "review_messages"
        ? checkReviewMessages(parsed as ReviewMessagesCopy, facts)
        : checkAdCopy(parsed as AdCopy, facts);
    if (parsed && reasons.length === 0) {
      attempts.push({ outcome: "passed", reasons: [] });
      return { ok: true, copy: parsed, attempts, usage };
    }
    qaUsed += 1;
    attempts.push({ outcome: "failed", reasons });
    correction = reasons.join("; ");
  }
  return {
    ok: false,
    code: "COPY_QA_EXHAUSTED",
    attempts: attempts as { outcome: "failed"; reasons: string[] }[],
    message: "Studio copy did not pass Quality within the copy attempt budget.",
    usage,
  };
}
