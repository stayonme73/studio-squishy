/**
 * STUDIO-OPERATING-STATIC-CREATIVE-LANE-READINESS-1
 *
 * Shared production rules for every launch static-design SKU. This is a lane
 * contract, not a flyer repair. Cedar & Stone is one proof case inside it.
 *
 * Authority: `docs/launch/studio-operating-static-creative-lane-readiness-1/`
 * Doctrine: `docs/studio-production-lane-doctrine-v1-locked.md`
 *
 * Does not reopen Room 4B frozen classifications. Those remain as sold-menu
 * honesty. This package grades the shared machinery those SKUs depend on.
 */

import { LAUNCH_MENU_DESIGN_SKUS, LAUNCH_MENU_PRINT_OUTPUT_SKUS } from "./studio-launch-menu-production-runtime-v1";
import { studioAutonomousProductionLoopV1 } from "./studio-autonomous-production-loop-v1";
import { studioGeneralDesignRuntimeV1 } from "./studio-general-design-runtime-v1";
import { studioStaticDesignCompositionV1 } from "./studio-static-design-composition-v1";
import { GPT_IMAGE_1_OUTPUT_TOKENS_BY_SIZE } from "./studio-production-cost-telemetry-v1";

export const STUDIO_STATIC_CREATIVE_LANE_READINESS_PACKAGE_ID =
  "STUDIO-OPERATING-STATIC-CREATIVE-LANE-READINESS-1" as const;

export type StaticCreativeLaneSku = (typeof LAUNCH_MENU_DESIGN_SKUS)[number];

export type LaneReadinessGrade =
  | "READY"
  | "READY_WITH_LIMITS"
  | "HOLD"
  | "NOT_CERTIFIED";

export type SharedLaneCapabilityId =
  | "customer_direction_fidelity"
  | "exact_fact_preservation"
  | "openai_visual_generation_routing"
  | "deterministic_fonts"
  | "crop_focal_control"
  | "composition_primitives"
  | "print_vs_digital_resolution"
  | "launch_blocking_exceptions"
  | "qa_before_review"
  | "revision_neutrality"
  | "output_export"
  | "delivery_readiness";

export const SHARED_LANE_CAPABILITIES = [
  {
    id: "customer_direction_fidelity" as const,
    label: "Follow customer direction faithfully",
    rule: "The finished artifact is graded against the customer's supplied brief, not against a concept the Machine invented. Every supplied line appears; nothing unsupported is invented.",
  },
  {
    id: "exact_fact_preservation" as const,
    label: "Preserve exact facts",
    rule: "Customer facts stay renderer-owned. Intake may not silently rewrite a headline, price, phone, URL, offer, or CTA before composition.",
  },
  {
    id: "openai_visual_generation_routing" as const,
    label: "OpenAI visual generation routing",
    rule: "When original imagery is needed, the provider creates the visual asset. Facts never enter the prompt. Type-led jobs may stay renderer-first. Hand-authored vector scenes are not a substitute.",
  },
  {
    id: "deterministic_fonts" as const,
    label: "Deterministic fonts",
    rule: "The face that reaches the glyphs is the face the document declared. Silent substitution is a hard failure.",
  },
  {
    id: "crop_focal_control" as const,
    label: "Crop and focal control",
    rule: "A focal point is a real crop window on a source larger than its box at output resolution. If the source is smaller than the box, the shortfall is reported, not hidden.",
  },
  {
    id: "composition_primitives" as const,
    label: "Composition primitives",
    rule: "Layout, layering, masks, transparency, hierarchy, and hollow-container safety live in one shared composition path. SKUs do not each invent a second composer.",
  },
  {
    id: "print_vs_digital_resolution" as const,
    label: "Print vs digital resolution policy",
    rule: "Digital may use CERT plates. A 300 DPI print claim is only launchable when source pixels cover the box with crop headroom. Provider ceilings are recorded, never quietly adopted as the print standard.",
  },
  {
    id: "launch_blocking_exceptions" as const,
    label: "Launch-blocking exceptions",
    rule: "A controlled-proof exception must name who authorised it, travel with the artifact, and stay forbidden for launch. Unauthorised shortfalls fail closed.",
  },
  {
    id: "qa_before_review" as const,
    label: "QA before customer review",
    rule: "QA runs on the finished artifact. Fail keeps Review closed. Pass is never invented.",
  },
  {
    id: "revision_neutrality" as const,
    label: "Revision neutrality",
    rule: "Studio-caused defects are corrected on the internal attempt budget. They do not spend the customer's revision.",
  },
  {
    id: "output_export" as const,
    label: "Output and export",
    rule: "The SKU delivers the formats it sold. Print-ready means a flattened customer-managed file, not Studio fulfillment or prepress.",
  },
  {
    id: "delivery_readiness" as const,
    label: "Delivery readiness without owner rescue",
    rule: "Routine production problems stay inside the Machine. Owner rescue after a bounded recovery is escalation, not a production path.",
  },
] as const;

export const STATIC_CREATIVE_LANE_SKUS = LAUNCH_MENU_DESIGN_SKUS;

export const STATIC_CREATIVE_PRINT_SKUS = LAUNCH_MENU_PRINT_OUTPUT_SKUS;

export const studioStaticCreativeLaneReadinessV1 = {
  packageId: STUDIO_STATIC_CREATIVE_LANE_READINESS_PACKAGE_ID,
  schemaVersion: 1 as const,
  room: 4 as const,
  stage: "shared_hardening" as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotReopenRoom4bClassifications: true as const,
  doNotTouchMaya: true as const,
  doNotTouchCustomerOne: true as const,
  doNotPatchLegacyComposer: true as const,
  doNotCreatePerSkuFixes: true as const,
  cedarStoneIsProofCaseNotTheLane: true as const,
  cedarStoneEvidenceRoot:
    "docs/launch/studio-operating-static-design-composition-rebuild-1/artifacts/cedar-stone" as const,

  capabilities: SHARED_LANE_CAPABILITIES,
  skus: STATIC_CREATIVE_LANE_SKUS,
  printSkus: STATIC_CREATIVE_PRINT_SKUS,

  attemptBudget: studioAutonomousProductionLoopV1.maxInternalProductionAttempts,
  generalDesignAttemptBudget:
    studioGeneralDesignRuntimeV1.maxInternalProductionAttempts,

  /**
   * Shared print / digital policy. Lifted from the Cedar & Stone spend gate so
   * the next SKU does not rediscover it as a flyer defect.
   */
  resolutionPolicy: {
    digitalCertPlatesAreLaunchable: true as const,
    printClaimRequiresSourceHeadroom: true as const,
    cropHeadroom: studioStaticDesignCompositionV1.cropHeadroom.minimumSourceScale,
    claimedPrintDpi: studioStaticDesignCompositionV1.print.dpi,
    generatedArtMaxPx: Math.max(
      ...Object.keys(GPT_IMAGE_1_OUTPUT_TOKENS_BY_SIZE).flatMap((size) =>
        size.split("x").map(Number),
      ),
    ),
    generatedArtProvider: "gpt-image-1" as const,
    fullBleedGeneratedPrintAtClaimedDpi: "NOT_LAUNCHABLE" as const,
    exceptionLabel:
      studioStaticDesignCompositionV1.printResolutionException.label,
    exceptionPermittedForLaunchPrint:
      studioStaticDesignCompositionV1.printResolutionException.permittedForLaunchPrint,
    studioPrintFulfillment: "DIGITAL_FILES_ONLY" as const,
  },

  proofCases: [
    {
      id: "maya-revised-flyer-stage0",
      skuId: "v2-rtu-flyer" as const,
      role: "legacy-composer failure that the shared path must be able to compose",
      preserved: true as const,
    },
    {
      id: "cedar-stone-customer-direction",
      skuId: "v2-rtu-flyer" as const,
      role: "fixed customer brief executed on the shared path with provider imagery",
      preserved: true as const,
    },
  ],
} as const;

export type StudioStaticCreativeLaneReadinessConfig =
  typeof studioStaticCreativeLaneReadinessV1;
