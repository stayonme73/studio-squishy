/**
 * STUDIO-OPERATING-LAUNCH-MENU-PRODUCTION-RUNTIME-1
 *
 * Honest launch-menu production map. Not permission to sell everything.
 * Package A flyer loop remains intact. Do not reopen Package A.
 *
 * Production Team = operational capabilities the Machine can invoke.
 * Not theatrical employee badges.
 */

export const studioLaunchMenuProductionRuntimeV1 = {
  packageId: "STUDIO-OPERATING-LAUNCH-MENU-PRODUCTION-RUNTIME-1",
  schemaVersion: 1 as const,
  room: 4 as const,
  doNotMerge: true as const,
  doNotTouchMaya: true as const,
  packageAUnchanged: true as const,
  customerRevisionPolicyUnchanged: true as const,
  refundPolicyUnchanged: true as const,
  carousel: "NOT_ON_LAUNCH_MENU" as const,
  ownerRoutineProduction: "NONE" as const,
  printFulfillment: "DIGITAL_FILES_ONLY" as const,
  campaignCreativeGeneralRuntime: "NOT_ESTABLISHED" as const,

  internalBudgets: {
    copyAttempts: 2,
    videoTransportAttempts: 2,
    videoCreativeAttempts: 2,
  },

  productionRoles: [
    "DESIGN_PRODUCTION",
    "COPY_PRODUCTION",
    "VIDEO_PRODUCTION",
    "VOICE_PRODUCTION",
    "PRINT_OUTPUT",
    "QUALITY_ASSURANCE",
  ] as const,

  ownerEscalationAllowed: [
    "bounded_internal_correction_exhausted",
    "genuine_creative_judgment_unresolved",
    "customer_facts_insufficient_cannot_infer",
    "provider_unavailable_beyond_safe_retry",
    "policy_or_customer_exception",
  ] as const,

  ownerEscalationForbidden: [
    "normal_provider_retry",
    "ordinary_qa_correction",
    "routine_render_retry",
    "successful_production",
    "routine_missing_internal_state_machine_can_repair",
  ] as const,
} as const;

export const LAUNCH_MENU_COPY_SKUS = [
  "v2-rtu-email-kit",
  "v2-rtu-sms-kit",
] as const;

export const LAUNCH_MENU_VIDEO_SKU = "v2-rtu-short-video" as const;

export const LAUNCH_MENU_DESIGN_SKUS = [
  "v2-rtu-flyer",
  "v2-rtu-promotion-graphics",
  "v2-rtu-social-posts",
  "v2-rtu-business-card",
  "v2-rtu-menu",
  "v2-rtu-service-sheet",
] as const;

export const LAUNCH_MENU_PRINT_OUTPUT_SKUS = [
  "v2-rtu-flyer",
  "v2-rtu-business-card",
  "v2-rtu-menu",
  "v2-rtu-service-sheet",
] as const;

export type LaunchMenuClassification =
  | "AUTONOMOUSLY_PRODUCTION_READY"
  | "READY_WITH_EXPLICIT_LIMITS"
  | "NOT_AUTONOMOUS_HOLD"
  | "NOT_ON_LAUNCH_MENU";

export type ProductionTeamRoleContract = {
  role: (typeof studioLaunchMenuProductionRuntimeV1.productionRoles)[number];
  invokedBy: string;
  receives: string;
  mayDecide: string;
  toolRuntime: string;
  returns: string;
  failure: string;
  machineHandlesFailure: string;
  customerFacingName: "The Studio Production Team";
};

export const productionTeamRoleContracts: readonly ProductionTeamRoleContract[] = [
  {
    role: "DESIGN_PRODUCTION",
    invokedBy: "Paid Machine observer (DESIGN-DISPATCH-OBSERVER-1)",
    receives: "Customer Intake facts + accepted Materials + SKU contract",
    mayDecide: "Creative layout from authorized customer content: hierarchy, type, scale, spacing, composition, grouping, offer emphasis, format, materials, balance. Must not invent customer facts.",
    toolRuntime: "studio_design_renderer (HTML/CSS + Playwright). Anthropic creative reasoner when keyed; deterministic seed fallback. Provider-independent.",
    returns: "PNG and/or PDF artifact + design QA evidence",
    failure: "QA class fail, missing facts, missing materials, renderer failure",
    machineHandlesFailure:
      "Flyer: class-level correction brief → remint (Package A budget 3). Other design SKUs: hook fail recorded; Review stays closed.",
    customerFacingName: "The Studio Production Team",
  },
  {
    role: "COPY_PRODUCTION",
    invokedBy: "Paid Machine observer (LAUNCH-MENU-PRODUCTION-RUNTIME-1)",
    receives: "Customer Intake facts only (offer, CTA, consent, must-include, must-not-say)",
    mayDecide: "Write customer-facing copy from authorized facts. May improve wording, hierarchy, tone, structure, and CTA treatment. Must not invent prices, claims, dates, contact, or testimonials.",
    toolRuntime: "studio_copy_producer (writer; Anthropic when keyed; fact-bound fallback). Not a live vendor product name.",
    returns: "JSON copy artifact + copy QA evidence",
    failure: "Missing required facts, consent not confirmed, copy QA exhaust",
    machineHandlesFailure:
      "Regenerate once from the same facts (strict). Exhaust → owner escalation. Do not infer missing facts.",
    customerFacingName: "The Studio Production Team",
  },
  {
    role: "VIDEO_PRODUCTION",
    invokedBy: "Paid Machine observer (LAUNCH-MENU-PRODUCTION-RUNTIME-1)",
    receives: "Customer stills on disk + Intake on-screen text/CTA + format",
    mayDecide: "Stills assembly + captions from customer text. Must not invent footage or require narration unless the job includes voice.",
    toolRuntime: "Shotstack adapter (provider-independent contract). ElevenLabs only if narration is in the job.",
    returns: "MP4 artifact + video QA evidence, or fail-closed verdict",
    failure:
      "Missing footage, credentials blocked, submit/render/ingest/download fail, invalid artifact, video QA fail",
    machineHandlesFailure:
      "Submit/ingest retry within budget 2. Poll, timeout, failed-render, and download retries stay inside the Shotstack client and must not resubmit a new paid render. Credentials → owner escalation. Creative QA fail does not burn transport retries.",
    customerFacingName: "The Studio Production Team",
  },
  {
    role: "VOICE_PRODUCTION",
    invokedBy: "Not Machine-observed in Package B",
    receives: "Approved script/facts (when a voice SKU is sold)",
    mayDecide: "TTS render of supplied script. Must not invent script claims.",
    toolRuntime: "ElevenLabs TTS adapter exists; paid observer does not invoke it.",
    returns: "MP3 when a live key is present (WAV unverified)",
    failure: "Credentials absent, provider failure, listening QA fail",
    machineHandlesFailure: "Not on the paid Machine path in this package. Classify HOLD.",
    customerFacingName: "The Studio Production Team",
  },
  {
    role: "PRINT_OUTPUT",
    invokedBy: "Machine after Design Production export (digital files only)",
    receives: "SKU print/digital contract (dimensions, PNG/PDF) + customer facts",
    mayDecide: "Digital print-ready file certification. Must not imply physical print or shipping.",
    toolRuntime: "Print/File Production capability (export validation on studio_design_renderer PNG/PDF)",
    returns: "Print-ready digital file. Client prints.",
    failure: "Same as Design Production",
    machineHandlesFailure: "Same as Design Production. No fulfillment vendor is invoked.",
    customerFacingName: "The Studio Production Team",
  },
  {
    role: "QUALITY_ASSURANCE",
    invokedBy: "Each producer after persist, before Review eligibility",
    receives: "Artifact + SKU QA contract + customer facts",
    mayDecide: "Pass / fail. Must not invent a pass. Must not open Review on fail.",
    toolRuntime: "Design QA / Copy QA / Video QA gates (deterministic + required attestations)",
    returns: "QA evidence bound to artifact identity",
    failure: "Contract miss, leak, missing facts, invalid artifact",
    machineHandlesFailure:
      "Route to the medium-specific correction contract. Exhaust → owner escalation. Customer revision policy untouched.",
    customerFacingName: "The Studio Production Team",
  },
] as const;

export const launchMenuHonestClassification: Record<string, LaunchMenuClassification> = {
  "v2-rtu-flyer": "AUTONOMOUSLY_PRODUCTION_READY",
  "v2-rtu-promotion-graphics": "READY_WITH_EXPLICIT_LIMITS",
  "v2-rtu-social-posts": "READY_WITH_EXPLICIT_LIMITS",
  "v2-rtu-business-card": "READY_WITH_EXPLICIT_LIMITS",
  "v2-rtu-menu": "READY_WITH_EXPLICIT_LIMITS",
  "v2-rtu-service-sheet": "READY_WITH_EXPLICIT_LIMITS",
  "v2-rtu-email-kit": "READY_WITH_EXPLICIT_LIMITS",
  "v2-rtu-sms-kit": "READY_WITH_EXPLICIT_LIMITS",
  "v2-rtu-short-video": "READY_WITH_EXPLICIT_LIMITS",
  "v2-rtu-short-form-video-edit": "READY_WITH_EXPLICIT_LIMITS",
  "v2-rtu-clip-repurposing": "READY_WITH_EXPLICIT_LIMITS",
  "v2-rtu-voice": "NOT_AUTONOMOUS_HOLD",
  "cc-001": "NOT_AUTONOMOUS_HOLD",
  campaign_creative_named_visual_systems: "READY_WITH_EXPLICIT_LIMITS",
  campaign_creative_general_customer: "NOT_AUTONOMOUS_HOLD",
  carousel: "NOT_ON_LAUNCH_MENU",
};
