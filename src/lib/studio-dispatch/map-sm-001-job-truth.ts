/**
 * Map authoritative campaign/job truth → Sm001ProjectTruth (customer mode).
 *
 * Consumes SM-001-INTAKE-TRUTH-1 for set structure: plannedPostCount ∈ {4,5,6}
 * selected before execution, member assignment, square-only executable plate,
 * posting order + calendar requirement, and campaign timing constraints.
 * Layout templates, plate, and N stay Studio production decisions — this mapper
 * never reads a customer field for them and never invents campaign facts.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_SM_001_SKU,
  assertSm001StructureExecutableForDispatch,
  mapSm001SetStructureFromLiveTruth,
} from "@/lib/studio-design-renderer";
import type {
  Sm001LiveTruthInput,
  Sm001ProjectTruth,
  Sm001SetStructureTruth,
} from "@/lib/studio-design-renderer";

import {
  requireApprovedLogoFile,
  resolveApprovedLogoMaterial,
} from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export const SM_001_DISPATCH_WIRING_SCOPE_NOTE =
  "STUDIO-OPERATING-DESIGN-SM-001-DISPATCH-HOOK-1 — Owner-independent Machine path. " +
  "plannedPostCount 4-6 selected before execution from campaign truth and material " +
  "availability (SM-001-INTAKE-TRUTH-1); layout templates assigned by Studio production, " +
  "not customer role menus. Square cert-square-1024 only; captions Studio-written; " +
  "advisory posting calendar with date governance; Canva not on the fulfillment spine; " +
  "Make not required; Owner routine production NONE.";

export type Sm001TruthMapResult =
  | {
      ok: true;
      truth: Sm001ProjectTruth;
      structure: Sm001SetStructureTruth;
    }
  | {
      ok: false;
      code:
        | "MISSING_REQUIRED_MATERIAL"
        | "BROKEN_ASSET_REFERENCE"
        | "INVALID_DESIGN_SPEC"
        | "MISSING_REQUIRED_TRUTH"
        | "INVALID_PLATE"
        | "INVALID_PLANNED_POST_COUNT"
        | "COUNT_MISMATCH"
        | "DATE_GOVERNANCE_FAILURE"
        | "SET_CONSISTENCY_FAILURE"
        | "UNAUTHORIZED_CUSTOMER_FIELD"
        | "SKU_NOT_SUPPORTED";
      message: string;
    };

const PHONE_RE = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const URL_RE =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9.]+\.[a-z]{2,}(?:\/[^\s]*)?|(?:example|book|shop)\.[a-z0-9][-a-z0-9.]*/i;
const PRICE_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/;
const MONEY_GLOBAL_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g;
const WAS_PRICE_RE = /\bwas\s*\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/i;
const ISO_DATE_GLOBAL_RE = /\d{4}-\d{2}-\d{2}/g;
const ISO_DATE_WINDOW_RE =
  /\d{4}-\d{2}-\d{2}\s*(?:–|—|-|to|through)\s*\d{4}-\d{2}-\d{2}/i;
const MONTH_DATE_WINDOW_RE =
  /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\s*[–—-]\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s*\d{4})?|\d{1,2}\/\d{1,2}\/\d{2,4}\s*[–—-]\s*\d{1,2}\/\d{1,2}\/\d{2,4}/i;

const FIXTURE_CONTENT_RE =
  /CERTIFICATION FIXTURE|INTERNAL TEST|harborandoak\.example/i;

/**
 * Intake keys that would turn a Studio production decision (layout template,
 * plate, N, publish dates, captions) into a customer override. sm-001 has no
 * such customer form — a smuggled key is a fail-closed condition, not input.
 */
const SM_001_SMUGGLED_ANSWER_PATTERNS: readonly RegExp[] = [
  /^(post|sm001Post|socialPost)\d+_?(layoutTemplate|template|role|roleAngle|angle|plate|size|format)/i,
  /(plannedPostCount|postCount|numberOfPosts|howManyPosts)/i,
  /(publishDate|postingDate|postDate|postingSchedule|whenToPost)/i,
  /caption/i,
];

/** A prohibited-claim pattern is compiled as a regex downstream. */
const REGEX_META_RE = /[.*+?^${}()|[\]\\]/;

function firstMatch(re: RegExp, text: string): string {
  const m = text.match(re);
  return m?.[0]?.trim() ?? "";
}

function stringAnswers(
  answers: Record<string, unknown>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (v == null) out[k] = undefined;
    else out[k] = String(v);
  }
  return out;
}

/** Copy that renders on the brand-trust member must not restate campaign price. */
function brandSafeBody(postsAbout: string): string {
  const cleaned = postsAbout
    .replace(MONEY_GLOBAL_RE, "")
    .replace(/\bwas\b/gi, "")
    .replace(/\s*[–—-]\s*/g, " — ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim();
  return (
    cleaned.slice(0, 220) ||
    "Plain, steady service for homeowners who want clear help."
  );
}

function brandSafeLine(value: string, maxLength: number): string {
  return value
    .replace(MONEY_GLOBAL_RE, "")
    .replace(/\bwas\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .replace(/^[\s—–-]+|[\s—–,.;:-]+$/g, "")
    .trim()
    .slice(0, maxLength);
}

function segmentsOf(text: string): string[] {
  return text
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractDateWindow(combined: string): string {
  return (
    firstMatch(ISO_DATE_WINDOW_RE, combined) ||
    firstMatch(MONTH_DATE_WINDOW_RE, combined)
  );
}

/**
 * Campaign timing only when the campaign already carries ISO dates.
 * A human-readable window stays unparsed rather than becoming invented dates.
 */
function extractIsoTimingConstraints(
  combined: string,
): { startDate: string; endDate?: string } | undefined {
  const iso = combined.match(ISO_DATE_GLOBAL_RE) ?? [];
  if (iso.length === 0) return undefined;
  if (iso.length === 1) return { startDate: iso[0]! };
  return { startDate: iso[0]!, endDate: iso[1]! };
}

/**
 * Build customer Sm001ProjectTruth from live intake + approved materials.
 * Fail closed on missing logo, offer, price, contact, or date window — the
 * current Launch Set layout library states those facts on the plate.
 */
export function mapSm001ProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): Sm001TruthMapResult {
  if (input.dispatchRecord.skuId !== DESIGN_RENDERER_SM_001_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `sm-001 dispatch hook only supports ${DESIGN_RENDERER_SM_001_SKU}`,
    };
  }

  const answers = stringAnswers(input.campaign.routeMapIntake?.answers ?? {});

  const smuggled = Object.keys(answers).filter((key) =>
    SM_001_SMUGGLED_ANSWER_PATTERNS.some((re) => re.test(key)),
  );
  if (smuggled.length > 0) {
    return {
      ok: false,
      code: "UNAUTHORIZED_CUSTOMER_FIELD",
      message:
        `UNAUTHORIZED_CUSTOMER_FIELD: ${smuggled.join(", ")} — layout template, ` +
        "plate, plannedPostCount, publish dates, and captions are Studio production " +
        "decisions, not a customer intake",
    };
  }

  const postsAbout = String(
    answers.postsAbout ?? answers.socialPostsPurposeChoice ?? "",
  ).trim();
  const callToAction = String(
    answers.callToAction ?? answers.socialPostsActionChoice ?? "",
  ).trim();
  const wordingHashtags = String(answers.wordingHashtags ?? "").trim();
  const mustNotSay = String(answers.mustNotSay ?? "").trim();

  const missing: string[] = [];
  if (!postsAbout) missing.push("postsAbout / socialPostsPurposeChoice");
  if (!callToAction) missing.push("callToAction / socialPostsActionChoice");
  if (missing.length) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: `Authoritative Route Map sm-001 intake missing: ${missing.join(", ")}`,
    };
  }

  const contentScan = [
    postsAbout,
    callToAction,
    wordingHashtags,
    mustNotSay,
  ].join(" ");
  if (FIXTURE_CONTENT_RE.test(contentScan)) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message:
        "Customer job truth must not contain certification fixture content",
    };
  }

  const combined = `${postsAbout}\n${callToAction}\n${wordingHashtags}`;
  const phone = firstMatch(PHONE_RE, combined);
  const webRaw = firstMatch(URL_RE, combined);
  const webDisplay = webRaw.replace(/^https?:\/\//i, "");
  const webUrl = webRaw
    ? webRaw.startsWith("http")
      ? webRaw
      : `https://${webRaw}`
    : "";
  const priceDisplay = firstMatch(PRICE_RE, combined).replace(/\s+/g, "");
  const wasPriceDisplay = firstMatch(WAS_PRICE_RE, combined).replace(
    /\s+/g,
    " ",
  );
  const dateWindow = extractDateWindow(combined);

  if (!phone || !webDisplay) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "postsAbout and/or callToAction must provide phone and website/destination for contact fields",
    };
  }
  if (!priceDisplay) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "Authoritative intake must provide a price token (e.g. $189) for the current Launch Set layout library — do not invent",
    };
  }
  if (!dateWindow) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "Authoritative intake must provide a campaign date window for the current Launch Set layout library — do not invent",
    };
  }

  const logo = requireApprovedLogoFile(
    resolveApprovedLogoMaterial({
    repoRoot: input.repoRoot,
    items: input.materials,
    skuId: DESIGN_RENDERER_SM_001_SKU,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  }),
  );
  if (!logo.ok) {
    return { ok: false, code: logo.code, message: logo.message };
  }

  const businessName = input.campaign.campaignName.trim() || "Customer";
  const wordmark = businessName;
  const purposeChoice = String(answers.socialPostsPurposeChoice ?? "").trim();
  const descriptor =
    purposeChoice ||
    String(answers.businessType ?? "").trim() ||
    "Local business";

  const segments = segmentsOf(postsAbout);
  const leadSegment = segments[0] ?? postsAbout;
  const leadAfterDash = leadSegment.split(/\s[—–-]\s/).slice(-1)[0] ?? leadSegment;
  const offerName = brandSafeLine(leadAfterDash, 80) || brandSafeLine(leadSegment, 80);

  // Supporting copy is customer material beyond the offer lead and the dates.
  const supporting = segments
    .slice(1)
    .filter((segment) => !MONTH_DATE_WINDOW_RE.test(segment))
    .filter((segment) => !ISO_DATE_WINDOW_RE.test(segment))
    .filter((segment) => segment.replace(ISO_DATE_GLOBAL_RE, "").trim().length > 8);
  const customerHeadline = supporting[0]
    ? brandSafeLine(supporting[0], 90)
    : "";
  const customerBody = supporting.length
    ? brandSafeLine(supporting.join(". "), 220)
    : "";

  if (!offerName) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "Authoritative intake must name the campaign offer in postsAbout — do not invent",
    };
  }

  const actionChoice = String(answers.socialPostsActionChoice ?? "").trim();
  const cta =
    actionChoice &&
    !callToAction.toLowerCase().includes(actionChoice.toLowerCase())
      ? `${actionChoice} — ${callToAction}`.slice(0, 120)
      : callToAction.slice(0, 120);

  const liveTruth: Sm001LiveTruthInput = {
    businessName,
    offerName,
    priceDisplay,
    dateWindow,
    cta,
    phone,
    materials: { hasLogo: true },
  };
  if (wasPriceDisplay) liveTruth.wasPriceDisplay = wasPriceDisplay;
  if (customerHeadline) liveTruth.headline = customerHeadline;
  if (customerBody) liveTruth.body = customerBody;
  const timingConstraints = extractIsoTimingConstraints(combined);
  if (timingConstraints) liveTruth.timingConstraints = timingConstraints;

  const structureMapped = mapSm001SetStructureFromLiveTruth(liveTruth);
  if (!structureMapped.ok) {
    return { ok: false, code: structureMapped.code, message: structureMapped.message };
  }

  const executable = assertSm001StructureExecutableForDispatch(
    structureMapped.structure,
  );
  if (!executable.ok) {
    return { ok: false, code: executable.code, message: executable.message };
  }

  const structure = structureMapped.structure;

  const requiredTextTokens = [
    priceDisplay,
    businessName.split(/\s+/)[0]!,
    ...dateWindow
      .split(/[–—,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2)
      .slice(0, 3),
  ].filter(Boolean);

  const truth: Sm001ProjectTruth = {
    campaignId: input.campaign.campaignId,
    jobId: input.dispatchRecord.jobId,
    dispatchId: input.dispatchRecord.dispatchId,
    skuId: DESIGN_RENDERER_SM_001_SKU,
    fixtureId: `job-${input.campaign.campaignId}`,
    label: `CUSTOMER JOB — authoritative intake — sm-001 Launch Set N=${structure.plannedPostCount}`,
    outputMode: "customer",
    businessName,
    wordmark,
    descriptor,
    headline: customerHeadline || "Service you can trust",
    offerName,
    priceDisplay,
    ...(wasPriceDisplay ? { wasPriceDisplay } : {}),
    dateWindow: dateWindow.slice(0, 120),
    body: customerBody || brandSafeBody(postsAbout),
    cta,
    phone,
    webDisplay,
    webUrl,
    disclaimer:
      "Finished social posts, captions, and a suggested posting calendar for your upload. You post and schedule.",
    platformLabel: structure.platformLabel,
    brandColors: {
      primary: "#1F3A5F",
      secondary: "#C4A574",
      background: "#F7F4EF",
      text: "#1A1A1A",
      muted: "#5A6570",
    },
    approvedLogoVariantId: logo.material.approvedIdentitySourceId!,
    materials: [
      {
        materialId: logo.material.materialId,
        role: "logo",
        relativePath: logo.material.relativePath,
        contentSha256: logo.material.contentSha256,
        approvedIdentitySourceId: logo.material.approvedIdentitySourceId,
      },
    ],
    requiredTextTokens,
    prohibitedClaimPatterns: [
      "CERTIFICATION FIXTURE",
      "Best in Richmond",
      "#1 rated",
      ...(mustNotSay && !REGEX_META_RE.test(mustNotSay)
        ? [mustNotSay.slice(0, 80)]
        : []),
    ],
    plannedPostCount: structure.plannedPostCount,
    plannedPostCountSelection: structure.plannedPostCountSelection,
    timingConstraints: structure.timingConstraints,
    assets: structure.assets,
    proofScopeNote: SM_001_DISPATCH_WIRING_SCOPE_NOTE,
  };

  return { ok: true, truth, structure };
}
