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

/** sm-001-monthly — cycle-keyed wrapper + DISPATCH-HOOK-1 Machine path. */
export {
  DESIGN_RENDERER_SM_001_MONTHLY_SKU,
  SM_001_MONTHLY_PROOF_PACKAGE_ID,
  SM_001_MONTHLY_WRAPPER_VERSION,
} from "./sm-001-monthly-types";
export type {
  Sm001MonthlyCycleIdentity,
  Sm001MonthlyProjectTruth,
  Sm001MonthlyCycleReceipt,
  Sm001MonthlyPipelineResult,
  Sm001MonthlyFailureCode,
} from "./sm-001-monthly-types";
export {
  SM_001_MONTHLY_PROOF_CONTRACT,
  isDesignRendererSm001MonthlySku,
} from "./sm-001-monthly-contracts";
export {
  validateSm001MonthlyCycleIdentity,
  validateSm001MonthlyPlannedPostCount,
  intersectCycleWindowWithCampaignTiming,
  assertNeverMintsCycleId,
  sanitizeProductionCycleIdForPath,
} from "./sm-001-monthly-cycle";
export {
  fingerprintSm001MonthlyProduction,
  fingerprintSm001MonthlyFromTruth,
} from "./sm-001-monthly-fingerprint";
export {
  SM_001_MONTHLY_PROOF_ARTIFACT_ROOT,
  SM_001_MONTHLY_PROOF_SCOPE_NOTE,
  SM_001_MONTHLY_PROOF_CYCLE_A,
  SM_001_MONTHLY_PROOF_CYCLE_B,
  buildHarborOakSm001MonthlyProjectTruth,
} from "./sm-001-monthly-fixtures";
export {
  runSm001MonthlyRendererPipeline,
  runSm001MonthlyProofPipeline,
  resolveSm001MonthlyCycleArtifactRoot,
} from "./sm-001-monthly-pipeline";

/** ma-001 Promotion Pack orchestrator — PROOF-1 only (no remap / no dispatch). */
export {
  DESIGN_RENDERER_MA_001_SKU,
  MA_001_PACK_SPEC_VERSION,
  MA_001_PACK_ORCHESTRATOR_VERSION,
  MA_001_SUPPORTED_KINDS,
} from "./ma-001-types";
export type {
  Ma001SupportedKind,
  Ma001LockedPackMemberCount,
  Ma001PlannedPackMember,
  Ma001PackProjectTruth,
  Ma001PackIdentity,
  Ma001PackPipelineResult,
  Ma001MemberResult,
  Ma001PromotionGraphicMemberTruth,
} from "./ma-001-types";
export {
  MA_001_PROOF_CONTRACT,
  isDesignRendererMa001Sku,
  isMa001SupportedKind,
  producerFamilyForKind,
  validateMa001PackComposition,
} from "./ma-001-contracts";
export {
  MA_001_PROOF_PACKAGE_ID,
  MA_001_PROOF_ARTIFACT_ROOT,
  buildHarborOakMa001MaxMixedPackTruth,
  buildHarborOakMa001N1FlyerPackTruth,
  buildMa001UnsupportedKindPackTruth,
  ensureHarborOakMa001LogoMaterial,
} from "./ma-001-fixtures";
export { fingerprintMa001Pack } from "./ma-001-fingerprint";
export { evaluateMa001PackQa } from "./ma-001-pack-qa";
export { persistMa001PackArtifacts } from "./ma-001-bind";
export { runMa001PromotionGraphicMemberAdapter } from "./ma-001-promo-member-adapter";
export {
  runMa001PackRendererPipeline,
  runMa001PackProofPipeline,
} from "./ma-001-pipeline";

/** ma-001 INTAKE-TRUTH-1 — composition locked before payment (no remap / no dispatch). */
export {
  MA_001_INTAKE_TRUTH_PACKAGE_ID,
  MA_001_CUSTOMER_KIND_OPTIONS,
  MA_001_CUSTOMER_CAMPAIGN_GRAPHIC_FORMAT_OPTIONS,
  MA_001_INHERITED_PLATE_BY_KIND,
  MA_001_MEMBER_CONTENT_INHERITANCE,
  MA_001_COMPOSITION_FIELD_IDS,
  MA_001_FORBIDDEN_PACK_COPY_FIELDS,
  MA_001_AMBIGUOUS_LEGACY_FIELDS,
  MA_001_COMPOSITION_CUSTOMER_SCHEMA,
  ma001MemberIdFor,
  mapMa001CompositionFromLiveTruth,
  buildMa001PackManifestSeed,
  ma001LiveCompositionFromFlatAnswers,
  assertMa001CompositionReadyForPayment,
} from "./ma-001-intake-truth";
export type {
  Ma001CustomerKindOption,
  Ma001CustomerCampaignGraphicFormatOption,
  Ma001LiveMemberAnswer,
  Ma001LiveCompositionInput,
  Ma001CompositionLiveTruth,
  Ma001PackManifestSeed,
  Ma001CompositionMapResult,
  Ma001PaymentReadinessResult,
} from "./ma-001-intake-truth";

/** ma-001 COMPOSITION-PAYMENT-GATE-1 — Plan/Checkout consume locked composition. */
export {
  MA_001_COMPOSITION_PAYMENT_GATE_PACKAGE_ID,
  fingerprintMa001CompositionTruth,
  normalizeMa001CompositionForPayment,
  sealMa001CompositionForPayment,
  ma001CompositionSealsMatch,
  evaluateMa001CompositionPaymentGate,
  customerFacingCompositionLines,
  assertMa001CompositionUnchangedAfterCheckoutAuthority,
  assertMa001PlanCompositionFresh,
} from "./ma-001-composition-payment-gate";
export type { Ma001CompositionPaymentSeal } from "./ma-001-composition-payment-gate";

/** ma-001 POSTPAY-COMPOSITION-DISPATCH-STRUCTURE-1 — paid seal → durable pack structure. */
export {
  MA_001_POSTPAY_COMPOSITION_DISPATCH_STRUCTURE_PACKAGE_ID,
  buildMa001PostPayDispatchStructureFromPaymentSeal,
  buildMa001PostPayDispatchStructureFromCampaign,
  assertMa001PostPayStructureMatchesPaymentSeal,
  assertMa001PostPayStructureDispatchReady,
  assertMa001PostPayStructureNoSilentMemberMutation,
  ensureMa001PostPayDispatchStructureOnCampaign,
} from "./ma-001-postpay-composition-dispatch-structure";
export type {
  Ma001PostPayDispatchMember,
  Ma001PostPayDispatchStructure,
  Ma001PostPayStructureFailureCode,
  Ma001PostPayStructureBuildResult,
} from "./ma-001-postpay-composition-dispatch-structure";

/** rm-j002 Profile Setup Kit composer — PROOF-1 only (no remap / no Canva / no mutation). */
export {
  DESIGN_RENDERER_RM_J002_SKU,
  RM_J002_KIT_SPEC_VERSION,
  RM_J002_KIT_ORCHESTRATOR_VERSION,
  RM_J002_AVATAR_VISUAL_VERSION,
  RM_J002_COVER_VISUAL_VERSION,
  RM_J002_COPY_CHECKLIST_PRESENTATION_VERSION,
  RM_J002_AVATAR_PLATE,
  RM_J002_FACEBOOK_COVER_PLATE,
} from "./rm-j002-types";
export { writeScopedProfileCopy } from "./rm-j002-members";
export type {
  RmJ002Platform,
  RmJ002MemberKind,
  RmJ002MemberId,
  RmJ002PlannedKitMember,
  RmJ002KitProjectTruth,
  RmJ002KitIdentity,
  RmJ002KitPipelineResult,
  RmJ002MemberResult,
} from "./rm-j002-types";
export {
  RM_J002_PROOF_CONTRACT,
  recipeForPlatform,
  isDesignRendererRmJ002Sku,
  isRmJ002Platform,
  validateRmJ002KitComposition,
} from "./rm-j002-contracts";
export {
  RM_J002_PROOF_PACKAGE_ID,
  RM_J002_PROOF_ARTIFACT_ROOT,
  buildRmJ002KitTruth,
  buildRmJ002UnsupportedInstagramCoverTruth,
  ensureHarborOakRmJ002LogoMaterial,
} from "./rm-j002-fixtures";
export { fingerprintRmJ002Kit } from "./rm-j002-fingerprint";
export { evaluateRmJ002KitQa } from "./rm-j002-kit-qa";
export { persistRmJ002KitArtifacts } from "./rm-j002-bind";
export {
  runRmJ002KitComposerPipeline,
  runRmJ002KitProofPipeline,
} from "./rm-j002-pipeline";

/** rm-j002 intake + payment lock — platform kit sealed before checkout (no remap). */
export {
  RM_J002_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
  RM_J002_CUSTOMER_PLATFORM_OPTIONS,
  RM_J002_KIT_LOCK_FIELD_IDS,
  RM_J002_FORBIDDEN_CREDENTIAL_INTAKE_FIELDS,
  mapRmJ002KitLockFromLiveTruth,
  rmJ002LiveKitLockFromFlatAnswers,
  assertRmJ002KitReadyForPayment,
  buildRmJ002KitManifestSeed,
  customerFacingRmJ002KitLines,
} from "./rm-j002-intake-truth";
export type {
  RmJ002LiveKitLockInput,
  RmJ002KitLiveTruth,
  RmJ002KitManifestSeed,
  RmJ002CustomerPlatformOption,
} from "./rm-j002-intake-truth";
export {
  RM_J002_KIT_PAYMENT_GATE_PACKAGE_ID,
  fingerprintRmJ002KitLiveTruth,
  normalizeRmJ002KitForPayment,
  sealRmJ002KitForPayment,
  evaluateRmJ002KitPaymentGate,
  assertRmJ002KitUnchangedAfterCheckoutAuthority,
  assertRmJ002PlanKitFresh,
  rmJ002KitSealsMatch,
} from "./rm-j002-kit-payment-gate";
export type { RmJ002KitPaymentSeal } from "./rm-j002-kit-payment-gate";

/** rm-j002 POSTPAY-KIT-DISPATCH-STRUCTURE-1 — paid seal → durable kit structure. */
export {
  RM_J002_POSTPAY_KIT_DISPATCH_STRUCTURE_PACKAGE_ID,
  buildRmJ002PostPayDispatchStructureFromPaymentSeal,
  buildRmJ002PostPayDispatchStructureFromCampaign,
  assertRmJ002PostPayStructureMatchesPaymentSeal,
  assertRmJ002PostPayStructureDispatchReady,
  assertRmJ002PostPayStructureNoSilentKitMutation,
  ensureRmJ002PostPayDispatchStructureOnCampaign,
} from "./rm-j002-postpay-kit-dispatch-structure";
export type {
  RmJ002PostPayProductionRole,
  RmJ002PostPayDispatchMember,
  RmJ002PostPayDispatchStructure,
  RmJ002PostPayStructureFailureCode,
  RmJ002PostPayStructureBuildResult,
} from "./rm-j002-postpay-kit-dispatch-structure";

/** rm-j008 Profile Update Kit composer — PROOF-1 only (no remap / no Canva / no mutation). */
export {
  DESIGN_RENDERER_RM_J008_SKU,
  RM_J008_KIT_SPEC_VERSION,
  RM_J008_KIT_ORCHESTRATOR_VERSION,
} from "./rm-j008-types";
export type {
  RmJ008Platform,
  RmJ008MemberKind,
  RmJ008MemberId,
  RmJ008PlannedKitMember,
  RmJ008BeforeState,
  RmJ008AfterState,
  RmJ008UpdateKitProjectTruth,
  RmJ008ChangeSheetRow,
  RmJ008KitIdentity,
  RmJ008KitPipelineResult,
  RmJ008MemberResult,
} from "./rm-j008-types";
export {
  RM_J008_PROOF_CONTRACT,
  recipeForUpdatePlatform,
  isDesignRendererRmJ008Sku,
  isRmJ008Platform,
  validateRmJ008KitComposition,
  validateRmJ008BeforeState,
} from "./rm-j008-contracts";
export {
  RM_J008_PROOF_PACKAGE_ID,
  RM_J008_PROOF_ARTIFACT_ROOT,
  buildRmJ008UpdateKitTruth,
  buildRmJ008UnsupportedInstagramCoverTruth,
  buildRmJ008PartialBioOnlyTruth,
  ensureHarborOakRmJ008LogoMaterial,
} from "./rm-j008-fixtures";
export { mapRmJ008AfterToRmJ002Truth } from "./rm-j008-after-adapter";
export { buildRmJ008ChangeSheetRows } from "./rm-j008-change-sheet";
export { fingerprintRmJ008UpdateKit } from "./rm-j008-fingerprint";
export { evaluateRmJ008KitQa } from "./rm-j008-kit-qa";
export { persistRmJ008KitArtifacts } from "./rm-j008-bind";
export {
  runRmJ008KitComposerPipeline,
  runRmJ008KitProofPipeline,
} from "./rm-j008-pipeline";

/** rm-j008 intake + payment lock — Update Kit sealed before checkout (no remap). */
export {
  RM_J008_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
  RM_J008_CUSTOMER_PLATFORM_OPTIONS,
  RM_J008_KIT_LOCK_FIELD_IDS,
  RM_J008_FORBIDDEN_CREDENTIAL_INTAKE_FIELDS,
  mapRmJ008KitLockFromLiveTruth,
  rmJ008LiveKitLockFromFlatAnswers,
  assertRmJ008KitReadyForPayment,
  buildRmJ008KitManifestSeed,
  customerFacingRmJ008KitLines,
} from "./rm-j008-intake-truth";
export type {
  RmJ008LiveKitLockInput,
  RmJ008KitLiveTruth,
  RmJ008KitManifestSeed,
  RmJ008CustomerPlatformOption,
} from "./rm-j008-intake-truth";
export {
  RM_J008_KIT_PAYMENT_GATE_PACKAGE_ID,
  fingerprintRmJ008KitLiveTruth,
  normalizeRmJ008KitForPayment,
  sealRmJ008KitForPayment,
  evaluateRmJ008KitPaymentGate,
  assertRmJ008KitUnchangedAfterCheckoutAuthority,
  assertRmJ008PlanKitFresh,
  rmJ008KitSealsMatch,
} from "./rm-j008-kit-payment-gate";
export type { RmJ008KitPaymentSeal } from "./rm-j008-kit-payment-gate";

/** rm-j008 POSTPAY-KIT-DISPATCH-STRUCTURE-1 — paid seal → durable Update Kit structure. */
export {
  RM_J008_POSTPAY_KIT_DISPATCH_STRUCTURE_PACKAGE_ID,
  buildRmJ008PostPayDispatchStructureFromPaymentSeal,
  buildRmJ008PostPayDispatchStructureFromCampaign,
  assertRmJ008PostPayStructureMatchesPaymentSeal,
  assertRmJ008PostPayStructureDispatchReady,
  assertRmJ008PostPayStructureNoSilentKitMutation,
  ensureRmJ008PostPayDispatchStructureOnCampaign,
} from "./rm-j008-postpay-kit-dispatch-structure";
export type {
  RmJ008PostPayProductionRole,
  RmJ008PostPayDispatchMember,
  RmJ008PostPayDispatchStructure,
  RmJ008PostPayStructureFailureCode,
  RmJ008PostPayStructureBuildResult,
} from "./rm-j008-postpay-kit-dispatch-structure";

/** bf-001 Brand Identity Refresh package composer — PROOF-1 only (no remap / Canva OFF). */
export {
  DESIGN_RENDERER_BF_001_SKU,
  BF_001_PACKAGE_SPEC_VERSION,
  BF_001_ORCHESTRATOR_VERSION,
  BF_001_SHEET_VISUAL_VERSION,
  BF_001_GRAPHIC_VISUAL_VERSION,
  BF_001_SHEET_PLATE,
  BF_001_PROFILE_PLATE,
  BF_001_COVER_PLATE,
  BF_001_STUDIO_SAFE_FONTS,
} from "./bf-001-types";
export type {
  Bf001GraphicKind,
  Bf001MemberId,
  Bf001MemberKind,
  Bf001PlannedMember,
  Bf001LogoMaterial,
  Bf001HexSwatch,
  Bf001FontRecommendation,
  Bf001LogoUsageRules,
  Bf001RefreshProjectTruth,
  Bf001PackageIdentity,
  Bf001PackagePipelineResult,
  Bf001MemberResult,
} from "./bf-001-types";
export {
  BF_001_PROOF_CONTRACT,
  isDesignRendererBf001Sku,
  isBf001StudioSafeFont,
  plateForGraphicKind,
  recipeForGraphicKind,
  validateBf001PackageComposition,
} from "./bf-001-contracts";
export {
  BF_001_PROOF_PACKAGE_ID,
  BF_001_PROOF_ARTIFACT_ROOT,
  buildBf001RefreshTruth,
  buildBf001ProfileAndCoverTruth,
  ensureHarborOakBf001LogoMaterial,
} from "./bf-001-fixtures";
export { fingerprintBf001Package } from "./bf-001-fingerprint";
export { evaluateBf001PackageQa } from "./bf-001-package-qa";
export { persistBf001PackageArtifacts } from "./bf-001-bind";
export {
  runBf001PackageComposerPipeline,
  runBf001PackageProofPipeline,
} from "./bf-001-pipeline";

/** bf-001 intake + payment lock — refresh package sealed before checkout (no remap). */
export {
  BF_001_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
  BF_001_CUSTOMER_GRAPHIC_KIND_OPTIONS,
  BF_001_PACKAGE_LOCK_FIELD_IDS,
  BF_001_FORBIDDEN_SCOPE_INTAKE_FIELDS,
  BF_001_AMBIGUOUS_LEGACY_FIELDS,
  mapBf001PackageLockFromLiveTruth,
  bf001LivePackageLockFromFlatAnswers,
  assertBf001PackageReadyForPayment,
  buildBf001PackageManifestSeed,
  customerFacingBf001PackageLines,
} from "./bf-001-intake-truth";
export type {
  Bf001LivePackageLockInput,
  Bf001PackageLiveTruth,
  Bf001PackageManifestSeed,
  Bf001PackageStartingPointIdentity,
  Bf001PackageFailureCode,
  Bf001PackageMapResult,
  Bf001PaymentReadinessResult,
  Bf001CustomerGraphicKindOption,
} from "./bf-001-intake-truth";
export {
  BF_001_PACKAGE_PAYMENT_GATE_PACKAGE_ID,
  fingerprintBf001PackageLiveTruth,
  normalizeBf001PackageForPayment,
  sealBf001PackageForPayment,
  evaluateBf001PackagePaymentGate,
  assertBf001PackageUnchangedAfterCheckoutAuthority,
  assertBf001PlanPackageFresh,
  bf001PackageSealsMatch,
} from "./bf-001-kit-payment-gate";
export type { Bf001PackagePaymentSeal } from "./bf-001-kit-payment-gate";

/** bf-001 POSTPAY-PACKAGE-DISPATCH-STRUCTURE-1 — paid seal → durable refresh structure. */
export {
  BF_001_POSTPAY_PACKAGE_DISPATCH_STRUCTURE_PACKAGE_ID,
  buildBf001PostPayDispatchStructureFromPaymentSeal,
  buildBf001PostPayDispatchStructureFromCampaign,
  assertBf001PostPayStructureMatchesPaymentSeal,
  assertBf001PostPayStructureDispatchReady,
  assertBf001PostPayStructureNoSilentPackageMutation,
  ensureBf001PostPayDispatchStructureOnCampaign,
} from "./bf-001-postpay-kit-dispatch-structure";
export type {
  Bf001PostPayProductionRole,
  Bf001PostPayDispatchMember,
  Bf001PostPayDispatchStructure,
  Bf001PostPayStructureFailureCode,
  Bf001PostPayStructureBuildResult,
} from "./bf-001-postpay-kit-dispatch-structure";
