/**
 * Map authoritative campaign/job truth → PromoProjectTruth (customer mode).
 * Per-graphic purpose + plate from live intake; never invents offer or contact fields.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_PROMO_SKU,
  assertPromoAssetsExecutableForDispatch,
  mapPromoAssetsFromIntakeAnswers,
} from "@/lib/studio-design-renderer";
import type { PromoProjectTruth } from "@/lib/studio-design-renderer";

import { resolveApprovedLogoMaterial } from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export type PromoTruthMapResult =
  | { ok: true; truth: PromoProjectTruth }
  | {
      ok: false;
      code:
        | "MISSING_REQUIRED_MATERIAL"
        | "BROKEN_ASSET_REFERENCE"
        | "INVALID_DESIGN_SPEC"
        | "MISSING_REQUIRED_TRUTH"
        | "INVALID_PLATE"
        | "INVALID_PURPOSE"
        | "UNSUPPORTED_PLATE_EXECUTION"
        | "SKU_NOT_SUPPORTED";
      message: string;
    };

const PHONE_RE = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const URL_RE =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9.]+\.[a-z]{2,}(?:\/[^\s]*)?|(?:example|book|shop)\.[a-z0-9][-a-z0-9.]*/i;
const PRICE_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/;

const FIXTURE_CONTENT_RE =
  /CERTIFICATION FIXTURE|INTERNAL TEST|harborandoak\.example/i;

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

function extractContactAndPrice(input: {
  mustInclude: string;
  callToAction: string;
}): {
  phone: string;
  webDisplay: string;
  webUrl: string;
  priceDisplay: string;
} {
  const combined = `${input.mustInclude}\n${input.callToAction}`;
  const phone = firstMatch(PHONE_RE, combined);
  const webRaw = firstMatch(URL_RE, combined);
  const webDisplay = webRaw.replace(/^https?:\/\//i, "");
  const webUrl = webRaw
    ? webRaw.startsWith("http")
      ? webRaw
      : `https://${webRaw}`
    : "";
  const priceDisplay = firstMatch(PRICE_RE, input.mustInclude).replace(
    /\s+/g,
    "",
  );
  return { phone, webDisplay, webUrl, priceDisplay };
}

export function mapPromoProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): PromoTruthMapResult {
  if (input.dispatchRecord.skuId !== DESIGN_RENDERER_PROMO_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `Promotion-graphics dispatch hook only supports ${DESIGN_RENDERER_PROMO_SKU}`,
    };
  }

  const rawAnswers = input.campaign.routeMapIntake?.answers ?? {};
  const answers = stringAnswers(rawAnswers);

  const campaignFocus = String(answers.campaignFocus ?? "").trim();
  const mustInclude = String(answers.mustInclude ?? "").trim();
  const dates = String(answers.dates ?? "").trim();
  const callToAction = String(answers.callToAction ?? "").trim();
  const disclaimers = String(answers.disclaimers ?? "").trim();

  const missing: string[] = [];
  if (!campaignFocus) missing.push("campaignFocus");
  if (!mustInclude) missing.push("mustInclude");
  if (!dates) missing.push("dates");
  if (!callToAction) missing.push("callToAction");
  if (missing.length) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: `Authoritative Route Map promotion-graphics intake missing: ${missing.join(", ")}`,
    };
  }

  const contentScan = [campaignFocus, mustInclude, callToAction, disclaimers, dates].join(
    " ",
  );
  if (FIXTURE_CONTENT_RE.test(contentScan)) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Customer job truth must not contain certification fixture content",
    };
  }

  const assetMapped = mapPromoAssetsFromIntakeAnswers(answers);
  if (!assetMapped.ok) {
    return {
      ok: false,
      code: assetMapped.code,
      message: assetMapped.message,
    };
  }

  const executable = assertPromoAssetsExecutableForDispatch(assetMapped.assets);
  if (!executable.ok) {
    return {
      ok: false,
      code: executable.code,
      message: executable.message,
    };
  }

  const extracted = extractContactAndPrice({ mustInclude, callToAction });
  if (!extracted.phone || !extracted.webDisplay) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "mustInclude and/or callToAction must provide phone and website/destination for contact fields",
    };
  }
  if (!extracted.priceDisplay) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: "mustInclude must provide a price token (e.g. $189)",
    };
  }

  const logo = resolveApprovedLogoMaterial({
    repoRoot: input.repoRoot,
    items: input.materials,
    skuId: DESIGN_RENDERER_PROMO_SKU,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  });
  if (!logo.ok) {
    return { ok: false, code: logo.code, message: logo.message };
  }

  const businessName = input.campaign.campaignName.trim() || "Customer";
  const wordmark = businessName;
  const descriptor = String(answers.businessType ?? "").trim() || "Local business";
  const offerName =
    campaignFocus.split(/[.\n]/)[0]?.trim().slice(0, 80) ||
    mustInclude.split(/[.\n]/)[0]?.trim().slice(0, 80) ||
    campaignFocus.slice(0, 80);
  const disclaimer =
    disclaimers ||
    "Finished campaign graphics for your print or digital use. You distribute.";

  const requiredTextTokens = [
    extracted.priceDisplay,
    businessName.split(/\s+/)[0]!,
    ...dates
      .split(/[–—,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2)
      .slice(0, 3),
  ].filter(Boolean);

  const truth: PromoProjectTruth = {
    campaignId: input.campaign.campaignId,
    jobId: input.dispatchRecord.jobId,
    dispatchId: input.dispatchRecord.dispatchId,
    skuId: DESIGN_RENDERER_PROMO_SKU,
    fixtureId: `job-${input.campaign.campaignId}`,
    label: "CUSTOMER JOB — authoritative intake",
    outputMode: "customer",
    businessName,
    wordmark,
    descriptor,
    headline: campaignFocus.slice(0, 90),
    offerName,
    priceDisplay: extracted.priceDisplay,
    dateWindow: dates.slice(0, 120),
    body: mustInclude.slice(0, 220),
    cta: callToAction,
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
    ],
    assets: assetMapped.assets,
    liveIntakePerAssetPurposeGap:
      "Per-graphic authorizedPurpose and agreedPlate intake fields are authoritative; dispatch maps and executes them without substitution.",
  };

  return { ok: true, truth };
}
