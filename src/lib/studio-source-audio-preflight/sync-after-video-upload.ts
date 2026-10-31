import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import type { CampaignRecord } from "@/config/studio-board";
import { withCampaignArtifactProductionWorkspace } from "@/lib/campaign-design-artifacts";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import { mapClipRepurposingJobTruthFromJob } from "@/lib/studio-dispatch/map-clip-repurposing-job-truth";
import { mapFootageEditingJobTruthFromJob } from "@/lib/studio-dispatch/map-footage-editing-job-truth";

import {
  attachSourceAudioAcknowledgement,
  recordSourceAudioGateOnCampaign,
} from "./acknowledgement";
import { evaluateSourceAudioGate } from "./evaluate";
import { resolveVideoSkuForSourceAudioPreflight } from "./resolve-video-sku";

/** After a stored talking-head upload, record measured gate outcome on the campaign (no auto-ack). */
export async function refreshSourceAudioPreflightForCampaign(
  campaignId: string,
): Promise<CampaignRecord | null> {
  const envelope = await readCampaignEnvelope(campaignId);
  if (!envelope?.record) return null;
  const skuId = resolveVideoSkuForSourceAudioPreflight(envelope.record);
  if (!skuId) return envelope.record;

  return withCampaignArtifactProductionWorkspace(campaignId, async (repoRoot) => {
    const latest = await readCampaignEnvelope(campaignId);
    if (!latest?.record) return null;
    const materials = (await readMaterialsEnvelope(campaignId))?.items ?? [];
    const truth =
      skuId === CLIP_REPURPOSING_SKU
        ? mapClipRepurposingJobTruthFromJob({
            repoRoot,
            campaign: latest.record,
            materials,
          })
        : mapFootageEditingJobTruthFromJob({
            repoRoot,
            campaign: latest.record,
            materials,
          });
    if (!truth.ok) return latest.record;

    const gate = evaluateSourceAudioGate({ sourceAbsolutePath: truth.sourceAbsolutePath });
    const updated = recordSourceAudioGateOnCampaign({
      campaign: latest.record,
      skuId,
      outcome: gate.outcome,
      customerNotice: gate.customerNotice,
    });
    const saved = await upsertCampaignRecord(updated, envelope.clientUserId);
    return saved.record;
  });
}

export async function acknowledgeSourceAudioLimitationForCampaign(input: {
  campaignId: string;
  proceedWithThisSource: boolean;
}): Promise<
  | { ok: true; record: CampaignRecord }
  | { ok: false; status: number; error: string }
> {
  if (!input.proceedWithThisSource) {
    return {
      ok: false,
      status: 400,
      error: "Proceeding with this source requires an explicit customer choice.",
    };
  }

  const envelope = await readCampaignEnvelope(input.campaignId);
  if (!envelope?.record) {
    return { ok: false, status: 404, error: "Campaign not found" };
  }
  const skuId = resolveVideoSkuForSourceAudioPreflight(envelope.record);
  if (!skuId) {
    return { ok: false, status: 400, error: "This project does not include a talking-head video lane." };
  }

  const refreshed = await refreshSourceAudioPreflightForCampaign(input.campaignId);
  const record = refreshed ?? envelope.record;
  const preflight = record.sourceAudioPreflight;
  if (preflight?.outcome !== "NOTICE_AND_CHOICE") {
    return {
      ok: false,
      status: 409,
      error:
        preflight?.outcome === "PASS"
          ? "Source audio already passed preflight. No limitation acknowledgement is required."
          : "Source audio is not waiting on a customer limitation choice.",
    };
  }

  const acknowledged = attachSourceAudioAcknowledgement({
    campaign: record,
    skuId,
    outcome: "NOTICE_AND_CHOICE",
    customerNotice: preflight.customerNotice,
  });
  const saved = await upsertCampaignRecord(acknowledged, envelope.clientUserId);
  return { ok: true, record: saved.record };
}
