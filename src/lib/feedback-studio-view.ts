import { feedbackStudio } from "@/config/feedback-studio";
import type { CampaignRecord } from "@/config/studio-board";
import { resolveCampaignDisplayName, resolveRevisionTracker } from "@/lib/campaign-record";

export function resolveFeedbackRevisionStatus(campaign: CampaignRecord | null): string {
  if (!campaign) return "—";

  const { included, used } = resolveRevisionTracker(campaign);
  const currentRound = Math.min(used + 1, included);

  if (currentRound >= included) {
    return feedbackStudio.reviewStatus.finalRound;
  }

  return feedbackStudio.reviewStatus.roundOf(currentRound, included);
}

export function resolveFeedbackCampaignTitle(campaign: CampaignRecord | null): string {
  if (!campaign) return "Your Campaign";
  return resolveCampaignDisplayName(campaign);
}
