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

/** Service-sheet proof (additive — does not alter flyer/card/menu; primaryTool stays Canva). */
export {
  DESIGN_RENDERER_SERVICE_SHEET_SKU,
  SERVICE_SHEET_DESIGN_SPEC_VERSION,
  SERVICE_SHEET_RENDERER_VERSION,
  SERVICE_SHEET_CANVAS,
  SERVICE_SHEET_MAX_SERVICES,
  SERVICE_SHEET_MIN_FONT_PX,
} from "./service-sheet-types";
export type {
  ServiceSheetDesignSpec,
  ServiceSheetProjectTruth,
  ServiceSheetArtifactIdentity,
  ServiceSheetRendererPipelineResult,
  ServicePriceDisplayMode,
  ServiceRowTruth,
} from "./service-sheet-types";
export {
  SERVICE_SHEET_PROOF_CONTRACT,
  isDesignRendererServiceSheetSku,
  countServiceSheetServices,
} from "./service-sheet-contracts";
export {
  SERVICE_SHEET_PROOF_PACKAGE_ID,
  SERVICE_SHEET_PROOF_ARTIFACT_ROOT,
  FIXTURE_CONTACT_FOR_PRICING_LINE,
  buildHarborOakServiceSheetProjectTruthMax,
  buildMaxLoadServiceSheetRows,
  ensureHarborOakServiceSheetLogoMaterial,
} from "./service-sheet-fixtures";
export {
  mapServicePriceDisplayMode,
  looksLikeInventedPricingFallback,
} from "./service-sheet-map-price";
export { validateServiceSheetDesignSpec } from "./service-sheet-validate";
export {
  reasonServiceSheetDesignSpecDeterministic,
  assertServiceSheetRequiredTruth,
} from "./service-sheet-reason";
export {
  renderServiceSheetHtml,
  declaredTextFromServiceSheetSpec,
} from "./service-sheet-render-html";
export {
  fingerprintServiceSheetDesignSpec,
  fingerprintServiceSheetMaterials,
  persistServiceSheetArtifacts,
  resolveServiceSheetRenderPaths,
} from "./service-sheet-bind";
export { verifyServiceSheetCompletenessAndPrices } from "./service-sheet-completeness";
export {
  runServiceSheetRendererPipeline,
  runServiceSheetProofPipeline,
  runServiceSheetJobPipeline,
} from "./service-sheet-pipeline";

/** Promotion-graphics proof (additive — primaryTool stays Canva; no sealed-lane edits). */
export {
  DESIGN_RENDERER_PROMO_SKU,
  PROMO_DESIGN_SPEC_VERSION,
  PROMO_RENDERER_VERSION,
  PROMO_SQUARE_PLATE,
  PROMO_PORTRAIT_PLATE,
  PROMO_LANDSCAPE_PLATE,
} from "./promo-types";
export type {
  PromoCampaignSetSpec,
  PromoProjectTruth,
  PromoCampaignSetIdentity,
  PromoRendererPipelineResult,
  PromoAssetTruth,
  PromoPlateId,
} from "./promo-types";
export {
  PROMO_PROOF_CONTRACT,
  isDesignRendererPromoSku,
  resolvePromoPlate,
} from "./promo-contracts";
export {
  PROMO_PROOF_PACKAGE_ID,
  PROMO_PROOF_ARTIFACT_ROOT,
  LIVE_INTAKE_PER_ASSET_PURPOSE_GAP,
  buildHarborOakPromoCampaignSetTruth,
  ensureHarborOakPromoLogoMaterial,
} from "./promo-fixtures";
export { validatePromoCampaignSetSpec } from "./promo-validate";
export {
  reasonPromoCampaignSetDeterministic,
  assertPromoRequiredTruth,
} from "./promo-reason";
export {
  renderPromoAssetHtml,
  declaredTextFromPromoAsset,
} from "./promo-render-html";
export {
  fingerprintPromoSharedSpec,
  fingerprintPromoAssetSpec,
  fingerprintPromoMaterials,
  persistPromoCampaignSetArtifacts,
  resolvePromoRenderPaths,
} from "./promo-bind";
export { evaluatePromoSetConsistency } from "./promo-set-qa";
export {
  runPromoRendererPipeline,
  runPromoProofPipeline,
  runPromoJobPipeline,
} from "./promo-pipeline";
export {
  PROMO_INTAKE_PURPOSE_OPTIONS,
  PROMO_INTAKE_PLATE_OPTIONS,
  PROMO_INTAKE_FIELD_IDS,
  PROMO_EXECUTABLE_PLATE_IDS,
  mapPromoAssetsFromIntakeAnswers,
  hasPromoPerGraphicIntakeTruth,
  assertPromoAssetsExecutableForDispatch,
} from "./promo-intake-truth";
