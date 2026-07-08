/**
 * Seed Production Workspace V1 demo — job in workspace + Review Room submit path.
 * Usage: node scripts/seed-production-workspace-v1.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CAMPAIGN_ID = "production-workspace-v1";
const JOB_ID = `${CAMPAIGN_ID}:sm-001`;
const NOW = "2026-07-03T16:00:00.000Z";

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
    campaignName: "Northwind — Social Launch",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Production Workspace V1 handoff demo.",
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
      status: "in_progress",
      relatedServiceIds: ["sm-001"],
      familyId: "social",
      catalogFamilyId: "social_media",
      serviceName: "sm-001",
      dependsOn: [],
      workflowState: "in_progress",
      responsibleRole: "strategy",
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
      spineStatus: "building_concepts",
      productionLane: "quick",
      intakeComplete: true,
      productionStartedAt: "2026-07-03T10:00:00.000Z",
      ownerApprovalPending: null,
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
          id: "note:1",
          content: "Concept direction prepared internally - ready for Review Room.",
          createdAt: "2026-07-03T15:30:00.000Z",
          author: { role: "staff", displayName: "Producer" },
        },
      ],
      workingFileRefs: [
        {
          id: "ref:1",
          label: "Working Figma board",
          url: "https://figma.com/file/demo-social",
          addedAt: "2026-07-03T12:00:00.000Z",
          author: { role: "staff", displayName: "Creative" },
        },
      ],
      laneQueuedAt: "2026-07-03T10:00:00.000Z",
      updatedAt: NOW,
    },
    {
      jobId: `${CAMPAIGN_ID}:rm-j001`,
      campaignId: CAMPAIGN_ID,
      skuId: "rm-j001",
      serviceName: "Route Start Flyer",
      spineStatus: "ready_for_queue",
      productionLane: "quick",
      intakeComplete: true,
      clientDeadline: "July 20, 2026",
      laneQueuedAt: "2026-07-03T11:00:00.000Z",
      updatedAt: NOW,
    },
  ],
  jobActivityEvents: [
    {
      id: "status_change:production-workspace-v1:sm-001:2026-07-03T10:00:00.000Z",
      campaignId: CAMPAIGN_ID,
      jobId: JOB_ID,
      kind: "status_change",
      occurredAt: "2026-07-03T10:00:00.000Z",
      actor: { role: "staff", displayName: "Producer" },
      spineStatus: "building_concepts",
      reason: "Started Building Concepts — lane capacity available",
    },
    {
      id: "approval:production-workspace-v1:sm-001:2026-07-03T16:00:00.000Z",
      campaignId: CAMPAIGN_ID,
      jobId: JOB_ID,
      kind: "approval",
      occurredAt: "2026-07-03T16:00:00.000Z",
      actor: { role: "staff", displayName: "Producer" },
      reason: "Submitted to client Review Room by production",
    },
  ],
  updatedAt: NOW,
  version: 7,
  syncedAt: NOW,
};

const materialsEnvelope = {
  campaignId: CAMPAIGN_ID,
  items: [
    {
      id: "mat-brand",
      category: "logo-brand",
      requirementLevel: "required",
      reviewStatus: "submitted",
      contentKind: "file-metadata",
      label: "Brand photos",
      reason: "Needed for social concepts",
      relatedServiceIds: ["sm-001"],
      submittedAt: "2026-07-02T14:00:00.000Z",
      submittedBy: { role: "client", userId: "tagia", displayName: "Northwind Client" },
      uploadStatus: "metadata_only",
    },
  ],
  updatedAt: NOW,
  version: 1,
  syncedAt: NOW,
};

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

  console.log(`Seeded Production Workspace demo: ${CAMPAIGN_ID}`);
  console.log(`  Workspace: http://localhost:3000/file-room/${CAMPAIGN_ID}/production/${encodeURIComponent(JOB_ID)}`);
  console.log(`  Owner Console: http://localhost:3000/file-room/owner-console`);
  console.log("  Login: tagia@local.dev / dev-only");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
