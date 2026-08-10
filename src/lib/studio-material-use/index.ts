export { studioMaterialUseV1 } from "@/config/studio-material-use-v1";
export type {
  MaterialUseAuthorizationBasis,
  StudioMaterialUseOutcome,
} from "@/config/studio-material-use-v1";

export {
  applyMaterialUseDecisionToItem,
  buildMaterialContentFingerprint,
  buildUseAuthorization,
  categoryRequiresUseClearance,
  evaluateMaterialUseDecision,
  isApprovedForUse,
  jobHasUnresolvedMaterialUseHold,
  listProductionBlockingMaterials,
  materialBlocksProductionUse,
  priorApprovalMatchesCurrentContent,
  scanMaterialText,
} from "./evaluate";

export type {
  MaterialUseAuthorization,
  MaterialUseBlockCode,
  MaterialUseDecision,
} from "./types";
