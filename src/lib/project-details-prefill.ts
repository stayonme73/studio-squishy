import { buildDiscoveryAnswersHeard } from "@/project-summary/buildDiscoveryAnswersHeard";
import type { CampaignRecord } from "@/config/studio-board";
import { projectDetails } from "@/config/project-details";
import {
  resolveApprovedPlanServiceNames,
  resolveApprovedServiceDisplayNames,
} from "@/lib/approved-plan-display";
import { businessNameFromAnswer, parseBusinessTileAnswer } from "@/lib/business-discovery-completion";
import type { DiscoveryBriefAnswers } from "@/recommendation/types";

export type ProjectDetailsPrefill = {
  businessName: string;
  businessOffer: string;
  selectedServices: readonly { skuId: string; serviceName: string }[];
  discoverySummary: readonly { label: string; value: string }[];
};

function resolveSelectedServices(
  approved: NonNullable<CampaignRecord["approvedStudioPlan"]>,
) {
  const selectedIds =
    approved.selectedServiceIds?.length > 0
      ? approved.selectedServiceIds
      : [...approved.includedServiceIds, ...approved.additionalServiceIds];
  const displayNames = resolveApprovedServiceDisplayNames(approved, selectedIds);

  return selectedIds.map((skuId, index) => ({
    skuId,
    serviceName: displayNames[index] ?? resolveApprovedPlanServiceNames(approved)[index] ?? skuId,
  }));
}

export function buildProjectDetailsPrefill(
  campaign: CampaignRecord | null,
  discoveryAnswers?: DiscoveryBriefAnswers,
): ProjectDetailsPrefill {
  const answers = discoveryAnswers ?? campaign?.discoveryAnswers ?? {};
  const businessRaw = answers["your-business"] ?? "";
  const { name, offer } = parseBusinessTileAnswer(businessRaw);
  const approved = campaign?.approvedStudioPlan;

  return {
    businessName: name || businessNameFromAnswer(businessRaw) || campaign?.campaignName || "",
    businessOffer: offer,
    selectedServices: approved ? resolveSelectedServices(approved) : [],
    discoverySummary: buildDiscoveryAnswersHeard(answers),
  };
}

export function projectDetailsPrefillLabels() {
  return projectDetails.prefill;
}
