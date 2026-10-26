import { studioResendLifecycleAndWatchdogV1 as cfg } from "@/config/studio-resend-lifecycle-and-watchdog-v1";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
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
import { watchdogSweepMayDeliverCampaign } from "./watchdog-sweep-eligibility";

type SweepDeps = {
  listCampaignEnvelopes: () => Promise<ServerCampaignEnvelope[]>;
  readCampaignEnvelope: typeof readCampaignEnvelope;
  readTasksEnvelope: typeof readTasksEnvelope;
  writeTasksEnvelope: typeof writeTasksEnvelope;
  getOrInitializeMaterials: typeof getOrInitializeMaterials;
  recoverPaidOperatingChain: typeof recoverPaidOperatingChain;
  deliverLifecycleNoticesForCampaign: typeof deliverLifecycleNoticesForCampaign;
  recoverMissingAuthorizedNotices: typeof recoverMissingAuthorizedNotices;
  evaluateLifecycleWatchdogFindings: typeof evaluateLifecycleWatchdogFindings;
};

export async function runLifecycleWatchdogSweep(options?: {
  limit?: number;
  onlyCampaignIds?: readonly string[];
  nowMs?: number;
  deps?: Partial<SweepDeps>;
}): Promise<{
  attemptedCampaigns: number;
  noticesAttempted: number;
  noticesSent: number;
  noticesFailed: number;
  recoveredMissingNotices: number;
  skippedHistoricalCampaigns: number;
  findings: LifecycleWatchdogFinding[];
  ownerActionRequired: false;
  campaignIds: string[];
}> {
  const deps: SweepDeps = {
    listCampaignEnvelopes,
    readCampaignEnvelope,
    readTasksEnvelope,
    writeTasksEnvelope,
    getOrInitializeMaterials,
    recoverPaidOperatingChain,
    deliverLifecycleNoticesForCampaign,
    recoverMissingAuthorizedNotices,
    evaluateLifecycleWatchdogFindings,
    ...options?.deps,
  };
  const limit = options?.limit ?? cfg.sweepLimit;
  const envelopes = await deps.listCampaignEnvelopes();
  const only = options?.onlyCampaignIds ? new Set(options.onlyCampaignIds) : null;
  const campaignIds: string[] = [];
  const findings: LifecycleWatchdogFinding[] = [];
  let noticesAttempted = 0;
  let noticesSent = 0;
  let noticesFailed = 0;
  let recoveredMissingNotices = 0;
  let skippedHistoricalCampaigns = 0;
  let attemptedCampaigns = 0;

  for (const envelope of envelopes) {
    if (only && !only.has(envelope.campaignId)) continue;
    if (
      !watchdogSweepMayDeliverCampaign({
        campaignId: envelope.campaignId,
        createdAt: envelope.record?.createdAt,
        sandbox: envelope.record?.paymentTruth?.sandbox,
        testPaymentIsolation: envelope.record?.testPaymentIsolation,
        disposableKitStripeTestProof: envelope.record?.disposableKitStripeTestProof,
      })
    ) {
      skippedHistoricalCampaigns += 1;
      continue;
    }
    if (attemptedCampaigns >= limit) break;
    attemptedCampaigns += 1;
    campaignIds.push(envelope.campaignId);

    if (envelope.record.paymentTruth?.status === "confirmed") {
      await deps.recoverPaidOperatingChain(envelope.record);
    }

    const latest = await deps.readCampaignEnvelope(envelope.campaignId);
    const tasks = await deps.readTasksEnvelope(envelope.campaignId);
    if (latest && tasks) {
      const materials = await deps.getOrInitializeMaterials(envelope.campaignId, latest.record);
      const recovered = deps.recoverMissingAuthorizedNotices({
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
        await deps.writeTasksEnvelope(recovered);
        recoveredMissingNotices += added.length;
      }
      findings.push(
        ...deps.evaluateLifecycleWatchdogFindings({
          campaign: latest.record,
          envelope: added.length > 0 ? recovered : tasks,
          nowMs: options?.nowMs,
        }),
      );
    }

    const result = await deps.deliverLifecycleNoticesForCampaign(envelope.campaignId, {
      nowMs: options?.nowMs,
      watchdogBoundary: true,
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
    skippedHistoricalCampaigns,
    findings,
    ownerActionRequired: false,
    campaignIds,
  };
}
