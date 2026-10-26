/**
 * Isolated Cert-7-shaped HTML previews with PREP parent-SKU logo binding (not a cert run).
 * Usage: npx tsx scripts/write-cert-7-logo-binding-repair-preview.mjs
 */

import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  mapSocialPromoOfferLedPromoTruth,
  mapSocialPromoOfferLedSocialTruth,
} from "../src/lib/studio-dispatch/map-social-promo-offer-led-truth.ts";
import { reasonPromoCampaignSetDeterministic } from "../src/lib/studio-design-renderer/promo-reason.ts";
import { reasonSocialPostsSetDeterministic } from "../src/lib/studio-design-renderer/social-posts-reason.ts";
import { renderPromoAssetHtml } from "../src/lib/studio-design-renderer/promo-render-html.ts";
import { renderSocialPostAssetHtml } from "../src/lib/studio-design-renderer/social-posts-render-html.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const CANONICAL_REL =
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/cert-7-synthetic-logo/spruce-line-studio-test-logo-v1.png";

const campaign = {
  campaignId: "cert-7-logo-binding-repair-preview",
  campaignName: "Spruce Line Studio",
  routeMapIntake: {
    submittedAt: "2026-10-25T12:00:00.000Z",
    answers: {
      "shared:businessName": "Spruce Line Studio",
      "shared:phone": "(555) 010-8820",
      "shared:webOrSocial": "spruceline.example/open-house",
      "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
      "social_and_promo_graphics:facts":
        "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.",
      "social_and_promo_graphics:cta": "Reserve your spot",
      "social_and_promo_graphics:mustKeep": "Warm, welcoming, not loud or salesy",
      "social_and_promo_graphics:rights": "I have permission to use the materials I am supplying.",
    },
  },
};

const materials = [
  {
    id: "condensed-social-logo",
    category: "logo-brand",
    reviewStatus: "approved_for_use",
    uploadStatus: "stored",
    relatedServiceIds: ["social_and_promo_graphics"],
    preparedLocalPath: CANONICAL_REL,
  },
];

function dispatch(branch) {
  return {
    dispatchId: `dd:preview:${branch}`,
    jobId: `job:preview:${branch}`,
    skuId: branch === "social" ? "v2-rtu-social-posts" : "v2-rtu-promotion-graphics",
    executionIdentityReady: true,
    status: "EXECUTION_IDENTITY_READY",
  };
}

const logoBytes = readFileSync(path.join(repoRoot, CANONICAL_REL));
const logoSha256 = createHash("sha256").update(logoBytes).digest("hex");

const outDir = path.join(
  repoRoot,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/cert-7-repair-sync-logo-2026-10-24/html-preview",
);
mkdirSync(outDir, { recursive: true });

const social = mapSocialPromoOfferLedSocialTruth({
  repoRoot,
  campaign,
  dispatchRecord: dispatch("social"),
  materials,
});
if (!social.ok) throw new Error(social.message);
expectLogo(social.truth.materials, social.truth.approvedLogoVariantId);
const socialSpec = reasonSocialPostsSetDeterministic(social.truth);
for (const asset of socialSpec.assets) {
  const html = renderSocialPostAssetHtml(repoRoot, socialSpec, asset);
  writeFileSync(path.join(outDir, `${asset.assetId}.html`), html);
  if (asset.assetId === "social-post-1") {
    if (!html.includes('role="logo"') && !html.includes("logo-plate")) {
      throw new Error("social-post-1 HTML missing logo layers");
    }
  }
}

const promo = mapSocialPromoOfferLedPromoTruth({
  repoRoot,
  campaign,
  dispatchRecord: dispatch("promo"),
  materials,
});
if (!promo.ok) throw new Error(promo.message);
expectLogo(promo.truth.materials, promo.truth.approvedLogoVariantId);
const promoSpec = reasonPromoCampaignSetDeterministic(promo.truth);
for (const asset of promoSpec.assets) {
  const html = renderPromoAssetHtml(repoRoot, promoSpec, asset);
  writeFileSync(path.join(outDir, `${asset.assetId}.html`), html);
  if (!html.includes("logo")) {
    throw new Error(`${asset.assetId} HTML missing logo reference`);
  }
}

writeFileSync(
  path.join(outDir, "manifest.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      logoSource: CANONICAL_REL,
      logoSha256,
      approvedLogoVariantId: social.truth.approvedLogoVariantId,
      note: "Cert-7 PREP-shaped parent SKU logo scope · offer-led · repair preview only",
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outDir, logoSha256 }, null, 2));

function expectLogo(materialsList, approvedLogoVariantId) {
  if (approvedLogoVariantId === "wordmark-only") {
    throw new Error("expected approved logo, got wordmark-only");
  }
  const logo = materialsList.find((m) => m.role === "logo");
  if (!logo?.contentSha256) throw new Error("missing logo material ref");
  if (logo.contentSha256 !== logoSha256) {
    throw new Error(`logo sha256 mismatch ${logo.contentSha256} !== ${logoSha256}`);
  }
}
