export {
  DESIGN_RENDERER_PROOF_SKU,
  FLYER_DESIGN_SPEC_VERSION,
  DESIGN_RENDERER_VERSION,
  FLYER_CANVAS,
} from "./types";
export type {
  FlyerDesignSpec,
  FlyerProjectTruth,
  DesignArtifactIdentity,
  DesignRendererPipelineResult,
  DesignRendererFailureCode,
} from "./types";

export { FLYER_PROOF_CONTRACT, isDesignRendererProofSku } from "./contracts";
export {
  PROOF_PACKAGE_ID,
  PROOF_ARTIFACT_ROOT,
  buildHarborOakFlyerProjectTruth,
  ensureHarborOakLogoMaterial,
} from "./fixtures";
export { validateFlyerDesignSpec } from "./validate-spec";
export {
  reasonFlyerDesignSpec,
  reasonFlyerDesignSpecDeterministic,
} from "./reason";
export { renderFlyerHtml, declaredTextFromSpec } from "./render-html";
export { captureFlyerExports } from "./capture";
export {
  fingerprintDesignSpec,
  fingerprintMaterials,
  nextRenderVersion,
  persistFlyerArtifacts,
  resolveRenderPaths,
  sha256File,
} from "./bind";
export {
  runDesignRendererProofPipeline,
  runDesignRendererJobPipeline,
  runDesignRendererPipeline,
} from "./pipeline";

/** Business-card proof (additive — does not alter flyer lane). */
export {
  DESIGN_RENDERER_BUSINESS_CARD_SKU,
  BUSINESS_CARD_DESIGN_SPEC_VERSION,
  BUSINESS_CARD_RENDERER_VERSION,
  BUSINESS_CARD_CANVAS,
} from "./card-types";
export type {
  BusinessCardDesignSpec,
  BusinessCardProjectTruth,
  BusinessCardArtifactIdentity,
  BusinessCardRendererPipelineResult,
} from "./card-types";
export {
  BUSINESS_CARD_PROOF_CONTRACT,
  isDesignRendererBusinessCardSku,
} from "./card-contracts";
export {
  BUSINESS_CARD_PROOF_PACKAGE_ID,
  BUSINESS_CARD_PROOF_ARTIFACT_ROOT,
  buildHarborOakBusinessCardProjectTruth,
  ensureHarborOakCardLogoMaterial,
} from "./card-fixtures";
export { validateBusinessCardDesignSpec } from "./card-validate";
export {
  reasonBusinessCardDesignSpecDeterministic,
  assertBusinessCardRequiredTruth,
} from "./card-reason";
export {
  renderBusinessCardSideHtml,
  renderBusinessCardPrintHtml,
  declaredTextFromCardSide,
} from "./card-render-html";
export { captureBusinessCardExports } from "./card-capture";
export {
  fingerprintBusinessCardDesignSpec,
  fingerprintBusinessCardMaterials,
  persistBusinessCardArtifacts,
  resolveBusinessCardRenderPaths,
} from "./card-bind";
export {
  runBusinessCardRendererPipeline,
  runBusinessCardProofPipeline,
  runBusinessCardJobPipeline,
} from "./card-pipeline";

/** Menu proof (additive — does not alter flyer/card lanes). */
export {
  DESIGN_RENDERER_MENU_SKU,
  MENU_DESIGN_SPEC_VERSION,
  MENU_RENDERER_VERSION,
  MENU_CANVAS,
  MENU_MAX_SECTIONS,
  MENU_MAX_ITEMS_TOTAL,
  MENU_MIN_FONT_PX,
} from "./menu-types";
export type {
  MenuDesignSpec,
  MenuProjectTruth,
  MenuArtifactIdentity,
  MenuRendererPipelineResult,
} from "./menu-types";
export {
  MENU_PROOF_CONTRACT,
  isDesignRendererMenuSku,
  countMenuItems,
} from "./menu-contracts";
export {
  MENU_PROOF_PACKAGE_ID,
  MENU_PROOF_ARTIFACT_ROOT,
  buildSaltCedarMenuProjectTruthMax,
  buildSaltCedarMenuProjectTruthSmall,
  buildSaltCedarMenuProjectTruthMedium,
  ensureSaltCedarMenuLogoMaterial,
  buildMaxLoadMenuSections,
} from "./menu-fixtures";
export { validateMenuDesignSpec } from "./menu-validate";
export {
  reasonMenuDesignSpecDeterministic,
  assertMenuRequiredTruth,
} from "./menu-reason";
export {
  renderMenuHtml,
  declaredTextFromMenuSpec,
} from "./menu-render-html";
export { captureMenuExports } from "./menu-capture";
export {
  fingerprintMenuDesignSpec,
  fingerprintMenuMaterials,
  persistMenuArtifacts,
  resolveMenuRenderPaths,
} from "./menu-bind";
export { verifyMenuItemCompletenessAndPrices } from "./menu-completeness";
export {
  runMenuRendererPipeline,
  runMenuProofPipeline,
  runMenuJobPipeline,
} from "./menu-pipeline";
