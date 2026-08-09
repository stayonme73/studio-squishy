import { certCopyCustomerBrief as brief } from "../cert-copy/fixture";
import {
  emailCampaignCorrectedDraft,
  emailCampaignFirstDraft,
  emailKitFinalDraft,
  marketingCopyFinalDraft,
  smsKitFinalDraft,
} from "../cert-copy/drafts";

import type { CopyQualityBrief, CopyQualitySubmission } from "./types";

/** Shared Harbor & Oak brief used by certification AND runtime QA path. */
export function harborOakCopyBrief(skuId: string): CopyQualityBrief {
  return {
    skuId,
    requiredFactTokens: ["189", "March 10|Mar 10", "April 15|Apr 15"],
    prohibitedClaimPatterns: [
      "cut energy bills in half",
      "same-day service everywhere",
      "guaranteed savings",
      "#1 rated",
      "free forever",
    ],
    ctaTokens: [brief.ctaUrl, brief.phone, "harborandoak\\.example"],
    requireCta: true,
    maxEmails: skuId === "cc-001" ? undefined : 2,
    maxSmsMessages: skuId === "v2-rtu-sms-kit" ? 4 : undefined,
    maxAssets: skuId === "cc-001" ? 3 : undefined,
    maxTotalWords: skuId === "cc-001" ? 750 : undefined,
    maxSmsChars: 320,
    rejectEmailStyleSms: skuId === "v2-rtu-sms-kit",
    forbiddenTonePatterns: [],
  };
}

export function submissionFromEmailCampaignDraft(
  draft: typeof emailCampaignFirstDraft | typeof emailCampaignCorrectedDraft,
): CopyQualitySubmission {
  return {
    kind: "email_set",
    emails: draft.emails.map((email) => ({
      subjectOptions: email.subjectOptions,
      previewText: email.previewText,
      body: email.body,
      cta: email.cta,
    })),
  };
}

export function submissionFromMarketingCopyDraft(
  draft: typeof marketingCopyFinalDraft = marketingCopyFinalDraft,
): CopyQualitySubmission {
  return {
    kind: "asset_set",
    assets: draft.assets.map((asset) => ({ body: asset.body })),
  };
}

export function submissionFromEmailKitDraft(
  draft: typeof emailKitFinalDraft = emailKitFinalDraft,
): CopyQualitySubmission {
  return {
    kind: "email_set",
    emails: draft.emails.map((email) => ({
      subjectOptions: email.subjectOptions,
      previewText: email.previewText,
      body: email.body,
      cta: email.cta,
    })),
  };
}

export function submissionFromSmsKitDraft(
  draft: typeof smsKitFinalDraft = smsKitFinalDraft,
): CopyQualitySubmission {
  return {
    kind: "sms_set",
    smsMessages: draft.messages.map((msg) => ({ body: msg.body })),
  };
}

export const HARBOR_OAK_PASS_ATTESTATIONS = {
  brandVoiceReviewed: true,
  grammarSpellingReviewed: true,
  notes:
    "Plainspoken Harbor & Oak voice confirmed; grammar/spelling reviewed; customer facts and CTAs verified against brief.",
} as const;
