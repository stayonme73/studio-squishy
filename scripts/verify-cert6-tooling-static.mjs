/**
 * Static Cert-6 tooling checks — no PREP seed, no campaign creation, no ARM/E2E.
 * Usage: node scripts/verify-cert6-tooling-static.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { certConstants } from "./social-promo-machine-cert-prep-shared.mjs";
import { CAMPAIGN_ID as SEED_CAMPAIGN_ID } from "./seed-social-promo-machine-cert-v6.mjs";

const EXPECTED = "disposable-social-promo-machine-cert-6";
const BRANCH_SKUS = ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"];

/** @type {{ check: string, status: "PASS" | "FAIL", detail?: string }[]} */
const results = [];

function record(check, status, detail = "") {
  results.push({ check, status, detail });
  console.log(`${status.padEnd(4)} ${check}${detail ? ` — ${detail}` : ""}`);
}

const c = certConstants(6);
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
  c.CHECKOUT_SESSION_ID === "local-disposable-sp-cert-6-no-charge" ? "PASS" : "FAIL",
  c.CHECKOUT_SESSION_ID,
);

const scriptChecks = [
  ["scripts/seed-social-promo-machine-cert-v6.mjs", "certConstants(6)"],
  ["scripts/owner-arm-disposable-sp-cert-6.mjs", EXPECTED],
  ["scripts/owner-stamp-social-promo-render-release-6.mjs", EXPECTED],
  ["scripts/disposable-sp-cert-production-truth-e2e.mjs", "seed-social-promo-machine-cert-v6.mjs"],
];

for (const [rel, needle] of scriptChecks) {
  const text = readFileSync(path.join(process.cwd(), rel), "utf8");
  record(`script-target-${path.basename(rel)}`, text.includes(needle) ? "PASS" : "FAIL", needle);
}

const e2e = readFileSync(
  path.join(process.cwd(), "scripts/disposable-sp-cert-production-truth-e2e.mjs"),
  "utf8",
);
record("e2e-cert-6-flag", e2e.includes("--cert=6") || e2e.includes("cert=6") ? "PASS" : "FAIL");
record(
  "e2e-preflight-dispatch-guard",
  e2e.includes("preflight-no-prior-dispatch") && e2e.includes("dispatchExecution") ? "PASS" : "FAIL",
);
record(
  "e2e-preflight-render-release",
  e2e.includes("preflight-render-release") && e2e.includes("socialPromoRenderRelease") ? "PASS" : "FAIL",
);
record(
  "e2e-file-room-approval",
  e2e.includes("applyCertFileRoomLogoProductionApproval") ? "PASS" : "FAIL",
);
record(
  "e2e-authoritative-facts",
  e2e.includes("authoritativeSocialPromoFactsForCert") ? "PASS" : "FAIL",
);
record(
  "e2e-sku-scope-check",
  e2e.includes("v2-rtu-social-posts") && e2e.includes("v2-rtu-promotion-graphics") ? "PASS" : "FAIL",
);
record(
  "e2e-release-eight-files",
  e2e.includes("files.length === 8") ? "PASS" : "FAIL",
);
record(
  "e2e-exact-byte-download",
  e2e.includes("exact-byte-download-proof") ? "PASS" : "FAIL",
);
record(
  "e2e-unauthorized-denial",
  e2e.includes("browser-unauthorized-denial") ? "PASS" : "FAIL",
);

const failed = results.filter((r) => r.status === "FAIL");
if (failed.length) {
  process.exit(1);
}

console.log("\nCert-6 tooling static checks: all PASS");
