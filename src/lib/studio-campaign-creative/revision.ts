/**
 * Hero photo revision — preserve CampaignVisualSystem + family; recompute prep/render.
 */

import type { CreativeBrief } from "./contracts";
import {
  runCampaignCreativePipeline,
  type CampaignPipelineMaterialInput,
  type CampaignPipelineResult,
} from "./pipeline";
import type { CampaignCreativeSetIdentity } from "./types";

export async function applyHeroPhotoRevision(input: {
  repoRoot: string;
  priorIdentity: CampaignCreativeSetIdentity;
  brief: CreativeBrief;
  /** New primary photo asset id (e.g. nia-photo-good-1 window). */
  newPrimaryPhotoId: string;
  materials: readonly CampaignPipelineMaterialInput[];
  artifactRootRel: string;
  systemId: string;
}): Promise<CampaignPipelineResult> {
  if (input.newPrimaryPhotoId === input.priorIdentity.heroMaterialId) {
    // Still allow re-render if prepared paths differ; identity hero is source id
  }

  const nextBrief: CreativeBrief = {
    ...input.brief,
    selectedAssetIds: {
      ...input.brief.selectedAssetIds,
      primaryPhotoId: input.newPrimaryPhotoId,
    },
  };

  const result = await runCampaignCreativePipeline({
    repoRoot: input.repoRoot,
    brief: nextBrief,
    systemId: input.systemId,
    materials: input.materials,
    artifactRootRel: input.artifactRootRel,
  });

  if (result.identity.systemId !== input.priorIdentity.systemId) {
    throw new Error("REVISION_BROKE_VISUAL_SYSTEM");
  }
  if (result.identity.familyId !== input.priorIdentity.familyId) {
    // Family may change if new photo orientation differs — allowed but noted.
    // Style (system) must stay. Family change is intentional Machine choice.
  }
  if (result.renderVersion <= input.priorIdentity.renderVersion) {
    throw new Error("REVISION_DID_NOT_BUMP_VERSION");
  }
  if (
    result.identity.materialFingerprint ===
    input.priorIdentity.materialFingerprint
  ) {
    throw new Error("REVISION_MATERIAL_FINGERPRINT_UNCHANGED");
  }

  return result;
}
