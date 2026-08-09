/**
 * Runtime copy-quality evaluation — reusable production gate (not certification-only).
 *
 * Honest boundary: deterministic checks catch contract/scope/claim/CTA/fact defects.
 * Brand voice and grammar still require structured human/model judgment attestation.
 * A bare checklist attestation alone is never sufficient for copy_channels QA pass.
 */

export type CopyQualityFinding = {
  id: string;
  severity: "fail" | "warn";
  message: string;
  checkKind:
    | "prohibited_claim"
    | "required_fact"
    | "cta"
    | "scope_count"
    | "word_limit"
    | "format"
    | "tone_pattern"
    | "judgment_attestation"
    | "grammar_attestation";
};

export type CopyQualityBrief = {
  skuId: string;
  /** Substrings that must appear somewhere in the produced copy (customer facts). */
  requiredFactTokens: readonly string[];
  /** Literal/regex-ready phrases that must not appear (customer + Studio prohibited). */
  prohibitedClaimPatterns: readonly string[];
  /** CTA tokens that satisfy the contract (URL and/or phone). At least one must appear when requireCta. */
  ctaTokens: readonly string[];
  requireCta: boolean;
  maxEmails?: number;
  maxSmsMessages?: number;
  maxAssets?: number;
  maxTotalWords?: number;
  maxSmsChars?: number;
  /** Extra tone patterns treated as fail (e.g. plainspoken-forbidden corporate AI phrases). */
  forbiddenTonePatterns?: readonly string[];
  /** When true, reject email-style multi-paragraph SMS bodies. */
  rejectEmailStyleSms?: boolean;
};

export type CopyQualityEmailPiece = {
  subjectOptions: readonly string[];
  previewText: string;
  body: string;
  cta: string;
};

export type CopyQualitySmsPiece = {
  body: string;
};

export type CopyQualityAssetPiece = {
  body: string;
};

export type CopyQualitySubmission = {
  kind: "email_set" | "sms_set" | "asset_set" | "plain_text";
  emails?: readonly CopyQualityEmailPiece[];
  smsMessages?: readonly CopyQualitySmsPiece[];
  assets?: readonly CopyQualityAssetPiece[];
  plainText?: string;
};

/**
 * Judgment that cannot be fully guaranteed by string checks.
 * Required for copy_channels QA pass — empty notes are rejected.
 */
export type CopyQualityJudgmentAttestations = {
  brandVoiceReviewed: boolean;
  grammarSpellingReviewed: boolean;
  /** Must name what was assessed (voice, grammar, customer facts). */
  notes: string;
};

export type CopyQualityEvaluation = {
  skuId: string;
  ok: boolean;
  findings: readonly CopyQualityFinding[];
  checkedAt: string;
  deterministicFailCount: number;
  judgmentRequired: true;
  summary: string;
};

export type CopyQualityEvidence = {
  evaluation: CopyQualityEvaluation;
  attestations: CopyQualityJudgmentAttestations;
  /** Server-confirmed: evaluation ok AND attestations complete. */
  gatePassed: boolean;
};

export type CopyQualityQaPayload = {
  brief: CopyQualityBrief;
  submission: CopyQualitySubmission;
  attestations: CopyQualityJudgmentAttestations;
};
