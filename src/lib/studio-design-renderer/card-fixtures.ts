/**
 * Safe Harbor & Oak CERTIFICATION FIXTURE for business-card proof.
 * INTERNAL TEST — not a live customer record. Double-sided truth.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import path from "path";

import { designFixtureA } from "@/lib/studio-kitchen-production/cert-design/fixtures";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";

import type { DesignMaterialRef } from "./types";
import { HARBOR_OAK_LOGO_SVG } from "./fixtures";
import type { BusinessCardProjectTruth } from "./card-types";
import { DESIGN_RENDERER_BUSINESS_CARD_SKU } from "./card-types";

export const BUSINESS_CARD_PROOF_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-BUSINESS-CARD-PROOF-1" as const;

export const BUSINESS_CARD_PROOF_ARTIFACT_ROOT =
  "docs/launch/studio-operating-design-business-card-proof-1/artifacts/v2-rtu-business-card" as const;

const LOGO_REL =
  `${BUSINESS_CARD_PROOF_ARTIFACT_ROOT}/materials/harbor-oak-anchor-oak-oval-v1.svg` as const;

export function ensureHarborOakCardLogoMaterial(
  repoRoot: string,
): DesignMaterialRef {
  const abs = path.join(repoRoot, LOGO_REL);
  mkdirSync(path.dirname(abs), { recursive: true });
  if (!existsSync(abs) || readFileSync(abs, "utf8") !== HARBOR_OAK_LOGO_SVG) {
    writeFileSync(abs, HARBOR_OAK_LOGO_SVG, "utf8");
  }
  const contentSha256 = createHash("sha256")
    .update(readFileSync(abs))
    .digest("hex");
  return {
    materialId: "mat-harbor-oak-logo-v1",
    role: "logo",
    relativePath: LOGO_REL,
    contentSha256,
    approvedIdentitySourceId: harborOakIdentityLock.approvedLogoVariantIds[0],
  };
}

/**
 * CERT fixture person matching historical Harbor card QA tokens
 * (Jordan Hale · Service Coordinator) — fixture only, not a live customer.
 */
export function buildHarborOakBusinessCardProjectTruth(input: {
  repoRoot: string;
  campaignId?: string;
  jobId?: string;
  dispatchId?: string;
}): BusinessCardProjectTruth {
  const campaignId =
    input.campaignId ?? "camp-design-business-card-proof-harbor-oak";
  const jobId =
    input.jobId ?? `${campaignId}::${DESIGN_RENDERER_BUSINESS_CARD_SKU}`;
  const dispatchId = input.dispatchId ?? `dd:${jobId}`;
  const logo = ensureHarborOakCardLogoMaterial(input.repoRoot);
  const fx = designFixtureA;
  const colors = fx.approvedColors;

  return {
    campaignId,
    jobId,
    dispatchId,
    skuId: DESIGN_RENDERER_BUSINESS_CARD_SKU,
    fixtureId: fx.id,
    label: fx.label,
    outputMode: "certification_fixture",
    businessName: harborOakIdentityLock.businessName,
    wordmark: harborOakIdentityLock.requiredWordmark,
    personName: "Jordan Hale",
    title: "Service Coordinator",
    phone: fx.phone,
    email: "jordan.hale@harborandoak.example",
    webDisplay: "harborandoak.example",
    webUrl: "https://harborandoak.example",
    address: "Richmond, VA metro",
    backDescriptor: "Plainspoken home services — HVAC & plumbing.",
    brandColors: {
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.background,
      text: colors.text,
      muted: "#5A6570",
    },
    approvedLogoVariantId: harborOakIdentityLock.approvedLogoVariantIds[0]!,
    materials: [logo],
    requiredTextTokens: [
      "Harbor",
      "Jordan",
      "Hale",
      "Coordinator",
      "555-0142",
      "harborandoak",
    ],
    prohibitedClaimPatterns: [...fx.prohibitedClaims],
  };
}
