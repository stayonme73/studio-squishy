import { studioPaidActivationRecoveryV1 } from "@/config/studio-paid-activation-recovery-v1";
import { listCampaignEnvelopes } from "@/lib/campaign-store/store";

import { needsPaidOperatingRecovery } from "./needs-recovery";
import { recoverPaidOperatingChain } from "./recover";
import type { PaidOperatingSweepResult } from "./types";

/**
 * Scan durable campaign files for paid projects stuck in pending_retry / missing
 * activation / missing sealed structure, then retry. Does not require a browser
 * session or Owner action.
 */
export async function sweepPaidActivationRecovery(options?: {
  limit?: number;
  excludeCampaignId?: string;
  /** When set, only these campaign ids are considered. */
  onlyCampaignIds?: readonly string[];
}): Promise<PaidOperatingSweepResult> {
  const limit = options?.limit ?? studioPaidActivationRecoveryV1.sweepLimit;
  const envelopes = await listCampaignEnvelopes();
  let skippedClear = 0;
  const pending = [];
  const only = options?.onlyCampaignIds
    ? new Set(options.onlyCampaignIds)
    : null;

  for (const envelope of envelopes) {
    if (only && !only.has(envelope.campaignId)) continue;
    if (
      options?.excludeCampaignId &&
      envelope.campaignId === options.excludeCampaignId
    ) {
      continue;
    }
    if (!needsPaidOperatingRecovery(envelope.record)) {
      skippedClear += 1;
      continue;
    }
    pending.push(envelope);
  }

  const attempted = pending.slice(0, limit);
  let recovered = 0;
  let stillPending = 0;
  const campaignIds: string[] = [];

  for (const envelope of attempted) {
    campaignIds.push(envelope.campaignId);
    const result = await recoverPaidOperatingChain(envelope.record);
    if (result.needsRecovery) {
      stillPending += 1;
    } else if (result.recovered || result.alreadyClear) {
      recovered += 1;
    }
  }

  return {
    attempted: attempted.length,
    recovered,
    stillPending,
    skippedClear,
    ownerActionRequired: false,
    campaignIds,
  };
}
