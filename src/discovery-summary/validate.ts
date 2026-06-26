/**
 * Discovery Summary view-model validation — no external schema library.
 */

import type { DiscoverySummaryModel } from "@/discovery-summary/types";

export class DiscoverySummaryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscoverySummaryValidationError";
  }
}

export function validateDiscoverySummaryModel(model: DiscoverySummaryModel): void {
  if (!model || typeof model !== "object") {
    throw new DiscoverySummaryValidationError("Discovery summary model must be an object.");
  }

  if (!Array.isArray(model.recommendedServices)) {
    throw new DiscoverySummaryValidationError(
      "Discovery summary model must include recommendedServices.",
    );
  }

  if (!Array.isArray(model.additionalStudioServices)) {
    throw new DiscoverySummaryValidationError(
      "Discovery summary model must include additionalStudioServices.",
    );
  }

  if (!model.sectionLabels?.includedRecommendations?.trim()) {
    throw new DiscoverySummaryValidationError(
      "Discovery summary model must include sectionLabels.",
    );
  }

  for (const service of [...model.recommendedServices, ...model.additionalStudioServices]) {
    if (!service.serviceId?.trim()) {
      throw new DiscoverySummaryValidationError("Each recommended service must include serviceId.");
    }
    if (!service.title?.trim()) {
      throw new DiscoverySummaryValidationError(
        `Recommended service "${service.serviceId}" is missing title.`,
      );
    }
    if (!service.explanation?.trim()) {
      throw new DiscoverySummaryValidationError(
        `Recommended service "${service.serviceId}" is missing explanation.`,
      );
    }
  }

  if (!model.totalInvestment?.display?.trim()) {
    throw new DiscoverySummaryValidationError("Discovery summary model must include totalInvestment.");
  }

  if (!model.estimatedTimeline?.customerLabel?.trim() && model.recommendedServices.length > 0) {
    throw new DiscoverySummaryValidationError(
      "Discovery summary model must include estimatedTimeline when services are recommended.",
    );
  }

  if (!model.nextStep?.headline?.trim() || !model.nextStep?.actionLabel?.trim()) {
    throw new DiscoverySummaryValidationError("Discovery summary model must include nextStep copy.");
  }

  if (!model.source?.generatedAt?.trim() || !model.source?.engineVersion?.trim()) {
    throw new DiscoverySummaryValidationError("Discovery summary model must include source metadata.");
  }
}
