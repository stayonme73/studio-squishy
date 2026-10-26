/**
 * Static Cert-8 tooling checks — no PREP seed, no campaign creation, no ARM/E2E.
 * Usage: node scripts/verify-cert8-tooling-static.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { certConstants } from "./social-promo-machine-cert-prep-shared.mjs";
import { CAMPAIGN_ID as SEED_CAMPAIGN_ID } from "./seed-social-promo-machine-cert-v8.mjs";
import { SPRUCE_LINE_CERT_LOGO_CANONICAL_REL } from "./spruce-line-cert-synthetic-logo.mjs";

const EXPECTED = "disposable-social-promo-machine-cert-8";
const BRANCH_SKUS = ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"];

/** @type {{ check: string, status: "PASS" | "FAIL", detail?: string }[]} */
const results = [];

function record(check, status, detail = "") {
  results.push({ check, status, detail });
  console.log(`${status.padEnd(4)} ${check}${detail ? ` — ${detail}` : ""}`);
}

const c = certConstants(8);
record(
  "certConstants-campaign-id",
  c.CAMPAIGN_ID === EXPECTED ? "PASS" : "FAIL",
  c.CAMPAIGN_ID,
);
record(
  "seed-module-campaign-id",
  SEED_CAMPAIGN_ID === EXPECTED ? "PASS" : "FAIL",
  SEED_CAMPAIGN_ID,
);
record(
  "branch-sku-scope",
  JSON.stringify(c.BRANCH_SKUS) === JSON.stringify(BRANCH_SKUS) ? "PASS" : "FAIL",
  c.BRANCH_SKUS.join(", "),
);
record(
  "sandbox-checkout-id",
  c.CHECKOUT_SESSION_ID === "local-disposable-sp-cert-8-no-charge" ? "PASS" : "FAIL",
  c.CHECKOUT_SESSION_ID,
);

const scriptChecks = [
  ["scripts/seed-social-promo-machine-cert-v8.mjs", "certConstants(8)"],
  ["scripts/owner-arm-disposable-sp-cert-8.mjs", EXPECTED],
  ["scripts/owner-stamp-social-promo-render-release-8.mjs", EXPECTED],
  ["scripts/disposable-sp-cert-production-truth-e2e.mjs", "seed-social-promo-machine-cert-v8.mjs"],
  ["scripts/spruce-line-cert-synthetic-logo.mjs", SPRUCE_LINE_CERT_LOGO_CANONICAL_REL],
  ["scripts/social-promo-machine-cert-prep-shared.mjs", "generation === 8"],
];

for (const [rel, needle] of scriptChecks) {
  const text = readFileSync(path.join(process.cwd(), rel), "utf8");
  record(`script-target-${path.basename(rel)}`, text.includes(needle) ? "PASS" : "FAIL", needle);
}

const e2e = readFileSync(
  path.join(process.cwd(), "scripts/disposable-sp-cert-production-truth-e2e.mjs"),
  "utf8",
);
record("e2e-cert-8-flag", e2e.includes("--cert=8") || e2e.includes("cert=8") ? "PASS" : "FAIL");
record(
  "e2e-review-readiness-await",
  e2e.includes("awaitSocialPromoParentCustomerReviewReady") ? "PASS" : "FAIL",
);
record(
  "e2e-review-readiness-default-timeout",
  !e2e.includes("maxWaitMs: 120_000") && !e2e.includes("maxWaitMs:120_000")
    ? "PASS"
    : "FAIL",
  "uses library default (180s), not Cert-8 race cap",
);
record(
  "e2e-preflight-dispatch-guard",
  e2e.includes("preflight-no-prior-dispatch") && e2e.includes("dispatchExecution") ? "PASS" : "FAIL",
);
record(
  "e2e-preflight-render-release",
  e2e.includes("preflight-render-release") && e2e.includes("socialPromoRenderRelease") ? "PASS" : "FAIL",
);
record(
  "e2e-unauthorized-isolated-context",
  e2e.includes("denyContext") && e2e.includes("browser.newContext") ? "PASS" : "FAIL",
);
record(
  "e2e-sku-scope-check",
  e2e.includes("v2-rtu-social-posts") && e2e.includes("v2-rtu-promotion-graphics") ? "PASS" : "FAIL",
);

const failed = results.filter((r) => r.status === "FAIL");
if (failed.length) {
  process.exit(1);
}

console.log("\nCert-8 tooling static checks: all PASS");
