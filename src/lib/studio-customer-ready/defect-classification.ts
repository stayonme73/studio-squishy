import { studioDefectClassificationV1 } from "@/config/studio-defect-classification-v1";

import type { StudioDefectClass } from "@/config/studio-defect-classification-v1";

export type DefectClassificationInput = {
  class: StudioDefectClass;
  isolated: boolean;
  belongsToSharedLaneOrSystem: boolean;
  blocksCurrentPackage: boolean;
  wouldOpenRabbitHole: boolean;
};

export function classifyDefectFixLevel(
  input: DefectClassificationInput,
): "highest_reusable_level" | "narrow_surgical_patch" {
  const surgicalAllowed =
    input.class === "local" &&
    input.isolated &&
    !input.belongsToSharedLaneOrSystem &&
    input.blocksCurrentPackage &&
    !input.wouldOpenRabbitHole;

  if (surgicalAllowed) {
    return "narrow_surgical_patch";
  }

  return "highest_reusable_level";
}

export function surgicalPatchIsDefault(): boolean {
  return !studioDefectClassificationV1.doNotDefaultToSurgicalFixes;
}
