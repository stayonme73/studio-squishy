/**
 * Safe Harbor & Oak CERTIFICATION FIXTURE inputs for design-renderer proof.
 * INTERNAL TEST — not a live customer record.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import path from "path";

import { designFixtureA } from "@/lib/studio-kitchen-production/cert-design/fixtures";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";

import type { DesignMaterialRef, FlyerProjectTruth } from "./types";
import { DESIGN_RENDERER_PROOF_SKU } from "./types";

export const PROOF_PACKAGE_ID = "STUDIO-OPERATING-DESIGN-RENDERER-PROOF-1" as const;

export const PROOF_ARTIFACT_ROOT =
  "docs/launch/studio-operating-design-renderer-proof-1/artifacts/v2-rtu-flyer" as const;

const LOGO_REL =
  `${PROOF_ARTIFACT_ROOT}/materials/harbor-oak-anchor-oak-oval-v1.svg` as const;

/** Minimal geometric mark representing approved identity (anchor + oak oval). */
export const HARBOR_OAK_LOGO_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="Harbor and Oak mark">
  <rect width="256" height="256" fill="#F7F4EF"/>
  <ellipse cx="128" cy="128" rx="108" ry="108" fill="#1F3A5F"/>
  <ellipse cx="128" cy="128" rx="92" ry="92" fill="none" stroke="#C4A574" stroke-width="8"/>
  <!-- Quiet oak leaf -->
  <path d="M128 56 C148 78 156 108 148 138 C140 162 128 178 128 178 C128 178 116 162 108 138 C100 108 108 78 128 56 Z" fill="#C4A574"/>
  <!-- Anchor stem -->
  <rect x="120" y="90" width="16" height="88" rx="4" fill="#F7F4EF"/>
  <circle cx="128" cy="82" r="14" fill="none" stroke="#F7F4EF" stroke-width="10"/>
  <path d="M88 168 C100 196 156 196 168 168" fill="none" stroke="#F7F4EF" stroke-width="12" stroke-linecap="round"/>
  <path d="M96 156 L88 172 M160 156 L168 172" stroke="#F7F4EF" stroke-width="10" stroke-linecap="round"/>
</svg>
`;

export function ensureHarborOakLogoMaterial(repoRoot: string): DesignMaterialRef {
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

export function buildHarborOakFlyerProjectTruth(input: {
  repoRoot: string;
  campaignId?: string;
  jobId?: string;
  dispatchId?: string;
}): FlyerProjectTruth {
  const campaignId = input.campaignId ?? "camp-design-renderer-proof-harbor-oak";
  const jobId = input.jobId ?? `${campaignId}::${DESIGN_RENDERER_PROOF_SKU}`;
  const dispatchId = input.dispatchId ?? `dd:${jobId}`;
  const logo = ensureHarborOakLogoMaterial(input.repoRoot);
  const fx = designFixtureA;
  const colors = fx.approvedColors;

  return {
    campaignId,
    jobId,
    dispatchId,
    skuId: DESIGN_RENDERER_PROOF_SKU,
    fixtureId: fx.id,
    label: fx.label,
    outputMode: "certification_fixture",
    businessName: harborOakIdentityLock.businessName,
    wordmark: harborOakIdentityLock.requiredWordmark,
    descriptor: harborOakIdentityLock.approvedDescriptors[0]!,
    headline: "Spring service you can trust",
    offerName: "Spring Tune-Up + Drain Clear Bundle",
    priceDisplay: "$189",
    wasPriceDisplay: "was $249",
    dateWindow: "March 10 – April 15, 2026",
    body: "HVAC tune-up and drain clear for homeowners who want plain, steady service — not hype.",
    cta: fx.cta,
    phone: fx.phone,
    webDisplay: "harborandoak.example/book-tuneup",
    webUrl: fx.ctaUrl,
    disclaimer:
      "CERTIFICATION FIXTURE / INTERNAL TEST — not a live customer. One single-sided flyer proof.",
    brandColors: {
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.background,
      text: colors.text,
      muted: "#5A6570",
    },
    approvedLogoVariantId: harborOakIdentityLock.approvedLogoVariantIds[0]!,
    materials: [logo],
    requiredTextTokens: [...fx.requiredFacts, "Harbor"],
    prohibitedClaimPatterns: [...fx.prohibitedClaims],
  };
}
