/**
 * Disposable Social & Promo Graphics — cert-1 PREPARATION ONLY.
 * Usage: node scripts/seed-social-promo-machine-cert-v1.mjs
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildPreparedIntakeAnswers,
  certConstants,
  logoChecksum,
  TEST_PAYMENT_ISOLATION,
  writeSocialPromoMachineCertPrepFiles as writePrep,
} from "./social-promo-machine-cert-prep-shared.mjs";

const c = certConstants(1);

export const CAMPAIGN_ID = c.CAMPAIGN_ID;
export const JOB_ID = c.JOB_ID;
export const CLIENT_ID = c.CLIENT_ID;
export const CLIENT_EMAIL = c.CLIENT_EMAIL;
export const CHECKOUT_SESSION_ID = c.CHECKOUT_SESSION_ID;
export { buildPreparedIntakeAnswers, TEST_PAYMENT_ISOLATION };

export const PREP_MARKER = {
  schemaVersion: "disposable-social-promo-machine-cert-prep-v1",
  purpose: "social_and_promo_graphics_production_truth_e2e",
  disposable: true,
  preparationOnly: true,
  authorizedAt: "2026-10-24T21:30:00.000Z",
};

export const LOGO_CHECKSUM = logoChecksum(1);

export function writeSocialPromoMachineCertPrepFiles() {
  return writePrep(1);
}

async function main() {
  const baseline = await writeSocialPromoMachineCertPrepFiles();
  console.log(`Prepared disposable Social & Promo cert project: ${CAMPAIGN_ID}`);
  console.log(`  Client: ${CLIENT_EMAIL} / dev-only`);
  console.log(`  Intake: draft only (NOT submitted — no Machine advance)`);
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
