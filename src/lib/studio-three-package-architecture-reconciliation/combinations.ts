import {
  threePackageSupportMatrix,
  type ThreePackageHeadlineId,
  type ThreePackageSupportId,
} from "@/config/studio-three-package-architecture-reconciliation-v1";

export type SupportChoice = "SELECT" | "SKIP";

export function evaluateThreePackageCombination(input: {
  headline?: ThreePackageHeadlineId;
  secondHeadline?: ThreePackageHeadlineId;
  support?: Partial<Record<ThreePackageSupportId, SupportChoice>>;
  missingReputationRights?: boolean;
  duplicateReviewRequestCampaign?: boolean;
}): { ok: true } | { ok: false; code: string; message: string } {
  if (!input.headline) {
    return { ok: false, code: "HEADLINE_REQUIRED", message: "Choose one headline package." };
  }
  if (input.secondHeadline && input.secondHeadline !== input.headline) {
    return {
      ok: false,
      code: "ONE_HEADLINE_ONLY",
      message: "There are three headlines. One headline per order. Reputation is support, not a headline.",
    };
  }
  const row = threePackageSupportMatrix[input.headline];
  for (const [id, choice] of Object.entries(input.support ?? {}) as [
    ThreePackageSupportId,
    SupportChoice,
  ][]) {
    if (choice !== "SELECT") continue;
    if (row[id] === "NOT_APPROPRIATE") {
      return {
        ok: false,
        code: "SUPPORT_NOT_APPROPRIATE",
        message: `${id} is not appropriate on ${input.headline}. Mark SKIP / N/A.`,
      };
    }
  }
  if (input.support?.reputation_customer_proof === "SELECT" && input.missingReputationRights) {
    return {
      ok: false,
      code: "REPUTATION_RIGHTS_REQUIRED",
      message:
        "Reputation support needs a real supplied testimonial and rights confirmation. Do not invent one.",
    };
  }
  if (
    input.support?.reputation_customer_proof === "SELECT" &&
    input.support.email_and_text === "SELECT" &&
    input.duplicateReviewRequestCampaign
  ) {
    return {
      ok: false,
      code: "NO_FILLER_REVIEW_REQUEST",
      message:
        "Reputation already includes review-request email and text. Email & Text must be a separate campaign, or skipped.",
    };
  }
  return { ok: true };
}

export function visibleSupportForHeadline(headline: ThreePackageHeadlineId) {
  const row = threePackageSupportMatrix[headline];
  return (Object.entries(row) as [ThreePackageSupportId, (typeof row)[ThreePackageSupportId]][])
    .filter(([, fit]) => fit !== "NOT_APPROPRIATE")
    .map(([id, fit]) => ({ id, fit, defaultChoice: "SKIP" as const }));
}
