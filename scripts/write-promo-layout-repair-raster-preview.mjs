/**
 * Local raster previews for promo layout repair (not a cert run).
 * Usage: npx tsx scripts/write-promo-layout-repair-raster-preview.mjs
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { mapSocialPromoOfferLedPromoTruth } from "../src/lib/studio-dispatch/map-social-promo-offer-led-truth.ts";
import { captureFlyerExports } from "../src/lib/studio-design-renderer/capture.ts";
import { reasonPromoCampaignSetDeterministic } from "../src/lib/studio-design-renderer/promo-reason.ts";
import { renderPromoAssetHtml } from "../src/lib/studio-design-renderer/promo-render-html.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const outDir = path.join(
  repoRoot,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/promo-layout-repair-2026-10-24/raster-preview",
);
mkdirSync(outDir, { recursive: true });

const campaign = {
  campaignId: "promo-layout-repair-preview",
  campaignName: "Spruce Line Studio",
  routeMapIntake: {
    submittedAt: "2026-10-25T00:28:19.907Z",
    answers: {
      "shared:businessName": "Spruce Line Studio",
      "shared:phone": "(555) 010-8820",
      "shared:webOrSocial": "spruceline.example/open-house",
      "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
      "social_and_promo_graphics:facts":
        "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.",
      "social_and_promo_graphics:cta": "Reserve your spot",
      "social_and_promo_graphics:rights": "Permission confirmed.",
    },
  },
};

const materials = [
  {
    id: "condensed-social-logo",
    category: "logo-brand",
    reviewStatus: "approved_for_use",
    relatedServiceIds: ["v2-rtu-promotion-graphics"],
    preparedLocalPath: "data/disposable-social-promo-machine-cert-6/materials/spruce-line-logo.png",
  },
];

const mapped = mapSocialPromoOfferLedPromoTruth({
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
if (!mapped.ok) throw new Error(mapped.message);

const spec = reasonPromoCampaignSetDeterministic(mapped.truth);

for (const asset of spec.assets) {
  const html = renderPromoAssetHtml(repoRoot, spec, asset);
  const htmlPath = path.join(outDir, `${asset.assetId}.html`);
  const pngPath = path.join(outDir, `${asset.assetId}.png`);
  writeFileSync(htmlPath, html);
  const capture = await captureFlyerExports({
    htmlAbsolutePath: htmlPath,
    pngAbsolutePath: pngPath,
    pdfAbsolutePath: path.join(outDir, `${asset.assetId}.pdf`),
    widthPx: asset.canvas.widthPx,
    heightPx: asset.canvas.heightPx,
  });
  console.log(asset.assetId, capture.overflowOk ? "OK" : capture.overflowDetail, pngPath);
}
