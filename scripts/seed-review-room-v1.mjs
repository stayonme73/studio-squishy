/**
 * Seed Review Room V1 demo — job in ready_for_review with prepared deliverables.
 * Usage: node scripts/seed-review-room-v1.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CAMPAIGN_ID = "review-room-v1";
const JOB_ID = `${CAMPAIGN_ID}:sm-001`;
const NOW = "2026-07-03T18:00:00.000Z";
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
    campaignName: "Harbor Cafe — Summer Social",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Review Room V1 demo.",
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
      status: "in_progress",
      relatedServiceIds: ["sm-001"],
      familyId: "social",
      catalogFamilyId: "social_media",
      serviceName: "sm-001",
      dependsOn: [],
      workflowState: "in_progress",
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
      spineStatus: "ready_for_review",
      productionLane: "quick",
      intakeComplete: true,
      productionStartedAt: "2026-07-03T10:00:00.000Z",
      ownerApprovalPending: null,
      spineStatusSetAt: NOW,
      spineStatusSetBy: { role: "owner", displayName: "Tagia" },
      spineStatusReason: "Owner approved — ready for client review",
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
      internalNotes: [
        {
          id: "note:internal",
          content: "Internal only — client must not see this.",
          createdAt: NOW,
          author: { role: "staff", displayName: "Producer" },
        },
      ],
      laneQueuedAt: "2026-07-03T10:00:00.000Z",
      updatedAt: NOW,
    },
  ],
  jobActivityEvents: [
    {
      id: "status_change:review-room-v1:sm-001:ready",
      campaignId: CAMPAIGN_ID,
      jobId: JOB_ID,
      kind: "status_change",
      occurredAt: NOW,
      actor: { role: "owner", displayName: "Tagia" },
      spineStatus: "ready_for_review",
      reason: "Owner approved — ready for client review",
    },
  ],
  jobReviewFeedback: [],
  updatedAt: NOW,
  version: 8,
  syncedAt: NOW,
};

const materialsEnvelope = {
  campaignId: CAMPAIGN_ID,
  items: [],
  updatedAt: NOW,
  version: 1,
  syncedAt: NOW,
};

async function ensureClientUser() {
  let users = [];
  try {
    users = JSON.parse(await readFile(PATHS.users, "utf8"));
  } catch {
    users = [];
  }

  const existing = users.find((user) => user.id === CLIENT_ID);
  if (existing) {
    existing.currentCampaignId = CAMPAIGN_ID;
    existing.email = "client@local.dev";
    existing.password = "dev-only";
    existing.roles = ["client"];
    existing.displayName = "Client Verify";
  } else {
    users.push({
      id: CLIENT_ID,
      email: "client@local.dev",
      password: "dev-only",
      displayName: "Client Verify",
      roles: ["client"],
      currentCampaignId: CAMPAIGN_ID,
    });
  }

  await writeFile(PATHS.users, JSON.stringify(users, null, 2));
}

async function main() {
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

  await ensureClientUser();

  console.log(`Seeded Review Room V1 demo: ${CAMPAIGN_ID}`);
  console.log(`  Review Room: http://localhost:3000/feedback-studio?jobId=${encodeURIComponent(JOB_ID)}`);
  console.log(`  Production: http://localhost:3000/file-room/${CAMPAIGN_ID}/production/${encodeURIComponent(JOB_ID)}`);
  console.log("  Client login: client@local.dev / dev-only");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
