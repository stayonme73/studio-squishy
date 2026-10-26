/**
 * Disposable Social & Promo Graphics — cert-7 PREPARATION ONLY.
 * Offer-led intake + rights-safe 512×512 synthetic Spruce Line test logo.
 * Usage: node scripts/seed-social-promo-machine-cert-v7.mjs
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

const c = certConstants(7);

export const CAMPAIGN_ID = c.CAMPAIGN_ID;
export const JOB_ID = c.JOB_ID;
export const CLIENT_ID = c.CLIENT_ID;
export const CLIENT_EMAIL = c.CLIENT_EMAIL;
export const CHECKOUT_SESSION_ID = c.CHECKOUT_SESSION_ID;
export { buildPreparedIntakeAnswers, TEST_PAYMENT_ISOLATION };
export const LOGO_CHECKSUM = logoChecksum(7);

async function main() {
  const baseline = await writeSocialPromoMachineCertPrepFiles(7);
  console.log(`Prepared disposable Social & Promo cert project: ${CAMPAIGN_ID}`);
  console.log(`  Client: ${CLIENT_EMAIL} / dev-only`);
  console.log(`  Baseline: docs/.../disposable-social-promo-machine-cert-proofs/baseline-cert-7.json`);
  console.log(`  Intake: draft only (NOT submitted — no Machine advance)`);
  console.log(
    `  Scenario: offer-led cert-7 — post-repair stack + realistic synthetic test logo for visual QA`,
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
