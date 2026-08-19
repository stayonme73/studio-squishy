import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";

import {
  applyReturnOwnerAsksOnCustomerReply,
  recoverOwnerDecisionAftermath,
} from "./owner-decision-aftermath";

async function loadTasksForAftermath(campaignId: string) {
  const campaign = await readCampaignEnvelope(campaignId);
  if (!campaign) return null;
  const tasks = await getOrGenerateTasks(campaignId, campaign.record);
  return { campaign, tasks };
}

/**
 * Re-queue a missing in-app Owner ask/decision follow-up without asking Tagia again.
 */
export async function recoverOwnerDecisionAftermathForCampaign(
  campaignId: string,
): Promise<{ recoveredIds: readonly string[] }> {
  const loaded = await loadTasksForAftermath(campaignId);
  if (!loaded) return { recoveredIds: [] };

  const recovered = recoverOwnerDecisionAftermath(loaded.tasks);
  if (recovered.recoveredIds.length === 0) return { recoveredIds: [] };

  await writeTasksEnvelope(recovered.envelope);
  return { recoveredIds: recovered.recoveredIds };
}

/**
 * After a customer Board reply, return Owner-asked folders to waiting_owner.
 * The original decision is not replayed. Missing follow-ups are recovered first.
 */
export async function resumeOwnerDecisionAsksAfterCustomerReply(
  campaignId: string,
): Promise<{ resumedIds: readonly string[] }> {
  const loaded = await loadTasksForAftermath(campaignId);
  if (!loaded) return { resumedIds: [] };

  const recovered = recoverOwnerDecisionAftermath(loaded.tasks);
  const resumed = applyReturnOwnerAsksOnCustomerReply(recovered.envelope);
  if (recovered.recoveredIds.length === 0 && resumed.resumedIds.length === 0) {
    return { resumedIds: [] };
  }

  await writeTasksEnvelope(resumed.envelope);
  return { resumedIds: resumed.resumedIds };
}
