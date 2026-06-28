import type { CampaignRecord } from "@/config/studio-board";
import {
  readProjectSummaryPlanDraft,
  resolveProjectSummaryPlanDraftCampaignId,
} from "@/lib/project-summary-plan-draft";

const CAMPAIGN_KEY = "studio-squishy:current-campaign";

export const STUDIO_GUIDE_DISCOVERY_HREF = "/business-discovery-studio";
export const STUDIO_GUIDE_PROJECT_SUMMARY_HREF = "/project-summary";

export function hasActiveStudioPlanState(
  campaign: CampaignRecord | null,
  campaignId?: string,
): boolean {
  if (campaign?.approvedStudioPlan) return true;
  const draft = readProjectSummaryPlanDraft(campaignId ?? campaign?.campaignId);
  return Boolean(draft && draft.selectedServiceIds.length > 0);
}

export function readCampaignForStudioGuideRedirect(): CampaignRecord | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CAMPAIGN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CampaignRecord;
  } catch {
    return null;
  }
}

/** State-aware redirect for legacy Studio Guide routes. */
export function resolveStudioGuideRedirectHref(): string {
  const campaign = readCampaignForStudioGuideRedirect();
  const campaignId = resolveProjectSummaryPlanDraftCampaignId(campaign?.campaignId);
  return hasActiveStudioPlanState(campaign, campaignId)
    ? STUDIO_GUIDE_PROJECT_SUMMARY_HREF
    : STUDIO_GUIDE_DISCOVERY_HREF;
}
