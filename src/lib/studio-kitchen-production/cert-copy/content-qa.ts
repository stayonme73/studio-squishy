/**
 * Certification-facing wrappers over the shared runtime copy-quality evaluator.
 * Same path as File Room copy_channels QA — not a bypass.
 */

import {
  evaluateCopyQuality,
  harborOakCopyBrief,
  submissionFromEmailCampaignDraft,
  submissionFromEmailKitDraft,
  submissionFromMarketingCopyDraft,
  submissionFromSmsKitDraft,
  type CopyQualityEvaluation,
  type CopyQualityFinding,
} from "../copy-quality";
import {
  emailCampaignCorrectedDraft,
  emailCampaignFirstDraft,
  emailKitFinalDraft,
  marketingCopyFinalDraft,
  marketingCopyTotalWords,
  smsKitFinalDraft,
} from "./drafts";

export type CertQaFinding = CopyQualityFinding;
export type CertContentQaResult = {
  skuId: string;
  passLabel: string;
  findings: readonly CopyQualityFinding[];
  ok: boolean;
  evaluation: CopyQualityEvaluation;
};

function toCertResult(
  evaluation: CopyQualityEvaluation,
  passLabel: string,
): CertContentQaResult {
  return {
    skuId: evaluation.skuId,
    passLabel,
    findings: evaluation.findings,
    ok: evaluation.ok,
    evaluation,
  };
}

export function evaluateEmailCampaignDraft(
  draft: typeof emailCampaignFirstDraft | typeof emailCampaignCorrectedDraft,
): CertContentQaResult {
  const evaluation = evaluateCopyQuality({
    brief: harborOakCopyBrief(draft.skuId),
    submission: submissionFromEmailCampaignDraft(draft),
  });
  return toCertResult(evaluation, `pass-${draft.pass}`);
}

export function evaluateMarketingCopyDraft(
  draft: typeof marketingCopyFinalDraft = marketingCopyFinalDraft,
): CertContentQaResult {
  const evaluation = evaluateCopyQuality({
    brief: harborOakCopyBrief(draft.skuId),
    submission: submissionFromMarketingCopyDraft(draft),
  });
  return toCertResult(evaluation, `pass-${draft.pass}`);
}

export function evaluateEmailKitDraft(
  draft: typeof emailKitFinalDraft = emailKitFinalDraft,
): CertContentQaResult {
  const evaluation = evaluateCopyQuality({
    brief: harborOakCopyBrief(draft.skuId),
    submission: submissionFromEmailKitDraft(draft),
  });
  return toCertResult(evaluation, `pass-${draft.pass}`);
}

export function evaluateSmsKitDraft(
  draft: typeof smsKitFinalDraft = smsKitFinalDraft,
): CertContentQaResult {
  const evaluation = evaluateCopyQuality({
    brief: harborOakCopyBrief(draft.skuId),
    submission: submissionFromSmsKitDraft(draft),
  });
  return toCertResult(evaluation, `pass-${draft.pass}`);
}

export function certCopyQaSummary() {
  return {
    emailFirst: evaluateEmailCampaignDraft(emailCampaignFirstDraft),
    emailCorrected: evaluateEmailCampaignDraft(emailCampaignCorrectedDraft),
    marketingCopy: evaluateMarketingCopyDraft(marketingCopyFinalDraft),
    emailKit: evaluateEmailKitDraft(emailKitFinalDraft),
    smsKit: evaluateSmsKitDraft(smsKitFinalDraft),
    marketingCopyWordCount: marketingCopyTotalWords(),
  };
}
