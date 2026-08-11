import type {
  CopyQualityBrief,
  CopyQualityEvaluation,
  CopyQualityFinding,
  CopyQualityJudgmentAttestations,
  CopyQualitySubmission,
} from "./types";

/** Built-in patterns that are never acceptable as customer-facing Studio copy claims. */
const UNIVERSAL_UNSUPPORTED_CLAIM_PATTERNS: readonly string[] = [
  "cut your energy bills in half",
  "energy bills in half",
  "guaranteed savings",
  "same-day service everywhere",
  "best in richmond",
  "#1 rated",
  "number one rated",
];

const DEFAULT_CORPORATE_AI_TONE_PATTERNS: readonly string[] = [
  "next-level",
  "synergy",
  "revolutionize",
  "elevate your living",
  "wellness-grade",
  "ecosystem of care",
  "proprietary comfort methodologies",
];

export { requiresCopyQualityGate } from "../quality-gates";

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function flattenSubmission(submission: CopyQualitySubmission): string {
  if (submission.kind === "plain_text") return submission.plainText ?? "";
  if (submission.kind === "email_set") {
    return (submission.emails ?? [])
      .map(
        (email) =>
          `${email.subjectOptions.join(" ")}\n${email.previewText}\n${email.body}\n${email.cta}`,
      )
      .join("\n");
  }
  if (submission.kind === "sms_set") {
    return (submission.smsMessages ?? []).map((m) => m.body).join("\n");
  }
  return (submission.assets ?? []).map((a) => a.body).join("\n");
}

function matchPattern(text: string, pattern: string): boolean {
  try {
    return new RegExp(pattern, "i").test(text);
  } catch {
    return text.toLowerCase().includes(pattern.toLowerCase());
  }
}

function pushFail(
  findings: CopyQualityFinding[],
  id: string,
  checkKind: CopyQualityFinding["checkKind"],
  message: string,
): void {
  findings.push({ id, severity: "fail", checkKind, message });
}

/**
 * Evaluate produced copy against a production brief.
 * Deterministic where possible; does not invent full semantic understanding.
 */
export function evaluateCopyQuality(input: {
  brief: CopyQualityBrief;
  submission: CopyQualitySubmission;
  checkedAt?: string;
}): CopyQualityEvaluation {
  const findings: CopyQualityFinding[] = [];
  const { brief, submission } = input;
  const allText = flattenSubmission(submission);

  const prohibited = [
    ...UNIVERSAL_UNSUPPORTED_CLAIM_PATTERNS,
    ...brief.prohibitedClaimPatterns,
  ];
  for (const [index, pattern] of prohibited.entries()) {
    if (matchPattern(allText, pattern)) {
      pushFail(
        findings,
        `prohibited_claim_${index}`,
        "prohibited_claim",
        `Unsupported or prohibited claim present: "${pattern}"`,
      );
    }
  }

  const tonePatterns = [
    ...DEFAULT_CORPORATE_AI_TONE_PATTERNS,
    ...(brief.forbiddenTonePatterns ?? []),
  ];
  for (const [index, pattern] of tonePatterns.entries()) {
    if (matchPattern(allText, pattern)) {
      pushFail(
        findings,
        `tone_pattern_${index}`,
        "tone_pattern",
        `Forbidden tone/voice pattern present: "${pattern}"`,
      );
    }
  }

  for (const [index, token] of brief.requiredFactTokens.entries()) {
    if (!matchPattern(allText, token)) {
      pushFail(
        findings,
        `required_fact_${index}`,
        "required_fact",
        `Required customer fact missing: "${token}"`,
      );
    }
  }

  if (brief.requireCta) {
    const hasCta = brief.ctaTokens.some((token) => matchPattern(allText, token));
    if (!hasCta) {
      pushFail(
        findings,
        "cta_missing",
        "cta",
        "Required CTA path missing (booking URL and/or phone as specified in brief)",
      );
    }
  }

  if (submission.kind === "email_set") {
    const emails = submission.emails ?? [];
    if (brief.maxEmails != null && emails.length > brief.maxEmails) {
      pushFail(
        findings,
        "email_count_limit",
        "scope_count",
        `Scope exceeded: ${emails.length} emails (limit ${brief.maxEmails})`,
      );
    }
    emails.forEach((email, index) => {
      const blob = `${email.cta}\n${email.body}`;
      if (brief.requireCta) {
        const has = brief.ctaTokens.some((token) => matchPattern(blob, token));
        if (!has) {
          pushFail(
            findings,
            `cta_missing_email_${index + 1}`,
            "cta",
            `Email ${index + 1}: missing required CTA path`,
          );
        }
      }
    });
  }

  if (submission.kind === "sms_set") {
    const messages = submission.smsMessages ?? [];
    if (brief.maxSmsMessages != null && messages.length > brief.maxSmsMessages) {
      pushFail(
        findings,
        "sms_count_limit",
        "scope_count",
        `Scope exceeded: ${messages.length} SMS (limit ${brief.maxSmsMessages})`,
      );
    }
    const maxChars = brief.maxSmsChars ?? 320;
    messages.forEach((msg, index) => {
      if (msg.body.length > maxChars) {
        pushFail(
          findings,
          `sms_too_long_${index + 1}`,
          "format",
          `SMS ${index + 1}: exceeds ${maxChars} characters`,
        );
      }
      if (brief.rejectEmailStyleSms && (/\n\n/.test(msg.body) || /Hi \{\{/i.test(msg.body))) {
        pushFail(
          findings,
          `sms_email_style_${index + 1}`,
          "format",
          `SMS ${index + 1}: reads like email-style copy`,
        );
      }
      if (brief.requireCta) {
        const has = brief.ctaTokens.some((token) => matchPattern(msg.body, token));
        if (!has) {
          pushFail(
            findings,
            `sms_cta_${index + 1}`,
            "cta",
            `SMS ${index + 1}: missing required CTA path`,
          );
        }
      }
    });
  }

  if (submission.kind === "asset_set") {
    const assets = submission.assets ?? [];
    if (brief.maxAssets != null && assets.length > brief.maxAssets) {
      pushFail(
        findings,
        "asset_count_limit",
        "scope_count",
        `Scope exceeded: ${assets.length} assets (limit ${brief.maxAssets})`,
      );
    }
  }

  if (brief.maxTotalWords != null) {
    const words = countWords(allText);
    if (words > brief.maxTotalWords) {
      pushFail(
        findings,
        "word_limit",
        "word_limit",
        `Word count ${words} exceeds limit ${brief.maxTotalWords}`,
      );
    }
  }

  const failFindings = findings.filter((f) => f.severity === "fail");
  const ok = failFindings.length === 0;
  return {
    skuId: brief.skuId,
    ok,
    findings,
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    deterministicFailCount: failFindings.length,
    judgmentRequired: true,
    summary: ok
      ? "Deterministic copy-quality checks passed. Judgment attestations still required for QA pass."
      : `Copy-quality failed (${failFindings.length}): ${failFindings
          .slice(0, 6)
          .map((f) => f.message)
          .join("; ")}`,
  };
}

export function validateCopyQualityAttestations(
  attestations: CopyQualityJudgmentAttestations | undefined,
): { ok: true } | { ok: false; error: string; findings: CopyQualityFinding[] } {
  const findings: CopyQualityFinding[] = [];
  if (!attestations) {
    return {
      ok: false,
      error:
        "Copy-family QA pass requires copyQuality payload with brand-voice and grammar judgment attestations.",
      findings: [
        {
          id: "attestations_missing",
          severity: "fail",
          checkKind: "judgment_attestation",
          message: "Judgment attestations missing",
        },
      ],
    };
  }
  if (!attestations.brandVoiceReviewed) {
    pushFail(
      findings,
      "brand_voice_not_reviewed",
      "judgment_attestation",
      "Brand/customer voice must be explicitly reviewed before copy QA pass",
    );
  }
  if (!attestations.grammarSpellingReviewed) {
    pushFail(
      findings,
      "grammar_not_reviewed",
      "grammar_attestation",
      "Grammar/spelling must be explicitly reviewed before copy QA pass",
    );
  }
  if (!attestations.notes.trim() || attestations.notes.trim().length < 12) {
    pushFail(
      findings,
      "attestation_notes_thin",
      "judgment_attestation",
      "Attestation notes must record what was assessed (min 12 characters)",
    );
  }
  if (findings.length > 0) {
    return {
      ok: false,
      error: findings.map((f) => f.message).join("; "),
      findings,
    };
  }
  return { ok: true };
}

/**
 * Full gate for copy_channels QA pass: deterministic evaluation + judgment attestations.
 */
export function gateCopyQualityForQaPass(input: {
  brief: CopyQualityBrief;
  submission: CopyQualitySubmission;
  attestations: CopyQualityJudgmentAttestations;
  checkedAt?: string;
}):
  | {
      ok: true;
      evaluation: CopyQualityEvaluation;
      attestations: CopyQualityJudgmentAttestations;
    }
  | {
      ok: false;
      error: string;
      evaluation: CopyQualityEvaluation;
      findings: readonly CopyQualityFinding[];
    } {
  const evaluation = evaluateCopyQuality({
    brief: input.brief,
    submission: input.submission,
    checkedAt: input.checkedAt,
  });
  const attestation = validateCopyQualityAttestations(input.attestations);
  if (!evaluation.ok) {
    return {
      ok: false,
      error: evaluation.summary,
      evaluation,
      findings: evaluation.findings,
    };
  }
  if (!attestation.ok) {
    return {
      ok: false,
      error: attestation.error,
      evaluation,
      findings: attestation.findings,
    };
  }
  return {
    ok: true,
    evaluation,
    attestations: input.attestations,
  };
}
