/**
 * Static Cert-9 tooling checks — no PREP seed, no campaign creation, no ARM/E2E.
 * Usage: node scripts/verify-cert9-tooling-static.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { certConstants } from "./social-promo-machine-cert-prep-shared.mjs";
import { CAMPAIGN_ID as SEED_CAMPAIGN_ID } from "./seed-social-promo-machine-cert-v9.mjs";
import { SPRUCE_LINE_CERT_LOGO_CANONICAL_REL } from "./spruce-line-cert-synthetic-logo.mjs";

const EXPECTED = "disposable-social-promo-machine-cert-9";
const BRANCH_SKUS = ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"];

/** @type {{ check: string, status: "PASS" | "FAIL", detail?: string }[]} */
const results = [];

function record(check, status, detail = "") {
  results.push({ check, status, detail });
  console.log(`${status.padEnd(4)} ${check}${detail ? ` — ${detail}` : ""}`);
}

const c = certConstants(9);
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
  c.CHECKOUT_SESSION_ID === "local-disposable-sp-cert-9-no-charge" ? "PASS" : "FAIL",
  c.CHECKOUT_SESSION_ID,
);
record(
  "client-email-isolation",
  c.CLIENT_EMAIL === "sp-cert-9@local.dev" ? "PASS" : "FAIL",
  c.CLIENT_EMAIL,
);

const scriptChecks = [
  ["scripts/seed-social-promo-machine-cert-v9.mjs", "certConstants(9)"],
  ["scripts/owner-arm-disposable-sp-cert-9.mjs", EXPECTED],
  ["scripts/owner-stamp-social-promo-render-release-9.mjs", EXPECTED],
  ["scripts/disposable-sp-cert-production-truth-e2e.mjs", "seed-social-promo-machine-cert-v9.mjs"],
  ["scripts/spruce-line-cert-synthetic-logo.mjs", SPRUCE_LINE_CERT_LOGO_CANONICAL_REL],
  ["scripts/social-promo-machine-cert-prep-shared.mjs", "generation === 9"],
  ["scripts/write-cert-9-readiness-isolated-rasters.mjs", "cert-9-readiness-2026-10-24"],
];

for (const [rel, needle] of scriptChecks) {
  const text = readFileSync(path.join(process.cwd(), rel), "utf8");
  record(`script-target-${path.basename(rel)}`, text.includes(needle) ? "PASS" : "FAIL", needle);
}

const e2e = readFileSync(
  path.join(process.cwd(), "scripts/disposable-sp-cert-production-truth-e2e.mjs"),
  "utf8",
);
record("e2e-cert-9-flag", e2e.includes("--cert=9") || e2e.includes("cert=9") ? "PASS" : "FAIL");
record(
  "e2e-review-readiness-await",
  e2e.includes("awaitSocialPromoParentCustomerReviewReady") ? "PASS" : "FAIL",
);
record(
  "e2e-review-readiness-default-timeout",
  !e2e.includes("maxWaitMs: 120_000") && !e2e.includes("maxWaitMs:120_000")
    ? "PASS"
    : "FAIL",
  "uses library default (180s)",
);
record(
  "e2e-unauthorized-isolated-context",
  e2e.includes("denyContext") && e2e.includes("browser.newContext") ? "PASS" : "FAIL",
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
  "e2e-sku-scope-check",
  e2e.includes("v2-rtu-social-posts") && e2e.includes("v2-rtu-promotion-graphics") ? "PASS" : "FAIL",
);
record(
  "e2e-exact-byte-via-file-room-url",
  e2e.includes("client-delivery-download-verify") &&
    e2e.includes("clientDeliveryFileDownloadPath") &&
    !e2e.includes("files[0]?.downloadPath")
    ? "PASS"
    : "FAIL",
);

const readiness = readFileSync(
  path.join(process.cwd(), "src/lib/studio-customer-life/social-promo-review-readiness.ts"),
  "utf8",
);
record(
  "review-readiness-bind-throttle",
  readiness.includes("SOCIAL_PROMO_REVIEW_READINESS_BIND_INTERVAL_MS = 3_000") ? "PASS" : "FAIL",
);
record(
  "review-readiness-qa-auth-gate",
  readiness.includes('internalQaReviewAuthorization?.status === "ELIGIBLE_FOR_REVIEW"') ? "PASS" : "FAIL",
);

const failed = results.filter((r) => r.status === "FAIL");
if (failed.length) {
  process.exit(1);
}

console.log("\nCert-9 tooling static checks: all PASS");
