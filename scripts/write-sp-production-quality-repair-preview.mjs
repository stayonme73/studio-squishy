/**
 * Local HTML previews for Social & Promo production quality repair (not a cert run).
 * Usage: npx tsx scripts/write-sp-production-quality-repair-preview.mjs
 */

import { mkdirSync, writeFileSync } from "fs";
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

const campaign = {
  campaignId: "repair-visual-proof",
  campaignName: "Spruce Line Studio",
  routeMapIntake: {
    submittedAt: "2026-10-24T12:00:00.000Z",
    answers: {
      "shared:businessName": "Spruce Line Studio",
      "shared:phone": "(555) 010-8820",
      "shared:webOrSocial": "spruceline.example/open-house",
      "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
      "social_and_promo_graphics:facts":
        "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.",
      "social_and_promo_graphics:cta": "Reserve your spot",
      "social_and_promo_graphics:rights": "I have permission to use the materials I am supplying.",
    },
  },
};

function dispatch(branch) {
  return {
    dispatchId: `dd:repair:${branch}`,
    jobId: `job:repair:${branch}`,
    skuId: branch === "social" ? "v2-rtu-social-posts" : "v2-rtu-promotion-graphics",
    executionIdentityReady: true,
    status: "EXECUTION_IDENTITY_READY",
  };
}

const outDir = path.join(
  repoRoot,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/production-quality-repair-2026-10-24/html-preview",
);
mkdirSync(outDir, { recursive: true });

const social = mapSocialPromoOfferLedSocialTruth({
  repoRoot,
  campaign,
  dispatchRecord: dispatch("social"),
  materials: [],
});
if (!social.ok) throw new Error(social.message);
const socialSpec = reasonSocialPostsSetDeterministic(social.truth);
for (const asset of socialSpec.assets) {
  writeFileSync(
    path.join(outDir, `${asset.assetId}.html`),
    renderSocialPostAssetHtml(repoRoot, socialSpec, asset),
  );
}

const promo = mapSocialPromoOfferLedPromoTruth({
  repoRoot,
  campaign,
  dispatchRecord: dispatch("promo"),
  materials: [],
});
if (!promo.ok) throw new Error(promo.message);
const promoSpec = reasonPromoCampaignSetDeterministic(promo.truth);
for (const asset of promoSpec.assets) {
  writeFileSync(
    path.join(outDir, `${asset.assetId}.html`),
    renderPromoAssetHtml(repoRoot, promoSpec, asset),
  );
}

writeFileSync(
  path.join(outDir, "manifest.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: "Cert-3-shaped offer-led intake, wordmark-only (no approved logo). Open HTML in a browser to inspect layout.",
      socialAssets: socialSpec.assets.map((a) => a.assetId),
      promoAssets: promoSpec.assets.map((a) => a.assetId),
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outDir, files: socialSpec.assets.length + promoSpec.assets.length }, null, 2));
