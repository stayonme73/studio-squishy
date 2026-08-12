/**
 * Map authoritative campaign/job truth → FlyerProjectTruth (customer mode).
 * Never injects Harbor CERT fixtures or certification disclaimers.
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
 * Prefer explicit staged path (tests / production staging). Fail closed if missing.
 */
export function resolveApprovedLogoMaterial(input: {
  repoRoot: string;
  items: readonly CampaignMaterialItem[];
  skuId: string;
  stagedLogoRelativePath?: string;
}):
  | { ok: true; material: DesignMaterialRef }
  | { ok: false; code: "MISSING_REQUIRED_MATERIAL" | "BROKEN_ASSET_REFERENCE"; message: string } {
  const approved = input.items.filter(
    (i) =>
      i.category === "logo-brand" &&
      i.reviewStatus === "approved_for_use" &&
      (i.relatedServiceIds.length === 0 ||
        i.relatedServiceIds.includes(input.skuId as never)),
  );
  if (approved.length === 0) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_MATERIAL",
      message: `No approved logo-brand material for ${input.skuId}`,
    };
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

  const businessName = input.campaign.campaignName.trim() || "Customer";
  const wordmark = businessName;
  const descriptor = "Local business";
  const customerDisclaimer = String(answers.disclaimers ?? "").trim();
  const disclaimer =
    customerDisclaimer ||
    "Finished single-sided flyer for your print or digital use. You distribute.";

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

  const offerName =
    mustInclude.split(/[.\n]/)[0]?.trim().slice(0, 80) || flyerPurpose.slice(0, 80);
  const cta =
    String(answers.callToAction ?? "").trim() ||
    "Book online or call";

  const requiredTextTokens = [
    extracted.priceDisplay,
    businessName.split(/\s+/)[0]!,
    ...(extracted.dateWindow
      ? extracted.dateWindow.split(/[–—,]/).map((s) => s.trim()).filter((s) => s.length > 2).slice(0, 3)
      : []),
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
    headline: flyerPurpose.slice(0, 90),
    offerName,
    priceDisplay: extracted.priceDisplay,
    dateWindow: extracted.dateWindow || "See offer details",
    body: mustInclude.slice(0, 220),
    cta,
    phone: extracted.phone,
    webDisplay: extracted.webDisplay,
    webUrl: extracted.webUrl,
    disclaimer,
    brandColors: {
      primary: "#1F3A5F",
      secondary: "#C4A574",
      background: "#F7F4EF",
      text: "#1A1A1A",
      muted: "#5A6570",
    },
    approvedLogoVariantId: logo.material.approvedIdentitySourceId!,
    materials: [logo.material],
    requiredTextTokens,
    prohibitedClaimPatterns: [
      "Best in Richmond",
      "#1 rated",
      "CERTIFICATION FIXTURE",
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
