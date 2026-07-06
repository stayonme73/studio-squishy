/**
 * Seed Compliance Hold V1 demo — Owner Needs My Decision folder (Folder 3A).
 * Usage: node scripts/seed-compliance-hold-v1.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CAMPAIGN_ID = "compliance-hold-v1";
const EXCEPTION_ID = "exc-compliance-hold-v1";
const QA_RECORD_ID = "qa-compliance-hold-v1";
const TASK_ID = "sm-001:copy";
const NOW = "2026-07-06T18:00:00.000Z";

const PATHS = {
  campaigns: path.join(process.cwd(), "data", "campaigns"),
  tasks: path.join(process.cwd(), "data", "campaign-tasks"),
  materials: path.join(process.cwd(), "data", "campaign-materials"),
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
  clientUserId: "tagia",
  syncVersion: 1,
  syncedAt: NOW,
  record: {
    campaignId: CAMPAIGN_ID,
    campaignName: "Harbor Cafe — Compliance Hold Demo",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Folder 3A — compliance hold Owner decision desk.",
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
      id: "sm-001:strategy_content_direction",
      title: "sm-001 — strategy_content_direction",
      phase: "strategy_content_direction",
      status: "complete",
      relatedServiceIds: ["sm-001"],
      familyId: "social",
      catalogFamilyId: "social_media",
      serviceName: "sm-001",
      dependsOn: [],
      workflowState: "complete",
      responsibleRole: "strategy",
    },
    {
      id: TASK_ID,
      title: "sm-001 — copy",
      phase: "copy",
      status: "blocked",
      relatedServiceIds: ["sm-001"],
      familyId: "social",
      catalogFamilyId: "social_media",
      serviceName: "sm-001",
      dependsOn: ["sm-001:strategy_content_direction"],
      workflowState: "blocked",
      workflowBlockedReason: "compliance_hold: Unverified health claim in caption draft",
      responsibleRole: "copy",
    },
  ],
  qaRecords: [
    {
      id: QA_RECORD_ID,
      taskId: TASK_ID,
      action: "qa_block",
      category: "compliance_concern",
      notes: "Caption references unverified health benefit — compliance hold required.",
      createdAt: "2026-07-06T17:30:00.000Z",
      actorUserId: "staff-qa",
      actorDisplayName: "QA",
      actorRole: "qa",
    },
  ],
  exceptionRecords: [
    {
      id: EXCEPTION_ID,
      campaignId: CAMPAIGN_ID,
      kind: "compliance_hold",
      status: "waiting_owner",
      title: "Compliance hold — unverified health claim",
      description: "QA flagged an unverified health claim in caption copy.",
      createdAt: NOW,
      updatedAt: NOW,
      raisedByUserId: "staff-qa",
      raisedByDisplayName: "QA",
      raisedByRole: "qa",
      taskId: TASK_ID,
      qaRecordId: QA_RECORD_ID,
    },
  ],
  exceptionEvents: [
    {
      id: "evt-compliance-hold-raised",
      exceptionId: EXCEPTION_ID,
      campaignId: CAMPAIGN_ID,
      createdAt: NOW,
      actorUserId: "staff-qa",
      actorDisplayName: "QA",
      actorRole: "qa",
      action: "raised",
      statusAfter: "waiting_owner",
      notes: "Caption references unverified health benefit — compliance hold required.",
    },
  ],
  updatedAt: NOW,
  version: 7,
  syncedAt: NOW,
};

const materialsEnvelope = {
  campaignId: CAMPAIGN_ID,
  items: [],
  updatedAt: NOW,
  version: 1,
  syncedAt: NOW,
};

await mkdir(PATHS.campaigns, { recursive: true });
await mkdir(PATHS.tasks, { recursive: true });
await mkdir(PATHS.materials, { recursive: true });

await writeFile(
  path.join(PATHS.campaigns, `${CAMPAIGN_ID}.json`),
  `${JSON.stringify(campaignEnvelope, null, 2)}\n`,
);
await writeFile(
  path.join(PATHS.tasks, `${CAMPAIGN_ID}.json`),
  `${JSON.stringify(tasksEnvelope, null, 2)}\n`,
);
await writeFile(
  path.join(PATHS.materials, `${CAMPAIGN_ID}.json`),
  `${JSON.stringify(materialsEnvelope, null, 2)}\n`,
);

console.log(`Seeded ${CAMPAIGN_ID} — compliance hold waiting_owner (${EXCEPTION_ID})`);
console.log(`  Owner Console: http://localhost:3000/file-room/owner-console`);
console.log("  Login: tagia@local.dev / dev-only");
