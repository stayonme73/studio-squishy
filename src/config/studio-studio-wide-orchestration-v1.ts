/**
 * PROJECT ALPHA — Studio-wide AI Creative Orchestration & Production Intelligence
 *
 * North Star: We are not building a better flyer generator. We are building
 * The Studio's reusable creative-production brain, so Machine can coordinate
 * whatever supported service the customer buys and involve Owner only when
 * true Owner judgment is required.
 *
 * Preserve Design Intelligence v1.2.1 and accepted Project Alpha architecture.
 * Individual production lanes extend this contract. They do not reinvent it.
 */

import { studioProjectAlphaV1 } from "./studio-project-alpha-v1";

export const studioStudioWideOrchestrationV1 = {
  packageId: "STUDIO-OPERATING-PROJECT-ALPHA-STUDIO-WIDE-ORCHESTRATION-1",
  schemaVersion: 1 as const,
  intelligenceVersion: studioProjectAlphaV1.intelligenceVersion,
  room: 4 as const,
  doNotMerge: true as const,
  customerRevisionPolicyUnchanged: true as const,
  scoutMayNotHandDrawCustomerArt: true as const,
  ownerIsNotFirstLineCreativeQa: true as const,
  ownerIsNotFirstLineEngineeringQa: true as const,
  routineLaunchAttemptBudget: 3 as const,
  notFlyerOnly: true as const,
  evaluateProvidersFailClosed: true as const,
  doNotOpenOwnerReview: true as const,

  operatingModel: {
    customer: "Studio Voice",
    orchestrator: "Machine",
    creativeReasoning: "AI Studio Manager",
    production: "domain Production capability",
    creativeGate: "domain Creative Director",
    technicalGate: "Technical QA / Print-File",
    engineeringRecovery: "Scout",
    owner: "true judgment only",
  } as const,

  lanes: [
    "static_design",
    "motion_video",
    "copy",
    "form_document",
    "print_file",
  ] as const,
} as const;

export const STUDIO_WIDE_ORCHESTRATION_VERSION =
  studioStudioWideOrchestrationV1.intelligenceVersion;

export type StudioJobType =
  | "static_design"
  | "motion_video"
  | "copy"
  | "form_document"
  | "print_file"
  | "voice_audio"
  | "unknown";

export type StudioProductionRoute =
  | "renderer_first"
  | "image_plus_renderer"
  | "customer_assets_plus_renderer"
  | "video_orchestration"
  | "copy_path"
  | "structured_document"
  | "print_file_packaging"
  | "fail_closed_evaluate_provider";

export type StudioManagerAction =
  | "continue_production"
  | "route_design"
  | "route_copy"
  | "route_video"
  | "route_document"
  | "route_print_file"
  | "use_image_generation"
  | "use_customer_assets"
  | "research_references"
  | "studio_correction_required"
  | "request_customer_information"
  | "engineering_recovery_required"
  | "owner_judgment_required";

export type StudioCapabilityStatus =
  | "active"
  | "evaluate"
  | "not_for_customer_text"
  | "out_of_scope";

export type StudioCreativeDomain = "design" | "video" | "copy" | "document";
