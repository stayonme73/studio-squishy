/**
 * Discovery Summary — maps RecommendationResult to a customer-facing view model.
 * Reads engine output and catalog copy; does not re-score or re-match discovery rules.
 */

import { getDerivedServicePricing, getServiceById, getServicePriceCents } from "@/catalog/accessors";
import { CUSTOMER_SECTION_LABELS } from "@/catalog/production-allocation";
import type { ServiceId } from "@/catalog/types";
import { buildCustomerWhyExplanation } from "@/discovery-summary/recommendation-copy";
import { computePlanPricingTotals, formatUsdFromCents } from "@/lib/plan-pricing";
import type {
  DeliverablesSummaryItem,
  RecommendationResult,
  RecommendationWarning,
  RecommendationWarningKind,
  TimelineLineItem,
} from "@/recommendation/types";
import type {
  DiscoverySummaryModel,
  DiscoverySummaryNextStep,
  DiscoverySummaryServiceItem,
  DiscoverySummaryTotalInvestment,
  DiscoverySummaryWarning,
  DiscoverySummaryInvestment,
} from "@/discovery-summary/types";

const CUSTOMER_WARNING_MESSAGES: Record<
  RecommendationWarningKind,
  (warning: RecommendationWarning) => string
> = {
  "missing-discovery-answer": () =>
    "Some discovery questions are still unanswered — completing them may refine your recommendation.",
  "inactive-service-match": (warning) => warning.message,
  "unmet-dependency": () =>
    "Some recommended services work best as a combined package — we'll confirm the full scope before checkout.",
  "low-confidence-match": () =>
    "This is our best match from what you shared so far — a quick review before checkout is recommended.",
  "requires-client-materials": (warning) => warning.message,
  "requires-client-access": (warning) => warning.message,
};

function buildServiceInvestment(serviceId: ServiceId): DiscoverySummaryInvestment {
  const pricing = getDerivedServicePricing(serviceId);
  const service = getServiceById(serviceId);
  const billing = pricing?.billing ?? (service?.billingType === "monthly" ? "monthly" : "one-time");
  const amountUsd = pricing?.amountUsd ?? getServicePriceCents(serviceId) / 100;
  const display =
    pricing?.display ??
    (billing === "monthly"
      ? `${formatUsdFromCents(getServicePriceCents(serviceId))}/month`
      : formatUsdFromCents(getServicePriceCents(serviceId)));

  return { display, amountUsd, billing };
}

function buildTotalInvestment(serviceIds: readonly ServiceId[]): DiscoverySummaryTotalInvestment {
  if (serviceIds.length === 0) {
    return {
      display: "No investment estimate",
      amountUsd: 0,
      hasQuotedItems: false,
      oneTimeSubtotalDisplay: formatUsdFromCents(0),
      monthlySubtotalDisplay: formatUsdFromCents(0),
      amountDueTodayDisplay: formatUsdFromCents(0),
      monthlySubtotalCents: 0,
    };
  }

  const totals = computePlanPricingTotals(serviceIds);
  const oneTimeSubtotalDisplay = formatUsdFromCents(totals.oneTimeSubtotalCents);
  const monthlySubtotalDisplay = formatUsdFromCents(totals.monthlySubtotalCents);
  const amountDueTodayDisplay = formatUsdFromCents(totals.amountDueTodayCents);

  let display: string;
  if (totals.monthlySubtotalCents > 0 && totals.oneTimeSubtotalCents > 0) {
    display = `${amountDueTodayDisplay} due today; ${monthlySubtotalDisplay}/month ongoing`;
  } else if (totals.monthlySubtotalCents > 0) {
    display = `${monthlySubtotalDisplay}/month`;
  } else {
    display = oneTimeSubtotalDisplay;
  }

  return {
    display,
    amountUsd: totals.amountDueTodayCents / 100,
    hasQuotedItems: false,
    oneTimeSubtotalDisplay,
    monthlySubtotalDisplay,
    amountDueTodayDisplay,
    monthlySubtotalCents: totals.monthlySubtotalCents,
  };
}

function buildTimelineSummary(timeline: RecommendationResult["estimatedTimeline"]) {
  return {
    customerLabel: timeline.customerLabel,
    totalBusinessDays: timeline.totalBusinessDays,
    oneTimeLabel: timeline.oneTimeLabel,
    monthlyLabel: timeline.monthlyLabel,
  };
}

function buildNextStep(result: RecommendationResult): DiscoverySummaryNextStep {
  if (result.recommendations.length === 0) {
    return {
      headline: "Let's find the right fit",
      body: "We couldn't match your answers to a specific package yet. Update your discovery answers or reach out and we'll help you choose.",
      actionLabel: "Update discovery answers",
    };
  }

  if (result.requiresApproval) {
    return {
      headline: "Review before you proceed",
      body: "Your recommendation is ready — confirm the services, deliverables, and investment before moving to checkout.",
      actionLabel: "Review and approve",
    };
  }

  return {
    headline: "You're ready to move forward",
    body: "Your recommended services and investment are set. Continue to checkout when you're ready.",
    actionLabel: "Continue to checkout",
  };
}

function mapWarning(warning: RecommendationWarning): DiscoverySummaryWarning | null {
  if (warning.kind === "inactive-service-match") {
    return null;
  }

  return {
    kind: warning.kind,
    message: CUSTOMER_WARNING_MESSAGES[warning.kind](warning),
    serviceId: warning.serviceId,
  };
}

function indexByServiceId<T extends { serviceId: ServiceId }>(
  items: readonly T[],
): Map<ServiceId, T> {
  return new Map(items.map((item) => [item.serviceId, item]));
}

function buildServiceItem(
  recommendation: RecommendationResult["recommendations"][number],
  brief: RecommendationResult["brief"],
  deliverablesByServiceId: Map<ServiceId, DeliverablesSummaryItem>,
  timelineByServiceId: Map<ServiceId, TimelineLineItem>,
): DiscoverySummaryServiceItem {
  const service = getServiceById(recommendation.serviceId);
  const deliverablesEntry = deliverablesByServiceId.get(recommendation.serviceId);
  const timelineEntry = timelineByServiceId.get(recommendation.serviceId);

  const title = service?.name ?? recommendation.serviceId;
  const customerDescription =
    service?.customerDescription ?? service?.customerReceives ?? "";
  const explanation =
    buildCustomerWhyExplanation(recommendation.serviceId, brief, customerDescription) ||
    title;

  return {
    serviceId: recommendation.serviceId,
    rank: recommendation.rank,
    title,
    explanation,
    deliverables: (deliverablesEntry?.deliverables ?? []).map((item) => ({
      label: item.label,
      quantity: item.quantity,
    })),
    investment: buildServiceInvestment(recommendation.serviceId),
    timelineLabel: timelineEntry?.customerLabel ?? "",
  };
}

/**
 * Transform a RecommendationResult into a customer-facing DiscoverySummaryModel.
 */
export function buildDiscoverySummary(result: RecommendationResult): DiscoverySummaryModel {
  const deliverablesByServiceId = indexByServiceId(result.deliverablesSummary);
  const timelineByServiceId = indexByServiceId(result.estimatedTimeline.items);

  const mapRecommendations = (
    recommendations: RecommendationResult["recommendations"],
  ) =>
    recommendations.map((recommendation) =>
      buildServiceItem(recommendation, result.brief, deliverablesByServiceId, timelineByServiceId),
    );

  const recommendedServices = mapRecommendations(result.recommendations);
  const considerNextServices = mapRecommendations(result.considerNextRecommendations);
  const additionalStudioServices: DiscoverySummaryServiceItem[] = [];

  const warnings = result.warnings
    .map(mapWarning)
    .filter((warning): warning is DiscoverySummaryWarning => warning !== null);

  const autoSelectedServiceIds = result.recommendations.map((entry) => entry.serviceId);

  return {
    recommendedServices,
    considerNextServices,
    additionalStudioServices,
    sectionLabels: CUSTOMER_SECTION_LABELS,
    primaryServiceId: result.primaryServiceId,
    totalInvestment: buildTotalInvestment(autoSelectedServiceIds),
    estimatedTimeline: buildTimelineSummary(result.estimatedTimeline),
    nextStep: buildNextStep(result),
    warnings,
    requiresApproval: result.requiresApproval,
    source: {
      generatedAt: result.generatedAt,
      engineVersion: result.engineVersion,
    },
  };
}
