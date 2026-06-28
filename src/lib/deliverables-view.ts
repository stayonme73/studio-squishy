import type { CampaignRecord } from "@/config/studio-board";
import {
  buildDeliverablesPackage,
  deliverables,
  type CampaignDeliverablesPackage,
} from "@/config/deliverables";
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
  options?: { previewDelivered?: boolean },
): DeliverablesView {
  const base = {
    campaignName: "—",
    selectedOption: "—",
    completionDate: "—",
    statusLabel: deliverables.summary.statusDelivered,
    package: null as CampaignDeliverablesPackage | null,
    showGreetingName: false,
  };

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
  };
}
