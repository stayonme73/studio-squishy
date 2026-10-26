/**
 * Isolated six-asset raster previews (not a cert run).
 * Usage: npx tsx scripts/write-social-promo-quality-closure-rasters.mjs
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { mapSocialPromoOfferLedPromoTruth, mapSocialPromoOfferLedSocialTruth } from "../src/lib/studio-dispatch/map-social-promo-offer-led-truth.ts";
import { captureFlyerExports } from "../src/lib/studio-design-renderer/capture.ts";
import { reasonPromoCampaignSetDeterministic } from "../src/lib/studio-design-renderer/promo-reason.ts";
import { renderPromoAssetHtml } from "../src/lib/studio-design-renderer/promo-render-html.ts";
import { reasonSocialPostsSetDeterministic } from "../src/lib/studio-design-renderer/social-posts-reason.ts";
import { renderSocialPostAssetHtml } from "../src/lib/studio-design-renderer/social-posts-render-html.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const outDir = path.join(
  repoRoot,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/social-promo-quality-closure-2026-10-24/raster-preview",
);
mkdirSync(outDir, { recursive: true });

const CERT6_FACTS =
  "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.";

const campaign = {
  campaignId: "quality-closure-preview",
  campaignName: "Spruce Line Studio",
  routeMapIntake: {
    submittedAt: "2026-10-25T00:28:19.907Z",
    answers: {
      "shared:businessName": "Spruce Line Studio",
      "shared:phone": "(555) 010-8820",
      "shared:webOrSocial": "spruceline.example/open-house",
      "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
      "social_and_promo_graphics:facts": CERT6_FACTS,
      "social_and_promo_graphics:cta": "Reserve your spot",
      "social_and_promo_graphics:rights": "Permission confirmed.",
    },
  },
};

const materials = [
  {
    id: "condensed-social-facts",
    category: "factual-confirmation",
    reviewStatus: "approved_for_use",
    text: CERT6_FACTS,
  },
  {
    id: "condensed-social-logo",
    category: "logo-brand",
    reviewStatus: "approved_for_use",
    relatedServiceIds: ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"],
    preparedLocalPath: "data/disposable-social-promo-machine-cert-6/materials/spruce-line-logo.png",
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
  console.log(asset.assetId, cap?.overflowOk ? "OK" : cap?.overflowDetail ?? "captured");
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
  console.log(asset.assetId, cap?.overflowOk ? "OK" : cap?.overflowDetail ?? "captured");
}
