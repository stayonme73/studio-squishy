import type { ServiceId } from "@/catalog/types";

const CAMPAIGN_KEY = "studio-squishy:current-campaign";
export const PROJECT_SUMMARY_PLAN_DRAFT_KEY_PREFIX = "studio-squishy:project-summary-plan-draft:";
const ANONYMOUS_CAMPAIGN = "__pre-campaign__";

export type ProjectSummaryPlanDraft = {
  selectedServiceIds: ServiceId[];
  updatedAt: string;
};

function draftKey(campaignId: string): string {
  return `${PROJECT_SUMMARY_PLAN_DRAFT_KEY_PREFIX}${campaignId}`;
}

function readCampaignIdFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CAMPAIGN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { campaignId?: string };
    return parsed.campaignId ?? null;
  } catch {
    return null;
  }
}

export function resolveProjectSummaryPlanDraftCampaignId(campaignId?: string): string {
  return campaignId ?? readCampaignIdFromStorage() ?? ANONYMOUS_CAMPAIGN;
}

export function readProjectSummaryPlanDraft(campaignId?: string): ProjectSummaryPlanDraft | null {
  if (typeof window === "undefined") return null;
  const key = draftKey(resolveProjectSummaryPlanDraftCampaignId(campaignId));
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProjectSummaryPlanDraft;
    if (!Array.isArray(parsed.selectedServiceIds)) return null;
    return {
      selectedServiceIds: [...parsed.selectedServiceIds],
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveProjectSummaryPlanDraft(
  selectedServiceIds: readonly ServiceId[],
  campaignId?: string,
): void {
  if (typeof window === "undefined") return;
  const payload: ProjectSummaryPlanDraft = {
    selectedServiceIds: [...selectedServiceIds],
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    draftKey(resolveProjectSummaryPlanDraftCampaignId(campaignId)),
    JSON.stringify(payload),
  );
}

export function clearProjectSummaryPlanDraft(campaignId?: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(draftKey(resolveProjectSummaryPlanDraftCampaignId(campaignId)));
}
