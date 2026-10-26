/**
 * Six isolated preview rasters using the canonical Cert-7 synthetic logo (no PREP seed / no campaign).
 * Usage: npx tsx scripts/write-cert7-isolated-preview-rasters.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  ensureSpruceLineCertSyntheticLogo,
  SPRUCE_LINE_CERT_LOGO_CANONICAL_REL,
} from "./spruce-line-cert-synthetic-logo.mjs";
import { mapSocialPromoOfferLedPromoTruth, mapSocialPromoOfferLedSocialTruth } from "../src/lib/studio-dispatch/map-social-promo-offer-led-truth.ts";
import { captureFlyerExports } from "../src/lib/studio-design-renderer/capture.ts";
import { reasonPromoCampaignSetDeterministic } from "../src/lib/studio-design-renderer/promo-reason.ts";
import { renderPromoAssetHtml } from "../src/lib/studio-design-renderer/promo-render-html.ts";
import { reasonSocialPostsSetDeterministic } from "../src/lib/studio-design-renderer/social-posts-reason.ts";
import { renderSocialPostAssetHtml } from "../src/lib/studio-design-renderer/social-posts-render-html.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const logo = await ensureSpruceLineCertSyntheticLogo(repoRoot);
console.log("logo", logo.relativePath, logo.width, "x", logo.height, "sha256", logo.sha256.slice(0, 16));

const outDir = path.join(
  repoRoot,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/cert-7-tooling-prep-2026-10-24/raster-preview",
);
mkdirSync(outDir, { recursive: true });

const CERT7_FACTS =
  "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.";

const campaign = {
  campaignId: "cert7-preview-shape-only",
  campaignName: "Spruce Line Studio",
  routeMapIntake: {
    submittedAt: "2026-10-25T12:00:00.000Z",
    answers: {
      "shared:businessName": "Spruce Line Studio",
      "shared:phone": "(555) 010-8820",
      "shared:webOrSocial": "spruceline.example/open-house",
      "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
      "social_and_promo_graphics:facts": CERT7_FACTS,
      "social_and_promo_graphics:cta": "Reserve your spot",
      "social_and_promo_graphics:rights": "Permission confirmed (disposable cert-7 synthetic project only).",
    },
  },
};

/** Same shape production mapping expects after File Room approval + preparedLocalPath. */
const materials = [
  {
    id: "condensed-social-facts",
    category: "factual-confirmation",
    reviewStatus: "approved_for_use",
    text: CERT7_FACTS,
  },
  {
    id: "condensed-social-logo",
    category: "logo-brand",
    reviewStatus: "approved_for_use",
    relatedServiceIds: ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"],
    preparedLocalPath: SPRUCE_LINE_CERT_LOGO_CANONICAL_REL,
  },
];

async function captureHtml(htmlPath, pngPath, w, h) {
  return captureFlyerExports({
    htmlAbsolutePath: htmlPath,
    pngAbsolutePath: pngPath,
    pdfAbsolutePath: pngPath.replace(/\.png$/, ".pdf"),
    widthPx: w,
    heightPx: h,
  });
}

const social = mapSocialPromoOfferLedSocialTruth({
  repoRoot,
  campaign,
  dispatchRecord: {
    dispatchId: "dd:preview:social",
    jobId: "preview:social",
    skuId: "v2-rtu-social-posts",
    executionIdentityReady: true,
    status: "EXECUTION_IDENTITY_READY",
  },
  materials,
});
if (!social.ok) throw new Error(social.message);
const socialSpec = reasonSocialPostsSetDeterministic(social.truth);
for (const asset of socialSpec.assets) {
  const htmlPath = path.join(outDir, `${asset.assetId}.html`);
  writeFileSync(htmlPath, renderSocialPostAssetHtml(repoRoot, socialSpec, asset));
  const pngPath = path.join(outDir, `${asset.assetId}.png`);
  const cap = await captureHtml(htmlPath, pngPath, asset.canvas.widthPx, asset.canvas.heightPx);
  const snippet = readFileSync(htmlPath, "utf8");
  if (snippet.includes("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ")) {
    throw new Error(`${asset.assetId} HTML still embeds 1×1 placeholder logo`);
  }
  console.log(asset.assetId, cap.overflowOk ? "OK" : cap.overflowDetail);
}

const promo = mapSocialPromoOfferLedPromoTruth({
  repoRoot,
  campaign,
  dispatchRecord: {
    dispatchId: "dd:preview:promo",
    jobId: "preview:promo",
    skuId: "v2-rtu-promotion-graphics",
    executionIdentityReady: true,
    status: "EXECUTION_IDENTITY_READY",
  },
  materials,
});
if (!promo.ok) throw new Error(promo.message);
const promoSpec = reasonPromoCampaignSetDeterministic(promo.truth);
for (const asset of promoSpec.assets) {
  const htmlPath = path.join(outDir, `${asset.assetId}.html`);
  writeFileSync(htmlPath, renderPromoAssetHtml(repoRoot, promoSpec, asset));
  const pngPath = path.join(outDir, `${asset.assetId}.png`);
  const cap = await captureHtml(htmlPath, pngPath, asset.canvas.widthPx, asset.canvas.heightPx);
  const snippet = readFileSync(htmlPath, "utf8");
  if (snippet.includes("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ")) {
    throw new Error(`${asset.assetId} HTML still embeds 1×1 placeholder logo`);
  }
  console.log(asset.assetId, cap.overflowOk ? "OK" : cap.overflowDetail);
}

writeFileSync(
  path.join(outDir, "preview-manifest.json"),
  `${JSON.stringify(
    {
      logo: {
        relativePath: logo.relativePath,
        sha256: logo.sha256,
        widthPx: logo.width,
        heightPx: logo.height,
      },
      campaignIdUsed: campaign.campaignId,
      note: "Preview-only shape — not a seeded cert-7 campaign.",
    },
    null,
    2,
  )}\n`,
);
