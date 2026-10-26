/**
 * PROJECT ALPHA — Hybrid Creative Certification
 *
 * Today is not merely “turn on image generation.”
 * Carry forward yesterday’s operating doctrine. Certify a real
 * image_plus_renderer path and pixel-level Creative Director / Vision QA.
 * Do not reopen Studio-wide orchestration unless a real blocking defect
 * is discovered.
 */

import { studioProjectAlphaV1 } from "./studio-project-alpha-v1";
import { studioStudioWideOrchestrationV1 } from "./studio-studio-wide-orchestration-v1";

export const studioProjectAlphaHybridCreativeCertificationV1 = {
  packageId: "STUDIO-OPERATING-PROJECT-ALPHA-HYBRID-CREATIVE-CERTIFICATION-1",
  schemaVersion: 1 as const,
  room: 4 as const,
  intelligenceVersion: studioProjectAlphaV1.intelligenceVersion,
  preserves: {
    orchestrationPackageId: studioStudioWideOrchestrationV1.packageId,
    designQualityPackageId: studioProjectAlphaV1.packageId,
    intelligenceVersion: "design-intelligence-v1.2.1" as const,
  },
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotOpenOwnerReview: true as const,
  doNotReopenOrchestrationUnlessBlockingDefect: true as const,
  scoutMayNotHandDrawCustomerArt: true as const,
  doNotAskOwnerForExtraDirectionToForcePass: true as const,
  customerOneRemintOnlyAfterCapabilityProves: true as const,

  customerOne: {
    v4: "maya-like-failure-evidence" as const,
    v7: "sparse-top-heavy-phase-1-failure-evidence" as const,
    v8toV10: "duplicate-remint-failure-evidence" as const,
    v11: "visual-defect-evidence" as const,
    v12: "current-renderer-only-correction" as const,
    revisionUsed: 0 as const,
    reviewUnopened: true as const,
  },

  northStar:
    "We are not building a better flyer generator. We are building The Studio’s reusable creative-production system so Machine can coordinate whatever supported service the customer buys and involve Owner only for genuine judgment.",

  customerExperienceRule:
    "Ask once. Remember it. Use it. Do not make the customer manage The Studio.",

  primaryObjective:
    "Certify a real end-to-end image_plus_renderer path and pixel-level Creative Director / Vision QA before Customer-One is reminted.",

  startingHonestLimits: [
    "image_plus_renderer is a real route, not yet a live generator",
    "OpenAI image generation / vision / Studio Manager are EVALUATE and fail closed",
    "Creative Director does not yet inspect the composed PNG at pixel level",
    "Customer-One V12 is renderer-only correction, not hybrid campaign art",
  ] as const,

  certifyBeforeCustomerOne: [
    "openai_image_generation",
    "openai_vision_creative_director",
  ] as const,

  failClosedUntilCertified: true as const,
  doNotSilentlySubstituteWeakerPath: true as const,
} as const;

export const HYBRID_CREATIVE_CERTIFICATION_PACKAGE_ID =
  studioProjectAlphaHybridCreativeCertificationV1.packageId;
