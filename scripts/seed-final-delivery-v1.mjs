/**
 * Seed Final Delivery V1 demo — client-approved job awaiting Owner final release.
 * Usage: node scripts/seed-final-delivery-v1.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CAMPAIGN_ID = "final-delivery-v1";
const JOB_ID = `${CAMPAIGN_ID}:sm-001`;
const NOW = "2026-07-03T20:00:00.000Z";
const CLIENT_ID = "client-verify";

const PATHS = {
  campaigns: path.join(process.cwd(), "data", "campaigns"),
  tasks: path.join(process.cwd(), "data", "campaign-tasks"),
  materials: path.join(process.cwd(), "data", "campaign-materials"),
  users: path.join(process.cwd(), "data", "studio-users.json"),
};

function lineItem(skuId, name, priceCents, deliverables) {
  return {
    skuId,
    serviceId: skuId,
    serviceName: name,
    billingType: "one_time",
    exactPriceCents: priceCents,
    priceDisplay: `$${priceCents / 100}`,
    deliverables,
    exclusions: [],
    timingWindowLabel: "3–5 business days",
    revisionRule: "1 revision round",
    clientResponsibilities: ["Provide brand assets"],
    executionResponsibility: "The Studio creates and delivers",
  };
}

const campaignEnvelope = {
  campaignId: CAMPAIGN_ID,
  clientUserId: CLIENT_ID,
  syncVersion: 1,
  syncedAt: NOW,
  record: {
    campaignId: CAMPAIGN_ID,
    campaignName: "Harbor Cafe — Final Delivery V1",
    campaignStatus: "READY_FOR_REVIEW",
    campaignDescription: "Final Delivery V1 demo.",
    estimatedCompletion: "July 18, 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: "2026-07-02T10:00:00.000Z",
    projectDetailsSubmittedAt: "2026-07-02T11:00:00.000Z",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 30000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 30000,
      lineItems: [
        lineItem("sm-001", "Social Media Launch Set", 30000, [
          "3 social post concepts",
          "Caption copy set",
          "Export-ready files",
        ]),
      ],
      approvedAt: "2026-07-02T09:30:00.000Z",
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    createdAt: "2026-07-02T08:00:00.000Z",
    updatedAt: NOW,
  },
};

const tasksEnvelope = {
  campaignId: CAMPAIGN_ID,
  planFingerprint: "sm-001:one_time",
  tasks: [
    {
      id: "sm-001:creative_production",
      title: "sm-001 — creative_production",
      phase: "creative_production",
      status: "complete",
      relatedServiceIds: ["sm-001"],
      familyId: "social",
      catalogFamilyId: "social_media",
      serviceName: "sm-001",
      dependsOn: [],
      workflowState: "complete",
      responsibleRole: "creative_production",
    },
  ],
  exceptionRecords: [],
  exceptionEvents: [],
  jobRecords: [
    {
      jobId: JOB_ID,
      campaignId: CAMPAIGN_ID,
      skuId: "sm-001",
      serviceName: "Social Media Launch Set",
      spineStatus: "approved",
      productionLane: "quick",
      intakeComplete: true,
      productionStartedAt: "2026-07-03T10:00:00.000Z",
      ownerApprovalPending: "before_delivery",
      spineStatusSetAt: NOW,
      spineStatusSetBy: { role: "client", displayName: "Client" },
      spineStatusReason: "Client approved for delivery — awaiting Owner final approval",
      clientDeadline: "July 18, 2026",
      deliverablePrep: [
        {
          deliverableKey: "deliverable-0",
          label: "3 social post concepts",
          preparedAt: "2026-07-03T14:00:00.000Z",
          preparedBy: { role: "staff", displayName: "Producer" },
        },
        {
          deliverableKey: "deliverable-1",
          label: "Caption copy set",
          preparedAt: "2026-07-03T14:30:00.000Z",
          preparedBy: { role: "staff", displayName: "Producer" },
        },
        {
          deliverableKey: "deliverable-2",
          label: "Export-ready files",
          preparedAt: "2026-07-03T15:00:00.000Z",
          preparedBy: { role: "staff", displayName: "Producer" },
        },
      ],
      workingFileRefs: [
        {
          id: "ref-internal",
          label: "Internal Figma board",
          url: "https://figma.com/internal-only",
          addedAt: NOW,
          author: { role: "staff", displayName: "Producer" },
        },
      ],
      laneQueuedAt: "2026-07-03T10:00:00.000Z",
      updatedAt: NOW,
    },
  ],
  jobActivityEvents: [
    {
      id: "client_delivery_approval:sm-001",
      campaignId: CAMPAIGN_ID,
      jobId: JOB_ID,
      kind: "client_delivery_approval",
      occurredAt: NOW,
      actor: { role: "client", displayName: "Client" },
      reason: "Client approved for delivery",
      spineStatus: "approved",
    },
  ],
  updatedAt: NOW,
  version: 8,
};

const materialsEnvelope = {
  campaignId: CAMPAIGN_ID,
  items: [],
  updatedAt: NOW,
};

await mkdir(PATHS.campaigns, { recursive: true });
await mkdir(PATHS.tasks, { recursive: true });
await mkdir(PATHS.materials, { recursive: true });

await writeFile(
  path.join(PATHS.campaigns, `${CAMPAIGN_ID}.json`),
  JSON.stringify(campaignEnvelope, null, 2),
);
await writeFile(
  path.join(PATHS.tasks, `${CAMPAIGN_ID}.json`),
  JSON.stringify(tasksEnvelope, null, 2),
);
await writeFile(
  path.join(PATHS.materials, `${CAMPAIGN_ID}.json`),
  JSON.stringify(materialsEnvelope, null, 2),
);

try {
  const usersRaw = await readFile(PATHS.users, "utf8");
  const users = JSON.parse(usersRaw);
  const client = users.users?.find((u) => u.id === CLIENT_ID);
  if (client && !client.campaignIds?.includes(CAMPAIGN_ID)) {
    client.campaignIds = [...(client.campaignIds ?? []), CAMPAIGN_ID];
    await writeFile(PATHS.users, JSON.stringify(users, null, 2));
  }
} catch {
  // users file optional
}

console.log(`Seeded Final Delivery V1: ${CAMPAIGN_ID}`);
console.log(`  Owner Desk: Final Release Needed`);
console.log(`  Job: ${JOB_ID} (approved + before_delivery)`);
