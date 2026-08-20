/**
 * Map authoritative campaign/job truth → FlyerProjectTruth (customer mode).
 * Never injects Harbor CERT fixtures, certification disclaimers, or Studio
 * SKU contract footer copy onto the customer-facing flyer.
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type {
  DesignMaterialRef,
  FlyerProjectTruth,
} from "@/lib/studio-design-renderer/types";
import { DESIGN_RENDERER_PROOF_SKU } from "@/lib/studio-design-renderer/types";

import {
  curatedCustomerBodyFromMustInclude,
  resolveCustomerBusinessName,
  resolveCustomerOfferHeadline,
  shortenCustomerFacingCta,
  stripCustomerFacingCta,
  stripProductionMetadataFromMustInclude,
} from "@/lib/studio-design-renderer/customer-facing-creative-copy";
import { applyExistingCtaHeadlineEmphasis } from "@/lib/studio-review-revision/flyer-revision-emphasis";
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

function brandColorsFromDirection(text: string): typeof DEFAULT_FLYER_COLORS {
  if (
    /botanical|soft neutral|warm,\s*clean,\s*calm|uncluttered|no childish school/i.test(
      text,
    )
  ) {
    return SOFT_NEUTRAL_BOTANICAL_COLORS;
  }
  return DEFAULT_FLYER_COLORS;
}

function extractOfferName(
  mustInclude: string,
  flyerPurpose: string,
  businessName: string,
): string {
  const lines = stripProductionMetadataFromMustInclude(mustInclude)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const skip =
    /includes:|customers may choose|^style:|call |visit |\(\d{3}\)|https?:|\$\d|book your reset|voice brief|missing fact/i;
  const found = lines.find(
    (line) => line !== businessName && !skip.test(line) && line.length < 80,
  );
  if (found) return found.slice(0, 80);
  const purposeTail = flyerPurpose.replace(/^promotional flyer for\s+/i, "").trim();
  return (purposeTail || flyerPurpose).slice(0, 80);
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
  const webRaw = firstMatch(URL_RE, mustInclude);
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
    )?.[0]?.trim() ?? "";

  return { phone, webDisplay, webUrl, priceDisplay, dateWindow };
}

/**
 * Resolve an approved logo-brand material to a local repo-relative file.
 * Prefer explicit staged path (tests / production staging).
 * No approved logo → optional (wordmark-only). Broken approved path still fails closed.
 */
export function resolveApprovedLogoMaterial(input: {
  repoRoot: string;
  items: readonly CampaignMaterialItem[];
  skuId: string;
  stagedLogoRelativePath?: string;
}):
  | { ok: true; material: DesignMaterialRef | null }
  | { ok: false; code: "MISSING_REQUIRED_MATERIAL" | "BROKEN_ASSET_REFERENCE"; message: string } {
  const approved = input.items.filter(
    (i) =>
      i.category === "logo-brand" &&
      i.reviewStatus === "approved_for_use" &&
      (i.relatedServiceIds.length === 0 ||
        i.relatedServiceIds.includes(input.skuId as never)),
  );
  if (approved.length === 0) {
    return { ok: true, material: null };
  }

  let relativePath = input.stagedLogoRelativePath?.trim() ?? "";
  if (!relativePath) {
    const hint = approved[0]!;
    // Allow a repo-relative path staged in url or teamNote for Machine production.
    const candidate = (hint.url ?? hint.teamNote ?? "").trim();
    if (
      candidate &&
      !candidate.startsWith("http") &&
      (candidate.startsWith("data/") || candidate.startsWith("docs/"))
    ) {
      relativePath = candidate;
    }
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

export function mapFlyerProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): FlyerTruthMapResult {
  if (input.dispatchRecord.skuId !== DESIGN_RENDERER_PROOF_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `Dispatch hook only supports ${DESIGN_RENDERER_PROOF_SKU}`,
    };
  }

  const answers = input.campaign.routeMapIntake?.answers ?? {};
  const flyerPurpose = String(answers.flyerPurpose ?? "").trim();
  const mustInclude = String(answers.mustInclude ?? "").trim();
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
  if (!extracted.phone || !extracted.webDisplay) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message:
        "mustInclude must provide phone and website/destination for flyer contact fields",
    };
  }
  if (!extracted.priceDisplay) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "mustInclude must provide a price token (e.g. $189)",
    };
  }

  const businessName = resolveCustomerBusinessName({
    campaignName: input.campaign.campaignName,
    mustInclude,
  });
  const wordmark = businessName;
  const descriptor = "";
  const disclaimer = String(answers.disclaimers ?? "").trim();
  const styleSource = [
    mustInclude,
    String(answers.materials ?? ""),
    String(answers.styleNotes ?? ""),
  ].join("\n");

  // Hard ban on leaking proof fixture language into customer jobs.
  if (/CERTIFICATION FIXTURE|INTERNAL TEST|harborandoak\.example/i.test(
    [flyerPurpose, mustInclude, disclaimer].join(" "),
  )) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Customer job truth must not contain certification fixture content",
    };
  }

  const offerName = resolveCustomerOfferHeadline({
    flyerPurpose,
    mustInclude,
    fallback: extractOfferName(mustInclude, flyerPurpose, businessName),
  });
  const voiceBriefExact = String(
    answers.voiceBriefExact ?? answers.studioVoiceBrief ?? "",
  ).trim();
  const body = customerFacingFlyerBody(mustInclude, voiceBriefExact || undefined);
  const cta = shortenCustomerFacingCta(
    stripCustomerFacingCta(
      String(answers.callToAction ?? "").trim() || "Book online or call",
    ),
  );
  const headline = applyExistingCtaHeadlineEmphasis({
    headline: offerName.slice(0, 90),
    callToAction: cta,
    emphasis: input.campaign.machineFlyerRevisionEmphasis,
  });

  const requiredTextTokens = [
    extracted.priceDisplay,
    businessName.split(/\s+/)[0]!,
    ...(extracted.dateWindow
      ? extracted.dateWindow.split(/[–—,]/).map((s) => s.trim()).filter((s) => s.length > 2).slice(0, 3)
      : []),
    ...( /2-hour/i.test(body) ? ["2-hour"] : []),
    ...( /household area/i.test(body) ? ["household area"] : []),
    ...( /organization plan/i.test(body) ? ["organization plan"] : []),
    ...(body.match(/pantry/i)?.[0] ? [body.match(/pantry/i)![0]] : []),
  ];

  const truth: FlyerProjectTruth = {
    campaignId: input.campaign.campaignId,
    jobId: input.dispatchRecord.jobId,
    dispatchId: input.dispatchRecord.dispatchId,
    skuId: DESIGN_RENDERER_PROOF_SKU,
    fixtureId: `job-${input.campaign.campaignId}`,
    label: "CUSTOMER JOB — authoritative intake (not a certification fixture)",
    outputMode: "customer",
    businessName,
    wordmark,
    descriptor,
    headline,
    offerName,
    priceDisplay: extracted.priceDisplay,
    dateWindow: extracted.dateWindow || "See offer details",
    body,
    cta,
    phone: extracted.phone,
    webDisplay: extracted.webDisplay,
    webUrl: extracted.webUrl,
    disclaimer,
    brandColors: brandColorsFromDirection(styleSource),
    approvedLogoVariantId: logo.material?.approvedIdentitySourceId ?? null,
    materials: logo.material ? [logo.material] : [],
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
    ],
  };

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
