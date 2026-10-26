import { copyCreativeWritingAvailable } from "@/config/studio-production-team-workforce-v1";
import {
  recordAnthropicCall,
  type AnthropicUsagePayload,
} from "@/lib/studio-project-alpha/cost-telemetry";
import {
  evaluateCopyQuality,
  type CopyQualitySubmission,
} from "@/lib/studio-kitchen-production/copy-quality";

import {
  assembleCopyFromFacts,
  buildCopyQualityBrief,
  consentConfirmed,
  missingCopyFacts,
  type CopyProducerFacts,
  type CopyProducerResult,
} from "./assemble";

function polishSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const capped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

function writeEmailSubmission(facts: CopyProducerFacts): CopyQualitySubmission {
  const name = facts.businessName.trim();
  const goal = polishSentence(facts.campaignGoal);
  const offer = polishSentence(facts.mustInclude);
  const cta = facts.callToAction.trim();
  const compliance = facts.compliance.trim();
  const opening = name
    ? `${name} has an update for you.`
    : "Here is the update you asked us to send.";
  const email1 = {
    subjectOptions: [facts.campaignGoal.trim().slice(0, 90)],
    previewText: cta,
    body: [opening, offer, `Next step: ${cta}`, compliance]
      .filter(Boolean)
      .join("\n\n"),
    cta,
  };
  const email2 = {
    subjectOptions: [`Reminder: ${facts.campaignGoal.trim().slice(0, 70)}`],
    previewText: cta,
    body: [
      name ? `A reminder from ${name}.` : "A reminder about this offer.",
      offer,
      cta,
    ].join("\n\n"),
    cta,
  };
  return { kind: "email_set", emails: facts.emailCount === 1 ? [email1] : [email1, email2] };
}

function writeSmsSubmission(facts: CopyProducerFacts): CopyQualitySubmission {
  const source = facts.messageCopy.trim() || facts.mustInclude.trim();
  const lines = source
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, facts.smsCount ?? 4);
  const bodies = lines.length > 0 ? lines : [facts.mustInclude.trim()];
  const cta = facts.callToAction.trim();
  const smsMessages = bodies.map((body) => {
    const compact = body.replace(/\s+/g, " ").trim();
    const withCta = compact.includes(cta) ? compact : `${compact} ${cta}`.trim();
    return { body: withCta.slice(0, 320) };
  });
  return { kind: "sms_set", smsMessages };
}

export function writeCopyFromFacts(
  facts: CopyProducerFacts,
  options?: { strict?: boolean },
): CopyProducerResult {
  if (options?.strict) return assembleCopyFromFacts(facts, { strict: true });
  const missing = missingCopyFacts(facts);
  if (missing.length > 0) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_FACTS",
      message: `Copy production cannot proceed without: ${missing.join(", ")}.`,
      missingRequired: missing,
    };
  }
  if (!consentConfirmed(facts.listConsent)) {
    return {
      ok: false,
      code: "CONSENT_NOT_CONFIRMED",
      message:
        "Copy production is blocked until the customer confirms they own the list and have consent.",
      missingRequired: ["listConsent"],
    };
  }
  const brief = buildCopyQualityBrief(facts);
  const submission =
    facts.skuId === "v2-rtu-sms-kit"
      ? writeSmsSubmission(facts)
      : writeEmailSubmission(facts);
  return {
    ok: true,
    submission,
    brief,
    missingRequired: [],
    writingRuntime: "structured_writer",
  };
}

function copyAnthropicSystemPrompt(facts: CopyProducerFacts): string {
  const kind = facts.skuId === "v2-rtu-sms-kit" ? "sms_set" : "email_set";
  return `You are Copy Production for The Studio SKU ${facts.skuId}.
Write customer-facing copy using only authorized facts.
You may improve wording, hierarchy, tone, structure, and CTA treatment.
Do not invent offers, prices, contact details, guarantees, claims, or customer facts.
Keep promotional prices, phone numbers, URLs, and the CTA string verbatim wherever they appear in the facts.
Return ONLY JSON for a CopyQualitySubmission with kind "${kind}".
Email kit: exactly ${facts.emailCount === 1 ? "1 email" : "2 emails"}, each with subjectOptions, previewText, body, cta.
Every email body+cta must include every required customer fact token (price, phone, URL) when those tokens exist in the facts, plus the CTA.
Email 1 must include the compliance line verbatim.
SMS kit: ${facts.smsCount ? `exactly ${facts.smsCount} messages` : "at most 4 messages"}, each body <= 320 characters, no email-style paragraphs.`;
}

function parseCopySubmission(text: string): CopyQualitySubmission {
  const fenced = text.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? text.trim();
  return JSON.parse(candidate) as CopyQualitySubmission;
}

async function requestCopyFromAnthropic(
  facts: CopyProducerFacts,
  apiKey: string,
  model: string,
  extraUser?: string,
): Promise<CopyQualitySubmission | null> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature: 0.2,
      system: copyAnthropicSystemPrompt(facts),
      messages: [
        {
          role: "user",
          content: extraUser
            ? `${JSON.stringify(facts)}\n\n${extraUser}`
            : JSON.stringify(facts),
        },
      ],
    }),
  });
  if (!response.ok) {
    recordAnthropicCall({
      model,
      purpose: "creative_reasoning",
      httpStatus: response.status,
    });
    return null;
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
  const text = data.content?.find((row) => row.type === "text")?.text ?? "";
  return parseCopySubmission(text);
}

async function writeCopyFromFactsAnthropic(
  facts: CopyProducerFacts,
): Promise<CopyProducerResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || !copyCreativeWritingAvailable()) return null;
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929";
  const brief = buildCopyQualityBrief(facts);
  try {
    let submission = await requestCopyFromAnthropic(facts, apiKey, model);
    if (!submission) return null;
    let evaluation = evaluateCopyQuality({ brief, submission });
    if (!evaluation.ok) {
      submission = await requestCopyFromAnthropic(
        facts,
        apiKey,
        model,
        `Your previous JSON failed Studio copy QA: ${evaluation.summary}. Return corrected JSON only. Keep required tokens verbatim. Do not invent facts.`,
      );
      if (!submission) return null;
      evaluation = evaluateCopyQuality({ brief, submission });
    }
    if (!evaluation.ok) return null;
    return {
      ok: true,
      submission,
      brief,
      missingRequired: [],
      writingRuntime: "anthropic_text_model",
    };
  } catch {
    return null;
  }
}

export async function produceCopyFromFacts(
  facts: CopyProducerFacts,
  options?: { strict?: boolean },
): Promise<CopyProducerResult> {
  if (options?.strict) return assembleCopyFromFacts(facts, { strict: true });
  const authored = await writeCopyFromFactsAnthropic(facts);
  if (authored) return authored;
  return writeCopyFromFacts(facts);
}
