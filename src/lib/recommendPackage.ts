import type { StudioGuidePackageId } from "@/config/studio-guide";

export type FirstCampaignAnswer = "yes" | "no";
export type SupportFrequencyAnswer = "one-time" | "monthly" | "long-term";
export type InvolvementAnswer = "do-it-for-me" | "do-it-with-me" | "get-started";

export type QuestionnaireAnswers = {
  firstCampaign: FirstCampaignAnswer;
  supportFrequency: SupportFrequencyAnswer;
  involvement: InvolvementAnswer;
};

/**
 * Q2 is primary; Q1 and Q3 nudge only. Keep simple — no scoring engine.
 */
export function recommendPackage(answers: QuestionnaireAnswers): StudioGuidePackageId {
  const { firstCampaign, supportFrequency, involvement } = answers;

  if (involvement === "get-started") {
    return "spark";
  }

  if (firstCampaign === "yes" && supportFrequency === "one-time") {
    return "spark";
  }

  if (supportFrequency === "one-time") {
    return "spark";
  }

  if (supportFrequency === "monthly") {
    return "momentum";
  }

  if (involvement === "do-it-with-me" && supportFrequency === "long-term") {
    return "growth";
  }

  return "growth";
}

export function packageIndexForId(id: StudioGuidePackageId) {
  return { spark: 0, momentum: 1, growth: 2 }[id];
}
