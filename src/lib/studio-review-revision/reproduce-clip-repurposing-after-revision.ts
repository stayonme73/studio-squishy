/**
 * One included Clip Repurposing set revision.
 * Does not create three independent revision allowances.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { invokeClipRepurposingDispatchHook } from "@/lib/studio-dispatch/clip-repurposing-dispatch-hook";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { ClipCustomerPipelineInput } from "@/lib/studio-clip-repurposing/customer-pipeline";
import type { LongSourceSentences, SetRevision } from "@/lib/studio-clip-repurposing/types";

export async function reproduceClipRepurposingAfterRevision(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials?: readonly CampaignMaterialItem[];
  sourceDurationSeconds?: number;
  sentences?: LongSourceSentences["sentences"];
  discover?: ClipCustomerPipelineInput["discover"];
  produce?: ClipCustomerPipelineInput["produce"];
  setRevision: SetRevision;
}) {
  if (input.dispatchRecord.skuId !== CLIP_REPURPOSING_SKU) {
    return {
      ok: false as const,
      failureCode: "SKU_NOT_SUPPORTED",
      message: "Set revision only applies to v2-rtu-clip-repurposing.",
    };
  }
  return invokeClipRepurposingDispatchHook({
    ...input,
    applyRevision: true,
  });
}
