/**
 * Focused data verification for the Test Batch 1 Social Posts client walkthrough.
 *
 * Usage:
 *   node scripts/verify-studio-test-batch-1-client-walkthrough.mjs
 *   node scripts/verify-studio-test-batch-1-client-walkthrough.mjs --after-submit
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  CAMPAIGN_ID,
  CLIENT_EMAIL,
  CLIENT_USER_ID,
  REQUIRED_SOCIAL_MATERIALS,
  SOCIAL_JOB_ID,
  SOCIAL_SKU_ID,
  SOURCE_BATCH_ID,
} from "./setup-studio-test-batch-1-client-walkthrough.mjs";

const afterSubmit = process.argv.includes("--after-submit");

const PATHS = {
  campaign: path.join(process.cwd(), "data", "campaigns", `${CAMPAIGN_ID}.json`),
  tasks: path.join(process.cwd(), "data", "campaign-tasks", `${CAMPAIGN_ID}.json`),
  materials: path.join(process.cwd(), "data", "campaign-materials", `${CAMPAIGN_ID}.json`),
  production: path.join(process.cwd(), "data", "campaign-production", `${CAMPAIGN_ID}.json`),
  users: path.join(process.cwd(), "data", "studio-users.json"),
  sourceCampaign: path.join(process.cwd(), "data", "campaigns", `${SOURCE_BATCH_ID}.json`),
  sourceTasks: path.join(process.cwd(), "data", "campaign-tasks", `${SOURCE_BATCH_ID}.json`),
  sourceMaterials: path.join(process.cwd(), "data", "campaign-materials", `${SOURCE_BATCH_ID}.json`),
  sourceProduction: path.join(process.cwd(), "data", "campaign-production", `${SOURCE_BATCH_ID}.json`),
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function verifyCampaign(campaignEnvelope) {
  assert(campaignEnvelope.campaignId === CAMPAIGN_ID, "Campaign envelope id mismatch.");
  assert(campaignEnvelope.clientUserId === CLIENT_USER_ID, "Campaign client mismatch.");

  const record = campaignEnvelope.record;
  assert(
    record.campaignName === "Test Batch 1 Social Posts Client Walkthrough",
    "Campaign name mismatch.",
  );
  assert(record.campaignStatus === "PAYMENT_RECEIVED", "Campaign must remain paid/queued, not Building Concepts.");
  assert(record.paymentReceivedAt, "Campaign should have paymentReceivedAt.");
  assert(record.projectDetailsSubmittedAt, "Fixture should expose the existing board materials intake.");
  assert(record.materialsSummary, "Campaign should track materials summary.");
  assert(
    record.materialsSummary.blockingRequiredCount === (afterSubmit ? 0 : REQUIRED_SOCIAL_MATERIALS.length),
    "Blocking required material count mismatch.",
  );

  const plan = record.approvedStudioPlan;
  assert(plan, "Campaign should have approvedStudioPlan.");
  assert(plan.selectedServiceIds.length === 1, "Expected one selected service.");
  assert(plan.selectedServiceIds[0] === SOCIAL_SKU_ID, "Selected SKU mismatch.");
  assert(plan.lineItems.length === 1, "Expected one line item.");
  assert(plan.lineItems[0].serviceName === "Make My Social Media Posts", "Line item service name mismatch.");
  assert(plan.amountDueTodayCents === 45000, "Expected $450 paid amount.");
  assert(record.packageLabel === "Custom Studio Plan", "Expected custom plan label.");
}

function verifyTasks(tasksEnvelope) {
  assert(tasksEnvelope.campaignId === CAMPAIGN_ID, "Tasks campaign id mismatch.");
  assert(tasksEnvelope.version >= 10, "Tasks envelope should be schema v10 or newer.");
  assert(tasksEnvelope.planFingerprint === `${SOCIAL_SKU_ID}:one_time`, "Plan fingerprint mismatch.");

  const jobs = tasksEnvelope.jobRecords ?? [];
  assert(jobs.length === 1, "Expected exactly one job record.");
  const socialJob = jobs[0];
  assert(socialJob.jobId === SOCIAL_JOB_ID, "Social job id mismatch.");
  assert(socialJob.skuId === SOCIAL_SKU_ID, "Social job SKU mismatch.");
  assert(
    socialJob.spineStatus === (afterSubmit ? "ready_for_queue" : "waiting_on_client"),
    `Unexpected Social Posts job status: ${socialJob.spineStatus}`,
  );
  assert(socialJob.productionStartedAt === null, "Production should not have started.");
  assert((socialJob.workPackets ?? []).length === 0, "No Work Packets should be assigned before queue entry.");
  assert((socialJob.clientDeliveryFiles ?? []).length === 0, "No fake final assets should exist.");

  if (!afterSubmit) {
    assert(
      tasksEnvelope.tasks.some((task) => task.relatedServiceIds.includes(SOCIAL_SKU_ID) && task.status === "blocked"),
      "Expected a blocked Social Posts task before materials arrive.",
    );
  }
}

function verifyMaterials(materialsEnvelope) {
  assert(materialsEnvelope.campaignId === CAMPAIGN_ID, "Materials campaign id mismatch.");
  assert(
    materialsEnvelope.items.length === REQUIRED_SOCIAL_MATERIALS.length,
    "Expected five Social Posts required material items.",
  );

  const labels = materialsEnvelope.items.map((item) => item.label).sort();
  const expectedLabels = REQUIRED_SOCIAL_MATERIALS.map((item) => item.label).sort();
  assert(JSON.stringify(labels) === JSON.stringify(expectedLabels), "Material labels mismatch.");

  for (const item of materialsEnvelope.items) {
    assert(item.requirementLevel === "required", `${item.label} should be required.`);
    assert(item.relatedServiceIds.length === 1 && item.relatedServiceIds[0] === SOCIAL_SKU_ID, `${item.label} SKU mismatch.`);
    assert(
      item.reviewStatus === (afterSubmit ? "submitted" : "requested"),
      `${item.label} reviewStatus mismatch: ${item.reviewStatus}`,
    );
    if (afterSubmit) {
      assert(item.submittedAt, `${item.label} should have submittedAt after client submission.`);
      assert(item.submittedBy?.userId === CLIENT_USER_ID, `${item.label} submittedBy mismatch.`);
    }
  }
}

function verifyProduction(productionEnvelope) {
  assert(productionEnvelope.campaignId === CAMPAIGN_ID, "Production campaign id mismatch.");
  assert(Array.isArray(productionEnvelope.workUnits), "Production workUnits should be an array.");
  assert(productionEnvelope.workUnits.length === 0, "No fake production work units should exist.");
  assert(Array.isArray(productionEnvelope.versions), "Production versions should be an array.");
  assert(productionEnvelope.versions.length === 0, "No fake production versions should exist.");
}

function verifyUser(users) {
  const user = users.find((entry) => entry.id === CLIENT_USER_ID);
  assert(user, "Dedicated walkthrough client user missing.");
  assert(user.email === CLIENT_EMAIL, "Dedicated walkthrough client email mismatch.");
  assert(JSON.stringify(user.roles) === JSON.stringify(["client"]), "Dedicated walkthrough user should be client-only.");
  assert(user.currentCampaignId === CAMPAIGN_ID, "Dedicated walkthrough user's current campaign mismatch.");
  assert(user.clientCampaignIds?.includes(CAMPAIGN_ID), "Dedicated walkthrough user should be linked to the campaign.");
}

function verifySourceBatchStillIntact(sourceCampaign, sourceTasks, sourceMaterials, sourceProduction) {
  assert(sourceCampaign.campaignId === SOURCE_BATCH_ID, "Source Batch 1 campaign id mismatch.");
  assert(sourceCampaign.record.campaignName === "The Studio Test Batch 1", "Source Batch 1 campaign name changed.");
  assert(sourceTasks.campaignId === SOURCE_BATCH_ID, "Source Batch 1 tasks id mismatch.");
  assert(sourceMaterials.campaignId === SOURCE_BATCH_ID, "Source Batch 1 materials id mismatch.");
  assert(sourceProduction.campaignId === SOURCE_BATCH_ID, "Source Batch 1 production id mismatch.");
  assert(
    sourceTasks.jobRecords?.some(
      (job) => job.skuId === SOCIAL_SKU_ID && job.spineStatus === "building_concepts",
    ),
    "Source Batch 1 Social Posts job should remain building_concepts.",
  );
}

async function main() {
  const [
    campaignEnvelope,
    tasksEnvelope,
    materialsEnvelope,
    productionEnvelope,
    users,
    sourceCampaign,
    sourceTasks,
    sourceMaterials,
    sourceProduction,
  ] = await Promise.all([
    readJson(PATHS.campaign),
    readJson(PATHS.tasks),
    readJson(PATHS.materials),
    readJson(PATHS.production),
    readJson(PATHS.users),
    readJson(PATHS.sourceCampaign),
    readJson(PATHS.sourceTasks),
    readJson(PATHS.sourceMaterials),
    readJson(PATHS.sourceProduction),
  ]);

  verifyCampaign(campaignEnvelope);
  verifyTasks(tasksEnvelope);
  verifyMaterials(materialsEnvelope);
  verifyProduction(productionEnvelope);
  verifyUser(users);
  verifySourceBatchStillIntact(sourceCampaign, sourceTasks, sourceMaterials, sourceProduction);

  console.log(`Verified ${CAMPAIGN_ID}${afterSubmit ? " after client submission" : ""}`);
  console.log(`Campaign status: ${campaignEnvelope.record.campaignStatus}`);
  console.log(`Social Posts job status: ${tasksEnvelope.jobRecords[0].spineStatus}`);
  console.log(`Blocking required materials: ${campaignEnvelope.record.materialsSummary.blockingRequiredCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
