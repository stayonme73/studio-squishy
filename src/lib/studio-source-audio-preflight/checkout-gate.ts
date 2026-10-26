import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import { SOURCE_AUDIO_CUSTOMER_NOTICE } from "@/config/studio-source-audio-preflight-v1";
import type { CampaignRecord } from "@/config/studio-board";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import { mapClipRepurposingJobTruthFromJob } from "@/lib/studio-dispatch/map-clip-repurposing-job-truth";
import { mapFootageEditingJobTruthFromJob } from "@/lib/studio-dispatch/map-footage-editing-job-truth";

import { customerAcknowledgedSourceLimitation } from "./acknowledgement";
import { evaluateSourceAudioGate } from "./evaluate";

export type SourceAudioCheckoutGateResult =
  | { ok: true }
  | { ok: false; error: "source_audio_preflight_required"; message: string };

export async function evaluateSourceAudioCheckoutGate(input: {
  repoRoot: string;
  campaign?: CampaignRecord;
  selectedServiceIds: readonly string[];
}): Promise<SourceAudioCheckoutGateResult> {
  const footageSelected = input.selectedServiceIds.includes(SHORT_FORM_VIDEO_EDITING_SKU);
  const clipSelected = input.selectedServiceIds.includes(CLIP_REPURPOSING_SKU);
  if (!footageSelected && !clipSelected) {
    return { ok: true };
  }
  if (!input.campaign) {
    return {
      ok: false,
      error: "source_audio_preflight_required",
      message:
        "Upload your talking-head recording so The Studio can check the audio before payment.",
    };
  }

  const materials =
    (await readMaterialsEnvelope(input.campaign.campaignId))?.items ?? [];
  const truth = clipSelected
    ? mapClipRepurposingJobTruthFromJob({
        repoRoot: input.repoRoot,
        campaign: input.campaign,
        materials,
      })
    : mapFootageEditingJobTruthFromJob({
        repoRoot: input.repoRoot,
        campaign: input.campaign,
        materials,
      });
  if (!truth.ok) {
    return {
      ok: false,
      error: "source_audio_preflight_required",
      message:
        "Upload one rights-cleared talking-head recording before payment. The Studio checks the audio first.",
    };
  }

  const gate = evaluateSourceAudioGate({
    sourceAbsolutePath: truth.sourceAbsolutePath,
  });
  if (gate.outcome === "REPLACEMENT_REQUIRED") {
    return {
      ok: false,
      error: "source_audio_preflight_required",
      message: gate.reason,
    };
  }
  if (
    gate.outcome === "NOTICE_AND_CHOICE" &&
    !customerAcknowledgedSourceLimitation(
      input.campaign.sourceAudioPreflight,
      gate.outcome,
    )
  ) {
    return {
      ok: false,
      error: "source_audio_preflight_required",
      message: SOURCE_AUDIO_CUSTOMER_NOTICE,
    };
  }
  return { ok: true };
}
