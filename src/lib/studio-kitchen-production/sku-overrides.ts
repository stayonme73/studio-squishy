import type { ServiceId } from "@/catalog/types";
import type { ProductionRole } from "@/lib/campaign-tasks/types";

import type { ACTIVE_CUSTOMER_FACING_SKUS } from "./active-set";
import {
  AI_VOICE_TOOL,
  CANVA_TOOL,
  CAPCUT_TOOL,
  LANDING_STRUCTURE_TOOL,
  PLATFORM_ADMIN_TOOL,
  SHOTSTACK_TOOL,
  TEXT_MODEL_TOOL,
} from "./family-baselines";
import type {
  ProductionCapabilityReadiness,
  ProductionQaItem,
  ProductionToolRef,
} from "./types";

type ActiveCapabilitySku = (typeof ACTIVE_CUSTOMER_FACING_SKUS)[number];

/**
 * SKU-specific production method overrides over family baselines + catalog authority.
 * Does not duplicate full catalog records.
 */
export type SkuProductionOverride = {
  producerRole?: ProductionRole;
  supportingRoles?: readonly ProductionRole[];
  primaryTool?: ProductionToolRef;
  optionalTools?: readonly ProductionToolRef[];
  requiredStudioInputs?: readonly string[];
  optionalInputs?: readonly string[];
  formatExportRequirements: readonly string[];
  extraLimitations?: readonly string[];
  extraQaItems?: readonly ProductionQaItem[];
  readiness: ProductionCapabilityReadiness;
  readinessNotes: string;
  specialNotes?: readonly string[];
  customerReviewHandoff?: string;
  finalDeliveryCriteria?: readonly string[];
};

const canvaFormats = (detail: string): readonly string[] => [
  "Final flattened digital export (PNG and/or PDF as appropriate)",
  "Editable Canva source files are not included unless separately authorized",
  detail,
];

const copyFormats = (detail: string): readonly string[] => [
  "Client-readable copy document or structured paste-ready text",
  detail,
];

export const SKU_PRODUCTION_OVERRIDES: Record<
  ActiveCapabilitySku,
  SkuProductionOverride
> = {
  "bf-001": {
    producerRole: "strategy",
    supportingRoles: ["creative_production", "copy", "qa", "producer_dispatcher"],
    primaryTool: CANVA_TOOL,
    optionalTools: [TEXT_MODEL_TOOL],
    formatExportRequirements: canvaFormats(
      "One-page Brand Direction Sheet + one branded profile or cover graphic",
    ),
    extraQaItems: [
      {
        id: "no_new_logo_claim",
        label: "No new-logo-from-scratch delivered",
        reason: "Catalog exclusion: new logo creation is out of scope",
        source: "catalog_exclusion",
      },
      {
        id: "hex_palette_present",
        label: "Palette includes usable HEX codes",
        reason: "Catalog deliverable requires HEX codes",
        source: "service_contract",
      },
    ],
    readiness: "contract_ready",
    readinessNotes:
      "Strategy + creative path defined. Canva used operationally for profile/cover; no live Canva API required for first quality testing.",
  },
  "sm-001": {
    producerRole: "creative_production",
    formatExportRequirements: canvaFormats(
      "Up to six static social posts + captions + simple calendar",
    ),
    extraQaItems: [
      {
        id: "post_count_limit",
        label: "No more than six static posts",
        reason: "Catalog deliverable limit",
        source: "service_contract",
      },
      {
        id: "no_reels_claim",
        label: "No reels/advanced motion claimed",
        reason: "Catalog exclusion",
        source: "catalog_exclusion",
      },
    ],
    readiness: "contract_ready",
    readinessNotes:
      "Social static content production method defined with manual Canva path. Posting/execution is out of base SKU.",
  },
  "sm-001-monthly": {
    producerRole: "creative_production",
    formatExportRequirements: canvaFormats(
      "Monthly batch up to six static posts + captions + calendar",
    ),
    extraQaItems: [
      {
        id: "monthly_batch_limit",
        label: "Monthly batch respects ≤6 posts",
        reason: "Monthly SKU deliverable limit",
        source: "service_contract",
      },
    ],
    readiness: "contract_ready",
    readinessNotes: "Same production method as sm-001 on a monthly cycle.",
  },
  "em-001": {
    producerRole: "copy",
    primaryTool: TEXT_MODEL_TOOL,
    optionalTools: [],
    formatExportRequirements: copyFormats("Up to two emails with subjects/CTAs"),
    extraQaItems: [
      {
        id: "email_count_limit",
        label: "No more than two emails",
        reason: "Catalog deliverable limit",
        source: "service_contract",
      },
      {
        id: "cta_present",
        label: "Each email has a clear CTA",
        reason: "Catalog promise includes CTAs",
        source: "service_contract",
      },
    ],
    readiness: "contract_ready",
    readinessNotes:
      "Copy-led production method is credible without design-tool integration. List building/CRM excluded.",
  },
  "em-001-monthly": {
    producerRole: "copy",
    primaryTool: TEXT_MODEL_TOOL,
    optionalTools: [],
    formatExportRequirements: copyFormats("Monthly email batch within SKU limits"),
    readiness: "contract_ready",
    readinessNotes: "Monthly copy batch using the same copy_channels method as em-001.",
  },
  "cc-001": {
    producerRole: "copy",
    primaryTool: TEXT_MODEL_TOOL,
    optionalTools: [],
    formatExportRequirements: copyFormats(
      "Up to three marketing copy assets / ≤750 words total per catalog",
    ),
    extraQaItems: [
      {
        id: "word_asset_limit",
        label: "Asset count and word limit respected",
        reason: "Catalog deliverable limits",
        source: "service_contract",
      },
    ],
    readiness: "contract_ready",
    readinessNotes: "Pure copy production — no Canva/CapCut dependency.",
  },
  "ma-001": {
    producerRole: "creative_production",
    formatExportRequirements: canvaFormats(
      "Up to four branded standard-format digital assets",
    ),
    extraQaItems: [
      {
        id: "asset_count_four",
        label: "No more than four assets",
        reason: "Catalog deliverable limit",
        source: "service_contract",
      },
      {
        id: "final_copy_used",
        label: "Final customer copy used (not inventing offers)",
        reason: "Client responsibility + factual accuracy",
        source: "service_contract",
      },
    ],
    readiness: "contract_ready",
    readinessNotes:
      "Promotion Pack production method defined via creative_production + manual Canva. Source files not included by default.",
  },
  "ap-001": {
    producerRole: "creative_production",
    primaryTool: AI_VOICE_TOOL,
    optionalTools: [],
    formatExportRequirements: [
      "Final MP3 (CUSTOMER READY WITH LIMITS — MP3; ElevenLabs mp3_44100_128 certified)",
      "WAV remains UNVERIFIED / NOT CERTIFIED — do not infer from MP3",
      "One AI voice style / one language",
      "Script ≤300 words",
    ],
    extraQaItems: [
      {
        id: "word_limit_300",
        label: "Script ≤300 words",
        reason: "Catalog deliverable/exclusion limit",
        source: "service_contract",
      },
      {
        id: "no_voice_cloning",
        label: "No voice cloning or celebrity imitation",
        reason: "Catalog exclusion",
        source: "catalog_exclusion",
      },
      {
        id: "audio_format",
        label: "Deliverable is MP3 (WAV unverified)",
        reason: "Listening certification covers MP3 only",
        source: "deliverable_format",
      },
    ],
    extraLimitations: [
      "CUSTOMER READY WITH LIMITS — MP3 only (KITCHEN-PRODUCTION-CERT-VOICE-1). WAV is UNVERIFIED.",
      "Catalog still lists MP3 or WAV — WAV promise remains an explicit follow-up discrepancy until verified separately.",
    ],
    readiness: "contract_ready",
    readinessNotes:
      "CUSTOMER READY WITH LIMITS — MP3 after Owner listening approval of cert-voice artifact sha256 d283144563a6fe2075be956fd144fe1c0bb4de29ec55ca308c5b8060c94647e4. WAV UNVERIFIED. Catalog MP3/WAV promise not silently changed.",
    specialNotes: [
      "Scriptwriting is not included unless selected separately.",
      "Basic pacing/pronunciation review is required before QA pass.",
      "Provider is ElevenLabs Text-to-Speech API only — not Studio Voice browser TTS.",
    ],
  },
  "rm-j002": {
    producerRole: "creative_production",
    supportingRoles: ["copy", "qa", "producer_dispatcher"],
    primaryTool: CANVA_TOOL,
    optionalTools: [PLATFORM_ADMIN_TOOL, TEXT_MODEL_TOOL],
    formatExportRequirements: [
      "Profile image and cover/header assets when applicable",
      "Bio/about/link copy package",
      "Direct platform placement only when customer grants secure admin access",
    ],
    extraLimitations: [
      "Content/asset production is separable from direct account modification.",
      "No social OAuth or automated account access exists in the repo.",
    ],
    extraQaItems: [
      {
        id: "account_control_confirmed",
        label: "Customer already controls the account",
        reason: "Catalog exclusion / client responsibility",
        source: "service_contract",
      },
      {
        id: "no_password_sharing",
        label: "No password/casual login sharing used",
        reason: "Client responsibility requires secure admin invite",
        source: "service_contract",
      },
    ],
    readiness: "partial",
    readinessNotes:
      "Asset/copy production method is defined. Direct Facebook/Instagram/TikTok modification remains manual and unwired — do not claim automatic account access.",
    specialNotes: [
      "Separate content/asset production from platform admin action in work packets.",
      "Posting/scheduling/community management remain excluded.",
    ],
  },
  "rm-j005": {
    producerRole: "copy",
    supportingRoles: ["strategy", "qa", "producer_dispatcher"],
    primaryTool: LANDING_STRUCTURE_TOOL,
    optionalTools: [TEXT_MODEL_TOOL, CANVA_TOOL],
    requiredStudioInputs: [
      "Approved Studio page structure / template",
      "Publication method for the campaign page",
      "Customer wording, logo, images, pricing, dates, links",
    ],
    formatExportRequirements: [
      "One responsive campaign page",
      "One clear CTA",
      "Published via approved Studio page-delivery method",
    ],
    extraLimitations: [
      "Not a full website, ecommerce, or custom application.",
      "Custom coding outside approved Studio structure is excluded.",
      "If every customer page requires bespoke engineering by Codey/Scout, the path is not yet productized.",
    ],
    extraQaItems: [
      {
        id: "one_page_one_offer",
        label: "Exactly one page / one campaign purpose",
        reason: "Catalog scope",
        source: "service_contract",
      },
      {
        id: "single_cta",
        label: "One clear CTA only",
        reason: "Catalog deliverable/exclusion",
        source: "service_contract",
      },
      {
        id: "responsive_check",
        label: "Mobile and desktop layout checked",
        reason: "Catalog deliverable",
        source: "deliverable_format",
      },
      {
        id: "links_cta_tested",
        label: "Links and approved CTA tested",
        reason: "Catalog deliverable",
        source: "service_contract",
      },
    ],
    readiness: "partial",
    readinessNotes:
      "Content/strategy pipeline exists, but productized publication without per-customer engineering is not proven. Engineering must not become routine production by default.",
    specialNotes: [
      "Copywriting beyond light editing of customer-supplied wording is excluded.",
      "Flag for later landing-page productization package if structure is not reusable.",
    ],
  },
  "rm-j007": {
    producerRole: "creative_production",
    formatExportRequirements: [
      "Corrected final export of the named existing promotional item",
      "No redesign / new concept",
    ],
    extraQaItems: [
      {
        id: "named_item_only",
        label: "Only the named existing item was updated",
        reason: "Catalog scope: limited update, not redesign",
        source: "service_contract",
      },
      {
        id: "replacement_facts_only",
        label: "Only supplied replacement details applied",
        reason: "Catalog purpose and client responsibilities",
        source: "service_contract",
      },
    ],
    readiness: "contract_ready",
    readinessNotes:
      "Limited update path is clear: apply customer-supplied replacements, export, QA. Manual Canva/file edit operational.",
  },
  "rm-j008": {
    producerRole: "creative_production",
    supportingRoles: ["copy", "qa", "producer_dispatcher"],
    primaryTool: CANVA_TOOL,
    optionalTools: [PLATFORM_ADMIN_TOOL],
    formatExportRequirements: [
      "Updated bio/link copy",
      "Placed/cropped customer-supplied profile and banner assets",
      "Platform update only with customer-controlled access",
    ],
    extraLimitations: [
      "Custom logo/banner design is excluded — placement/crop/resize of customer assets only.",
      "No automated social account access.",
    ],
    extraQaItems: [
      {
        id: "one_platform_only",
        label: "Exactly one platform updated",
        reason: "Catalog exclusion: more than one platform",
        source: "catalog_exclusion",
      },
      {
        id: "no_new_content_creation",
        label: "No original social content creation claimed",
        reason: "Catalog exclusion",
        source: "catalog_exclusion",
      },
    ],
    readiness: "partial",
    readinessNotes:
      "Copy/asset placement method defined. Direct profile modification remains manual/unwired.",
  },
  "v2-rtu-flyer": {
    producerRole: "creative_production",
    formatExportRequirements: canvaFormats("One flyer — PDF + digital"),
    readiness: "contract_ready",
    readinessNotes: "RTU flyer — creative_production + manual Canva; client distributes.",
    extraQaItems: [
      {
        id: "flyer_contact_present",
        label: "Required contact/offer fields present when provided",
        reason: "RTU usability and client materials",
        source: "service_contract",
      },
    ],
  },
  "v2-rtu-menu": {
    producerRole: "creative_production",
    formatExportRequirements: canvaFormats("One menu design export"),
    readiness: "contract_ready",
    readinessNotes: "RTU menu — manual Canva operational path.",
  },
  "v2-rtu-service-sheet": {
    producerRole: "creative_production",
    formatExportRequirements: canvaFormats("One service sheet export"),
    readiness: "contract_ready",
    readinessNotes: "RTU service sheet — manual Canva operational path.",
  },
  "v2-rtu-social-posts": {
    producerRole: "creative_production",
    formatExportRequirements: canvaFormats("Four RTU social posts (client distributes)"),
    extraQaItems: [
      {
        id: "four_posts",
        label: "Exactly four posts unless catalog allows fewer with reason",
        reason: "RTU social posts SKU promise",
        source: "service_contract",
      },
    ],
    readiness: "contract_ready",
    readinessNotes: "RTU social posts — design/copy package; client posts.",
  },
  "v2-rtu-promotion-graphics": {
    producerRole: "creative_production",
    formatExportRequirements: canvaFormats("Two campaign graphics"),
    readiness: "contract_ready",
    readinessNotes: "RTU campaign graphics — distinct from published landing page (rm-j005).",
  },
  "v2-rtu-business-card": {
    producerRole: "creative_production",
    formatExportRequirements: canvaFormats("Business card design only (print excluded)"),
    extraLimitations: ["Printing/shipping not included — design-only."],
    readiness: "contract_ready",
    readinessNotes: "Design-only business card via manual Canva path.",
  },
  "v2-rtu-email-kit": {
    producerRole: "copy",
    primaryTool: TEXT_MODEL_TOOL,
    optionalTools: [],
    formatExportRequirements: copyFormats("Up to two RTU emails — client pastes into their platform"),
    readiness: "contract_ready",
    readinessNotes: "Email kit is copy/production package — Studio does not send email.",
  },
  "v2-rtu-sms-kit": {
    producerRole: "copy",
    primaryTool: TEXT_MODEL_TOOL,
    optionalTools: [],
    formatExportRequirements: copyFormats(
      "Up to four RTU SMS messages — client pastes into their platform",
    ),
    extraLimitations: [
      "Studio does not send SMS. No Twilio/SMS transport is part of this SKU.",
    ],
    readiness: "contract_ready",
    readinessNotes: "SMS kit is paste-ready copy only — transport absent by design.",
  },
  "v2-rtu-voice": {
    producerRole: "creative_production",
    primaryTool: AI_VOICE_TOOL,
    optionalTools: [TEXT_MODEL_TOOL],
    formatExportRequirements: [
      "Short announcement script when needed (≤300 words)",
      "Final MP3 audio track for client distribution (CUSTOMER READY WITH LIMITS — MP3)",
      "WAV remains UNVERIFIED / NOT CERTIFIED — do not infer from MP3",
    ],
    extraQaItems: [
      {
        id: "rtu_voice_word_limit",
        label: "Script ≤300 words",
        reason: "Voice RTU / ap-001 class limit",
        source: "service_contract",
      },
      {
        id: "client_distributes_audio",
        label: "Package assumes client uploads/distributes audio",
        reason: "RTU client responsibility",
        source: "service_contract",
      },
    ],
    extraLimitations: [
      "CUSTOMER READY WITH LIMITS — MP3 only (KITCHEN-PRODUCTION-CERT-VOICE-1). WAV is UNVERIFIED.",
      "Catalog still lists MP3 or WAV — WAV promise remains an explicit follow-up discrepancy until verified separately.",
    ],
    readiness: "contract_ready",
    readinessNotes:
      "CUSTOMER READY WITH LIMITS — MP3 via shared ElevenLabs MP3 listening certification (cert-voice). WAV UNVERIFIED. CapCut is not used for audio-only.",
  },
  "v2-rtu-short-video": {
    producerRole: "creative_production",
    primaryTool: SHOTSTACK_TOOL,
    optionalTools: [AI_VOICE_TOOL, CANVA_TOOL, CAPCUT_TOOL],
    formatExportRequirements: [
      "One basic short-form MP4, 15–30 seconds",
      "One aspect ratio only (vertical, square, or landscape)",
      "On-screen captions + CTA treatment",
    ],
    extraQaItems: [
      {
        id: "runtime_15_30",
        label: "Runtime 15–30 seconds",
        reason: "RTU short video promise",
        source: "service_contract",
      },
      {
        id: "one_aspect_ratio",
        label: "One format/aspect ratio only",
        reason: "RTU short video promise",
        source: "deliverable_format",
      },
      {
        id: "captions_cta",
        label: "Captions and CTA treatment present",
        reason: "RTU deliverable",
        source: "service_contract",
      },
      {
        id: "usable_footage",
        label: "Customer footage/assets usable or approved Studio assets used",
        reason: "Client responsibilities / production quality",
        source: "service_contract",
      },
    ],
    readiness: "contract_ready",
    readinessNotes:
      "KITCHEN-VIDEO-INTEGRATION-1: SHOTSTACK INTEGRATION PROVEN. INTEGRATED / QA READY / NOT CUSTOMER READY / NOT CERTIFIED. CapCut CLOSED — OWNER-INDEPENDENCE FAIL. Stock + music UNRESOLVED. Next: KITCHEN-PRODUCTION-CERT-VIDEO-1.",
    specialNotes: [
      "Client posts/distributes the finished video.",
      "Customer must provide organized usable footage when using their own visuals.",
      "Optional certified voice MP3 may be referenced by hash; voice cert does not certify video.",
      "Stock-media capability UNRESOLVED for jobs that need stock — unused in this package.",
      "MUSIC CAPABILITY = UNRESOLVED — omit music until rights are certain (unused in this package).",
      "Tagia/Owner CapCut click-export is NOT an acceptable production success path.",
      "Primary producer: Shotstack Edit + Ingest API (stage proof bound under kitchen-video-integration-1 artifacts).",
    ],
  },
};

/** Type guard helper for override lookup. */
export function getSkuOverride(skuId: ServiceId): SkuProductionOverride | undefined {
  return SKU_PRODUCTION_OVERRIDES[skuId as keyof typeof SKU_PRODUCTION_OVERRIDES];
}
