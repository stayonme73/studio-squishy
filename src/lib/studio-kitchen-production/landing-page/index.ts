/**
 * Browser-safe landing-page constants and types.
 * Node/Playwright production lives in `./server`.
 */

export {
  LANDING_PAGE_SKU,
  LANDING_PAGE_STRUCTURE_ID,
  LANDING_PAGE_MECHANISM_VERSION,
  LANDING_PAGE_CUSTOMER_READY_STATUS,
} from "./types";
export type {
  LandingPageWorkPacket,
  LandingPageDefinition,
  LandingPageArtifactRecord,
  LandingPublishResult,
  LandingQaCheck,
  LandingCtaKind,
  LandingPageSectionId,
} from "./types";
export {
  APPROVED_SECTION_ORDER,
  STUDIO_CAMPAIGN_PAGE_STRUCTURE,
  assertSectionOrder,
} from "./structure";
export {
  lightEditLandingBodyCopy,
  landingBodyCopyNeedsLightEdit,
} from "./copy-edit";
export type { LandingPageQaPayload } from "./qa";
