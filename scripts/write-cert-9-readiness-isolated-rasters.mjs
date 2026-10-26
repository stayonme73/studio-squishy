/**
 * Six isolated PNG rasters — Cert-9 readiness (PREP parent logo scope, post review-prep repair stack).
 * Not a cert seed/run. Usage: npx tsx scripts/write-cert-9-readiness-isolated-rasters.mjs
 */

import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  ensureSpruceLineCertSyntheticLogo,
  SPRUCE_LINE_CERT_LOGO_CANONICAL_REL,
} from "./spruce-line-cert-synthetic-logo.mjs";
import {
  mapSocialPromoOfferLedPromoTruth,
  mapSocialPromoOfferLedSocialTruth,
} from "../src/lib/studio-dispatch/map-social-promo-offer-led-truth.ts";
import { captureFlyerExports } from "../src/lib/studio-design-renderer/capture.ts";
import { reasonPromoCampaignSetDeterministic } from "../src/lib/studio-design-renderer/promo-reason.ts";
import { renderPromoAssetHtml } from "../src/lib/studio-design-renderer/promo-render-html.ts";
import { reasonSocialPostsSetDeterministic } from "../src/lib/studio-design-renderer/social-posts-reason.ts";
import { renderSocialPostAssetHtml } from "../src/lib/studio-design-renderer/social-posts-render-html.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const logo = await ensureSpruceLineCertSyntheticLogo(repoRoot);
const expectedSha = createHash("sha256")
  .update(readFileSync(path.join(repoRoot, SPRUCE_LINE_CERT_LOGO_CANONICAL_REL)))
  .digest("hex");

const outDir = path.join(
  repoRoot,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/cert-9-readiness-2026-10-24/raster-preview",
);
mkdirSync(outDir, { recursive: true });

const CERT9_FACTS =
  "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.";

const campaign = {
  campaignId: "cert9-readiness-raster-only",
  campaignName: "Spruce Line Studio",
  routeMapIntake: {
    submittedAt: "2026-10-25T12:00:00.000Z",
    answers: {
      "shared:businessName": "Spruce Line Studio",
      "shared:phone": "(555) 010-8820",
      "shared:webOrSocial": "spruceline.example/open-house",
      "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
      "social_and_promo_graphics:facts": CERT9_FACTS,
      "social_and_promo_graphics:cta": "Reserve your spot",
      "social_and_promo_graphics:mustKeep": "Warm, welcoming, not loud or salesy",
      "social_and_promo_graphics:rights":
        "I have permission to use the materials I am supplying (disposable cert-9 synthetic project only).",
    },
  },
};

const materials = [
  {
    id: "condensed-social-facts",
    category: "factual-confirmation",
    reviewStatus: "approved_for_use",
    text: CERT9_FACTS,
  },
  {
    id: "condensed-social-logo",
    category: "logo-brand",
    reviewStatus: "approved_for_use",
    uploadStatus: "stored",
    relatedServiceIds: ["social_and_promo_graphics"],
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

const qa = [];

function assertLogoMaterial(truth, branch) {
  if (truth.approvedLogoVariantId === "wordmark-only") {
    throw new Error(`${branch}: wordmark-only after parent logo scope fix`);
  }
  const logoMat = truth.materials.find((m) => m.role === "logo");
  if (!logoMat || logoMat.contentSha256 !== expectedSha) {
    throw new Error(`${branch}: logo SHA mismatch`);
  }
}

const social = mapSocialPromoOfferLedSocialTruth({
  repoRoot,
  campaign,
  dispatchRecord: {
    dispatchId: "dd:cert9-preview:social",
    jobId: "preview:social",
    skuId: "v2-rtu-social-posts",
    executionIdentityReady: true,
    status: "EXECUTION_IDENTITY_READY",
  },
  materials,
});
if (!social.ok) throw new Error(social.message);
assertLogoMaterial(social.truth, "social");
const socialSpec = reasonSocialPostsSetDeterministic(social.truth);
for (const asset of socialSpec.assets) {
  const htmlPath = path.join(outDir, `${asset.assetId}.html`);
  const html = renderSocialPostAssetHtml(repoRoot, socialSpec, asset);
  writeFileSync(htmlPath, html);
  if (!html.includes("logo-plate") && !html.includes('role="logo"') && !html.includes("data:image/png;base64,")) {
    throw new Error(`${asset.assetId} HTML missing logo image layers`);
  }
  const pngPath = path.join(outDir, `${asset.assetId}.png`);
  const cap = await captureHtml(htmlPath, pngPath, asset.canvas.widthPx, asset.canvas.heightPx);
  qa.push({
    assetId: asset.assetId,
    branch: "social",
    overflowOk: cap.overflowOk,
    overflowDetail: cap.overflowDetail ?? null,
    pngBytes: readFileSync(pngPath).length,
  });
  console.log(asset.assetId, cap.overflowOk ? "OK" : cap.overflowDetail);
}

const promo = mapSocialPromoOfferLedPromoTruth({
  repoRoot,
  campaign,
  dispatchRecord: {
    dispatchId: "dd:cert9-preview:promo",
    jobId: "preview:promo",
    skuId: "v2-rtu-promotion-graphics",
    executionIdentityReady: true,
    status: "EXECUTION_IDENTITY_READY",
  },
  materials,
});
if (!promo.ok) throw new Error(promo.message);
assertLogoMaterial(promo.truth, "promo");
if (promo.truth.headline && promo.truth.headline === promo.truth.offerName) {
  throw new Error("promo duplicate headline/offer on truth");
}
const promoSpec = reasonPromoCampaignSetDeterministic(promo.truth);
for (const asset of promoSpec.assets) {
  const htmlPath = path.join(outDir, `${asset.assetId}.html`);
  const html = renderPromoAssetHtml(repoRoot, promoSpec, asset);
  writeFileSync(htmlPath, html);
  const pngPath = path.join(outDir, `${asset.assetId}.png`);
  const cap = await captureHtml(htmlPath, pngPath, asset.canvas.widthPx, asset.canvas.heightPx);
  qa.push({
    assetId: asset.assetId,
    branch: "promo",
    overflowOk: cap.overflowOk,
    overflowDetail: cap.overflowDetail ?? null,
    pngBytes: readFileSync(pngPath).length,
  });
  console.log(asset.assetId, cap.overflowOk ? "OK" : cap.overflowDetail);
}

writeFileSync(
  path.join(outDir, "visual-qa-manifest.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      logoSha256: expectedSha,
      logoDimensions: `${logo.width}x${logo.height}`,
      authoritativeFacts: CERT9_FACTS,
      price: "$49",
      dateWindow: "November 8 – December 15, 2026",
      cta: "Reserve your spot",
      phone: "(555) 010-8820",
      qa,
      note: "Isolated renderer PNGs — not Final Delivery or consumed cert campaign.",
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ outDir, logoSha256: expectedSha, rasterCount: qa.length }, null, 2));
