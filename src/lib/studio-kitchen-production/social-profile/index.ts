export {
  SOCIAL_PROFILE_PACKAGE_ID,
  SOCIAL_PROFILE_MECHANISM_VERSION,
  SOCIAL_PROFILE_SETUP_SKU,
  SOCIAL_PROFILE_UPDATE_SKU,
} from "./types";
export type {
  SocialPlatform,
  SocialProfileSku,
  SocialProfileMode,
  SocialProfileWorkPacket,
  SocialProfileMutation,
  SocialProfileSnapshot,
  PlatformCapabilityRecord,
  PlatformProductionVerdict,
  SocialCredentialRef,
} from "./types";
export {
  loadAuthoritativeRmJ002Contract,
  loadAuthoritativeRmJ008Contract,
} from "./contracts";
export type { AuthoritativeSocialProfileContract } from "./contracts";
export {
  FACEBOOK_PAGE_CAPABILITY,
  INSTAGRAM_CAPABILITY,
  TIKTOK_CAPABILITY,
  FACEBOOK_ABOUT_MAX_CHARS,
  getPlatformCapability,
  platformHardGateMatrix,
  deriveSkuReadinessFromPlatforms,
} from "./capability";
export {
  validateSocialProfileWorkPacket,
  planSupportedMutations,
  sharedSpineSteps,
  resolveFulfillment,
} from "./work-packet";
export type { SocialPacketValidation, SocialFulfillment } from "./work-packet";
export {
  planPlatformAdapter,
  verifyReadback,
  setupVsUpdateBoundary,
} from "./adapters";
export { copyLimitConflict, facebookAboutFits } from "./copy";
export {
  redactSecretsForLog,
  assertAccountIdSeparatedFromCredential,
  SOCIAL_SECURITY_RULES,
} from "./security";
export {
  SOCIAL_PROFILE_KIT_READINESS_STATUS,
  kitDeliverablesForMode,
  evaluateKitReadiness,
  buildPlatformFieldChecklist,
  platformSupportsCoverAsset,
} from "./kit-delivery";
