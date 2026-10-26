/**
 * Disposable Social & Promo Graphics — cert-3 PREPARATION ONLY.
 * Customer-realistic offer-led intake draft + synthetic logo fixture (filesystem only).
 * Usage: node scripts/seed-social-promo-machine-cert-v3.mjs
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

const c = certConstants(3);

export const CAMPAIGN_ID = c.CAMPAIGN_ID;
export const JOB_ID = c.JOB_ID;
export const CLIENT_ID = c.CLIENT_ID;
export const CLIENT_EMAIL = c.CLIENT_EMAIL;
export const CHECKOUT_SESSION_ID = c.CHECKOUT_SESSION_ID;
export { buildPreparedIntakeAnswers, TEST_PAYMENT_ISOLATION };
export const LOGO_CHECKSUM = logoChecksum(3);

async function main() {
  const baseline = await writeSocialPromoMachineCertPrepFiles(3);
  console.log(`Prepared disposable Social & Promo cert project: ${CAMPAIGN_ID}`);
  console.log(`  Client: ${CLIENT_EMAIL} / dev-only`);
  console.log(`  Baseline: docs/.../disposable-social-promo-machine-cert-proofs/baseline-cert-3.json`);
  console.log(`  Intake: draft only (NOT submitted — no Machine advance)`);
  console.log(`  Scenario: offer-led — explicit price + date window in facts, shared contact, logo at execution`);
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
