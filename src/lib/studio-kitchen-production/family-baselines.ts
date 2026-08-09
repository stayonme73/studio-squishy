import type { ProductionRole, ProductionTaskFamilyId, TaskPhase } from "@/lib/campaign-tasks/types";
import { FAMILY_TASK_PIPELINES } from "@/lib/campaign-tasks/templates";

import type { ProductionStepContract, ProductionToolRef } from "./types";

export type FamilyProductionBaseline = {
  productionFamilyId: ProductionTaskFamilyId;
  defaultProducerRole: ProductionRole;
  defaultSupportingRoles: readonly ProductionRole[];
  defaultPrimaryTool: ProductionToolRef;
  defaultOptionalTools: readonly ProductionToolRef[];
  defaultStudioInputs: readonly string[];
  defaultSteps: readonly ProductionStepContract[];
  defaultCustomerReviewHandoff: string;
  defaultFinalDeliveryCriteria: readonly string[];
};

function stepsFromPipeline(
  familyId: ProductionTaskFamilyId,
  roleForPhase: (phase: TaskPhase) => ProductionRole,
): readonly ProductionStepContract[] {
  const pipeline = FAMILY_TASK_PIPELINES[familyId];
  const steps: ProductionStepContract[] = pipeline.map((bp, index) => ({
    id: `${familyId}-step-${index + 1}`,
    label: bp.titleSuffix,
    taskPhase: bp.phase,
    responsibleRole: roleForPhase(bp.phase),
    summary: `${bp.titleSuffix} phase for ${familyId} family pipeline.`,
  }));
  return [
    {
      id: `${familyId}-brief`,
      label: "Confirm inputs & brief",
      taskPhase: null,
      responsibleRole: "producer_dispatcher",
      summary: "Confirm required customer and Studio inputs before production claim.",
    },
    ...steps,
    {
      id: `${familyId}-review-ready`,
      label: "Review-ready handoff",
      taskPhase: "delivery_prep",
      responsibleRole: "producer_dispatcher",
      summary: "Package client-safe outputs for customer Review Room.",
    },
  ];
}

function phaseRole(phase: TaskPhase): ProductionRole {
  switch (phase) {
    case "strategy":
    case "strategy_content_direction":
    case "review_strategy":
      return "strategy";
    case "copy":
      return "copy";
    case "creative":
    case "creative_copy":
    case "creative_production":
      return "creative_production";
    case "qa":
      return "qa";
    case "delivery_prep":
      return "producer_dispatcher";
    default:
      return "producer_dispatcher";
  }
}

const CANVA_MANUAL: ProductionToolRef = {
  toolId: "canva",
  label: "Canva",
  required: true,
  integrationState: "manual_operational",
  toolReadiness: "manual_operational_path_exists",
  note: "Approved design tool. Repo has no live Canva integration — production uses manual/operational Canva export with file refs returned to File Room.",
};

const TEXT_MODEL: ProductionToolRef = {
  toolId: "text_model",
  label: "Text / copy production capability",
  required: true,
  integrationState: "manual_operational",
  toolReadiness: "manual_operational_path_exists",
  note: "Copy is produced via approved Studio copy workflow — not a live vendor API claim.",
};

const CAPCUT: ProductionToolRef = {
  toolId: "capcut",
  label: "CapCut",
  required: false,
  integrationState: "not_integrated",
  toolReadiness: "unsupported",
  note:
    "CLOSED — OWNER-INDEPENDENCE FAIL (KITCHEN-VIDEO-OPERATIONAL-1). Not an active production provider. Do not reopen for routine RTU short video.",
};

const SHOTSTACK: ProductionToolRef = {
  toolId: "shotstack",
  label: "Shotstack Edit + Ingest API",
  required: true,
  integrationState: "partial_adapter",
  toolReadiness: "contract_ready",
  note:
    "KITCHEN-PRODUCTION-CERT-VIDEO-1: owner-independent Shotstack MP4 path CUSTOMER READY WITH LIMITS — MP4. Final A/V beat synchronization is mandatory per-artifact QA before delivery. CapCut remains CLOSED — OWNER-INDEPENDENCE FAIL.",
};

const AI_VOICE: ProductionToolRef = {
  toolId: "ai_voice_tool",
  label: "ElevenLabs Text-to-Speech API (customer deliverable audio)",
  required: true,
  integrationState: "partial_adapter",
  toolReadiness: "tool_integration_required",
  note:
    "Kitchen adapter targets ElevenLabs TTS REST (not ElevenLabs Studio UI, not browser speechSynthesis). Requires server-side ELEVENLABS_API_KEY. MP3 path CUSTOMER READY WITH LIMITS after listening cert; WAV UNVERIFIED. Do not claim live generation without a bound audio artifact.",
};

const LANDING_STRUCTURE: ProductionToolRef = {
  toolId: "studio_landing_page_structure",
  label: "Approved Studio page structure (studio-campaign-page-v1)",
  required: true,
  integrationState: "partial_adapter",
  toolReadiness: "contract_ready",
  note:
    "KITCHEN-LANDING-PAGE-PRODUCTION-1: CUSTOMER READY WITH LIMITS — work packet → studio-campaign-page-v1 HTML → Netlify Deploy API public publish proven. Limits: customer outputMode omits cert disclaimers; per-artifact responsive QA; CTA/link/QR destination truth per artifact; custom domain separate unless promised. Not a per-customer Studio eng build.",
};

const PLATFORM_ADMIN: ProductionToolRef = {
  toolId: "manual_platform_admin",
  label: "Manual platform admin (customer-controlled account)",
  required: true,
  integrationState: "not_integrated",
  toolReadiness: "manual_operational_path_exists",
  note:
    "KITCHEN-SOCIAL-PROFILE-PRODUCTION-1 A+C: rm-j002/rm-j008 sell PROFILE KITS (customer applies). Manual admin/login mutation is NOT the fulfillment path. Facebook Page API mutation preserved as future-only (INTEGRATION READY / ACCOUNT-AUTH BLOCKER) — Meta OAuth not started. Instagram + TikTok direct mutation UNSUPPORTED. No password vault / browser automation.",
};

export const FAMILY_PRODUCTION_BASELINES: Record<
  ProductionTaskFamilyId,
  FamilyProductionBaseline
> = {
  brand_identity_messaging: {
    productionFamilyId: "brand_identity_messaging",
    defaultProducerRole: "strategy",
    defaultSupportingRoles: ["creative_production", "copy", "qa", "producer_dispatcher"],
    defaultPrimaryTool: CANVA_MANUAL,
    defaultOptionalTools: [TEXT_MODEL],
    defaultStudioInputs: [
      "Approved Studio Plan line / scope",
      "Campaign Record customer facts",
      "Brand materials slots (when required)",
    ],
    defaultSteps: stepsFromPipeline("brand_identity_messaging", phaseRole),
    defaultCustomerReviewHandoff:
      "Submit client-safe Brand Direction Sheet and profile/cover graphic to Review Room after QA pass.",
    defaultFinalDeliveryCriteria: [
      "QA passed",
      "Deliverables match catalog count/type",
      "No internal leaks in package",
      "Customer approval or revision path complete",
    ],
  },
  campaign_launch_monthly: {
    productionFamilyId: "campaign_launch_monthly",
    defaultProducerRole: "strategy",
    defaultSupportingRoles: ["qa", "producer_dispatcher"],
    defaultPrimaryTool: TEXT_MODEL,
    defaultOptionalTools: [CANVA_MANUAL],
    defaultStudioInputs: ["Approved plan scope", "Campaign direction facts"],
    defaultSteps: stepsFromPipeline("campaign_launch_monthly", phaseRole),
    defaultCustomerReviewHandoff: "Submit strategy package to Review Room after QA.",
    defaultFinalDeliveryCriteria: [
      "QA passed",
      "Scope match to plan line",
      "Client-safe packaging",
    ],
  },
  social: {
    productionFamilyId: "social",
    defaultProducerRole: "creative_production",
    defaultSupportingRoles: ["strategy", "copy", "qa", "producer_dispatcher"],
    defaultPrimaryTool: CANVA_MANUAL,
    defaultOptionalTools: [TEXT_MODEL],
    defaultStudioInputs: [
      "Approved plan / RTU scope",
      "Offer facts from Campaign Record",
      "Brand assets when required",
    ],
    defaultSteps: stepsFromPipeline("social", phaseRole),
    defaultCustomerReviewHandoff:
      "Submit static posts + captions (and calendar when included) to Review Room after QA.",
    defaultFinalDeliveryCriteria: [
      "Asset count within SKU limit",
      "Captions present when promised",
      "QA passed",
      "Export formats client-ready",
    ],
  },
  copy_channels: {
    productionFamilyId: "copy_channels",
    defaultProducerRole: "copy",
    defaultSupportingRoles: ["qa", "producer_dispatcher"],
    defaultPrimaryTool: TEXT_MODEL,
    defaultOptionalTools: [],
    defaultStudioInputs: ["Approved plan scope", "Offer/facts from intake"],
    defaultSteps: stepsFromPipeline("copy_channels", phaseRole),
    defaultCustomerReviewHandoff: "Submit copy package to Review Room after QA.",
    defaultFinalDeliveryCriteria: [
      "Word/asset limits respected",
      "Factual accuracy checked",
      "Grammar checked",
      "QA passed",
    ],
  },
  video_audio: {
    productionFamilyId: "video_audio",
    defaultProducerRole: "creative_production",
    defaultSupportingRoles: ["qa", "producer_dispatcher", "copy"],
    defaultPrimaryTool: SHOTSTACK,
    defaultOptionalTools: [AI_VOICE],
    defaultStudioInputs: ["Approved script or footage requirements", "Plan limits"],
    defaultSteps: stepsFromPipeline("video_audio", phaseRole),
    defaultCustomerReviewHandoff:
      "Submit audio/video file refs to Review Room after QA — client distributes unless separately scoped.",
    defaultFinalDeliveryCriteria: [
      "Duration/word limits respected",
      "Required format delivered",
      "QA passed",
      "No unsupported cloning/music claims",
    ],
  },
  landing_page: {
    productionFamilyId: "landing_page",
    defaultProducerRole: "copy",
    defaultSupportingRoles: ["strategy", "qa", "producer_dispatcher"],
    defaultPrimaryTool: LANDING_STRUCTURE,
    defaultOptionalTools: [TEXT_MODEL, CANVA_MANUAL],
    defaultStudioInputs: [
      "Approved Studio page structure",
      "Customer wording, CTA, and links",
      "Publication method decision",
    ],
    defaultSteps: stepsFromPipeline("landing_page", phaseRole),
    defaultCustomerReviewHandoff:
      "Submit page preview / published URL through Review Room after QA and link checks.",
    defaultFinalDeliveryCriteria: [
      "One page / one offer",
      "One clear CTA",
      "Links tested",
      "Responsive check complete",
      "QA passed",
    ],
  },
  optimization: {
    productionFamilyId: "optimization",
    defaultProducerRole: "strategy",
    defaultSupportingRoles: ["qa", "producer_dispatcher"],
    defaultPrimaryTool: TEXT_MODEL,
    defaultOptionalTools: [],
    defaultStudioInputs: ["Existing campaign materials for review"],
    defaultSteps: stepsFromPipeline("optimization", phaseRole),
    defaultCustomerReviewHandoff: "Submit recommendations to Review Room after QA.",
    defaultFinalDeliveryCriteria: ["QA passed", "Recommendations clear", "Scope match"],
  },
  marketing_assets: {
    productionFamilyId: "marketing_assets",
    defaultProducerRole: "creative_production",
    defaultSupportingRoles: ["qa", "producer_dispatcher", "copy"],
    defaultPrimaryTool: CANVA_MANUAL,
    defaultOptionalTools: [],
    defaultStudioInputs: ["Final copy when required", "Brand assets", "SKU asset count limit"],
    defaultSteps: stepsFromPipeline("marketing_assets", phaseRole),
    defaultCustomerReviewHandoff:
      "Submit final digital asset files to Review Room after QA.",
    defaultFinalDeliveryCriteria: [
      "Asset count within SKU limit",
      "Formats as agreed",
      "No unauthorized source-file promise",
      "QA passed",
    ],
  },
};

export const PLATFORM_ADMIN_TOOL = PLATFORM_ADMIN;
export const AI_VOICE_TOOL = AI_VOICE;
export const CAPCUT_TOOL = CAPCUT;
export const SHOTSTACK_TOOL = SHOTSTACK;
export const CANVA_TOOL = CANVA_MANUAL;
export const TEXT_MODEL_TOOL = TEXT_MODEL;
export const LANDING_STRUCTURE_TOOL = LANDING_STRUCTURE;
