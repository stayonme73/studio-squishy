/**
 * Seed Folder 3 remaining decision types — one campaign each.
 * Usage: node scripts/seed-owner-folder-3-remaining.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const NOW = "2026-07-06T20:00:00.000Z";
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
    deliverables: ["Deliverable set"],
    exclusions: [],
    timingWindowLabel: "3–5 business days",
    revisionRule: "1 revision round",
    clientResponsibilities: ["Provide brand assets"],
    executionResponsibility: "The Studio creates and delivers",
  };
}

function baseCampaign(campaignId, campaignName) {
  return {
    campaignId,
    clientUserId: "tagia",
    syncVersion: 1,
    syncedAt: NOW,
    record: {
      campaignId,
      campaignName,
      campaignStatus: "BUILDING_CONCEPTS",
      campaignDescription: `Folder 3 — ${campaignName}`,
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
        lineItems: [lineItem("sm-001", "Social Media Launch Set", 30000)],
        approvedAt: "2026-07-02T09:30:00.000Z",
      },
      revisionRoundsIncluded: 1,
      revisionRoundsUsed: 0,
      createdAt: "2026-07-02T08:00:00.000Z",
      updatedAt: NOW,
    },
  };
}

function baseTaskEnvelope(campaignId, extras = {}) {
  return {
    campaignId,
    planFingerprint: "sm-001:one_time",
    tasks: [
      {
        id: "sm-001:copy",
        title: "sm-001 — copy",
        phase: "copy",
        status: "blocked",
        relatedServiceIds: ["sm-001"],
        familyId: "social",
        catalogFamilyId: "social_media",
        serviceName: "sm-001",
        dependsOn: [],
        workflowState: "blocked",
        responsibleRole: "copy",
      },
    ],
    updatedAt: NOW,
    version: 11,
    syncedAt: NOW,
    exceptionRecords: [],
    exceptionEvents: [],
    qaRecords: [],
    jobRecords: [],
    jobActivityEvents: [],
    ownerDecisionInteractions: [],
    ...extras,
  };
}

const FIXTURES = [
  {
    campaignId: "owner-deadline-v1",
    name: "Deadline Decision Demo",
    tasks: baseTaskEnvelope("owner-deadline-v1", {
      exceptionRecords: [
        {
          id: "exc-owner-deadline-v1",
          campaignId: "owner-deadline-v1",
          kind: "deadline_commitment",
          status: "waiting_owner",
          title: "Deadline commitment — client event date",
          description: "Team needs Owner-owned date before dispatch.",
          createdAt: NOW,
          updatedAt: NOW,
          raisedByUserId: "staff-producer",
          raisedByDisplayName: "Producer",
          raisedByRole: "producer_dispatcher",
          taskId: "sm-001:copy",
        },
      ],
    }),
  },
  {
    campaignId: "owner-revision-v1",
    name: "Revision Limit Demo",
    tasks: baseTaskEnvelope("owner-revision-v1", {
      exceptionRecords: [
        {
          id: "exc-owner-revision-v1",
          campaignId: "owner-revision-v1",
          kind: "revision_exhausted",
          status: "waiting_owner",
          title: "Revision limit reached — client requested another round",
          createdAt: NOW,
          updatedAt: NOW,
          raisedByUserId: "staff-producer",
          raisedByDisplayName: "Producer",
          raisedByRole: "producer_dispatcher",
          taskId: "sm-001:copy",
        },
      ],
    }),
  },
  {
    campaignId: "owner-scope-v1",
    name: "Scope Change Demo",
    tasks: baseTaskEnvelope("owner-scope-v1", {
      exceptionRecords: [
        {
          id: "exc-owner-scope-v1",
          campaignId: "owner-scope-v1",
          kind: "scope_change",
          status: "waiting_owner",
          title: "Scope change — extra deliverable requested",
          createdAt: NOW,
          updatedAt: NOW,
          raisedByUserId: "staff-producer",
          raisedByDisplayName: "Producer",
          raisedByRole: "producer_dispatcher",
          taskId: "sm-001:copy",
        },
      ],
    }),
  },
  {
    campaignId: "owner-refund-v1",
    name: "Refund Decision Demo",
    tasks: baseTaskEnvelope("owner-refund-v1", {
      jobRecords: [
        {
          jobId: "owner-refund-v1:sm-001",
          campaignId: "owner-refund-v1",
          skuId: "sm-001",
          serviceName: "Social Media Launch Set",
          spineStatus: "waiting_on_client",
          productionLane: "standard",
          refundEligibleAt: NOW,
          waitingOnClientSince: "2026-06-20T12:00:00.000Z",
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      ownerDecisionInteractions: [
        {
          id: "interaction-owner-refund-v1",
          campaignId: "owner-refund-v1",
          jobId: "owner-refund-v1:sm-001",
          interactionKind: "refund_request",
          status: "waiting_owner",
          clientMessage: "Project stalled — I have not heard back in two weeks.",
          createdAt: NOW,
          updatedAt: NOW,
          refundSnapshot: {
            reason: "Project stalled — I have not heard back in two weeks.",
            requestedOutcome: "Full refund and close the job",
            productionStarted: false,
            receivedConceptsOrFiles: false,
            supportingDetails: "Please refund my payment.",
            policyStatusLabel:
              "May be eligible per 14-day waiting-on-client policy — Owner approval required.",
            timelineFacts:
              "Waiting on client since Jun 20, 2026. Internal refund-eligibility signal recorded Jul 6, 2026.",
            missingEvidence: "No supporting details from the client.",
            recommendedNextAction:
              "Review client reason and timeline, then approve or deny — do not auto-refund.",
            sourceChannel: "structured_customer_form",
            submittedAt: NOW,
          },
        },
      ],
    }),
  },
  {
    campaignId: "owner-complaint-v1",
    name: "Client Complaint Demo",
    tasks: baseTaskEnvelope("owner-complaint-v1", {
      jobRecords: [
        {
          jobId: "owner-complaint-v1:sm-001",
          campaignId: "owner-complaint-v1",
          skuId: "sm-001",
          serviceName: "Social Media Launch Set",
          spineStatus: "building_concepts",
          productionLane: "standard",
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      ownerDecisionInteractions: [
        {
          id: "interaction-owner-complaint-v1",
          campaignId: "owner-complaint-v1",
          jobId: "owner-complaint-v1:sm-001",
          interactionKind: "complaint",
          status: "waiting_owner",
          clientMessage: "I am frustrated with how long this is taking.",
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    }),
  },
  {
    campaignId: "owner-heavy-lane-v1",
    name: "Heavy Lane Full Demo",
    campaignExtras: {
      approvedStudioPlan: {
        selectedServiceIds: ["sm-001", "sm-002"],
        includedServiceIds: ["sm-001", "sm-002"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 60000,
        monthlyTotalCents: 0,
        amountDueTodayCents: 60000,
        lineItems: [
          lineItem("sm-001", "Social Media Launch Set", 30000),
          lineItem("sm-002", "Brand Video Spot", 30000),
        ],
        approvedAt: "2026-07-02T09:30:00.000Z",
      },
    },
    tasks: baseTaskEnvelope("owner-heavy-lane-v1", {
      jobRecords: [
        {
          jobId: "owner-heavy-lane-v1:sm-001",
          campaignId: "owner-heavy-lane-v1",
          skuId: "sm-001",
          serviceName: "Social Media Launch Set",
          spineStatus: "building_concepts",
          productionLane: "heavy",
          productionStartedAt: NOW,
          laneQueuedAt: "2026-07-05T10:00:00.000Z",
          createdAt: NOW,
          updatedAt: NOW,
        },
        {
          jobId: "owner-heavy-lane-v1:sm-002",
          campaignId: "owner-heavy-lane-v1",
          skuId: "sm-002",
          serviceName: "Brand Video Spot",
          spineStatus: "ready_for_queue",
          productionLane: "heavy",
          laneQueuedAt: NOW,
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    }),
  },
];

await mkdir(PATHS.campaigns, { recursive: true });
await mkdir(PATHS.tasks, { recursive: true });
await mkdir(PATHS.materials, { recursive: true });

for (const fixture of FIXTURES) {
  const campaign = baseCampaign(fixture.campaignId, fixture.name);
  if (fixture.campaignExtras?.approvedStudioPlan) {
    campaign.record.approvedStudioPlan = fixture.campaignExtras.approvedStudioPlan;
  }
  await writeFile(
    path.join(PATHS.campaigns, `${fixture.campaignId}.json`),
    `${JSON.stringify(campaign, null, 2)}\n`,
  );
  await writeFile(
    path.join(PATHS.tasks, `${fixture.campaignId}.json`),
    `${JSON.stringify(fixture.tasks, null, 2)}\n`,
  );
  await writeFile(
    path.join(PATHS.materials, `${fixture.campaignId}.json`),
    `${JSON.stringify({ campaignId: fixture.campaignId, items: [], updatedAt: NOW, version: 1, syncedAt: NOW }, null, 2)}\n`,
  );
  console.log(`Seeded ${fixture.campaignId}`);
}

console.log("Folder 3 remaining fixtures ready — login tagia@local.dev / dev-only");
