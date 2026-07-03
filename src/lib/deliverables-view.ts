import type { CampaignRecord } from "@/config/studio-board";
import {
  buildDeliverablesPackage,
  deliverables,
  type CampaignDeliverablesPackage,
} from "@/config/deliverables";
import type { FinalDeliveryView } from "@/lib/job-control/final-delivery-view";
import { resolveDeliverableScopeFromCampaign } from "@/lib/deliverable-scope";

export type DeliverablesPageState = "no-campaign" | "preparing" | "ready";

export type DeliverablesView = {
  state: DeliverablesPageState;
  campaignName: string;
  selectedOption: string;
  completionDate: string;
  statusLabel: string;
  package: CampaignDeliverablesPackage | null;
  showGreetingName: boolean;
  /** Job-scoped Final Delivery V1 — real files from Production Workspace. */
  finalDelivery: FinalDeliveryView | null;
  useJobDelivery: boolean;
};

function formatCompletionDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function selectedOptionLabel(campaign: CampaignRecord) {
  if (campaign.selectedCampaignOption) return campaign.selectedCampaignOption;
  return "Option A (Budget Friendly)";
}

export function resolveDeliverablesView(
  campaign: CampaignRecord | null,
  options?: { previewDelivered?: boolean; finalDelivery?: FinalDeliveryView | null },
): DeliverablesView {
  const base = {
    campaignName: "—",
    selectedOption: "—",
    completionDate: "—",
    statusLabel: deliverables.summary.statusDelivered,
    package: null as CampaignDeliverablesPackage | null,
    showGreetingName: false,
    finalDelivery: options?.finalDelivery ?? null,
    useJobDelivery: false,
  };

  if (options?.finalDelivery?.state === "ready" && options.finalDelivery.jobs.length > 0) {
    const latestDelivered = options.finalDelivery.jobs
      .map((job) => job.deliveredAt)
      .filter(Boolean)
      .sort()
      .at(-1);

    return {
      state: "ready",
      campaignName: options.finalDelivery.campaignName,
      selectedOption: campaign?.selectedCampaignOption ?? selectedOptionLabel(campaign ?? ({} as CampaignRecord)),
      completionDate: latestDelivered
        ? formatCompletionDate(latestDelivered)
        : formatCompletionDate(campaign?.updatedAt ?? new Date().toISOString()),
      statusLabel: options.finalDelivery.allJobsDelivered
        ? deliverables.summary.statusDelivered
        : "PARTIALLY DELIVERED",
      package: null,
      showGreetingName: true,
      finalDelivery: options.finalDelivery,
      useJobDelivery: true,
    };
  }

  if (options?.previewDelivered) {
    const lineItems = campaign?.approvedStudioPlan?.lineItems;
    if (!campaign || !lineItems?.length) {
      return { ...base, state: "no-campaign" };
    }

    const scope = resolveDeliverableScopeFromCampaign(campaign);
    return {
      state: "ready",
      campaignName: campaign.campaignName,
      selectedOption: campaign.selectedCampaignOption ?? selectedOptionLabel(campaign),
      completionDate: formatCompletionDate(campaign.updatedAt),
      statusLabel: deliverables.summary.statusDelivered,
      package: buildDeliverablesPackage(campaign.campaignName, scope),
      showGreetingName: true,
      finalDelivery: null,
      useJobDelivery: false,
    };
  }

  if (!campaign) {
    return { ...base, state: "no-campaign" };
  }

  if (campaign.campaignStatus !== "DELIVERED") {
    return {
      ...base,
      state: "preparing",
      campaignName: campaign.campaignName,
      finalDelivery: options?.finalDelivery ?? null,
    };
  }

  const scope = resolveDeliverableScopeFromCampaign(campaign);

  return {
    state: "ready",
    campaignName: campaign.campaignName,
    selectedOption: selectedOptionLabel(campaign),
    completionDate: formatCompletionDate(campaign.updatedAt),
    statusLabel: deliverables.summary.statusDelivered,
    package: buildDeliverablesPackage(campaign.campaignName, scope),
    showGreetingName: true,
    finalDelivery: options?.finalDelivery ?? null,
    useJobDelivery: false,
  };
}
