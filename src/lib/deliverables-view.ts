import type { CampaignRecord } from "@/config/studio-board";
import {
  buildDeliverablesPackage,
  deliverables,
  type CampaignDeliverablesPackage,
} from "@/config/deliverables";

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

  const previewName = campaign?.campaignName ?? "Summer Product Launch";
  if (options?.previewDelivered) {
    return {
      state: "ready",
      campaignName: previewName,
      selectedOption: campaign?.selectedCampaignOption ?? "Option B (Balanced)",
      completionDate: formatCompletionDate(campaign?.updatedAt ?? new Date().toISOString()),
      statusLabel: deliverables.summary.statusDelivered,
      package: buildDeliverablesPackage(previewName),
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

  return {
    state: "ready",
    campaignName: campaign.campaignName,
    selectedOption: selectedOptionLabel(campaign),
    completionDate: formatCompletionDate(campaign.updatedAt),
    statusLabel: deliverables.summary.statusDelivered,
    package: buildDeliverablesPackage(campaign.campaignName),
    showGreetingName: true,
  };
}
