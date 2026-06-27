/**
 * Discovery Summary — maps RecommendationResult to a customer-facing view model.
 * Reads engine output and catalog copy; does not re-score or re-match discovery rules.
 */

import { getServiceById } from "@/catalog/accessors";
import { CUSTOMER_SECTION_LABELS } from "@/catalog/production-allocation";
import type { ServiceId } from "@/catalog/types";
import { studioNeeds } from "@/config/studio-services";
import type {
  DeliverablesSummaryItem,
  EstimatedInvestment,
  EstimatedTimeline,
  InvestmentLineItem,
  RecommendationReason,
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
} from "@/discovery-summary/types";

const NEED_LABEL_BY_ID = new Map(studioNeeds.map((need) => [need.id, need.label]));

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
};

function needLabel(value: string): string {
  return NEED_LABEL_BY_ID.get(value as (typeof studioNeeds)[number]["id"]) ?? formatKebabLabel(value);
}

function formatKebabLabel(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function reasonPhrase(reason: RecommendationReason): string {
  switch (reason.signal) {
    case "need":
      return `You selected "${needLabel(reason.value)}" as a goal.`;
    case "situation":
      return `Your situation — "${reason.value}" — aligns with this service.`;
    case "challenge":
      return `You identified "${reason.value}" as a challenge we can address.`;
    case "focus-keyword":
      return `Your focus on "${reason.value}" points here.`;
  }
}

function buildServiceExplanation(
  customerDescription: string,
  reasons: readonly RecommendationReason[],
): string {
  const reasonCopy = [...reasons]
    .sort((a, b) => b.weight - a.weight)
    .map(reasonPhrase)
    .filter((phrase, index, phrases) => phrases.indexOf(phrase) === index);

  if (reasonCopy.length === 0) {
    return customerDescription;
  }

  return `${customerDescription} ${reasonCopy.join(" ")}`.trim();
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildTotalInvestmentDisplay(investment: EstimatedInvestment): string {
  if (investment.items.length === 0) {
    return "No investment estimate";
  }

  const allQuoted = investment.items.every((item) => item.amountUsd === 0);
  if (allQuoted) {
    return "Quoted at checkout";
  }

  const hasMonthly = investment.items.some((item) => item.billing === "monthly");
  const hasOneTime = investment.items.some((item) => item.billing === "one-time");
  const total = formatUsd(investment.totalAmountUsd);

  if (hasMonthly && hasOneTime) {
    return investment.hasQuotedItems
      ? `${total} plus quoted items (mix of one-time and monthly)`
      : `${total} (mix of one-time and monthly)`;
  }

  if (hasMonthly) {
    return investment.hasQuotedItems
      ? `${total} per month plus quoted items`
      : `${total} per month`;
  }

  return investment.hasQuotedItems ? `${total} plus quoted items` : total;
}

function buildTotalInvestment(investment: EstimatedInvestment): DiscoverySummaryTotalInvestment {
  return {
    display: buildTotalInvestmentDisplay(investment),
    amountUsd: investment.totalAmountUsd,
    hasQuotedItems: investment.hasQuotedItems,
  };
}

function buildTimelineSummary(timeline: EstimatedTimeline) {
  return {
    customerLabel: timeline.customerLabel,
    totalBusinessDays: timeline.totalBusinessDays,
  };
}

function buildNextStep(result: RecommendationResult): DiscoverySummaryNextStep {
  if (result.includedRecommendations.length === 0) {
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
  deliverablesByServiceId: Map<ServiceId, DeliverablesSummaryItem>,
  investmentByServiceId: Map<ServiceId, InvestmentLineItem>,
  timelineByServiceId: Map<ServiceId, TimelineLineItem>,
): DiscoverySummaryServiceItem {
  const service = getServiceById(recommendation.serviceId);
  const deliverablesEntry = deliverablesByServiceId.get(recommendation.serviceId);
  const investmentEntry = investmentByServiceId.get(recommendation.serviceId);
  const timelineEntry = timelineByServiceId.get(recommendation.serviceId);

  const title = service?.name ?? recommendation.serviceId;
  const customerDescription =
    service?.customerDescription ?? service?.customerReceives ?? recommendation.serviceId;
  const explanation = buildServiceExplanation(customerDescription, recommendation.reasons);

  return {
    serviceId: recommendation.serviceId,
    rank: recommendation.rank,
    title,
    explanation,
    deliverables: (deliverablesEntry?.deliverables ?? []).map((item) => ({
      label: item.label,
      quantity: item.quantity,
    })),
    investment: {
      display: investmentEntry?.display ?? "Quoted at checkout",
      amountUsd: investmentEntry?.amountUsd ?? 0,
      billing: investmentEntry?.billing ?? "one-time",
    },
    timelineLabel: timelineEntry?.customerLabel ?? "",
  };
}

/**
 * Transform a RecommendationResult into a customer-facing DiscoverySummaryModel.
 */
export function buildDiscoverySummary(result: RecommendationResult): DiscoverySummaryModel {
  const deliverablesByServiceId = indexByServiceId(result.deliverablesSummary);
  const investmentByServiceId = indexByServiceId(result.estimatedInvestment.items);
  const timelineByServiceId = indexByServiceId(result.estimatedTimeline.items);

  const mapRecommendations = (
    recommendations: RecommendationResult["includedRecommendations"],
  ) =>
    recommendations.map((recommendation) =>
      buildServiceItem(
        recommendation,
        deliverablesByServiceId,
        investmentByServiceId,
        timelineByServiceId,
      ),
    );

  const recommendedServices = mapRecommendations(result.includedRecommendations);
  const additionalStudioServices = mapRecommendations(result.additionalStudioServices);

  const warnings = result.warnings
    .map(mapWarning)
    .filter((warning): warning is DiscoverySummaryWarning => warning !== null);

  return {
    recommendedServices,
    additionalStudioServices,
    sectionLabels: CUSTOMER_SECTION_LABELS,
    primaryServiceId: result.primaryServiceId,
    totalInvestment: buildTotalInvestment(result.estimatedInvestment),
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
