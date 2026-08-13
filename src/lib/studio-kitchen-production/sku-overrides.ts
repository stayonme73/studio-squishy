import type { ServiceId } from "@/catalog/types";
import type { ProductionRole } from "@/lib/campaign-tasks/types";

import type { ACTIVE_CUSTOMER_FACING_SKUS } from "./active-set";
import {
  AI_VOICE_TOOL,
  CANVA_TOOL,
  LANDING_STRUCTURE_TOOL,
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
      "CUSTOMER READY WITH LIMITS — MP3 only (KITCHEN-PRODUCTION-CERT-VOICE-1). WAV is UNVERIFIED / NOT CERTIFIED — post-launch enhancement only.",
    ],
    readiness: "contract_ready",
    readinessNotes:
      "CUSTOMER READY WITH LIMITS — MP3 after Owner listening approval of cert-voice artifact sha256 d283144563a6fe2075be956fd144fe1c0bb4de29ec55ca308c5b8060c94647e4. WAV UNVERIFIED. Catalog honesty aligned to MP3-only in KITCHEN-PRODUCTION-READINESS-CLOSEOUT-1.",
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
    optionalTools: [TEXT_MODEL_TOOL],
    formatExportRequirements: [
      "Social Profile Setup Kit (CUSTOMER READY WITH LIMITS — PROFILE KIT)",
      "Platform-specific bio/about copy + URL/contact field map",
      "Profile image/avatar + cover/banner where platform supports one",
      "Platform-specific setup sheet with field-by-field checklist",
    ],
    extraLimitations: [
      "CUSTOMER READY WITH LIMITS — PROFILE KIT (KITCHEN-SOCIAL-PROFILE-PRODUCTION-1 Owner decision A+C).",
      "Kit delivery only — customer owns/creates the account and applies platform-side changes.",
      "No Studio login, OAuth mutation, password vault, or browser automation in this SKU path.",
      "Facebook Page mutation remains documented future-only: INTEGRATION READY / ACCOUNT-AUTH BLOCKER — NOT integrated; NOT sold as done-for-you mutation.",
      "Instagram direct profile mutation: UNSUPPORTED.",
      "TikTok direct profile mutation: UNSUPPORTED.",
      "Per-artifact copy QA and design QA required before delivery.",
    ],
    extraQaItems: [
      {
        id: "kit_not_mutation",
        label: "Deliverable is a setup kit — no login-based mutation claimed",
        reason: "Owner decision A+C menu honesty",
        source: "service_contract",
      },
      {
        id: "field_checklist_present",
        label: "Platform field map / setup checklist present",
        reason: "Kit deliverable",
        source: "deliverable_format",
      },
      {
        id: "no_password_workflow",
        label: "No raw-password or casual login-sharing workflow",
        reason: "Security + contract honesty",
        source: "service_contract",
      },
    ],
    readiness: "contract_ready",
    readinessNotes:
      "CUSTOMER READY WITH LIMITS — PROFILE KIT (KITCHEN-SOCIAL-PROFILE-PRODUCTION-1 A+C). Owner-independent path: Copy + Design (manual Canva) + platform field-map package. Customer applies on platform. Facebook Page API mutation preserved as future-only (not wired). Instagram/TikTok mutation UNSUPPORTED. NOT unlimited Customer Ready / NOT CERTIFIED.",
    specialNotes: [
      "Do not reopen Meta OAuth unless product strategy or customer demand justifies App Review cost.",
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
      "One responsive campaign page (HTML via studio-campaign-page-v1 structure) (CUSTOMER READY WITH LIMITS)",
      "One clear CTA with authoritative href",
      "Published via approved Studio page-delivery method (static-host API — Netlify adapter)",
    ],
    extraLimitations: [
      "CUSTOMER READY WITH LIMITS (KITCHEN-LANDING-PAGE-PRODUCTION-1).",
      "Customer-output mode must omit certification-fixture disclaimers (outputMode: \"customer\").",
      "Per-artifact responsive QA remains required before delivery (desktop/tablet/mobile); readiness does not inherit from prior page/hash.",
      "CTA / link / QR destination truth remains per-artifact QA before delivery.",
      "Custom-domain handling is separate unless already promised by the contract (rm-j005 does not promise custom domain).",
      "Not a full website, ecommerce, or custom application.",
      "Custom coding outside approved Studio structure is excluded.",
      "Team default must remain Public for new projects so routine pages are not private-by-default. Existing private sites cannot be flipped via current Netlify API — create a new public site instead (or Owner Make public once).",
      "Basic contact form is not enabled — link/tel/mailto CTA only unless structure later supports a form.",
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
        label: "Per-artifact mobile / tablet / desktop layout checked",
        reason: "CUSTOMER READY WITH LIMITS — responsive QA per artifact",
        source: "deliverable_format",
      },
      {
        id: "links_cta_tested",
        label: "Links, CTA, and QR destinations tested (per artifact)",
        reason: "CUSTOMER READY WITH LIMITS — destination truth per artifact",
        source: "service_contract",
      },
      {
        id: "no_placeholder_cta_href",
        label: "CTA href is authoritative (no # / TODO placeholders)",
        reason: "Kitchen landing-page production gate",
        source: "service_contract",
      },
      {
        id: "customer_output_no_cert_disclaimer",
        label: "Customer outputMode omits certification-fixture disclaimer",
        reason: "CUSTOMER READY WITH LIMITS — customer vs certification fixture",
        source: "service_contract",
      },
    ],
    readiness: "contract_ready",
    readinessNotes:
      "CUSTOMER READY WITH LIMITS (KITCHEN-LANDING-PAGE-PRODUCTION-1). Owner-independent work packet → studio-campaign-page-v1 HTML → Netlify API site create/deploy → public URL proven. Desktop/tablet/mobile Owner visual QA PASS (V4 mobile subline wrap). Limits: customer outputMode omits cert disclaimers; per-artifact responsive QA; CTA/link/QR destination truth per artifact; custom domain separate unless promised. NOT full unlimited Customer Ready / NOT CERTIFIED. CapCut/video untouched.",
    specialNotes: [
      "Copywriting beyond light editing of customer-supplied wording is excluded.",
      "Routine production = AI/tool runs landing-page pipeline from work packet — not Tagia hand-building HTML and not per-customer Studio eng releases.",
      "Do not deliver customer pages by adding permanent hardcoded Studio app routes per job.",
      "Preserve V1–V4 Cedar Lane fixture artifacts under docs/launch/kitchen-landing-page-production-1/artifacts/.",
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
    optionalTools: [TEXT_MODEL_TOOL],
    formatExportRequirements: [
      "Social Profile Update Kit (CUSTOMER READY WITH LIMITS — PROFILE KIT)",
      "Revised bio/about copy + URL/contact recommendations",
      "Updated profile/banner assets where applicable",
      "Before→after change sheet + field-replacement checklist",
    ],
    extraLimitations: [
      "CUSTOMER READY WITH LIMITS — PROFILE KIT (KITCHEN-SOCIAL-PROFILE-PRODUCTION-1 Owner decision A+C).",
      "Kit delivery only — customer applies unsupported platform-side changes.",
      "Not done-for-you profile management / login-based mutation.",
      "New logo creation from scratch excluded.",
      "Facebook Page mutation future-only (INTEGRATION READY / ACCOUNT-AUTH BLOCKER) — not wired.",
      "Instagram and TikTok direct profile mutation remain UNSUPPORTED.",
      "Per-artifact copy QA and design QA required before delivery.",
    ],
    extraQaItems: [
      {
        id: "one_platform_only",
        label: "Exactly one platform kit",
        reason: "Catalog exclusion: more than one platform",
        source: "catalog_exclusion",
      },
      {
        id: "kit_not_mutation",
        label: "Deliverable is an update kit — no login-based mutation claimed",
        reason: "Owner decision A+C menu honesty",
        source: "service_contract",
      },
      {
        id: "before_after_change_sheet",
        label: "Before→after change sheet present",
        reason: "Update kit deliverable",
        source: "deliverable_format",
      },
      {
        id: "no_new_content_creation",
        label: "No original social content creation claimed",
        reason: "Catalog exclusion",
        source: "catalog_exclusion",
      },
    ],
    readiness: "contract_ready",
    readinessNotes:
      "CUSTOMER READY WITH LIMITS — PROFILE KIT (KITCHEN-SOCIAL-PROFILE-PRODUCTION-1 A+C). Owner-independent path: Copy + Design (manual Canva) + before→after field-map package. Customer applies on platform. Meta OAuth not started. Instagram/TikTok mutation UNSUPPORTED. NOT unlimited Customer Ready / NOT CERTIFIED.",
  },
  "v2-rtu-flyer": {
    producerRole: "creative_production",
    /**
     * STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-1 — Owner-sealed:
     * Canva is not the operational executor for this SKU.
     * Thin Machine path: design spec → HTML/CSS → Playwright PNG/PDF.
     * Remaining design SKUs stay on Canva baseline until separately authorized.
     */
    primaryTool: {
      toolId: "studio_design_renderer",
      label: "Studio Design Renderer (HTML/CSS + Playwright)",
      required: true,
      integrationState: "integrated",
      toolReadiness: "contract_ready",
      note:
        "Owner-approved Machine path for v2-rtu-flyer only (DESIGN-RENDERER-PROOF-1). Canva is not on the fulfillment spine for this SKU. Make not required.",
    },
    formatExportRequirements: [
      "Final flattened digital export (PNG and/or PDF as appropriate)",
      "Editable source files are not included unless separately authorized",
      "One flyer — PDF + digital",
    ],
    readiness: "contract_ready",
    readinessNotes:
      "RTU flyer — creative_production + Studio Design Renderer (Owner-independent). Client distributes. Canva not required for this SKU.",
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
    /**
     * STUDIO-OPERATING-DESIGN-MENU-DISPATCH-HOOK-1 — Owner-authorized:
     * Canva is not the operational executor for this SKU.
     * Thin Machine path: menu design spec → sectioned HTML/CSS → Playwright PNG/PDF.
     * Visual Owner verdict: PASS WITH LIMITS (MENU-LAYOUT-1 max-load).
     * Remaining design SKUs stay on Canva baseline until separately authorized.
     */
    primaryTool: {
      toolId: "studio_design_renderer",
      label: "Studio Design Renderer (HTML/CSS + Playwright)",
      required: true,
      integrationState: "integrated",
      toolReadiness: "contract_ready",
      note:
        "Owner-approved Machine path for v2-rtu-menu only (MENU-PROOF-1 + MENU-LAYOUT-1 PASS WITH LIMITS). Canva is not on the fulfillment spine for this SKU. Make not required. Max 5 sections / 30 items TOTAL.",
    },
    formatExportRequirements: [
      "Final flattened digital export (PNG and/or PDF as appropriate)",
      "Editable source files are not included unless separately authorized",
      "One single-page menu — PDF + digital",
    ],
    readiness: "contract_ready",
    readinessNotes:
      "RTU menu — creative_production + Studio Design Renderer (Owner-independent, two-column capable). Client prints/shares. Canva not required for this SKU. Visual PASS WITH LIMITS.",
  },
  "v2-rtu-service-sheet": {
    producerRole: "creative_production",
    /**
     * STUDIO-OPERATING-DESIGN-SERVICE-SHEET-DISPATCH-HOOK-1 — Owner-authorized:
     * Canva is not the operational executor for this SKU.
     * Thin Machine path: service-sheet design spec → list HTML/CSS → Playwright PNG/PDF.
     * Pricing modes: listed | contact_for_pricing | omitted (no invented pricing).
     * Visual Owner control: SERVICE-SHEET-PROOF-1 PASS.
     * Remaining design SKUs stay on Canva baseline until separately authorized.
     */
    primaryTool: {
      toolId: "studio_design_renderer",
      label: "Studio Design Renderer (HTML/CSS + Playwright)",
      required: true,
      integrationState: "integrated",
      toolReadiness: "contract_ready",
      note:
        "Owner-approved Machine path for v2-rtu-service-sheet only (SERVICE-SHEET-PROOF-1). Canva is not on the fulfillment spine for this SKU. Make not required. Max 10 services; optional pricing modes.",
    },
    formatExportRequirements: [
      "Final flattened digital export (PNG and/or PDF as appropriate)",
      "Editable source files are not included unless separately authorized",
      "One single-page service sheet — PDF + digital",
    ],
    readiness: "contract_ready",
    readinessNotes:
      "RTU service sheet — creative_production + Studio Design Renderer (Owner-independent). Client prints/shares. Canva not required for this SKU.",
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
    /**
     * STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-DISPATCH-HOOK-1 — Owner-authorized:
     * Canva is not the operational executor for this SKU.
     * Thin Machine path: campaign-set design spec → dual HTML/CSS → Playwright PNG/PDF.
     * Executable plates now: Square 1024×1024 + Portrait 1024×1536 only.
     * Landscape may be recorded in intake but fails closed until promo landscape layout is proven.
     * Visual Owner control: PROMOTION-GRAPHICS-PROOF-1 PASS WITH LIMITS.
     * Remaining design SKUs stay on Canva baseline until separately authorized.
     */
    primaryTool: {
      toolId: "studio_design_renderer",
      label: "Studio Design Renderer (HTML/CSS + Playwright)",
      required: true,
      integrationState: "integrated",
      toolReadiness: "contract_ready",
      note:
        "Owner-approved Machine path for v2-rtu-promotion-graphics only (PROMOTION-GRAPHICS-PROOF-1 PASS WITH LIMITS + INTAKE-TRUTH-1). Canva is not on the fulfillment spine for this SKU. Make not required. Exactly two assets; Square+Portrait executable; Landscape fail-closed.",
    },
    formatExportRequirements: [
      "Final flattened digital export (PNG and/or PDF as appropriate)",
      "Editable source files are not included unless separately authorized",
      "Two coordinated campaign graphics — one agreed format/use per graphic",
    ],
    readiness: "contract_ready",
    readinessNotes:
      "RTU campaign graphics — creative_production + Studio Design Renderer (Owner-independent set). Distinct from published landing page (rm-j005). Canva not required for this SKU. Visual PASS WITH LIMITS.",
  },
  "v2-rtu-business-card": {
    producerRole: "creative_production",
    /**
     * STUDIO-OPERATING-DESIGN-BUSINESS-CARD-DISPATCH-HOOK-1 — Owner-authorized:
     * Canva is not the operational executor for this SKU.
     * Thin Machine path: card design spec → front+back HTML/CSS → Playwright PNG/PDF.
     * Remaining design SKUs stay on Canva baseline until separately authorized.
     * Visual Owner verdict: PASS WITH LIMITS (BUSINESS-CARD-PROOF-1).
     */
    primaryTool: {
      toolId: "studio_design_renderer",
      label: "Studio Design Renderer (HTML/CSS + Playwright)",
      required: true,
      integrationState: "integrated",
      toolReadiness: "contract_ready",
      note:
        "Owner-approved Machine path for v2-rtu-business-card only (DESIGN-BUSINESS-CARD-PROOF-1). Canva is not on the fulfillment spine for this SKU. Make not required. Double-sided front+back required.",
    },
    formatExportRequirements: [
      "Final flattened digital export (PNG and/or PDF as appropriate)",
      "Editable source files are not included unless separately authorized",
      "Business card design only (print excluded)",
      "Double-sided design — front and back",
    ],
    extraLimitations: ["Printing/shipping not included — design-only."],
    readiness: "contract_ready",
    readinessNotes:
      "RTU business card — creative_production + Studio Design Renderer (Owner-independent, double-sided). Client prints. Canva not required for this SKU. Visual PASS WITH LIMITS.",
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
      "CUSTOMER READY WITH LIMITS — MP3 only (KITCHEN-PRODUCTION-CERT-VOICE-1). WAV is UNVERIFIED / NOT CERTIFIED — post-launch enhancement only.",
    ],
    readiness: "contract_ready",
    readinessNotes:
      "CUSTOMER READY WITH LIMITS — MP3 via shared ElevenLabs MP3 listening certification (cert-voice). WAV UNVERIFIED. Catalog honesty aligned to MP3-only in KITCHEN-PRODUCTION-READINESS-CLOSEOUT-1. CapCut is not used for audio-only.",
  },
  "v2-rtu-short-video": {
    producerRole: "creative_production",
    primaryTool: SHOTSTACK_TOOL,
    optionalTools: [AI_VOICE_TOOL, CANVA_TOOL],
    formatExportRequirements: [
      "One basic short-form MP4, 15–30 seconds (CUSTOMER READY WITH LIMITS — MP4)",
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
      {
        id: "av_beat_synchronization_per_artifact",
        label: "Final A/V beat synchronization (per artifact)",
        reason:
          "KITCHEN-PRODUCTION-CERT-VIDEO-1 known limit — topic-card transitions can lag narration slightly; mandatory watch-with-sound QA before delivery; regenerate on fail; readiness does not inherit from prior video/hash",
        source: "service_contract",
      },
    ],
    extraLimitations: [
      "CUSTOMER READY WITH LIMITS — MP4 (KITCHEN-PRODUCTION-CERT-VIDEO-1).",
      "Final A/V beat synchronization remains a mandatory per-artifact QA check before customer delivery; if sync QA fails, regenerate before delivery.",
      "No customer artifact may inherit readiness from a prior video/hash (per-artifact gate).",
      "Stock-media capability UNRESOLVED for jobs that need stock.",
      "MUSIC CAPABILITY = UNRESOLVED — omit music until rights are certain.",
    ],
    readiness: "contract_ready",
    readinessNotes:
      "CUSTOMER READY WITH LIMITS — MP4 (KITCHEN-PRODUCTION-CERT-VIDEO-1). Owner-independent Shotstack Production proven. Known limit: topic-card transitions can lag narration slightly — final A/V beat sync is mandatory per-artifact QA before delivery. CapCut CLOSED — OWNER-INDEPENDENCE FAIL. Stock + music UNRESOLVED.",
    specialNotes: [
      "Client posts/distributes the finished video.",
      "Customer must provide organized usable footage when using their own visuals.",
      "Use SKU-appropriate narration (15–30s); do not force the 39s voice-cert fixture into short video.",
      "Stock-media capability UNRESOLVED for jobs that need stock — unused in this package.",
      "MUSIC CAPABILITY = UNRESOLVED — omit music until rights are certain (unused in this package).",
      "Tagia/Owner CapCut click-export is NOT an acceptable production success path.",
      "Primary producer: Shotstack Edit + Ingest API (Production/v1 for customer delivers; stage proofs under kitchen-video-integration-1).",
    ],
  },
};

/** Type guard helper for override lookup. */
export function getSkuOverride(skuId: ServiceId): SkuProductionOverride | undefined {
  return SKU_PRODUCTION_OVERRIDES[skuId as keyof typeof SKU_PRODUCTION_OVERRIDES];
}
