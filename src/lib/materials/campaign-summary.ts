import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import type { CampaignRecord } from "@/config/studio-board";

import { countBlockingRequiredMaterials } from "./materials-view";
import { readMaterialsEnvelope } from "./store";

export async function syncMaterialsSummaryOnCampaign(
  campaignId: string,
  blockingRequiredCount?: number,
): Promise<void> {
  const envelope = await readCampaignEnvelope(campaignId);
  if (!envelope) return;

  let resolvedCount = blockingRequiredCount;
  if (resolvedCount === undefined) {
    const materials = await readMaterialsEnvelope(campaignId);
    resolvedCount = countBlockingRequiredMaterials(materials?.items ?? []);
  }

  const now = new Date().toISOString();
  const record: CampaignRecord = {
    ...envelope.record,
    materialsSummary: {
      blockingRequiredCount: resolvedCount,
      updatedAt: now,
    },
    updatedAt: now,
  };

  await upsertCampaignRecord(record, envelope.clientUserId);
}
