/**
 * Owner-authorized socialPromoRenderRelease for disposable-social-promo-machine-cert-9 only.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { CAMPAIGN_ID } from "./seed-social-promo-machine-cert-v9.mjs";

const RELEASE_REASON =
  "Owner-approved isolated local Social & Promo production certification — Cert-9 (post review-prep performance + harness repair stack).";
const ENV = { NODE_ENV: "development" };
process.env.NODE_ENV = ENV.NODE_ENV;
const repoRoot = process.cwd();

async function loadModule(relative) {
  return import(pathToFileURL(path.join(repoRoot, relative)).href);
}

const { readCampaignEnvelope, writeCampaignEnvelope } = await loadModule(
  "src/lib/campaign-store/store.ts",
);
const { parseSocialPromoCertIsolation } = await loadModule(
  "src/lib/studio-payment/disposable-social-promo-cert-isolation.ts",
);

const envelope = await readCampaignEnvelope(CAMPAIGN_ID);
if (!envelope) {
  console.error("STOP: campaign envelope missing");
  process.exit(1);
}

const parsed = parseSocialPromoCertIsolation(envelope.record);
if (parsed.kind !== "armed") {
  console.error(`STOP: isolation not ARMED (kind=${parsed.kind})`);
  process.exit(1);
}

if (envelope.record.socialPromoRenderRelease) {
  console.error("STOP: socialPromoRenderRelease already set");
  process.exit(1);
}

if (
  envelope.record.paymentTruth?.status !== "confirmed" ||
  envelope.record.paymentTruth?.sandbox !== true
) {
  console.error("STOP: sandbox-confirmed payment prerequisite failed");
  process.exit(1);
}

const now = new Date().toISOString();
const stamped = {
  ...envelope.record,
  socialPromoRenderRelease: {
    authorizedBy: "owner-tagia",
    authorizedAt: now,
    reason: RELEASE_REASON,
    packageId: "social_and_promo_graphics",
    campaignId: CAMPAIGN_ID,
    sandboxOnly: true,
  },
  updatedAt: now,
};

await writeCampaignEnvelope({
  ...envelope,
  record: stamped,
  syncedAt: now,
  syncVersion: (envelope.syncVersion ?? 0) + 1,
});

const proof = {
  at: now,
  campaignId: CAMPAIGN_ID,
  socialPromoRenderRelease: stamped.socialPromoRenderRelease,
  paymentSandbox: stamped.paymentTruth?.sandbox ?? null,
  dispatchExecutionPresent: Boolean(stamped.dispatchExecution),
};

const proofPath = path.join(
  repoRoot,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/cert-9-render-release-stamp-template.json",
);
writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
console.log(JSON.stringify(proof, null, 2));
