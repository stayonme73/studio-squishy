import type { DiscoveryTileId } from "@/config/business-discovery-studio";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";
import type { DiscoveryBrief, DiscoveryBriefAnswers } from "@/recommendation/types";

function toBriefAnswers(answers: DiscoveryAnswers): DiscoveryBriefAnswers {
  const briefAnswers: DiscoveryBriefAnswers = {};
  for (const [tileId, value] of Object.entries(answers)) {
    if (tileId === "submit-project") continue;
    if (typeof value !== "string" || !value.trim()) continue;
    briefAnswers[tileId as Exclude<DiscoveryTileId, "submit-project">] = value;
  }
  return briefAnswers;
}

/** Map persisted discovery tile answers to a Recommendation Engine brief. */
export function discoveryBriefFromAnswers(answers: DiscoveryAnswers): DiscoveryBrief {
  return { answers: toBriefAnswers(answers) };
}

/** Read brief answers from a campaign record or local discovery session. */
export function resolveDiscoveryBriefAnswers(
  campaignAnswers?: DiscoveryBriefAnswers,
  sessionAnswers?: DiscoveryAnswers,
): DiscoveryBriefAnswers {
  if (campaignAnswers && Object.keys(campaignAnswers).length > 0) {
    return campaignAnswers;
  }
  return toBriefAnswers(sessionAnswers ?? {});
}
