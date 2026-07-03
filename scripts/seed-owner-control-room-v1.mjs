/**
 * Seed Owner Control Room V1 demo — one client, multiple jobs in different spine states.
 * Usage: node scripts/seed-owner-control-room-v1.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CAMPAIGN_ID = "owner-control-acme-v1";
const NOW = "2026-07-03T14:00:00.000Z";

const PATHS = {
  campaigns: path.join(process.cwd(), "data", "campaigns"),
  tasks: path.join(process.cwd(), "data", "campaign-tasks"),
  materials: path.join(process.cwd(), "data", "campaign-materials"),
};

function lineItem(skuId, name, priceCents) {
  return {
    skuId,
    serviceId: skuId,
    serviceName: name,
    billingType: "one_time",
    exactPriceCents: priceCents,
    priceDisplay: `$${priceCents / 100}`,
    deliverables: ["Finished deliverable"],
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
    campaignName: "Acme Co — Summer Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Multi-job production demo for Owner Control Room V1.",
    estimatedCompletion: "July 12, 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: "2026-07-01T10:00:00.000Z",
    projectDetailsSubmittedAt: "2026-07-01T11:00:00.000Z",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001", "rm-j001", "vp-001"],
      includedServiceIds: ["sm-001", "rm-j001", "vp-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 90000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 90000,
      lineItems: [
        lineItem("sm-001", "Social Media Launch Set", 30000),
        lineItem("rm-j001", "Route Start Flyer", 20000),
        lineItem("vp-001", "Short Video Production", 40000),
      ],
      approvedAt: "2026-07-01T09:30:00.000Z",
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: NOW,
  },
};

function task(skuId, phase, workflowState, status) {
  return {
    id: `${skuId}:${phase}`,
    title: `${skuId} — ${phase}`,
    phase,
    status: status ?? (workflowState === "in_progress" ? "in_progress" : "ready"),
    relatedServiceIds: [skuId],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: skuId,
    dependsOn: [],
    workflowState,
    responsibleRole:
      phase === "strategy_content_direction"
        ? "strategy"
        : phase === "copy"
          ? "copy"
          : "creative_production",
  };
}

const tasksEnvelope = {
  campaignId: CAMPAIGN_ID,
  planFingerprint: "rm-j001:one_time|sm-001:one_time|vp-001:one_time",
  tasks: [
    task("sm-001", "strategy_content_direction", "in_progress", "in_progress"),
    task("rm-j001", "copy", "needs_revision", "needs_revision"),
    task("vp-001", "creative_production", "blocked", "blocked"),
  ],
  exceptionRecords: [
    {
      id: "exc-acme-deadline",
      campaignId: CAMPAIGN_ID,
      kind: "deadline_risk",
      status: "waiting_owner",
      title: "At-risk deadline — Short Video",
      description: "Client deadline is 5 days; Heavy lane full.",
      createdAt: "2026-07-02T10:00:00.000Z",
      updatedAt: "2026-07-03T08:00:00.000Z",
      raisedByUserId: "staff-dev",
      raisedByDisplayName: "Staff Dev",
      raisedByRole: "producer_dispatcher",
      taskId: "vp-001:creative_production",
    },
    {
      id: "exc-acme-scope",
      campaignId: CAMPAIGN_ID,
      kind: "scope_change",
      status: "waiting_owner",
      title: "Scope change — extra video length",
      description: "Client asked for 60s instead of 30s.",
      createdAt: "2026-07-02T14:00:00.000Z",
      updatedAt: "2026-07-02T14:00:00.000Z",
      raisedByUserId: "staff-dev",
      raisedByDisplayName: "Staff Dev",
      raisedByRole: "producer_dispatcher",
      taskId: "vp-001:creative_production",
    },
  ],
  exceptionEvents: [],
  jobRecords: [
    {
      jobId: `${CAMPAIGN_ID}:vp-001`,
      campaignId: CAMPAIGN_ID,
      skuId: "vp-001",
      serviceName: "Short Video Production",
      spineStatus: "waiting_on_client",
      productionLane: "heavy",
      intakeComplete: true,
      productionStartedAt: "2026-07-02T09:00:00.000Z",
      waitingOnClientSince: "2026-06-28T10:00:00.000Z",
      lastClientResponseAt: null,
      nonRefundable: true,
      laneQueuedAt: "2026-07-01T12:00:00.000Z",
      updatedAt: NOW,
    },
  ],
  jobActivityEvents: [
    {
      id: "status_change:owner-control-acme-v1:vp-001:2026-07-02T09:00:00.000Z",
      campaignId: CAMPAIGN_ID,
      jobId: `${CAMPAIGN_ID}:vp-001`,
      kind: "status_change",
      occurredAt: "2026-07-02T09:00:00.000Z",
      actor: { role: "staff", displayName: "Producer" },
      spineStatus: "building_concepts",
      reason: "Production started",
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
      id: "mat-vp-broll",
      category: "photo-video",
      requirementLevel: "required",
      reviewStatus: "missing",
      contentKind: "file-metadata",
      label: "B-roll footage",
      reason: "Required for short video assembly",
      relatedServiceIds: ["vp-001"],
      promotionApprovedAt: "2026-06-28T10:00:00.000Z",
      clientFacingLabel: "B-roll footage",
      clientFacingPrompt: "Upload any existing clips or photos we can use.",
      uploadStatus: "none",
    },
    {
      id: "mat-rm-logo",
      category: "logo-brand",
      requirementLevel: "required",
      reviewStatus: "submitted",
      contentKind: "file-metadata",
      label: "Logo file",
      reason: "Flyer layout",
      relatedServiceIds: ["rm-j001"],
      submittedAt: "2026-07-02T16:00:00.000Z",
      submittedBy: { role: "client", userId: "tagia", displayName: "Acme Client" },
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

  console.log(`Seeded Owner Control Room demo: ${CAMPAIGN_ID}`);
  console.log("  Login: tagia@local.dev / dev-only");
  console.log("  View:  http://localhost:3000/file-room/owner-console");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
