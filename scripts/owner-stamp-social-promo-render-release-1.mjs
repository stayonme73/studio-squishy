/**
 * Owner-authorized socialPromoRenderRelease stamp for disposable-social-promo-machine-cert-1.
 * writeCampaignEnvelope only — no recovery, dispatch, email, or production.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CAMPAIGN_ID = "disposable-social-promo-machine-cert-1";
const RELEASE_REASON =
  "Owner-approved isolated local Social & Promo production certification.";
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

if (envelope.record.paymentTruth?.status !== "confirmed" || envelope.record.paymentTruth?.sandbox !== true) {
  console.error("STOP: sandbox-confirmed payment prerequisite failed");
  process.exit(1);
}

if (envelope.record.routeMapIntakeSubmittedAt) {
  console.error("STOP: intake already submitted");
  process.exit(1);
}

if (envelope.record.dispatchExecution) {
  console.error("STOP: dispatchExecution already present");
  process.exit(1);
}

const beforeRelease = envelope.record.socialPromoRenderRelease ?? null;
const beforeIsolation = structuredClone(envelope.record.testPaymentIsolation);
const releasedAt = new Date().toISOString();

const now = releasedAt;
const nextEnvelope = {
  ...envelope,
  record: {
    ...envelope.record,
    socialPromoRenderRelease: {
      releasedAt,
      authorizedBy: "owner",
      reason: RELEASE_REASON,
    },
    updatedAt: now,
  },
  syncedAt: now,
  syncVersion: (envelope.syncVersion ?? 0) + 1,
};

await writeCampaignEnvelope(nextEnvelope);

const after = await readCampaignEnvelope(CAMPAIGN_ID);

const proof = {
  at: now,
  campaignId: CAMPAIGN_ID,
  environment: ENV,
  writeMethod: "writeCampaignEnvelope (atomic file replace; no recovery/dispatch hooks)",
  beforeRelease,
  afterRelease: after.record.socialPromoRenderRelease ?? null,
  testPaymentIsolation: after.record.testPaymentIsolation,
  testPaymentIsolationUnchanged:
    JSON.stringify(after.record.testPaymentIsolation) === JSON.stringify(beforeIsolation),
  executionPhase: after.record.testPaymentIsolation?.executionPhase ?? null,
  paymentSandbox: after.record.paymentTruth?.sandbox ?? null,
  routeMapIntakeSubmittedAt: after.record.routeMapIntakeSubmittedAt ?? null,
  intakeComplete: after.record.postPayActivation?.intakeComplete ?? null,
  blockingRequiredMaterialsCount:
    after.record.postPayActivation?.blockingRequiredMaterialsCount ?? null,
  dispatchExecutionPresent: Boolean(after.record.dispatchExecution),
  syncVersion: after.syncVersion,
};

const proofPath = path.join(
  repoRoot,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/render-release-stamp-2026-10-24.json",
);
writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");

console.log(JSON.stringify(proof, null, 2));
