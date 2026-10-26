/**
 * Map authoritative campaign/job truth → FlyerProjectTruth (customer mode).
 * Never injects Harbor CERT fixtures, certification disclaimers, or Studio
 * SKU contract footer copy onto the customer-facing flyer.
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID } from "@/config/studio-social-promo-current-door-contract-v1";
import { readProjectIntakeAnswer } from "@/lib/project-intake-plan";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type {
  DesignMaterialRef,
  FlyerProjectTruth,
} from "@/lib/studio-design-renderer/types";
import { DESIGN_RENDERER_PROOF_SKU } from "@/lib/studio-design-renderer/types";
import {
  deriveCreativeBrief,
  paletteForBrief,
  readRecentSignatures,
  selectCreativeDirection,
} from "@/lib/studio-design-intelligence";

import {
  curatedCustomerBodyFromMustInclude,
  resolveCustomerBusinessName,
  resolveCustomerOfferHeadline,
  shortenCustomerFacingCta,
  stripCustomerFacingCta,
  stripProductionMetadataFromMustInclude,
} from "@/lib/studio-design-renderer/customer-facing-creative-copy";
import {
  customerFlyerBodyWithoutContactDump,
  deriveCustomerFacingCta,
  offerCopyFromMustInclude,
} from "@/lib/studio-design-renderer/flyer-creative-quality";
import { applyExistingCtaHeadlineEmphasis } from "@/lib/studio-review-revision/flyer-revision-emphasis";
import { assertLiveFactsPreserved } from "@/lib/studio-static-creative-lane/preserve-supplied-facts";
import type { JobDispatchRecord } from "./types";

export type FlyerTruthMapResult =
  | { ok: true; truth: FlyerProjectTruth }
  | {
      ok: false;
      code:
        | "MISSING_REQUIRED_MATERIAL"
        | "BROKEN_ASSET_REFERENCE"
        | "INVALID_DESIGN_SPEC"
        | "SKU_NOT_SUPPORTED";
      message: string;
    };

const PHONE_RE =
  /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/;
const URL_RE =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9.]+\.[a-z]{2,}(?:\/[^\s]*)?/i;
const PRICE_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/;
const DATE_LINE_RE =
  /(?:Opening\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(?:\d{1,2}.{0,40})?\d{4}/i;

function firstMatch(re: RegExp, text: string): string {
  const m = text.match(re);
  return m?.[0]?.trim() ?? "";
}

const DEFAULT_FLYER_COLORS = {
  primary: "#1F3A5F",
  secondary: "#C4A574",
  background: "#F7F4EF",
  text: "#1A1A1A",
  muted: "#5A6570",
} as const;

/** Soft-neutral botanical atmosphere from locked customer style notes — palette only, no invented illustration. */
const SOFT_NEUTRAL_BOTANICAL_COLORS = {
  primary: "#3F5A4A",
  secondary: "#B89A6A",
  background: "#F4F0E6",
  text: "#2A2824",
  muted: "#6A655C",
} as const;

const EDITORIAL_BOUTIQUE_COLORS = {
  primary: "#3A2A24",
  secondary: "#C4A15A",
  background: "#EDE4D4",
  text: "#2A211C",
  muted: "#6A5C52",
} as const;

function brandColorsFromDirection(
  text: string,
):
  | typeof DEFAULT_FLYER_COLORS
  | typeof SOFT_NEUTRAL_BOTANICAL_COLORS
  | typeof EDITORIAL_BOUTIQUE_COLORS {
  if (
    /botanical|soft neutral|warm,\s*clean,\s*calm|uncluttered|no childish school/i.test(
      text,
    )
  ) {
    return SOFT_NEUTRAL_BOTANICAL_COLORS;
  }
  if (
    /\b(boutique|fashion|styling|stylist|salon|apparel|clothing|grand opening|atelier)\b/i.test(
      text,
    )
  ) {
    return EDITORIAL_BOUTIQUE_COLORS;
  }
  return DEFAULT_FLYER_COLORS;
}

function extractOfferName(
  mustInclude: string,
  flyerPurpose: string,
  businessName: string,
): string {
  const fromFacts = offerCopyFromMustInclude(
    stripProductionMetadataFromMustInclude(mustInclude),
  );
  if (
    fromFacts.offerName &&
    normalizeComparable(fromFacts.offerName) !== normalizeComparable(businessName) &&
    !DATE_LINE_RE.test(fromFacts.offerName)
  ) {
    return fromFacts.offerName.slice(0, 80);
  }
  const lines = stripProductionMetadataFromMustInclude(mustInclude)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const skip =
    /includes:|customers may choose|^style:|call |visit |\(\d{3}\)|https?:|book your reset|voice brief|missing fact/i;
  const found = lines.find(
    (line) =>
      line !== businessName &&
      !skip.test(line) &&
      !DATE_LINE_RE.test(line) &&
      normalizeComparable(line) !== normalizeComparable(businessName) &&
      line.length < 80,
  );
  if (found) return found.slice(0, 80);
  const dateLine = lines.find((line) => DATE_LINE_RE.test(line));
  if (dateLine) return dateLine.slice(0, 80);
  const purposeTail = flyerPurpose.replace(/^promotional flyer for\s+/i, "").trim();
  return (purposeTail || flyerPurpose).slice(0, 80);
}

function normalizeComparable(value: string): string {
  return value.toLowerCase().replace(/['’]/g, "").replace(/\s+/g, " ").trim();
}

function customerFacingFlyerBody(
  mustInclude: string,
  voiceBriefExact?: string,
): string {
  const facts = stripProductionMetadataFromMustInclude(mustInclude, {
    voiceBriefExact,
  });
  const joined = facts.replace(/\s+/g, " ");
  const hasSession = /2-hour home organization session/i.test(joined);
  const hasArea = /one selected household area/i.test(joined);
  const hasPlan = /simple organization plan for maintaining the space/i.test(joined);
  const chooseLine = facts
    .split(/\n+/)
    .map((line) => line.trim())
    .find((line) => /customers may choose:/i.test(line));
  const chooseList = (chooseLine ?? "")
    .replace(/customers may choose:\s*/i, "")
    .replace(/\.$/, "")
    .trim();
  if (hasSession && hasArea && hasPlan) {
    const sessionAreaPlan =
      "One 2-hour home organization session. One selected household area. Simple organization plan for maintaining the space.";
    if (chooseList) {
      return `${sessionAreaPlan} ${chooseList.charAt(0).toUpperCase()}${chooseList.slice(1)}.`;
    }
    return sessionAreaPlan;
  }
  return (
    curatedCustomerBodyFromMustInclude(mustInclude, {
      voiceBriefExact,
      maxLen: 480,
    }) || facts
  );
}

function extractLines(mustInclude: string): {
  phone: string;
  webDisplay: string;
  webUrl: string;
  priceDisplay: string;
  dateWindow: string;
} {
  const phone = firstMatch(PHONE_RE, mustInclude);
  const webRaw = firstMatch(URL_RE, mustInclude).replace(/[.,;:]+$/, "");
  const webDisplay = webRaw.replace(/^https?:\/\//i, "");
  const webUrl = webRaw
    ? webRaw.startsWith("http")
      ? webRaw
      : `https://${webRaw}`
    : "";
  const priceDisplay = firstMatch(PRICE_RE, mustInclude).replace(/\s+/g, "") ||
    "";
  // Prefer an explicit date-ish span if present; else leave empty (still render).
  const dateWindow =
    mustInclude.match(
      /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}[^.\n]{0,40}\d{4}/i,
    )?.[0]?.trim() ??
    mustInclude.match(
      /(?:Opening\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}/i,
    )?.[0]?.trim() ??
    "";

  return { phone, webDisplay, webUrl, priceDisplay, dateWindow };
}

/**
 * Resolve an approved logo-brand material to a local repo-relative file.
 * Prefer explicit staged path (tests / production staging).
 * No approved logo → optional (wordmark-only). Broken approved path still fails closed.
 */
/** Machine branch SKUs inherit File Room logo slots tagged on the parent composite package. */
const SOCIAL_PROMO_LOGO_BRANCH_SKUS = new Set([
  "v2-rtu-social-posts",
  "v2-rtu-promotion-graphics",
]);

function logoScopeSkuIds(skuId: string): readonly string[] {
  if (skuId === SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID) return [skuId];
  if (SOCIAL_PROMO_LOGO_BRANCH_SKUS.has(skuId)) {
    return [skuId, SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID];
  }
  return [skuId];
}

function logoBrandItemsForSku(
  items: readonly CampaignMaterialItem[],
  skuId: string,
): CampaignMaterialItem[] {
  const scope = new Set(logoScopeSkuIds(skuId));
  return items.filter(
    (i) =>
      i.category === "logo-brand" &&
      (i.relatedServiceIds.length === 0 ||
        i.relatedServiceIds.some((id) => scope.has(id))),
  );
}

function relativePathForLogoBrandItem(item: CampaignMaterialItem): string {
  const staged = (
    item.url ??
    item.teamNote ??
    ("preparedLocalPath" in item ? String(item.preparedLocalPath ?? "") : "")
  ).trim();
  if (
    staged &&
    !staged.startsWith("http") &&
    (staged.startsWith("data/") || staged.startsWith("docs/"))
  ) {
    return staged.replace(/\\/g, "/");
  }
  const objectPath = item.storageRef?.objectPath?.trim();
  if (objectPath) {
    return ["data/file-room-objects", ...objectPath.split("/").filter(Boolean)].join("/");
  }
  return "";
}

export function resolveApprovedLogoMaterial(input: {
  repoRoot: string;
  items: readonly CampaignMaterialItem[];
  skuId: string;
  stagedLogoRelativePath?: string;
}):
  | { ok: true; material: DesignMaterialRef | null }
  | { ok: false; code: "MISSING_REQUIRED_MATERIAL" | "BROKEN_ASSET_REFERENCE"; message: string } {
  const scoped = logoBrandItemsForSku(input.items, input.skuId);
  const storedPending = scoped.filter(
    (i) =>
      i.uploadStatus === "stored" &&
      i.reviewStatus !== "approved_for_use" &&
      i.reviewStatus !== "not_needed" &&
      i.reviewStatus !== "blocked_from_use",
  );
  const approved = scoped.filter((i) => i.reviewStatus === "approved_for_use");
  if (approved.length === 0) {
    if (storedPending.length > 0) {
      return {
        ok: false,
        code: "MISSING_REQUIRED_MATERIAL",
        message:
          "A logo file is on file but is not yet approved for production use. The Studio must approve the logo in File Room before graphics can render.",
      };
    }
    return { ok: true, material: null };
  }

  let relativePath = input.stagedLogoRelativePath?.trim() ?? "";
  if (!relativePath) {
    relativePath = relativePathForLogoBrandItem(approved[0]!);
  }

  if (!relativePath) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_MATERIAL",
      message:
        "Approved logo exists but no local staged file path is available for the design renderer",
    };
  }

  const abs = path.join(input.repoRoot, relativePath);
  if (!existsSync(abs)) {
    return {
      ok: false,
      code: "BROKEN_ASSET_REFERENCE",
      message: `Logo material path missing on disk: ${relativePath}`,
    };
  }

  const contentSha256 = createHash("sha256")
    .update(readFileSync(abs))
    .digest("hex");
  const logoId = `job-logo-${approved[0]!.id}`;

  return {
    ok: true,
    material: {
      materialId: approved[0]!.id,
      role: "logo",
      relativePath,
      contentSha256,
      approvedIdentitySourceId: logoId,
    },
  };
}

/** A resolved logo file. No approved logo stays absent — this does not invent one. */
export function requirePresentLogoMaterial(
  resolved:
    | { ok: true; material: DesignMaterialRef | null }
    | {
        ok: false;
        code: "MISSING_REQUIRED_MATERIAL" | "BROKEN_ASSET_REFERENCE";
        message: string;
      },
):
  | { ok: true; material: DesignMaterialRef }
  | {
      ok: false;
      code: "MISSING_REQUIRED_MATERIAL" | "BROKEN_ASSET_REFERENCE";
      message: string;
    } {
  if (!resolved.ok) return resolved;
  if (!resolved.material) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_MATERIAL",
      message:
        "Approved logo material is required before this design can render.",
    };
  }
  return { ok: true, material: resolved.material };
}

export function mapFlyerProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  /** Campaign Launch Kit may keep the approved customer example domain. Fixture labels stay banned. */
  allowApprovedCustomerExampleDomain?: boolean;
}): FlyerTruthMapResult {
  if (input.dispatchRecord.skuId !== DESIGN_RENDERER_PROOF_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `Dispatch hook only supports ${DESIGN_RENDERER_PROOF_SKU}`,
    };
  }

  const answers = input.campaign.routeMapIntake?.answers ?? {};
  const flyerPurpose = readProjectIntakeAnswer(
    answers,
    "flyerPurpose",
    DESIGN_RENDERER_PROOF_SKU,
  );
  const mustInclude = readProjectIntakeAnswer(
    answers,
    "mustInclude",
    DESIGN_RENDERER_PROOF_SKU,
  );
  if (!flyerPurpose || !mustInclude) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message:
        "Authoritative Route Map flyer intake missing flyerPurpose or mustInclude",
    };
  }

  const logo = resolveApprovedLogoMaterial({
    repoRoot: input.repoRoot,
    items: input.materials,
    skuId: DESIGN_RENDERER_PROOF_SKU,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  });
  if (!logo.ok) {
    return { ok: false, code: logo.code, message: logo.message };
  }

  const extracted = extractLines(mustInclude);

  const businessName = resolveCustomerBusinessName({
    campaignName: input.campaign.campaignName,
    mustInclude,
  });
  const wordmark = businessName;
  const descriptor = "";
  const disclaimer = readProjectIntakeAnswer(
    answers,
    "disclaimers",
    DESIGN_RENDERER_PROOF_SKU,
  );
  const styleSource = [
    flyerPurpose,
    mustInclude,
    input.campaign.campaignName,
    readProjectIntakeAnswer(answers, "materials", DESIGN_RENDERER_PROOF_SKU),
    readProjectIntakeAnswer(answers, "styleNotes", DESIGN_RENDERER_PROOF_SKU),
  ].join("\n");

  // Hard ban on leaking proof fixture language into customer jobs.
  const customerTruth = [flyerPurpose, mustInclude, disclaimer].join(" ");
  const fixtureLeak = /CERTIFICATION FIXTURE|INTERNAL TEST/i.test(customerTruth);
  const exampleDomain =
    !input.allowApprovedCustomerExampleDomain && /harborandoak\.example/i.test(customerTruth);
  if (fixtureLeak || exampleDomain) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Customer job truth must not contain certification fixture content",
    };
  }

  const offerName = extractOfferName(mustInclude, flyerPurpose, businessName);
  const resolvedHeadline = resolveCustomerOfferHeadline({
    flyerPurpose,
    mustInclude,
    businessName,
    fallback: offerName,
  });
  const voiceBriefExact = String(
    answers.voiceBriefExact ?? answers.studioVoiceBrief ?? "",
  ).trim();
  const suppliedCampaignBody = input.allowApprovedCustomerExampleDomain
    ? String(answers["campaign_launch_kit:facts"] ?? "").trim()
    : "";
  const suppliedObjective = input.allowApprovedCustomerExampleDomain
    ? String(answers["campaign_launch_kit:mustKeep"] ?? "").trim()
    : "";
  const body = suppliedCampaignBody || customerFlyerBodyWithoutContactDump(
    customerFacingFlyerBody(mustInclude, voiceBriefExact || undefined),
    {
      headline: resolvedHeadline,
      offerName,
      businessName,
    },
  );
  const derivedCta = stripCustomerFacingCta(
    deriveCustomerFacingCta({
      explicitCta: readProjectIntakeAnswer(answers, "callToAction", DESIGN_RENDERER_PROOF_SKU),
      mustInclude,
    }),
  );
  const cta = input.allowApprovedCustomerExampleDomain
    ? derivedCta
    : shortenCustomerFacingCta(derivedCta);
  const headline = applyExistingCtaHeadlineEmphasis({
    headline: (suppliedObjective || resolvedHeadline).slice(0, 90),
    callToAction: cta,
    emphasis: input.campaign.machineFlyerRevisionEmphasis,
  });
  const revisionEmphasis = input.campaign.machineFlyerRevisionEmphasis
    ?.emphasizeExistingCtaAsHeadline
    ? {
        emphasizeExistingCtaAsHeadline: true,
        instruction: String(
          input.campaign.machineFlyerRevisionEmphasis.instruction ?? "",
        ),
      }
    : undefined;

  const materialsNote = readProjectIntakeAnswer(
    answers,
    "materials",
    DESIGN_RENDERER_PROOF_SKU,
  );
  const brief = deriveCreativeBrief({
    businessName,
    flyerPurpose,
    mustInclude: `${mustInclude}\n${styleSource}`,
    materials: materialsNote,
    intendedUse: readProjectIntakeAnswer(
      answers,
      "intendedUse",
      DESIGN_RENDERER_PROOF_SKU,
    ),
    sizeNotes: readProjectIntakeAnswer(
      answers,
      "sizeNotes",
      DESIGN_RENDERER_PROOF_SKU,
    ),
    cta,
    headline,
    offerName,
    body,
    logoAvailable: Boolean(logo.material),
    suppliedImagery: false,
    requiredFacts: [],
  });
  const direction = selectCreativeDirection({
    brief,
    recent: readRecentSignatures(input.repoRoot),
  });
  const chosenPalette = paletteForBrief(brief);

  const offerHay = `${offerName} ${headline} ${body}`;
  const offerTokens = offerName
    .split(/[\s+/—–-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3 && !/^\$/.test(token))
    .slice(0, 4);
  const requiredTextTokens = [
    extracted.priceDisplay,
    businessName.split(/\s+/)[0]!,
    ...offerTokens,
    ...(extracted.dateWindow
      ? extracted.dateWindow.split(/[–—,]/).map((s) => s.trim()).filter((s) => s.length > 2).slice(0, 3)
      : []),
    ...( /2-hour/i.test(offerHay) ? ["2-hour"] : []),
    ...( /household area/i.test(offerHay) ? ["household area"] : []),
    ...( /organization plan/i.test(offerHay) ? ["organization plan"] : []),
    ...(offerHay.match(/pantry/i)?.[0] ? [offerHay.match(/pantry/i)![0]] : []),
  ].filter((token) => token.trim().length > 0);

  const truth: FlyerProjectTruth = {
    campaignId: input.campaign.campaignId,
    jobId: input.dispatchRecord.jobId,
    dispatchId: input.dispatchRecord.dispatchId,
    skuId: DESIGN_RENDERER_PROOF_SKU,
    fixtureId: `job-${input.campaign.campaignId}`,
    label: "CUSTOMER JOB — authoritative intake (not a certification fixture)",
    outputMode: "customer",
    ...(input.allowApprovedCustomerExampleDomain
      ? { approvedCustomerExampleDomain: true }
      : {}),
    businessName,
    wordmark,
    descriptor,
    headline,
    offerName,
    priceDisplay: extracted.priceDisplay,
    ...(input.allowApprovedCustomerExampleDomain
      ? (() => {
          const was = mustInclude.match(/was\s+(\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i)?.[1];
          return was ? { wasPriceDisplay: `was ${was.replace(/\s+/g, "")}` } : {};
        })()
      : {}),
    dateWindow: extracted.dateWindow,
    body,
    cta,
    phone: extracted.phone,
    webDisplay: extracted.webDisplay,
    webUrl: extracted.webUrl,
    disclaimer,
    sizeNotes: readProjectIntakeAnswer(
      answers,
      "sizeNotes",
      DESIGN_RENDERER_PROOF_SKU,
    ),
    intendedUse: readProjectIntakeAnswer(
      answers,
      "intendedUse",
      DESIGN_RENDERER_PROOF_SKU,
    ),
    brandColors: {
      primary: chosenPalette.primary,
      secondary: chosenPalette.secondary,
      background: chosenPalette.background,
      text: chosenPalette.text,
      muted: chosenPalette.muted,
    },
    approvedLogoVariantId: logo.material?.approvedIdentitySourceId ?? null,
    materials: logo.material ? [logo.material] : [],
    revisionEmphasis,
    requiredTextTokens,
    prohibitedClaimPatterns: [
      "Best in Richmond",
      "#1 rated",
      "CERTIFICATION FIXTURE",
      "school bus",
      "cartoon pencil",
      "guarantee",
      "% off",
      "Finished single-sided flyer for your print or digital use",
      "You distribute",
      "See offer details",
      ...(/\bbook online or call\b/i.test(cta) ? [] : ["Book online or call"]),
      "flyer for",
    ],
    creativeDirection: direction,
  };

  const facts = assertLiveFactsPreserved({
    supplied: [
      { id: "headline", text: resolvedHeadline.slice(0, 90) },
      { id: "cta", text: cta },
      { id: "offerName", text: offerName },
      { id: "priceDisplay", text: extracted.priceDisplay },
      { id: "phone", text: extracted.phone },
      { id: "webDisplay", text: extracted.webDisplay },
    ],
    truthValues: [
      headline,
      cta,
      offerName,
      extracted.priceDisplay,
      extracted.phone,
      extracted.webDisplay,
      body,
    ],
    suppliedHeadline: resolvedHeadline.slice(0, 90),
    mappedHeadline: headline,
    mappedCta: cta,
  });
  if (!facts.ok) {
    return { ok: false, code: "INVALID_DESIGN_SPEC", message: facts.message };
  }

  return { ok: true, truth };
}

export function customerArtifactRootRel(
  campaignId: string,
  dispatchId: string,
): string {
  // Windows-safe: strip characters illegal in directory names (esp. ':').
  const safeDispatch = dispatchId.replace(/[^a-zA-Z0-9_-]+/g, "_");
  return `data/campaign-design-artifacts/${campaignId}/${safeDispatch}`;
}
