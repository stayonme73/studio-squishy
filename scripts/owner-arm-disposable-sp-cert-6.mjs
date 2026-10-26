/**
 * Owner-authorized PREPARED → ARMED for disposable-social-promo-machine-cert-6 only.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { CAMPAIGN_ID } from "./seed-social-promo-machine-cert-v6.mjs";

const ENV = { NODE_ENV: "development" };
process.env.NODE_ENV = ENV.NODE_ENV;
const repoRoot = process.cwd();

async function loadModule(relative) {
  return import(pathToFileURL(path.join(repoRoot, relative)).href);
}

const { readCampaignEnvelope, writeCampaignEnvelope } = await loadModule(
  "src/lib/campaign-store/store.ts",
);
const { parseSocialPromoCertIsolation, armDisposableSocialPromoCertMarker } =
  await loadModule("src/lib/studio-payment/disposable-social-promo-cert-isolation.ts");
const { applyServerCampaignIsolationWritePolicy } = await loadModule(
  "src/lib/studio-payment/server-campaign-isolation-write-policy.ts",
);

const envelope = await readCampaignEnvelope(CAMPAIGN_ID);
if (!envelope) {
  console.error("STOP: campaign envelope missing");
  process.exit(1);
}

const beforeMarker = envelope.record.testPaymentIsolation
  ? structuredClone(envelope.record.testPaymentIsolation)
  : null;
const parsed = parseSocialPromoCertIsolation(envelope.record);

if (parsed.kind === "armed") {
  console.error("STOP: already ARMED");
  process.exit(1);
}
if (parsed.kind !== "prepared") {
  console.error(`STOP: marker not prepared (kind=${parsed.kind})`);
  process.exit(1);
}

const armed = armDisposableSocialPromoCertMarker({
  campaign: envelope.record,
  env: ENV,
  armedAt: new Date().toISOString(),
});
if (!armed.ok) {
  console.error(`STOP: arm helper refused — ${armed.message}`);
  process.exit(1);
}

const persistedRecord = applyServerCampaignIsolationWritePolicy(
  envelope.record,
  armed.campaign,
  ENV,
);

if (
  JSON.stringify(persistedRecord.testPaymentIsolation) !==
  JSON.stringify(armed.campaign.testPaymentIsolation)
) {
  console.error("STOP: server write policy rejected arm marker");
  process.exit(1);
}

const now = new Date().toISOString();
await writeCampaignEnvelope({
  ...envelope,
  record: { ...persistedRecord, updatedAt: now },
  syncedAt: now,
  syncVersion: (envelope.syncVersion ?? 0) + 1,
});

const after = await readCampaignEnvelope(CAMPAIGN_ID);
const afterParsed = parseSocialPromoCertIsolation(after.record);

const proof = {
  at: now,
  campaignId: CAMPAIGN_ID,
  environment: ENV,
  beforeMarker,
  afterMarker: after.record.testPaymentIsolation,
  afterParseKind: afterParsed.kind,
  paymentSandbox: after.record.paymentTruth?.sandbox ?? null,
  socialPromoRenderRelease: after.record.socialPromoRenderRelease ?? null,
  routeMapIntakeSubmittedAt: after.record.routeMapIntakeSubmittedAt ?? null,
  dispatchExecutionPresent: Boolean(after.record.dispatchExecution),
  syncVersion: after.syncVersion,
};

const proofPath = path.join(
  repoRoot,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/cert-6-arm-transition-2026-10-24.json",
);
writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
console.log(JSON.stringify(proof, null, 2));
