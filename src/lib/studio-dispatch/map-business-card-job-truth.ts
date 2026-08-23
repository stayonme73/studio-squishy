/**
 * Map authoritative campaign/job truth → BusinessCardProjectTruth (customer mode).
 * Never injects Harbor CERT fixtures or certification disclaimers.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { BusinessCardProjectTruth } from "@/lib/studio-design-renderer/card-types";
import { DESIGN_RENDERER_BUSINESS_CARD_SKU } from "@/lib/studio-design-renderer/card-types";

import {
  requireApprovedLogoFile,
  resolveApprovedLogoMaterial,
} from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export type BusinessCardTruthMapResult =
  | { ok: true; truth: BusinessCardProjectTruth }
  | {
      ok: false;
      code:
        | "MISSING_REQUIRED_MATERIAL"
        | "BROKEN_ASSET_REFERENCE"
        | "INVALID_DESIGN_SPEC"
        | "MISSING_REQUIRED_TRUTH"
        | "SKU_NOT_SUPPORTED";
      message: string;
    };

function splitNameTitle(raw: string): { personName: string; title?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { personName: "" };
  const parts = trimmed
    .split(/\s*[·|–—,]\s*|\s+-\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { personName: parts[0]!, title: parts.slice(1).join(" — ") };
  }
  return { personName: trimmed };
}

export function mapBusinessCardProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): BusinessCardTruthMapResult {
  if (input.dispatchRecord.skuId !== DESIGN_RENDERER_BUSINESS_CARD_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `Business-card dispatch hook only supports ${DESIGN_RENDERER_BUSINESS_CARD_SKU}`,
    };
  }

  const answers = input.campaign.routeMapIntake?.answers ?? {};
  const businessName = String(
    answers.businessName ?? input.campaign.campaignName ?? "",
  ).trim();
  const cardNameTitle = String(answers.cardNameTitle ?? "").trim();
  const phone = String(answers.phone ?? "").trim();
  const email = String(answers.email ?? "").trim();
  const webOrSocial = String(answers.webOrSocial ?? "").trim();
  const address = String(answers.address ?? "").trim();
  const brandMaterials = String(answers.brandMaterials ?? "").trim();

  const missing: string[] = [];
  if (!businessName) missing.push("businessName");
  if (!cardNameTitle) missing.push("cardNameTitle");
  if (!phone) missing.push("phone");
  if (!email) missing.push("email");
  if (!brandMaterials) missing.push("brandMaterials");
  if (missing.length) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: `Authoritative Route Map business-card intake missing: ${missing.join(", ")}`,
    };
  }

  const { personName, title } = splitNameTitle(cardNameTitle);
  if (!personName) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: "cardNameTitle must include a person name",
    };
  }

  const logo = requireApprovedLogoFile(
    resolveApprovedLogoMaterial({
    repoRoot: input.repoRoot,
    items: input.materials,
    skuId: DESIGN_RENDERER_BUSINESS_CARD_SKU,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  }),
  );
  if (!logo.ok) {
    return { ok: false, code: logo.code, message: logo.message };
  }

  const webDisplay = webOrSocial.replace(/^https?:\/\//i, "");
  const webUrl = webOrSocial
    ? webOrSocial.startsWith("http")
      ? webOrSocial
      : `https://${webOrSocial}`
    : undefined;

  const joined = [
    businessName,
    personName,
    title ?? "",
    phone,
    email,
    webDisplay,
    address,
    brandMaterials,
  ].join(" ");

  if (/CERTIFICATION FIXTURE|INTERNAL TEST|harborandoak\.example/i.test(joined)) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Customer job truth must not contain certification fixture content",
    };
  }

  const nameToken = personName.split(/\s+/)[0]!;
  const requiredTextTokens = [
    businessName.split(/\s+/)[0]!,
    nameToken,
    phone,
  ].filter(Boolean);

  const truth: BusinessCardProjectTruth = {
    campaignId: input.campaign.campaignId,
    jobId: input.dispatchRecord.jobId,
    dispatchId: input.dispatchRecord.dispatchId,
    skuId: DESIGN_RENDERER_BUSINESS_CARD_SKU,
    fixtureId: `job-${input.campaign.campaignId}`,
    label: "CUSTOMER JOB — authoritative intake (not a certification fixture)",
    outputMode: "customer",
    businessName,
    wordmark: businessName,
    personName,
    title,
    phone,
    email,
    webDisplay: webDisplay || undefined,
    webUrl,
    address: address || undefined,
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
