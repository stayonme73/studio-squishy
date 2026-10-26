/**
 * Disposable Social & Promo Graphics — cert-6 PREPARATION ONLY.
 * Customer-realistic offer-led intake + valid minimal synthetic PNG logo (generation ≥ 4).
 * Usage: node scripts/seed-social-promo-machine-cert-v6.mjs
 *
 * STOP: Do not run without Owner execution authorization.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildPreparedIntakeAnswers,
  certConstants,
  logoChecksum,
  TEST_PAYMENT_ISOLATION,
  writeSocialPromoMachineCertPrepFiles,
} from "./social-promo-machine-cert-prep-shared.mjs";

const c = certConstants(6);

export const CAMPAIGN_ID = c.CAMPAIGN_ID;
export const JOB_ID = c.JOB_ID;
export const CLIENT_ID = c.CLIENT_ID;
export const CLIENT_EMAIL = c.CLIENT_EMAIL;
export const CHECKOUT_SESSION_ID = c.CHECKOUT_SESSION_ID;
export { buildPreparedIntakeAnswers, TEST_PAYMENT_ISOLATION };
export const LOGO_CHECKSUM = logoChecksum(6);

async function main() {
  const baseline = await writeSocialPromoMachineCertPrepFiles(6);
  console.log(`Prepared disposable Social & Promo cert project: ${CAMPAIGN_ID}`);
  console.log(`  Client: ${CLIENT_EMAIL} / dev-only`);
  console.log(`  Baseline: docs/.../disposable-social-promo-machine-cert-proofs/baseline-cert-6.json`);
  console.log(`  Intake: draft only (NOT submitted — no Machine advance)`);
  console.log(
    `  Scenario: offer-led cert-6 — post File Room repair (fingerprint + logo quarantine fix)`,
  );
  console.log(JSON.stringify(baseline, null, 2));
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
