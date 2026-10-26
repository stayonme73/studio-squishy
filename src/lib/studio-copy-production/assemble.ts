/**
 * Fact-bound copy production. Assembles customer facts; does not invent claims.
 */

import type {
  CopyQualityBrief,
  CopyQualityEmailPiece,
  CopyQualitySmsPiece,
  CopyQualitySubmission,
} from "@/lib/studio-kitchen-production/copy-quality";

export type CopyProducerFacts = {
  skuId: "v2-rtu-email-kit" | "v2-rtu-sms-kit";
  businessName: string;
  campaignGoal: string;
  mustInclude: string;
  callToAction: string;
  compliance: string;
  mustNotSay: string;
  messageCopy: string;
  sendingAccount: string;
  listConsent: string;
  /** Historical email kit stays at two. Campaign Launch Kit asks for one. */
  emailCount?: 1 | 2;
  /** Standalone text kit stays at four. Campaign Launch Kit asks for two. */
  smsCount?: 2 | 4;
};

export type CopyWritingRuntime =
  | "anthropic_text_model"
  | "structured_writer"
  | "strict_assembler";

export type CopyProducerResult =
  | {
      ok: true;
      submission: CopyQualitySubmission;
      brief: CopyQualityBrief;
      missingRequired: readonly string[];
      writingRuntime?: CopyWritingRuntime;
    }
  | {
      ok: false;
      code: "MISSING_REQUIRED_FACTS" | "CONSENT_NOT_CONFIRMED";
      message: string;
      missingRequired: readonly string[];
    };

const PHONE_RE =
  /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/;
const URL_RE =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9.]+\.[a-z]{2,}(?:\/[^\s]*)?/i;
const PRICE_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/;

function firstMatch(re: RegExp, text: string): string {
  const m = text.match(re);
  return m?.[0]?.trim() ?? "";
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokensFromFacts(facts: CopyProducerFacts): string[] {
  const blob = `${facts.mustInclude} ${facts.callToAction} ${facts.campaignGoal}`;
  const tokens = [
    firstMatch(PRICE_RE, blob),
    firstMatch(PHONE_RE, blob),
    firstMatch(URL_RE, blob),
  ].filter(Boolean);
  return [...new Set(tokens)];
}

function prohibitedFromMustNotSay(mustNotSay: string): string[] {
  return mustNotSay
    .split(/[.\n;]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4);
}

function consentOk(value: string): boolean {
  return /^yes/i.test(value.trim());
}

export function missingCopyFacts(facts: CopyProducerFacts): string[] {
  const missing: string[] = [];
  if (!facts.campaignGoal.trim()) missing.push("campaignGoal");
  if (!facts.mustInclude.trim()) missing.push("mustInclude");
  if (!facts.callToAction.trim()) missing.push("callToAction");
  if (facts.skuId === "v2-rtu-sms-kit" && !facts.messageCopy.trim() && !facts.mustInclude.trim()) {
    missing.push("messageCopy");
  }
  return missing;
}

export function consentConfirmed(value: string): boolean {
  return consentOk(value);
}

export function buildCopyQualityBrief(facts: CopyProducerFacts): CopyQualityBrief {
  const requiredFactTokens = tokensFromFacts(facts).map(escapeRe);
  const ctaTokens = [
    firstMatch(PHONE_RE, facts.callToAction) || firstMatch(PHONE_RE, facts.mustInclude),
    firstMatch(URL_RE, facts.callToAction) || firstMatch(URL_RE, facts.mustInclude),
    facts.callToAction.trim(),
  ]
    .filter(Boolean)
    .map(escapeRe);

  return {
    skuId: facts.skuId,
    requiredFactTokens: requiredFactTokens,
    prohibitedClaimPatterns: prohibitedFromMustNotSay(facts.mustNotSay),
    ctaTokens,
    requireCta: true,
    maxEmails: facts.skuId === "v2-rtu-email-kit" ? (facts.emailCount ?? 2) : undefined,
    maxSmsMessages:
      facts.skuId === "v2-rtu-sms-kit" ? (facts.smsCount ?? 4) : undefined,
    maxSmsChars: facts.skuId === "v2-rtu-sms-kit" ? 320 : undefined,
    rejectEmailStyleSms: facts.skuId === "v2-rtu-sms-kit",
  };
}

export function assembleCopyFromFacts(
  facts: CopyProducerFacts,
  options?: { strict?: boolean },
): CopyProducerResult {
  const missing = missingCopyFacts(facts);
  if (missing.length > 0) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_FACTS",
      message: `Copy production cannot proceed without: ${missing.join(", ")}.`,
      missingRequired: missing,
    };
  }
  if (!consentOk(facts.listConsent)) {
    return {
      ok: false,
      code: "CONSENT_NOT_CONFIRMED",
      message:
        "Copy production is blocked until the customer confirms they own the list and have consent.",
      missingRequired: ["listConsent"],
    };
  }

  const brief = buildCopyQualityBrief(facts);

  if (facts.skuId === "v2-rtu-sms-kit") {
    const lines = facts.messageCopy
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, facts.smsCount ?? 4);
    const bodies =
      lines.length > 0
        ? lines
        : [facts.mustInclude.trim()].filter(Boolean);
    const smsMessages: CopyQualitySmsPiece[] = bodies.map((body) => ({
      body: options?.strict
        ? `${body} ${facts.callToAction}`.trim()
        : `${body} ${facts.callToAction}`.trim(),
    }));
    return {
      ok: true,
      submission: { kind: "sms_set", smsMessages },
      brief,
      missingRequired: [],
      writingRuntime: "strict_assembler",
    };
  }

  const subject = options?.strict
    ? facts.businessName.trim() || "Update"
    : facts.campaignGoal.trim().slice(0, 90);
  const email1: CopyQualityEmailPiece = {
    subjectOptions: [subject],
    previewText: facts.callToAction.trim(),
    body: [facts.mustInclude.trim(), facts.compliance.trim()]
      .filter(Boolean)
      .join("\n\n"),
    cta: facts.callToAction.trim(),
  };
  const email2: CopyQualityEmailPiece = {
    subjectOptions: [
      options?.strict
        ? `${facts.businessName.trim() || "Update"} — reminder`
        : `Reminder: ${facts.campaignGoal.trim().slice(0, 70)}`,
    ],
    previewText: facts.callToAction.trim(),
    body: `${facts.mustInclude.trim()}\n\n${facts.callToAction.trim()}`,
    cta: facts.callToAction.trim(),
  };

  return {
    ok: true,
    submission: {
      kind: "email_set",
      emails: facts.emailCount === 1 ? [email1] : [email1, email2],
    },
    brief,
    missingRequired: [],
    writingRuntime: "strict_assembler",
  };
}
