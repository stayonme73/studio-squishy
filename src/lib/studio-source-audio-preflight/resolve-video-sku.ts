import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import type { CampaignRecord } from "@/config/studio-board";

export type SourceAudioVideoSku =
  | typeof SHORT_FORM_VIDEO_EDITING_SKU
  | typeof CLIP_REPURPOSING_SKU;

/** Factory SKU for source-audio preflight on plan or condensed-offer payment truth. */
export function resolveVideoSkuForSourceAudioPreflight(
  record: CampaignRecord,
): SourceAudioVideoSku | null {
  const selected = record.approvedStudioPlan?.selectedServiceIds ?? [];
  if (selected.includes(SHORT_FORM_VIDEO_EDITING_SKU)) return SHORT_FORM_VIDEO_EDITING_SKU;
  if (selected.includes(CLIP_REPURPOSING_SKU)) return CLIP_REPURPOSING_SKU;

  const paid = record.paymentTruth?.selectedServiceIds ?? [];
  if (
    paid.includes(SHORT_FORM_VIDEO_EDITING_SKU) ||
    paid.includes("short_form_video_editing")
  ) {
    return SHORT_FORM_VIDEO_EDITING_SKU;
  }
  if (paid.includes(CLIP_REPURPOSING_SKU) || paid.includes("clip_repurposing")) {
    return CLIP_REPURPOSING_SKU;
  }
  return null;
}
