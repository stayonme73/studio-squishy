/**
 * Read-only PREP verification for disposable Social & Promo cert campaigns.
 * Usage: npx tsx scripts/verify-disposable-sp-cert-prep.mjs 2
 */

import { statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  certConstants,
  SOCIAL_PROMO_KIT_ONLY_INTAKE_KEYS,
} from "./social-promo-machine-cert-prep-shared.mjs";

const generation = Number(process.argv[2] ?? "2");
if (
  generation !== 1 &&
  generation !== 2 &&
  generation !== 3 &&
  generation !== 4 &&
  generation !== 5 &&
  generation !== 6 &&
  generation !== 7 &&
  generation !== 8 &&
  generation !== 9
) {
  console.error("Usage: verify-disposable-sp-cert-prep.mjs <1|2|3|4|5|6|7|8|9>");
  process.exit(1);
}

const c = certConstants(generation);
const repoRoot = process.cwd();

async function loadModule(relative) {
  return import(pathToFileURL(path.join(repoRoot, relative)).href);
}

const { readCampaignEnvelope } = await loadModule("src/lib/campaign-store/store.ts");
const { parseSocialPromoCertIsolation, disposableSocialPromoCertBlocksBillableProviders } =
  await loadModule("src/lib/studio-payment/disposable-social-promo-cert-isolation.ts");
const { disposableTestCampaignBlocksCustomerEmails } = await loadModule(
  "src/lib/studio-payment/disposable-test-isolation-guards.ts",
);

const checks = [];

function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const envelope = await readCampaignEnvelope(c.CAMPAIGN_ID);
check("campaign-envelope", Boolean(envelope), c.CAMPAIGN_ID);
if (!envelope) process.exit(2);

const record = envelope.record;
const parsed = parseSocialPromoCertIsolation(record);
check("isolation-prepared", parsed.kind === "prepared", parsed.kind);
check("payment-sandbox", record.paymentTruth?.sandbox === true);
check(
  "payment-scope",
  record.paymentTruth?.selectedServiceIds?.join(",") === "social_and_promo_graphics",
);
check(
  "approved-plan-lines",
  (record.approvedStudioPlan?.lineItems?.length ?? 0) > 0,
  String(record.approvedStudioPlan?.lineItems?.length ?? 0),
);
check("intake-not-submitted", !record.routeMapIntakeSubmittedAt);
check("intake-draft", Boolean(record.routeMapIntakeDraft?.answers));
if (generation === 3) {
  const answers = record.routeMapIntakeDraft?.answers ?? {};
  const kitLeaks = SOCIAL_PROMO_KIT_ONLY_INTAKE_KEYS.filter((key) => Boolean(answers[key]?.trim()));
  check("intake-no-kit-only-keys", kitLeaks.length === 0, kitLeaks.join(", ") || "none");
  check(
    "intake-offer-led-facts",
    Boolean(String(answers["social_and_promo_graphics:facts"] ?? "").includes("$49")),
    "explicit price in facts",
  );
}
check("no-render-release", !record.socialPromoRenderRelease?.authorizedBy);
check("no-dispatch", !record.dispatchExecution);
check("no-routing-handoff", !record.routingHandoff);
check("billable-block", disposableSocialPromoCertBlocksBillableProviders(record));
check("email-block", disposableTestCampaignBlocksCustomerEmails(record));

const artifacts = path.join(repoRoot, "data/campaign-design-artifacts", c.CAMPAIGN_ID);
try {
  statSync(artifacts);
  check("no-production-artifacts", false, artifacts);
} catch {
  check("no-production-artifacts", true);
}

const materialsPath = path.join(repoRoot, "data/campaign-materials", `${c.CAMPAIGN_ID}.json`);
const materials = JSON.parse(await readFile(materialsPath, "utf8"));
const facts = materials.items?.find((i) => i.id === "condensed-social-facts");
check("materials-facts-missing", facts?.reviewStatus === "missing");

const proof = {
  at: new Date().toISOString(),
  generation,
  campaignId: c.CAMPAIGN_ID,
  checks,
  allPass: checks.every((entry) => entry.ok),
  recordSnapshot: {
    executionPhase: record.testPaymentIsolation?.executionPhase,
    checkoutSessionId: record.paymentTruth?.checkoutSessionId,
    postPayPhase: record.postPayActivation?.phase,
    jobIds: record.postPayActivation?.jobIds,
    branchSkusExpected: c.BRANCH_SKUS,
  },
};

const proofFile =
  generation === 3
    ? "cert-3-prep-verification-2026-10-24.json"
    : generation === 2
      ? "cert-2-prep-verification-2026-10-24.json"
      : "cert-1-prep-verification.json";
const proofPath = path.join(
  repoRoot,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs",
  proofFile,
);
await writeFile(proofPath, JSON.stringify(proof, null, 2));

if (!proof.allPass) process.exit(3);
console.log(`\nVerification written: ${proofPath}`);
