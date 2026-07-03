/**
 * Focused data verification for The Studio Test Batch 1.
 *
 * Usage:
 *   node scripts/verify-studio-test-batch-1.mjs
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { CAMPAIGN_ID } from "./setup-studio-test-batch-1.mjs";

const EXPECTED_SKUS = [
  "v2-rtu-social-posts",
  "v2-rtu-promotion-graphics",
  "v2-rtu-flyer",
  "v2-rtu-email-kit",
];

const PATHS = {
  campaign: path.join(process.cwd(), "data", "campaigns", `${CAMPAIGN_ID}.json`),
  tasks: path.join(process.cwd(), "data", "campaign-tasks", `${CAMPAIGN_ID}.json`),
  materials: path.join(process.cwd(), "data", "campaign-materials", `${CAMPAIGN_ID}.json`),
  production: path.join(process.cwd(), "data", "campaign-production", `${CAMPAIGN_ID}.json`),
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function sameSet(actual, expected) {
  return actual.length === expected.length && expected.every((entry) => actual.includes(entry));
}

function verifyCampaign(campaignEnvelope) {
  assert(campaignEnvelope.campaignId === CAMPAIGN_ID, "Campaign envelope id mismatch.");
  assert(campaignEnvelope.clientUserId === "tagia", "Campaign client should be tagia.");
  const record = campaignEnvelope.record;
  assert(record.campaignName === "The Studio Test Batch 1", "Campaign name mismatch.");
  assert(record.paymentReceivedAt, "Campaign should have paymentReceivedAt.");
  assert(record.projectDetailsSubmittedAt, "Campaign should have projectDetailsSubmittedAt.");
  const plan = record.approvedStudioPlan;
  assert(plan, "Campaign should have approvedStudioPlan.");
  assert(sameSet([...plan.selectedServiceIds], EXPECTED_SKUS), "Selected V2 SKUs mismatch.");
  assert(plan.lineItems.length === EXPECTED_SKUS.length, "Expected one line item per job.");
  assert(plan.lineItems.every((line) => line.clientResponsibilities?.length), "Each line needs client responsibilities.");
  assert(plan.lineItems.every((line) => line.deliverables?.length), "Each line needs deliverables.");
}

function verifyTasks(tasksEnvelope) {
  assert(tasksEnvelope.version >= 10, "Tasks envelope should be schema v10 or newer.");
  assert(tasksEnvelope.planFingerprint === EXPECTED_SKUS.map((sku) => `${sku}:one_time`).sort().join("|"), "Plan fingerprint mismatch.");
  for (const sku of EXPECTED_SKUS) {
    assert(tasksEnvelope.tasks.some((task) => task.relatedServiceIds.includes(sku)), `Missing tasks for ${sku}.`);
  }
  const jobs = tasksEnvelope.jobRecords ?? [];
  assert(jobs.length === EXPECTED_SKUS.length, "Expected one job record per SKU.");
  assert(jobs.some((job) => job.skuId === "v2-rtu-flyer" && job.spineStatus === "waiting_on_client"), "Flyer should be waiting on client.");
  assert(jobs.some((job) => job.skuId === "v2-rtu-social-posts" && job.workPackets?.some((packet) => packet.role === "strategy")), "Social posts should have a strategy Work Packet.");
  assert(jobs.some((job) => job.skuId === "v2-rtu-email-kit" && job.workPackets?.some((packet) => packet.role === "copy")), "Email kit should have a copy Work Packet.");
  assert(jobs.every((job) => (job.clientDeliveryFiles ?? []).length === 0), "No fake client final assets should exist.");
  assert(jobs.every((job) => (job.workPackets ?? []).every((packet) => packet.returnedFileRefs.length === 0)), "No fake returned Work Packet files should exist.");
}

function verifyMaterials(materialsEnvelope) {
  assert(materialsEnvelope.items.length >= EXPECTED_SKUS.length, "Expected material requirements for the jobs.");
  for (const sku of EXPECTED_SKUS) {
    assert(materialsEnvelope.items.some((item) => item.relatedServiceIds.includes(sku)), `Missing materials for ${sku}.`);
  }
  assert(materialsEnvelope.items.some((item) => item.requirementLevel === "required" && ["missing", "requested"].includes(item.reviewStatus)), "Expected required client-side intake requirements.");
}

function verifyProduction(productionEnvelope) {
  assert(productionEnvelope.campaignId === CAMPAIGN_ID, "Production envelope id mismatch.");
  assert(Array.isArray(productionEnvelope.workUnits), "Production workUnits should be an array.");
  assert(Array.isArray(productionEnvelope.versions), "Production versions should be an array.");
}

async function main() {
  const [campaignEnvelope, tasksEnvelope, materialsEnvelope, productionEnvelope] = await Promise.all([
    readJson(PATHS.campaign),
    readJson(PATHS.tasks),
    readJson(PATHS.materials),
    readJson(PATHS.production),
  ]);

  verifyCampaign(campaignEnvelope);
  verifyTasks(tasksEnvelope);
  verifyMaterials(materialsEnvelope);
  verifyProduction(productionEnvelope);

  console.log(`Verified ${CAMPAIGN_ID}`);
  console.log(`Jobs: ${EXPECTED_SKUS.join(", ")}`);
  console.log(`Materials: ${materialsEnvelope.items.length}`);
  console.log(`Tasks: ${tasksEnvelope.tasks.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
