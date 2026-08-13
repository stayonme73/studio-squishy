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

/**
 * Social-posts proof (additive — primaryTool stays Canva; no dispatch/observer
 * wiring; no sealed-lane edits).
 */
export {
  DESIGN_RENDERER_SOCIAL_POSTS_SKU,
  SOCIAL_POSTS_DESIGN_SPEC_VERSION,
  SOCIAL_POSTS_RENDERER_VERSION,
  SOCIAL_POSTS_EXACT_COUNT,
  SOCIAL_POSTS_SQUARE_PLATE,
  SOCIAL_POST_ROLE_ANGLES,
  SOCIAL_POST_TRUST_ROLE_ANGLE,
} from "./social-posts-types";
export type {
  DesignRendererSocialPostsSku,
  SocialPostsSetSpec,
  SocialPostsProjectTruth,
  SocialPostsSetIdentity,
  SocialPostsRendererPipelineResult,
  SocialPostsRendererFailureCode,
  SocialPostMemberTruth,
  SocialPostAssetSpec,
  SocialPostAssetArtifact,
  SocialPostCaption,
  SocialPostingOrderEntry,
  SocialPostOrderIndex,
  SocialPostRoleAngle,
  SocialPostPlateId,
  SocialPostsQuad,
} from "./social-posts-types";
export {
  SOCIAL_POSTS_PROOF_CONTRACT,
  isDesignRendererSocialPostsSku,
  resolveSocialPostPlate,
} from "./social-posts-contracts";
export {
  SOCIAL_POSTS_INTAKE_FIELD_IDS,
  SOCIAL_POSTS_ROLE_ANGLE_CLASSIFICATION,
  SOCIAL_POSTS_LIVE_PLATFORM_OPTIONS,
  SOCIAL_POSTS_LIVE_PURPOSE_OPTIONS,
  SOCIAL_POSTS_EXECUTABLE_PLATE_IDS,
  mapSocialPostsSetStructureFromIntakeAnswers,
  hasSocialPostsSetStructureIntakeTruth,
  assertSocialPostsStructureExecutableForDispatch,
  assignStudioProductionSocialPostMembers,
  resolveSocialPostsPlatformPlacement,
  isProvenSocialPostRoleAngle,
} from "./social-posts-intake-truth";
export type {
  SocialPostsSetStructureTruth,
  SocialPostsIntakeStructureResult,
  SocialPostsRoleAngleAuthority,
  SocialPostsLivePlatformOption,
} from "./social-posts-intake-truth";

export {
  SOCIAL_POSTS_PROOF_PACKAGE_ID,
  SOCIAL_POSTS_PROOF_ARTIFACT_ROOT,
  SOCIAL_POSTS_DISPATCH_WIRING_SCOPE_NOTE,
  SOCIAL_POSTS_FIXTURE_PLATFORM_LABEL,
  buildHarborOakSocialPostsSetTruth,
  ensureHarborOakSocialPostsLogoMaterial,
} from "./social-posts-fixtures";
export { validateSocialPostsSetSpec } from "./social-posts-validate";
export {
  reasonSocialPostsSetDeterministic,
  assertSocialPostsRequiredTruth,
  socialPostAuthorizedPurpose,
} from "./social-posts-reason";
export {
  reasonSocialPostCaptionsDeterministic,
  assertCaptionsBoundToPosts,
  validateCaptionFacts,
} from "./social-posts-captions";
export type {
  SocialPostCaptionValidation,
  SocialPostCaptionBindingResult,
} from "./social-posts-captions";
export {
  renderSocialPostAssetHtml,
  declaredTextFromSocialPostAsset,
} from "./social-posts-render-html";
export {
  fingerprintSocialPostsSharedSpec,
  fingerprintSocialPostAssetSpec,
  fingerprintSocialPostsMaterials,
  fingerprintSocialPostCaptions,
  fingerprintSocialPostingOrder,
  persistSocialPostsSetArtifacts,
  resolveSocialPostsRenderPaths,
} from "./social-posts-bind";
export { evaluateSocialPostsSetConsistency } from "./social-posts-set-qa";
export type { SocialPostsSetQaResult } from "./social-posts-set-qa";
export {
  runSocialPostsRendererPipeline,
  runSocialPostsProofPipeline,
  runSocialPostsJobPipeline,
} from "./social-posts-pipeline";

/**
 * sm-001 Launch Set (sealed social-posts lane untouched). SM-001-DISPATCH-HOOK-1
 * remaps primaryTool and wires the dd:{jobId} hook for sm-001 only.
 */
export {
  DESIGN_RENDERER_SM_001_SKU,
  SM_001_DESIGN_SPEC_VERSION,
  SM_001_RENDERER_VERSION,
  SM_001_PLANNED_POST_COUNTS,
  SM_001_SQUARE_PLATE,
  SM_001_LAYOUT_TEMPLATES,
} from "./sm-001-types";
export type {
  DesignRendererSm001Sku,
  Sm001SetSpec,
  Sm001ProjectTruth,
  Sm001SetIdentity,
  Sm001RendererPipelineResult,
  Sm001RendererFailureCode,
  Sm001MemberTruth,
  Sm001AssetSpec,
  Sm001AssetArtifact,
  Sm001Caption,
  Sm001PostingOrderEntry,
  Sm001CalendarEntry,
  Sm001CalendarManifest,
  Sm001LayoutTemplate,
  Sm001PlannedPostCount,
  Sm001PlannedPostCountSelection,
  Sm001PlateId,
  Sm001TimingConstraints,
  Sm001MaterialRef,
  Sm001DesignLayer,
  Sm001OutputMode,
} from "./sm-001-types";
export {
  SM_001_PROOF_CONTRACT,
  isDesignRendererSm001Sku,
  isSm001PlannedPostCount,
  resolveSm001ExecutablePlate,
} from "./sm-001-contracts";
export {
  collectSm001NSelectSignals,
  selectSm001PlannedPostCount,
  assertPlannedPostCountLocked,
} from "./sm-001-n-select";
export type { Sm001NSelectInput } from "./sm-001-n-select";
export {
  SM_001_PROOF_PACKAGE_ID,
  SM_001_PROOF_ARTIFACT_ROOT,
  SM_001_PROOF_SCOPE_NOTE,
  assignSm001MembersForCount,
  buildHarborOakSm001ProjectTruth,
  ensureHarborOakSm001LogoMaterial,
} from "./sm-001-fixtures";
export type { Sm001FixtureRichness } from "./sm-001-fixtures";
export {
  reasonSm001SetDeterministic,
  assertSm001RequiredTruth,
  sm001AuthorizedPurpose,
  SM_001_SOCIAL_REUSED_TEMPLATES,
  SM_001_EXTENSION_TEMPLATES,
  SM_001_BRAND_ONLY_TEMPLATE,
} from "./sm-001-reason";
export {
  reasonSm001CaptionsDeterministic,
  assertSm001CaptionsBoundToPosts,
  validateSm001CaptionFacts,
} from "./sm-001-captions";
export type { Sm001CaptionBindingResult } from "./sm-001-captions";
export {
  buildSm001CalendarManifest,
  suggestSm001Dates,
  assertSuggestedDatesObeyConstraints,
  fingerprintSm001Calendar,
} from "./sm-001-calendar";
export type { Sm001CalendarBuildResult } from "./sm-001-calendar";
export {
  renderSm001AssetHtml,
  declaredTextFromSm001Asset,
} from "./sm-001-render-html";
export { validateSm001SetSpec } from "./sm-001-validate";
export type { Sm001ValidateResult } from "./sm-001-validate";
export { evaluateSm001SetConsistency } from "./sm-001-set-qa";
export type { Sm001SetQaResult } from "./sm-001-set-qa";
export {
  fingerprintSm001SharedSpec,
  fingerprintSm001AssetSpec,
  fingerprintSm001Materials,
  fingerprintSm001Captions,
  fingerprintSm001PostingOrder,
  persistSm001SetArtifacts,
  resolveSm001RenderPaths,
} from "./sm-001-bind";
export type { Sm001AssetRenderInput } from "./sm-001-bind";
export {
  runSm001RendererPipeline,
  runSm001ProofPipeline,
  runSm001JobPipeline,
} from "./sm-001-pipeline";
/** sm-001 INTAKE-TRUTH-1 — live set structure consumed by the sm-001 dispatch hook. */
export {
  SM_001_LAYOUT_TEMPLATE_CLASSIFICATION,
  SM_001_AUTHORIZED_LIVE_TRUTH_KEYS,
  SM_001_EXECUTABLE_PLATE_IDS,
  mapSm001SetStructureFromLiveTruth,
  hasSm001SetStructureLiveTruth,
  assertSm001StructureExecutableForDispatch,
  detectSm001UnauthorizedFields,
  resolveSm001TimingConstraints,
  isProvenSm001LayoutTemplate,
} from "./sm-001-intake-truth";
export type {
  Sm001LiveTruthInput,
  Sm001SetStructureTruth,
  Sm001IntakeStructureResult,
  Sm001IntakeStructureFailureCode,
  Sm001DispatchReadinessResult,
  Sm001LayoutTemplateAuthority,
  Sm001TimingSource,
} from "./sm-001-intake-truth";
