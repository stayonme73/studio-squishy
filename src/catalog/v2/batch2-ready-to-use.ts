/**
 * Catalog V2 — Batch 2: Ready-to-use campaign kits, audio/video, and post/publish add-on (DRAFT ONLY).
 *
 * Five held draft SKUs — four ready-to-use launch candidates plus post/publish add-on framework.
 * NOT in live SERVICE_CATALOG. NOT wired to Route Map, checkout, intake, Discovery,
 * or Recommendation Engine.
 *
 * Legacy references: em-001, sms-001, ap-001, vp-001, social_media-execution,
 * rm-j004, rm-j006 (scope/timing/placement hints only).
 */

import type { CatalogV2ServiceEntry } from "@/catalog/v2/types";
import { CATALOG_V2_DRAFT_SCHEMA_VERSION } from "@/catalog/v2/types";

export const CATALOG_V2_BATCH2_READY_TO_USE_BATCH_ID = "batch2-ready-to-use" as const;
export const CATALOG_V2_BATCH2_ADDONS_BATCH_ID = "batch2-addons" as const;

/** Shared price note — approved public V1 price for Batch 2 held draft SKUs (V2 draft only). */
export const CATALOG_V2_BATCH2_PUBLIC_V1_PRICE_NOTE = "approved public V1 price (Batch 2)";

/** Shared Batch 2 delivery rule — documented on each ready-to-use record. */
export const CATALOG_V2_BATCH2_DELIVERY_RULE =
  "The Studio creates the finished deliverable. The client sends, uploads, prints, posts, or distributes it unless they separately buy a clearly scoped post/publish add-on.";

export const CATALOG_V2_BATCH2_RTU_CLIENT_RESPONSIBILITY =
  "Client sends, uploads, posts, or distributes delivered files through their own platform, account, or tools unless they separately purchase a scoped post/publish add-on.";

/** Required email-kit client responsibility — list, consent, sending, and replies stay with client. */
export const CATALOG_V2_BATCH2_EMAIL_CLIENT_RESPONSIBILITY =
  "Client is responsible for their own audience/list, consent, sending account, replies, opt-outs, and all customer communication; client sends delivered campaign files through their own email platform.";

/** Required SMS-kit client responsibility — list, consent, sending, and replies stay with client. */
export const CATALOG_V2_BATCH2_SMS_CLIENT_RESPONSIBILITY =
  "Client is responsible for their own audience/list, consent, sending account, replies, opt-outs, and all customer communication; client sends delivered message files through their own SMS platform.";

type Batch2BaseOverrides = {
  priceCents?: number | null;
  priceNote?: string;
  batchLaunchCandidate?: boolean;
  launchSetStatus?: CatalogV2ServiceEntry["launchSetStatus"];
  routeMapEligible?: boolean;
  directExitEligible?: boolean;
  placement?: CatalogV2ServiceEntry["placement"];
  laneEligibility?: CatalogV2ServiceEntry["laneEligibility"];
  turnaroundApprovalStatus?: CatalogV2ServiceEntry["turnaroundApprovalStatus"];
  clientResponsibilityAfterDelivery?: string;
  scopeRoutingNote?: string;
  deliveryType?: CatalogV2ServiceEntry["deliveryType"];
  draftBatch?: string;
  sourceExecutionMode?: CatalogV2ServiceEntry["sourceExecutionMode"];
};

function batch2ReadyToUseBase(
  entry: Omit<
    CatalogV2ServiceEntry,
    | "schemaVersion"
    | "availability"
    | "deliveryType"
    | "routeMapEligible"
    | "directExitEligible"
    | "placement"
    | "laneEligibility"
    | "intakeTemplate"
    | "isRouteMapJob"
    | "isDraftOnly"
    | "draftBatch"
    | "batchLaunchCandidate"
    | "launchSetStatus"
    | "deliveryRule"
    | "clientResponsibilityAfterDelivery"
    | "turnaroundApprovalStatus"
    | "priceCents"
    | "priceNote"
  > &
    Batch2BaseOverrides,
): CatalogV2ServiceEntry {
  return {
    schemaVersion: CATALOG_V2_DRAFT_SCHEMA_VERSION,
    availability: "held",
    deliveryType: "ready_to_use",
    routeMapEligible: false,
    directExitEligible: false,
    placement: "none",
    laneEligibility: [],
    intakeTemplate: "",
    isRouteMapJob: false,
    isDraftOnly: true,
    draftBatch: CATALOG_V2_BATCH2_READY_TO_USE_BATCH_ID,
    batchLaunchCandidate: true,
    launchSetStatus: "launch_candidate",
    deliveryRule: CATALOG_V2_BATCH2_DELIVERY_RULE,
    clientResponsibilityAfterDelivery: CATALOG_V2_BATCH2_RTU_CLIENT_RESPONSIBILITY,
    turnaroundApprovalStatus: "proposed",
    priceCents: null,
    priceNote: "no approved price yet",
    ...entry,
  };
}

function batch2PostPublishAddonBase(
  entry: Omit<
    CatalogV2ServiceEntry,
    | "schemaVersion"
    | "availability"
    | "deliveryType"
    | "routeMapEligible"
    | "directExitEligible"
    | "placement"
    | "laneEligibility"
    | "intakeTemplate"
    | "isRouteMapJob"
    | "isDraftOnly"
    | "draftBatch"
    | "batchLaunchCandidate"
    | "launchSetStatus"
    | "deliveryRule"
    | "clientResponsibilityAfterDelivery"
    | "turnaroundApprovalStatus"
    | "priceCents"
    | "priceNote"
    | "revisionLimit"
    | "sourceExecutionMode"
  > &
    Batch2BaseOverrides,
): CatalogV2ServiceEntry {
  return {
    schemaVersion: CATALOG_V2_DRAFT_SCHEMA_VERSION,
    availability: "held",
    deliveryType: "post_publish",
    routeMapEligible: false,
    directExitEligible: false,
    placement: "none",
    laneEligibility: [],
    intakeTemplate: "",
    isRouteMapJob: false,
    isDraftOnly: true,
    draftBatch: CATALOG_V2_BATCH2_ADDONS_BATCH_ID,
    batchLaunchCandidate: false,
    launchSetStatus: "held_broad_overlap",
    deliveryRule:
      "Add-on only — schedules or publishes included approved deliverables from an eligible parent social or video job on one connected client-owned platform when purchased together.",
    clientResponsibilityAfterDelivery:
      "Client provides connected platform access, timely approval before publish, and remains responsible for account activity, comments, DMs, analytics, and compliance after publish.",
    turnaroundApprovalStatus: "proposed",
    priceCents: null,
    priceNote: "no approved price yet",
    revisionLimit: 0,
    sourceExecutionMode: "managed_execution_when_selected",
    ...entry,
  };
}

/**
 * Batch 2 draft entries — held (public V1 prices approved; batch not activated).
 * Merged into CATALOG_V2_DRAFT via draft-catalog.ts; isolated from live catalog.
 */
export const CATALOG_V2_BATCH2_READY_TO_USE: readonly CatalogV2ServiceEntry[] = [
  batch2ReadyToUseBase({
    sku: "v2-rtu-email-kit",
    clientFacingName: "Make My Email Campaign Kit",
    category: "email-marketing",
    familyId: "email_marketing",
    legacySourceSku: "em-001",
    legacyPriceReferenceCents: 32500,
    legacyPriceReferenceNote:
      "em-001 Email Campaign Build is $325 for up to two client-ready emails with subject lines and preview text — approved public V1 price for this SKU is $350.",
    priceCents: 35000,
    priceNote: CATALOG_V2_BATCH2_PUBLIC_V1_PRICE_NOTE,
    turnaroundApprovalStatus: "approved",
    clientResponsibilityAfterDelivery: CATALOG_V2_BATCH2_EMAIL_CLIENT_RESPONSIBILITY,
    scopeRoutingNote:
      "Automation, segmentation, list building, monthly batches, or more than two emails route to Help Me Figure Out What I Need (rm-j001), not into this SKU.",
    includedDeliverables: [
      {
        key: "marketing_email",
        quantity: 2,
        unit: "emails",
        label:
          "Up to two finished marketing emails for one campaign — subject lines, preview text, finished body copy, CTA, and simple layout direction for each",
      },
      {
        key: "email_content_files",
        quantity: 1,
        unit: "file",
        label:
          "Plain-text and simple HTML-ready email content files the client can paste into their own email platform",
      },
    ],
    exclusions: [
      "Email sending, scheduling, or platform access — email kit only, not a sending service",
      "List building, list buying, list cleaning, or segmentation",
      "Consent collection or subscriber management",
      "Reply management or customer communication",
      "Automation, CRM integration, or custom HTML coding",
      "Platform setup or deliverability troubleshooting",
      "More than two emails",
      "More than one campaign goal or offer",
      "Performance guarantees",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: "Usually within 3–5 business days after intake is complete.",
    billingType: "one_time",
    sourceLaunchStatus: "active",
    productionLane: "standard_build",
    sourceExecutionMode: "creation_delivery",
    intakeTemplateFieldsTbd: [
      "One campaign goal (offer, event, promotion, launch, or follow-up)",
      "Exact copy, offer details, dates, links, and required wording",
      "Logo, photos, colors, or brand materials",
      "Call to action for each email",
      "Any required disclaimers or compliance wording (client-supplied)",
      "Anything that must not be said or shown",
    ],
  }),
  batch2ReadyToUseBase({
    sku: "v2-rtu-sms-kit",
    clientFacingName: "Make My Text Message Campaign Kit",
    category: "sms-marketing",
    familyId: "sms_marketing",
    legacySourceSku: "sms-001",
    legacyPriceReferenceCents: 17500,
    legacyPriceReferenceNote:
      "sms-001 SMS Campaign Build is $175 for up to four client-ready SMS messages — approved public V1 price for this SKU is $225.",
    priceCents: 22500,
    priceNote: CATALOG_V2_BATCH2_PUBLIC_V1_PRICE_NOTE,
    turnaroundApprovalStatus: "approved",
    clientResponsibilityAfterDelivery: CATALOG_V2_BATCH2_SMS_CLIENT_RESPONSIBILITY,
    scopeRoutingNote:
      "MMS, automation, monthly batches, consent setup, or more than four messages route to Help Me Figure Out What I Need (rm-j001), not into this SKU.",
    includedDeliverables: [
      {
        key: "sms_message",
        quantity: 4,
        unit: "messages",
        label:
          "Up to four client-ready SMS messages for one campaign goal — promotion, event, reminder, offer, launch, or follow-up",
      },
      {
        key: "sms_sequence",
        quantity: 1,
        unit: "document",
        label: "Suggested sending order/sequence and timing document",
      },
      {
        key: "sms_message_file",
        quantity: 1,
        unit: "file",
        label: "Plain-text message file with all approved SMS copy ready to paste into the client's SMS platform",
      },
    ],
    exclusions: [
      "SMS sending, scheduling, or platform access — SMS kit only, not a sending service",
      "Contact/list management or audience building",
      "Consent collection, opt-out handling, or legal compliance review",
      "Reply management or customer communication",
      "MMS graphics, video, or attachments",
      "Automation or platform setup",
      "More than four messages",
      "More than one campaign goal",
      "Performance guarantees",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: "Usually within 2–3 business days after intake is complete.",
    billingType: "one_time",
    sourceLaunchStatus: "paused",
    productionLane: "quick_turn",
    sourceExecutionMode: "creation_delivery",
    intakeTemplateFieldsTbd: [
      "One campaign goal (promotion, event, reminder, offer, launch, or follow-up)",
      "Exact message copy or talking points for up to four SMS messages",
      "Offer details, dates, links, phone, or call to action",
      "Character limits or platform constraints, if known",
      "Any required opt-out or compliance wording (client-supplied and client-verified)",
      "Anything that must not be said or shown",
    ],
  }),
  batch2ReadyToUseBase({
    sku: "v2-rtu-voice",
    clientFacingName: "Make Me a Voice Announcement",
    category: "audio-production",
    familyId: "ai_voice_over",
    legacySourceSku: "ap-001",
    legacyPriceReferenceCents: 17500,
    legacyPriceReferenceNote:
      "ap-001 AI Voice Over Production is $175 for one track up to 300 words — approved public V1 price for this SKU is $250.",
    priceCents: 25000,
    priceNote: CATALOG_V2_BATCH2_PUBLIC_V1_PRICE_NOTE,
    turnaroundApprovalStatus: "approved",
    clientResponsibilityAfterDelivery:
      "Client provides approved details and facts for the script and is responsible for pronunciation accuracy, claims, and rights; client uploads, embeds, or distributes the delivered audio file through their own tools.",
    scopeRoutingNote:
      "Visual/motion pieces, posting, multiple platforms, or scope beyond one short voice track route to Help Me Figure Out What I Need (rm-j001) or rm-j006 patterns, not into this SKU.",
    includedDeliverables: [
      {
        key: "voice_script",
        quantity: 1,
        unit: "script",
        label:
          "Short announcement script written by The Studio from client-approved details and facts (up to 300 words)",
      },
      {
        key: "ai_voice_over_track",
        quantity: 1,
        unit: "audio",
        label: "One AI-generated voice-over track — one approved voice style; one language",
      },
      {
        key: "voice_audio_file",
        quantity: 1,
        unit: "file",
        label: "Final MP3 or WAV audio file",
      },
    ],
    exclusions: [
      "Voice cloning or celebrity/public-figure imitation",
      "Human voice recording or multiple speakers/voices",
      "Translations or multiple languages",
      "Music production or advanced audio mixing",
      "Visual, motion, or social post assembly",
      "Posting, publishing, or scheduling",
      "More than 300 script words",
      "Legal claim review",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: "Usually within 2–3 business days after intake is complete.",
    billingType: "one_time",
    sourceLaunchStatus: "active",
    productionLane: "quick_turn",
    sourceExecutionMode: "creation_delivery",
    intakeTemplateFieldsTbd: [
      "Announcement purpose and key message",
      "Approved details, facts, offers, dates, and required wording for The Studio to write the script",
      "Pronunciation notes for names, products, and offers",
      "Preferred voice style/tone",
      "Language (one language only)",
      "Anything that must not be said",
    ],
  }),
  batch2ReadyToUseBase({
    sku: "v2-rtu-short-video",
    clientFacingName: "Make Me a Short Video",
    category: "video-production",
    familyId: "marketing_video",
    legacySourceSku: "vp-001",
    legacyPriceReferenceCents: 79500,
    legacyPriceReferenceNote:
      "vp-001 Marketing Video Project is $795 for one video up to 60 seconds — approved public V1 price for this SKU is $550.",
    priceCents: 55000,
    priceNote: CATALOG_V2_BATCH2_PUBLIC_V1_PRICE_NOTE,
    turnaroundApprovalStatus: "approved",
    clientResponsibilityAfterDelivery:
      "Client supplies usable organized footage, photos, logo, and source materials when using client visuals; client uploads, posts, or distributes the delivered MP4 through their own platform unless they separately purchase post/publish add-on with this job.",
    scopeRoutingNote:
      "On-site filming, multiple cuts/aspect ratios, videos longer than 45 seconds, paid placement, or posting scope route to Help Me Figure Out What I Need (rm-j001) or rm-j004 patterns, not into this SKU.",
    includedDeliverables: [
      {
        key: "marketing_video",
        quantity: 1,
        unit: "video",
        label:
          "One short-form video up to 45 seconds — one format only: vertical, square, or landscape; one campaign, offer, event, or promotion focus",
      },
      {
        key: "video_mp4",
        quantity: 1,
        unit: "file",
        label:
          "Final MP4 with basic edit, on-screen captions, and CTA treatment — using client footage or approved Studio/stock/AI visuals",
      },
    ],
    exclusions: [
      "On-site filming, drone footage, or talent casting",
      "Photography or custom illustration source creation",
      "Advanced custom animation or motion graphics",
      "Multiple aspect ratios, cuts, or versions",
      "Video longer than 45 seconds",
      "Music licensing outside approved tools",
      "Paid ads, placement, or influencer work",
      "Posting, publishing, or scheduling (unless post/publish add-on purchased with this job)",
      "Ongoing edits or daily content",
      "Performance guarantees",
      "More than one revision round",
    ],
    revisionLimit: 1,
    turnaround: "Usually within 3–5 business days after intake is complete.",
    billingType: "one_time",
    sourceLaunchStatus: "paused",
    productionLane: "complex_build",
    sourceExecutionMode: "creation_delivery",
    intakeTemplateFieldsTbd: [
      "Video purpose (campaign, offer, event, service, or promotion focus)",
      "One format choice: vertical, square, or landscape",
      "Client footage OR approved Studio/stock/AI visuals — photos, logo, and source materials as applicable",
      "Exact on-screen text, offer details, dates, and CTA",
      "Brand colors, fonts, or style references",
      "Any required disclaimers or legal wording (client-supplied)",
      "Anything that must not be shown or said",
    ],
  }),
  batch2PostPublishAddonBase({
    sku: "v2-addon-post-publish",
    clientFacingName: "Post/Publish for Me",
    category: "add-on-services",
    familyId: "social_media",
    legacySourceSku: "social_media-execution",
    legacyPriceReferenceCents: 10000,
    legacyPriceReferenceNote:
      "social_media-execution Social Scheduling & Publishing is $100 add-on to sm-001 — this V2 add-on applies only to approved social posts or short video parent jobs, not standalone shelf purchase.",
    priceCents: 10000,
    priceNote: CATALOG_V2_BATCH2_PUBLIC_V1_PRICE_NOTE,
    turnaroundApprovalStatus: "approved",
    scopeRoutingNote:
      "Not a standalone ready-to-use shelf item — purchase only with an eligible approved social posts or short video parent job (v2-rtu-social-posts, v2-rtu-short-video). Scope beyond one connected platform or included parent deliverables routes to rm-j001.",
    includedDeliverables: [
      {
        key: "social_scheduling_publishing",
        quantity: 1,
        unit: "execution",
        label:
          "Schedules or publishes one approved deliverable from the purchased eligible parent social posts or short video job on one connected client-owned platform",
      },
    ],
    exclusions: [
      "Standalone purchase without an eligible parent social posts or short video job",
      "Ready-to-use marketing assets without a social/video post deliverable (flyers, menus, handouts, email kits, SMS kits, voice-only audio)",
      "Account setup or additional platform connections",
      "Comments, DMs, engagement, community management, or reply handling",
      "Analytics, reporting, or paid ads",
      "Extra posts, formats, or deliverables beyond the parent job scope",
      "Same-day change requests after scheduling",
    ],
    turnaround: "Usually within 1–2 business days after approval and clean access.",
    billingType: "one_time",
    sourceLaunchStatus: "limited",
    productionLane: "quick_turn",
    intakeTemplateFieldsTbd: [
      "Eligible parent job reference (social posts or short video SKU purchased together)",
      "One connected client-owned platform/account for publish",
      "Preferred publish date/time window",
      "Approval confirmation before publish",
    ],
  }),
];

/** Batch 2 ready-to-use launch candidate SKUs — four kits/media jobs (post/publish add-on excluded). */
export const CATALOG_V2_BATCH2_LAUNCH_CANDIDATE_SKUS = [
  "v2-rtu-email-kit",
  "v2-rtu-sms-kit",
  "v2-rtu-voice",
  "v2-rtu-short-video",
] as const;

/** Eligible parent SKUs for v2-addon-post-publish — approved social/video jobs only (draft reference). */
export const CATALOG_V2_BATCH2_POST_PUBLISH_ELIGIBLE_PARENT_SKUS = [
  "v2-rtu-social-posts",
  "v2-rtu-short-video",
] as const;

/** Batch 2 launch candidate entries — filters out add-on framework SKU. */
export const CATALOG_V2_BATCH2_LAUNCH_CANDIDATES: readonly CatalogV2ServiceEntry[] =
  CATALOG_V2_BATCH2_READY_TO_USE.filter((entry) => entry.batchLaunchCandidate !== false);

/** Batch 2 draft entries only — all five held SKUs including post/publish add-on. */
export function getBatch2DraftEntries(): readonly CatalogV2ServiceEntry[] {
  return CATALOG_V2_BATCH2_READY_TO_USE;
}

/** Batch 2 launch candidate entries only — four ready-to-use SKUs for shelf review. */
export function getBatch2LaunchCandidateEntries(): readonly CatalogV2ServiceEntry[] {
  return CATALOG_V2_BATCH2_LAUNCH_CANDIDATES;
}
