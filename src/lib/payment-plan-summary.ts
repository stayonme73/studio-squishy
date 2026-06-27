import { getServiceById } from "@/catalog/accessors";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { getStudioGuideV1Package } from "@/config/studio-guide-v1-lock";
import { readCurrentCampaignHydrated } from "@/lib/studio-board-campaign";
import { PROJECT_SUMMARY_MOCK } from "@/project-summary";
import type { StudioPlanReviewModel } from "@/studio-plan-review";

export type PaymentPlanSummarySource = "storage" | "mock";

export type PaymentPlanSummary = {
  services: readonly string[];
  investmentLabel: "Estimated Investment" | "Monthly Total";
  investmentDisplay: string;
  source: PaymentPlanSummarySource;
};

const MOCK_INVESTMENT = "$1,596";

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function isMonthlyPackage(packageId: StudioGuidePackageId): boolean {
  const pkg = getStudioGuideV1Package(packageId);
  return pkg?.price.toLowerCase().includes("per month") ?? false;
}

function monthlyDisplayFromPackage(packageId: StudioGuidePackageId): string {
  const pkg = getStudioGuideV1Package(packageId);
  if (!pkg) return "$499/month";
  return pkg.price.replace(/\sper month$/i, "/month");
}

/**
 * Left-panel Studio Plan summary — reads approved plan from campaign storage when present,
 * otherwise falls back to Project Summary mock services and placeholder investment.
 */
export function buildPaymentPlanSummary(
  packageId?: StudioGuidePackageId,
): PaymentPlanSummary {
  const campaign = readCurrentCampaignHydrated();
  const approved = campaign?.approvedStudioPlan;

  if (approved) {
    const allIds = [...approved.includedServiceIds, ...approved.additionalServiceIds];
    const services = allIds
      .map((id) => getServiceById(id)?.name)
      .filter((name): name is string => Boolean(name));

    if (services.length > 0) {
      const effectivePackageId = packageId ?? campaign?.packageId;
      if (effectivePackageId && isMonthlyPackage(effectivePackageId)) {
        return {
          services,
          investmentLabel: "Monthly Total",
          investmentDisplay: monthlyDisplayFromPackage(effectivePackageId),
          source: "storage",
        };
      }

      let totalUsd = 0;
      for (const id of allIds) {
        totalUsd += getServiceById(id)?.pricing?.amountUsd ?? 0;
      }

      if (totalUsd > 0) {
        return {
          services,
          investmentLabel: "Estimated Investment",
          investmentDisplay: formatUsd(totalUsd),
          source: "storage",
        };
      }

      if (approved.additionalCostUsd > 0) {
        return {
          services,
          investmentLabel: "Estimated Investment",
          investmentDisplay: formatUsd(approved.additionalCostUsd),
          source: "storage",
        };
      }

      return {
        services,
        investmentLabel: "Estimated Investment",
        investmentDisplay: MOCK_INVESTMENT,
        source: "storage",
      };
    }
  }

  return {
    services: PROJECT_SUMMARY_MOCK.services.map((service) => service.name),
    investmentLabel: "Estimated Investment",
    investmentDisplay: MOCK_INVESTMENT,
    source: "mock",
  };
}

function collectPlanServices(plan: StudioPlanReviewModel): StudioPlanReviewModel["includedServices"] {
  return [
    ...plan.includedServices,
    ...plan.additionalStudioServices,
    ...plan.addedToPlanServices,
  ];
}

/**
 * Live Studio Plan summary for inline checkout — reflects current customize selections.
 */
export function buildPaymentPlanSummaryFromPlan(plan: StudioPlanReviewModel): PaymentPlanSummary {
  const allServices = collectPlanServices(plan);
  const services = allServices.map((service) => service.title);

  if (services.length === 0) {
    return {
      services: PROJECT_SUMMARY_MOCK.services.map((service) => service.name),
      investmentLabel: "Estimated Investment",
      investmentDisplay: "Total updates as you customize your plan.",
      source: "mock",
    };
  }

  let totalUsd = 0;
  let hasQuotedItems = false;
  for (const service of allServices) {
    if (service.amountUsd > 0) {
      totalUsd += service.amountUsd;
    } else if (service.pricingDisplay.toLowerCase().includes("quoted")) {
      hasQuotedItems = true;
    }
  }

  if (hasQuotedItems && totalUsd === 0) {
    return {
      services,
      investmentLabel: "Estimated Investment",
      investmentDisplay: "Quoted at checkout",
      source: "mock",
    };
  }

  if (hasQuotedItems) {
    return {
      services,
      investmentLabel: "Estimated Investment",
      investmentDisplay: `${formatUsd(totalUsd)} plus quoted items`,
      source: "mock",
    };
  }

  return {
    services,
    investmentLabel: "Estimated Investment",
    investmentDisplay: totalUsd > 0 ? formatUsd(totalUsd) : plan.additionalCost.display,
    source: "mock",
  };
}
