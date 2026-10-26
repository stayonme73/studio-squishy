/**
 * Clip Repurposing uses the shared source-audio gate before paid Production.
 * Does not reopen set discovery, ranking, or clip selection.
 */
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { isSourceAudioPreflightSku } from "@/config/studio-source-audio-preflight-v1";
import {
  prepareCustomerSourceAudio,
  sourceAudioWorkDirectory,
} from "@/lib/studio-source-audio-preflight";
import type { SourceAudioPrepareResult, SourceAudioPreflightRecord } from "@/lib/studio-source-audio-preflight";

export function prepareClipRepurposingSourceAudio(input: {
  repoRoot: string;
  campaignId: string;
  sourceAbsolutePath: string;
  sourceRelativePath: string;
  acknowledgement?: SourceAudioPreflightRecord;
}): SourceAudioPrepareResult {
  if (!isSourceAudioPreflightSku(CLIP_REPURPOSING_SKU)) {
    throw new Error("Clip Repurposing must stay on the shared source-audio gate.");
  }
  return prepareCustomerSourceAudio({
    repoRoot: input.repoRoot,
    sourceAbsolutePath: input.sourceAbsolutePath,
    sourceRelativePath: input.sourceRelativePath,
    acknowledgement: input.acknowledgement,
    workDirectory: sourceAudioWorkDirectory(input.repoRoot, input.campaignId),
  });
}
