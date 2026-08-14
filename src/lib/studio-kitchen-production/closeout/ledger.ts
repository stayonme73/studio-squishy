/**
 * KITCHEN-PRODUCTION-READINESS-CLOSEOUT-1 — final active-SKU production truth ledger.
 * Source of launch disposition truth for Owner review. No commerce activation.
 */

import { getServiceById } from "@/catalog/accessors";
import { getRouteMapPriceDisplay } from "@/catalog/route-map-display";

import { ACTIVE_CUSTOMER_FACING_SKUS } from "../active-set";
/** Deep imports — avoid Kitchen cert barrels that pull Node-only QA/runtime into client graphs. */
import { CERT_COPY_SKUS } from "../cert-copy/fixture";
import { CERT_DESIGN_TESTED_SKUS } from "../cert-design/fixtures";
import { CERT_VOICE_TESTED_SKUS } from "../cert-voice/fixtures";
import { resolveServiceProductionContract } from "../resolve-contract";
import { CERT_VIDEO_CERTIFIED_SKU } from "../video-cert/finalization";

import type {
  CloseoutVerdict,
  FinalActiveSkuLedgerRow,
  LaunchDisposition,
  ProductionToolLedgerRow,
  RedFlag,
} from "./types";
import { CLOSEOUT_PACKAGE_ID, CLOSEOUT_STARTING_COMMIT } from "./types";

type StaticLedgerFields = Omit<
  FinalActiveSkuLedgerRow,
  | "customerFacingName"
  | "priceDisplay"
  | "productionRole"
  | "productionMechanismTool"
  | "requiredCustomerInputs"
>;

/**
 * Closeout-normalized readiness + launch disposition per active SKU.
 * Catalog name/price/role/tool/inputs are resolved live from contracts.
 */
const STATIC_LEDGER: Record<
  (typeof ACTIVE_CUSTOMER_FACING_SKUS)[number],
  StaticLedgerFields
> = {
  "bf-001": {
    skuId: "bf-001",
    exactDeliverable:
      "One-page Brand Direction Sheet + one branded profile or cover graphic (no new logo from scratch)",
    customerResponsibility:
      "Provide brand materials, accurate business facts, and approve direction; no Studio logo-from-scratch expectation",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — METHOD COVERED",
    readinessLimitations: [
      "No new logo creation",
      "HEX palette required",
      "Manual Canva path (no live Canva API)",
      "Not individually design-cert sealed — mechanism covered by certified Canva design path",
    ],
    certificationEvidencePackage:
      "KITCHEN-PRODUCTION-CAPABILITY-1 + design method from KITCHEN-PRODUCTION-CERT-DESIGN-1 (adjacent Canva path)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "sm-001": {
    skuId: "sm-001",
    exactDeliverable:
      "Up to six static social posts + captions + simple calendar (no reels; Studio does not post)",
    customerResponsibility:
      "Provide offer facts/brand assets; client posts and schedules on their own accounts",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — METHOD COVERED",
    readinessLimitations: [
      "≤6 static posts",
      "No reels / advanced motion",
      "Posting/execution out of base SKU",
      "Manual Canva — mechanism covered by certified v2-rtu-social-posts design path",
    ],
    certificationEvidencePackage:
      "KITCHEN-PRODUCTION-CERT-DESIGN-1 (method) + KITCHEN-PRODUCTION-CAPABILITY-1",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "sm-001-monthly": {
    skuId: "sm-001-monthly",
    exactDeliverable:
      "Monthly batch up to six static posts + captions + calendar (no engagement management)",
    customerResponsibility:
      "Provide monthly offer facts; client posts; no Studio community management",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — METHOD COVERED",
    readinessLimitations: [
      "Pay-per-cycle Machine path via Studio Design Renderer (cycle-keyed wrapper)",
      "Explicit productionCycleId target + locked plannedPostCount ∈ {4,5,6}",
      "≤6 posts/cycle",
      "No engagement / DMs / ads",
      "No automatic renewal / no Stripe subscription",
    ],
    certificationEvidencePackage:
      "KITCHEN-PRODUCTION-CERT-DESIGN-1 (method) + SM-001-MONTHLY-DISPATCH-HOOK-1",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "em-001": {
    skuId: "em-001",
    exactDeliverable: "Up to two emails with subjects/CTAs (Studio does not send)",
    customerResponsibility:
      "Own list/CRM; paste/send from customer platform; supply accurate offer facts",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — COPY",
    readinessLimitations: [
      "≤2 emails",
      "List building / CRM / live send excluded",
      "Copy quality gate required at qa_pass",
    ],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-COPY-1 (cfff55d)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "em-001-monthly": {
    skuId: "em-001-monthly",
    exactDeliverable: "Monthly email copy batch within SKU limits (Studio does not send)",
    customerResponsibility:
      "Own list/CRM; paste/send monthly; supply accurate recurring offer facts",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — METHOD COVERED",
    readinessLimitations: [
      "Same copy_channels method as certified em-001",
      "Not individually copy-cert sealed",
      "No live send / CRM",
    ],
    certificationEvidencePackage:
      "KITCHEN-PRODUCTION-CERT-COPY-1 (method via em-001)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "cc-001": {
    skuId: "cc-001",
    exactDeliverable:
      "Up to three marketing copy assets / ≤750 words total (paste-ready document)",
    customerResponsibility: "Provide facts/claims; approve; distribute copy as needed",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — COPY",
    readinessLimitations: [
      "≤3 assets / ≤750 words",
      "No Canva/CapCut dependency",
      "Copy quality gate required at qa_pass",
    ],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-COPY-1 (cfff55d)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "ma-001": {
    skuId: "ma-001",
    exactDeliverable:
      "Up to four branded standard-format digital assets (source files not default)",
    customerResponsibility:
      "Provide final copy/facts and brand assets; distribute finished exports",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — DESIGN",
    readinessLimitations: [
      "≤4 assets",
      "Editable Canva source not included by default",
      "Manual Canva path; print pixels not live-API proven",
      "Per-artifact design QA gate",
    ],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-DESIGN-1 (664af4c)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "ap-001": {
    skuId: "ap-001",
    exactDeliverable: "One AI voice-over track as final MP3 (≤300 words; one style/language)",
    customerResponsibility:
      "Final script, pronunciation notes, accurate claims/rights, approval",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — MP3",
    readinessLimitations: [
      "MP3 only",
      "WAV UNVERIFIED / not currently offered",
      "No voice cloning",
      "Scriptwriting not included unless selected separately",
    ],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-VOICE-1 (5348ba7)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "rm-j002": {
    skuId: "rm-j002",
    exactDeliverable:
      "Social Profile Setup Kit for one platform (copy + assets + field-by-field setup sheet)",
    customerResponsibility:
      "Own/create the account; complete platform login/security; apply kit fields and assets on-platform",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — PROFILE KIT",
    readinessLimitations: [
      "Kit delivery only — no Studio login/OAuth mutation",
      "Facebook Page API mutation future-only (not wired)",
      "Instagram/TikTok direct mutation UNSUPPORTED",
      "One platform; no posting/ads/community management",
    ],
    certificationEvidencePackage: "KITCHEN-SOCIAL-PROFILE-PRODUCTION-1 (2c8b40f)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "rm-j005": {
    skuId: "rm-j005",
    exactDeliverable:
      "One responsive campaign page (studio-campaign-page-v1) published to a public Netlify URL",
    customerResponsibility:
      "Provide wording/logo/images/pricing/dates/links; no custom-domain expectation in base SKU",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS",
    readinessLimitations: [
      "Per-artifact responsive QA (desktop/tablet/mobile)",
      "Per-artifact CTA/link/QR destination truth",
      "Custom domain separate / not included",
      "No form by default; not a full website",
      "Customer outputMode must omit cert disclaimers",
    ],
    certificationEvidencePackage: "KITCHEN-LANDING-PAGE-PRODUCTION-1 (a8f58f7)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "rm-j007": {
    skuId: "rm-j007",
    exactDeliverable:
      "Corrected final export of one named existing promotional item (no redesign)",
    customerResponsibility:
      "Name the existing item; supply exact replacement facts/assets only",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — METHOD COVERED",
    readinessLimitations: [
      "Named item only — not a redesign/new concept",
      "Manual Canva/file edit operational path",
      "Not individually design-cert sealed",
    ],
    certificationEvidencePackage:
      "KITCHEN-PRODUCTION-CAPABILITY-1 + Canva design method (CERT-DESIGN)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "rm-j008": {
    skuId: "rm-j008",
    exactDeliverable:
      "Social Profile Update Kit for one platform (revised copy/assets + before→after change sheet)",
    customerResponsibility:
      "Apply unsupported platform-side changes; own account; supply accurate before-state facts",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — PROFILE KIT",
    readinessLimitations: [
      "Kit delivery only — no login-based mutation",
      "One platform; no new content creation / posting",
      "Facebook mutation future-only; IG/TT mutation UNSUPPORTED",
    ],
    certificationEvidencePackage: "KITCHEN-SOCIAL-PROFILE-PRODUCTION-1 (2c8b40f)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "v2-rtu-flyer": {
    skuId: "v2-rtu-flyer",
    exactDeliverable: "One flyer — PDF + digital export (client distributes)",
    customerResponsibility: "Provide offer/contact facts; distribute/print as needed",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — DESIGN",
    readinessLimitations: [
      "Manual Canva path",
      "Exact catalog print pixels not API-proven",
      "Per-artifact design QA",
    ],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-DESIGN-1 (664af4c)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "v2-rtu-menu": {
    skuId: "v2-rtu-menu",
    exactDeliverable: "One menu design export",
    customerResponsibility: "Provide menu items/prices/facts; distribute export",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — DESIGN",
    readinessLimitations: ["Manual Canva path", "Per-artifact design QA"],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-DESIGN-1 (664af4c)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "v2-rtu-service-sheet": {
    skuId: "v2-rtu-service-sheet",
    exactDeliverable: "One service sheet export",
    customerResponsibility: "Provide services/pricing/contact; distribute export",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — DESIGN",
    readinessLimitations: ["Manual Canva path", "Per-artifact design QA"],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-DESIGN-1 (664af4c)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "v2-rtu-social-posts": {
    skuId: "v2-rtu-social-posts",
    exactDeliverable: "Four RTU social posts (design/copy package; client posts)",
    customerResponsibility: "Client posts/schedules on their accounts",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — DESIGN",
    readinessLimitations: [
      "Exactly four posts unless catalog allows fewer with reason",
      "Studio does not post",
      "Manual Canva path",
    ],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-DESIGN-1 (664af4c)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "v2-rtu-promotion-graphics": {
    skuId: "v2-rtu-promotion-graphics",
    exactDeliverable: "Two campaign graphics (static; distinct from rm-j005 page)",
    customerResponsibility: "Provide campaign facts; distribute graphics",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — DESIGN",
    readinessLimitations: [
      "Static graphics only — not a published landing page",
      "Manual Canva path",
    ],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-DESIGN-1 (664af4c)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "v2-rtu-business-card": {
    skuId: "v2-rtu-business-card",
    exactDeliverable: "Business card design only (print/ship excluded)",
    customerResponsibility: "Provide contact details; arrange own print/ship",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — DESIGN",
    readinessLimitations: ["Design-only — printing/shipping excluded", "Manual Canva path"],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-DESIGN-1 (664af4c)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "v2-rtu-email-kit": {
    skuId: "v2-rtu-email-kit",
    exactDeliverable:
      "Up to two RTU emails — paste-ready kit (Studio does not send)",
    customerResponsibility: "Paste into customer email platform and send",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — COPY",
    readinessLimitations: ["≤2 emails", "No transport/CRM", "Copy quality gate"],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-COPY-1 (cfff55d)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "v2-rtu-sms-kit": {
    skuId: "v2-rtu-sms-kit",
    exactDeliverable:
      "Up to four RTU SMS messages — paste-ready (Studio does not send)",
    customerResponsibility: "Paste into customer SMS platform and send",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — COPY",
    readinessLimitations: ["≤4 SMS", "No Twilio/SMS transport", "Copy quality gate"],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-COPY-1 (cfff55d)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "v2-rtu-voice": {
    skuId: "v2-rtu-voice",
    exactDeliverable:
      "Short announcement script when needed + final MP3 for client distribution",
    customerResponsibility:
      "Provide approved facts; confirm pronunciation/claims/rights; upload/distribute audio",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — MP3",
    readinessLimitations: [
      "MP3 only",
      "WAV UNVERIFIED / not currently offered",
      "Client distributes audio",
      "≤300 words",
    ],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-VOICE-1 (5348ba7)",
    unresolvedDependency: null,
    launchDisposition: "SELL WITH LIMITS",
  },
  "v2-rtu-short-video": {
    skuId: "v2-rtu-short-video",
    exactDeliverable:
      "One basic short-form MP4, 15–30 seconds, one aspect ratio, captions + CTA",
    customerResponsibility:
      "Provide organized usable footage when using own visuals; post/distribute finished video",
    ownerRoutineResponsibility: "NONE",
    engineeringIndependence: "NONE",
    readinessStatus: "CUSTOMER READY WITH LIMITS — MP4",
    readinessLimitations: [
      "15–30 seconds only",
      "Per-artifact A/V beat sync QA mandatory",
      "Stock-media UNRESOLVED when stock is required",
      "Music UNRESOLVED — omit until rights certain",
      "CapCut CLOSED — not an active producer",
    ],
    certificationEvidencePackage: "KITCHEN-PRODUCTION-CERT-VIDEO-1 (dc82de7)",
    unresolvedDependency:
      "Stock/music remain unresolved for jobs that need them (does not block customer-footage path)",
    launchDisposition: "SELL WITH LIMITS",
  },
};

export function buildFinalActiveSkuLedger(): readonly FinalActiveSkuLedgerRow[] {
  return ACTIVE_CUSTOMER_FACING_SKUS.map((skuId) => {
    const staticRow = STATIC_LEDGER[skuId];
    const service = getServiceById(skuId);
    if (!service) {
      throw new Error(`Active SKU ${skuId} missing from catalog`);
    }
    const resolved = resolveServiceProductionContract(skuId);
    if (resolved.status !== "resolved") {
      throw new Error(`Active SKU ${skuId} failed contract resolve: ${resolved.status}`);
    }
    const { contract } = resolved;
    return {
      ...staticRow,
      customerFacingName: service.name,
      priceDisplay: getRouteMapPriceDisplay(service),
      productionRole: contract.producerRole,
      productionMechanismTool: `${contract.primaryTool.label} [${contract.primaryTool.toolId}]`,
      requiredCustomerInputs: contract.requiredCustomerInputs,
    };
  });
}

export const FINAL_PRODUCTION_TOOL_LEDGER: readonly ProductionToolLedgerRow[] = [
  {
    tool: "ElevenLabs",
    studioJob: "Customer deliverable TTS (ap-001, v2-rtu-voice)",
    status: "ACTIVE — CUSTOMER READY WITH LIMITS — MP3",
    accountRequired: "Yes (Studio ElevenLabs account)",
    credentialType: "ELEVENLABS_API_KEY (server-only)",
    costPlanStatus: "Owner-managed plan; MP3 path proven",
    productionDependency: "Required for voice SKUs",
    replacementHistoryStatus: "Current provider",
    currentLimitation: "WAV unverified / not currently offered",
  },
  {
    tool: "Shotstack",
    studioJob: "Short-video MP4 assembly/render (v2-rtu-short-video)",
    status: "ACTIVE — CUSTOMER READY WITH LIMITS — MP4",
    accountRequired: "Yes (Stage + Production keys)",
    credentialType: "SHOTSTACK_API_KEY + SHOTSTACK_PRODUCTION_API_KEY",
    costPlanStatus: "Owner-managed; Production/v1 for customer delivers",
    productionDependency: "Required for short video",
    replacementHistoryStatus: "Replaced CapCut as active producer",
    currentLimitation: "Per-artifact A/V beat sync QA; stock/music unresolved",
  },
  {
    tool: "Netlify",
    studioJob: "Public campaign-page publish (rm-j005)",
    status: "ACTIVE — CUSTOMER READY WITH LIMITS",
    accountRequired: "Yes",
    credentialType: "NETLIFY_AUTH_TOKEN (+ optional NETLIFY_SITE_ID)",
    costPlanStatus: "Free tier sufficient for Kitchen publish proof",
    productionDependency: "Required for landing-page public URL",
    replacementHistoryStatus: "Current static host",
    currentLimitation: "Custom domain separate; public-by-default team setting",
  },
  {
    tool: "Canva",
    studioJob: "Static design / profile graphics / brand assets",
    status: "ACTIVE — MANUAL OPERATIONAL",
    accountRequired: "Yes (operator Canva workspace)",
    credentialType: "Operator login (no Studio API key)",
    costPlanStatus: "Owner-managed Canva plan",
    productionDependency: "Required for design-led SKUs",
    replacementHistoryStatus: "Current design tool (no live API)",
    currentLimitation: "No live Canva API; manual export + file refs",
  },
  {
    tool: "Make",
    studioJob: "Not an active Kitchen production producer for launch SKUs",
    status: "NOT ACTIVE IN LAUNCH PRODUCTION PATH",
    accountRequired: "N/A for current active SKU fulfillment",
    credentialType: "N/A",
    costPlanStatus: "N/A",
    productionDependency: "None for current active set",
    replacementHistoryStatus: "Historical / foundation mention only",
    currentLimitation: "Do not claim Make as active producer",
  },
  {
    tool: "Supabase",
    studioJob: "File Room private storage infrastructure (not a deliverable producer)",
    status: "INFRASTRUCTURE — NOT A CUSTOMER DELIVERABLE TOOL",
    accountRequired: "Yes (when File Room storage enabled)",
    credentialType: "SUPABASE_* keys (server-only)",
    costPlanStatus: "Owner-managed",
    productionDependency: "Storage infrastructure only",
    replacementHistoryStatus: "Current private storage",
    currentLimitation: "Not a production mechanism for SKU outputs",
  },
  {
    tool: "CapCut",
    studioJob: "Former short-video candidate — REJECTED",
    status: "REJECTED / REMOVED / HISTORICAL ONLY",
    accountRequired: "N/A — do not restore",
    credentialType: "N/A",
    costPlanStatus: "N/A",
    productionDependency: "None — CLOSED OWNER-INDEPENDENCE FAIL",
    replacementHistoryStatus: "Replaced by Shotstack",
    currentLimitation: "Must never be treated as active production provider",
  },
  {
    tool: "Text / copy production capability",
    studioJob: "Copy-led SKUs (em/cc/email-kit/sms-kit)",
    status: "ACTIVE — CUSTOMER READY WITH LIMITS — COPY",
    accountRequired: "Studio copy workflow (not a vendor API claim)",
    credentialType: "N/A (approved Studio copy workflow)",
    costPlanStatus: "N/A",
    productionDependency: "Required for copy SKUs",
    replacementHistoryStatus: "Current",
    currentLimitation: "Studio does not send email/SMS; client-owned platforms",
  },
  {
    tool: "studio-campaign-page-v1 + Netlify adapter",
    studioJob: "Landing-page structure + publish (rm-j005)",
    status: "ACTIVE — CUSTOMER READY WITH LIMITS",
    accountRequired: "Netlify (see Netlify row)",
    credentialType: "NETLIFY_AUTH_TOKEN",
    costPlanStatus: "See Netlify",
    productionDependency: "Required for rm-j005",
    replacementHistoryStatus: "Current",
    currentLimitation: "Approved structure only; no bespoke coding per job",
  },
];

export const FINAL_RED_FLAG_REGISTER: readonly RedFlag[] = [
  {
    category: "LAUNCH LIMIT",
    item: "Voice WAV not offered",
    notes: "MP3 certified; WAV unverified — catalog honesty aligned to MP3-only",
  },
  {
    category: "LAUNCH LIMIT",
    item: "Short-video A/V beat sync per artifact",
    notes: "Mandatory watch-with-sound QA; regenerate on fail",
  },
  {
    category: "LAUNCH LIMIT",
    item: "Short-video stock/music unresolved",
    notes: "Does not block customer-footage path; omit music/stock until rights certain",
  },
  {
    category: "LAUNCH LIMIT",
    item: "Landing-page custom domain excluded",
    notes: "rm-j005 publishes public Netlify URL; custom domain separate",
  },
  {
    category: "LAUNCH LIMIT",
    item: "Landing-page per-artifact responsive + CTA QA",
    notes: "Readiness does not inherit from prior page/hash",
  },
  {
    category: "LAUNCH LIMIT",
    item: "Social profile kits require customer apply",
    notes: "No Studio login mutation; explicit before purchase",
  },
  {
    category: "LAUNCH LIMIT",
    item: "Copy/email/SMS client-owned send",
    notes: "Studio produces paste-ready copy; does not operate CRM/Twilio",
  },
  {
    category: "LAUNCH LIMIT",
    item: "Design via manual Canva",
    notes: "No live Canva API; per-artifact design QA; print pixels not API-proven",
  },
  {
    category: "LAUNCH LIMIT",
    item: "Method-covered SKUs without dedicated cert seal",
    notes:
      "bf-001, sm-001, sm-001-monthly, em-001-monthly, rm-j007 — production path proven via family method + adjacent cert; not individually Owner-sealed packages",
  },
  {
    category: "LAUNCH LIMIT",
    item: "sm-001 optional execution language",
    notes:
      "Catalog still says connected-account access if execution is selected; Kitchen launch path treats sm-001 as content package (client posts). social_media-execution add-ons remain outside the 22-SKU launch capability set (yellow/limited; not certified).",
  },
  {
    category: "POST-LAUNCH ENHANCEMENT",
    item: "Facebook Page direct mutation",
    notes: "INTEGRATION READY / ACCOUNT-AUTH BLOCKER — future only; kits sell today",
  },
  {
    category: "POST-LAUNCH ENHANCEMENT",
    item: "Instagram/TikTok direct profile mutation",
    notes: "UNSUPPORTED — kits remain the honest path",
  },
  {
    category: "POST-LAUNCH ENHANCEMENT",
    item: "Voice WAV certification",
    notes: "Requires separate account-tier + listening proof",
  },
  {
    category: "POST-LAUNCH ENHANCEMENT",
    item: "Stock-media expansion for short video",
    notes: "Unresolved rights/capability when stock is required",
  },
  {
    category: "POST-LAUNCH ENHANCEMENT",
    item: "Music support for short video",
    notes: "UNRESOLVED — omit until rights certain",
  },
  {
    category: "POST-LAUNCH ENHANCEMENT",
    item: "Landing-page custom domains",
    notes: "Not in rm-j005 base contract",
  },
  {
    category: "POST-LAUNCH ENHANCEMENT",
    item: "Template refinements / provider cost optimization",
    notes: "Useful later; not required for current promise",
  },
];

export function launchBlockers(): readonly RedFlag[] {
  return FINAL_RED_FLAG_REGISTER.filter((f) => f.category === "LAUNCH BLOCKER");
}

export function deriveCloseoutVerdict(
  ledger: readonly FinalActiveSkuLedgerRow[] = buildFinalActiveSkuLedger(),
): CloseoutVerdict {
  const blockers = launchBlockers();
  if (blockers.length > 0) {
    return "KITCHEN PRODUCTION NOT READY — LAUNCH BLOCKERS REMAIN";
  }
  for (const row of ledger) {
    if (
      row.launchDisposition === "DO NOT SELL" ||
      row.launchDisposition === "REMOVE / RESTRUCTURE REQUIRED"
    ) {
      return "KITCHEN PRODUCTION NOT READY — LAUNCH BLOCKERS REMAIN";
    }
    if (
      row.ownerRoutineResponsibility === "OWNER-INDEPENDENCE DEFECT" ||
      row.engineeringIndependence === "ROUTINE ENGINEERING DEPENDENCY"
    ) {
      return "KITCHEN PRODUCTION NOT READY — LAUNCH BLOCKERS REMAIN";
    }
    if (
      row.launchDisposition !== "SELL" &&
      row.launchDisposition !== "SELL WITH LIMITS"
    ) {
      return "KITCHEN PRODUCTION NOT READY — LAUNCH BLOCKERS REMAIN";
    }
  }
  return "KITCHEN PRODUCTION READY FOR LAUNCH WITH DOCUMENTED LIMITS";
}

export function closeoutControlPoint() {
  return {
    packageId: CLOSEOUT_PACKAGE_ID,
    startingCommit: CLOSEOUT_STARTING_COMMIT,
    latestSealedPackage: "KITCHEN-SOCIAL-PROFILE-PRODUCTION-1",
    activeSkuCount: ACTIVE_CUSTOMER_FACING_SKUS.length,
    certCopySkus: CERT_COPY_SKUS,
    certDesignSkus: CERT_DESIGN_TESTED_SKUS,
    certVoiceSkus: CERT_VOICE_TESTED_SKUS,
    certVideoSku: CERT_VIDEO_CERTIFIED_SKU,
  };
}

export function assertEveryActiveSkuHasDisposition(
  ledger: readonly FinalActiveSkuLedgerRow[],
): boolean {
  const ids = new Set(ledger.map((r) => r.skuId));
  return (
    ledger.length === ACTIVE_CUSTOMER_FACING_SKUS.length &&
    ACTIVE_CUSTOMER_FACING_SKUS.every((id) => ids.has(id)) &&
    ledger.every((r) => Boolean(r.launchDisposition))
  );
}

export function weakestDisposition(
  components: readonly LaunchDisposition[],
): LaunchDisposition {
  const rank: Record<LaunchDisposition, number> = {
    SELL: 0,
    "SELL WITH LIMITS": 1,
    "DO NOT SELL": 2,
    "REMOVE / RESTRUCTURE REQUIRED": 3,
  };
  return components.reduce((worst, d) => (rank[d] > rank[worst] ? d : worst), "SELL");
}
