/**
 * Harbor & Oak CERTIFICATION FIXTURE — four-post social set.
 * Explicit per-post order + role angle truth (not derived from live intake).
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { designFixtureA } from "@/lib/studio-kitchen-production/cert-design/fixtures";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";

import { HARBOR_OAK_LOGO_SVG } from "./fixtures";
import {
  DESIGN_RENDERER_SOCIAL_POSTS_SKU,
  type SocialPostMaterialRef,
  type SocialPostsProjectTruth,
} from "./social-posts-types";

export const SOCIAL_POSTS_PROOF_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-PROOF-1" as const;

export const SOCIAL_POSTS_PROOF_ARTIFACT_ROOT =
  "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts" as const;

const LOGO_REL =
  `${SOCIAL_POSTS_PROOF_ARTIFACT_ROOT}/materials/harbor-oak-anchor-oak-oval-v1.svg` as const;

/** Explicit scope boundary recorded on the truth so the proof cannot imply live execution. */
export const SOCIAL_POSTS_DISPATCH_WIRING_SCOPE_NOTE =
  "STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-DISPATCH-HOOK-1 — Machine path for v2-rtu-social-posts. primaryTool studio_design_renderer. Layout templates via Studio production (INTAKE-TRUTH-1), not Harbor-as-customer-contract. Square-only. Captions Studio-written. Owner routine NONE. Make unused." as const;

/** Customer-facing placement label surfaced on every post in the set. */
export const SOCIAL_POSTS_FIXTURE_PLATFORM_LABEL =
  "Instagram Post — square feed (CERT)" as const;

export function ensureHarborOakSocialPostsLogoMaterial(
  repoRoot: string,
): SocialPostMaterialRef {
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

export function buildHarborOakSocialPostsSetTruth(input: {
  repoRoot: string;
  campaignId?: string;
  jobId?: string;
  dispatchId?: string;
}): SocialPostsProjectTruth {
  const campaignId = input.campaignId ?? "camp-design-social-posts-proof-harbor";
  const jobId =
    input.jobId ?? `${campaignId}::${DESIGN_RENDERER_SOCIAL_POSTS_SKU}`;
  const dispatchId = input.dispatchId ?? `dd:${jobId}`;
  const logo = ensureHarborOakSocialPostsLogoMaterial(input.repoRoot);
  const fx = designFixtureA;
  const colors = fx.approvedColors;
  const campaign = harborOakIdentityLock.campaign;

  return {
    campaignId,
    jobId,
    dispatchId,
    skuId: DESIGN_RENDERER_SOCIAL_POSTS_SKU,
    fixtureId: fx.id,
    label: `${fx.label} — social-posts four-post set`,
    outputMode: "certification_fixture",
    businessName: harborOakIdentityLock.businessName,
    wordmark: harborOakIdentityLock.requiredWordmark,
    descriptor: harborOakIdentityLock.approvedDescriptors[0]!,
    headline: "Spring service you can trust",
    offerName: campaign.offerName,
    priceDisplay: campaign.priceToken,
    wasPriceDisplay: "was $249",
    dateWindow: "March 10 – April 15, 2026",
    body: "HVAC tune-up and drain clear for homeowners who want plain, steady service.",
    cta: fx.cta,
    phone: fx.phone,
    webDisplay: "harborandoak.example/book-tuneup",
    webUrl: fx.ctaUrl,
    disclaimer:
      "CERTIFICATION FIXTURE / INTERNAL TEST — not a live customer. Four coordinated social posts proof.",
    platformLabel: SOCIAL_POSTS_FIXTURE_PLATFORM_LABEL,
    brandColors: {
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.background,
      text: colors.text,
      muted: "#5A6570",
    },
    materials: [logo],
    approvedLogoVariantId: harborOakIdentityLock.approvedLogoVariantIds[0]!,
    requiredTextTokens: [
      campaign.priceToken,
      "March 10",
      "April 15",
      "2026",
      "Harbor",
    ],
    prohibitedClaimPatterns: [...fx.prohibitedClaims],
    assets: [
      { assetId: "social-post-1", orderIndex: 1, roleAngle: "offer_lead" },
      { assetId: "social-post-2", orderIndex: 2, roleAngle: "cta_book" },
      { assetId: "social-post-3", orderIndex: 3, roleAngle: "dates_window" },
      { assetId: "social-post-4", orderIndex: 4, roleAngle: "trust_brand" },
    ],
    dispatchWiringScopeNote: SOCIAL_POSTS_DISPATCH_WIRING_SCOPE_NOTE,
  };
}
