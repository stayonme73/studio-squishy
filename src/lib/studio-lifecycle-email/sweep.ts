import { studioResendLifecycleAndWatchdogV1 as cfg } from "@/config/studio-resend-lifecycle-and-watchdog-v1";
import { listCampaignEnvelopes, readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import { recoverPaidOperatingChain } from "@/lib/studio-paid-activation-recovery";

import { deliverLifecycleNoticesForCampaign } from "./campaign";
import {
  evaluateLifecycleWatchdogFindings,
  recoverMissingAuthorizedNotices,
  type LifecycleWatchdogFinding,
} from "./watchdog-gaps";

export async function runLifecycleWatchdogSweep(options?: {
  limit?: number;
  onlyCampaignIds?: readonly string[];
  nowMs?: number;
}): Promise<{
  attemptedCampaigns: number;
  noticesAttempted: number;
  noticesSent: number;
  noticesFailed: number;
  recoveredMissingNotices: number;
  findings: LifecycleWatchdogFinding[];
  ownerActionRequired: false;
  campaignIds: string[];
}> {
  const limit = options?.limit ?? cfg.sweepLimit;
  const envelopes = await listCampaignEnvelopes();
  const only = options?.onlyCampaignIds ? new Set(options.onlyCampaignIds) : null;
  const campaignIds: string[] = [];
  const findings: LifecycleWatchdogFinding[] = [];
  let noticesAttempted = 0;
  let noticesSent = 0;
  let noticesFailed = 0;
  let recoveredMissingNotices = 0;
  let attemptedCampaigns = 0;

  for (const envelope of envelopes) {
    if (only && !only.has(envelope.campaignId)) continue;
    if (attemptedCampaigns >= limit) break;
    attemptedCampaigns += 1;
    campaignIds.push(envelope.campaignId);

    if (envelope.record.paymentTruth?.status === "confirmed") {
      await recoverPaidOperatingChain(envelope.record);
    }

    const latest = await readCampaignEnvelope(envelope.campaignId);
    const tasks = await readTasksEnvelope(envelope.campaignId);
    if (latest && tasks) {
      const materials = await getOrInitializeMaterials(envelope.campaignId, latest.record);
      const recovered = recoverMissingAuthorizedNotices({
        campaign: latest.record,
        envelope: tasks,
        clientUserId: latest.clientUserId,
        materials: materials.items,
      });
      const beforeIds = new Set((tasks.jobCommunicationRecords ?? []).map((record) => record.id));
      const added = (recovered.jobCommunicationRecords ?? []).filter(
        (record) => !beforeIds.has(record.id),
      );
      if (added.length > 0) {
        await writeTasksEnvelope(recovered);
        recoveredMissingNotices += added.length;
      }
      findings.push(
        ...evaluateLifecycleWatchdogFindings({
          campaign: latest.record,
          envelope: added.length > 0 ? recovered : tasks,
          nowMs: options?.nowMs,
        }),
      );
    }

    const result = await deliverLifecycleNoticesForCampaign(envelope.campaignId, {
      nowMs: options?.nowMs,
    });
    noticesAttempted += result.attempted;
    noticesSent += result.sent;
    noticesFailed += result.failed;
  }

  return {
    attemptedCampaigns,
    noticesAttempted,
    noticesSent,
    noticesFailed,
    recoveredMissingNotices,
    findings,
    ownerActionRequired: false,
    campaignIds,
  };
}
