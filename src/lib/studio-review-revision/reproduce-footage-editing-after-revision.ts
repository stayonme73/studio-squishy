/**
 * One included $349 revision — routes back into the frozen factory.
 * Does not reopen stills timing revision or Clip Repurposing.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import { invokeFootageEditingDispatchHook } from "@/lib/studio-dispatch/footage-editing-dispatch-hook";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { runFootageEditingPipeline } from "@/lib/studio-short-form-video-editing/footage-pipeline";

export async function reproduceFootageEditingAfterRevision(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials?: readonly CampaignMaterialItem[];
  runPipeline?: typeof runFootageEditingPipeline;
}) {
  if (input.dispatchRecord.skuId !== SHORT_FORM_VIDEO_EDITING_SKU) {
    return {
      ok: false as const,
      failureCode: "SKU_NOT_SUPPORTED",
      message: "Footage revision only applies to v2-rtu-short-form-video-edit.",
    };
  }
  return invokeFootageEditingDispatchHook({
    ...input,
    applyRevision: true,
  });
}
