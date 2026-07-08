import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import type { StudioUser } from "@/lib/campaign-store/types";
import { syncJobCommunicationRecords } from "@/lib/job-control/communication";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import {
  COORDINATOR_SYSTEM_USER,
  coordinateClientEvent,
  coordinateOwnerOutcome,
  createCoordinatorSession,
} from "@/studio-coordinator";

const NOW = "2026-07-03T12:00:00.000Z";
const CLIENT_ID = "client-1";

const coordinatorAssignments: CampaignAssignmentsFile = {
  staffByUserId: {
    [COORDINATOR_SYSTEM_USER.id]: ["dc-camp"],
  },
  staffCapabilities: {
    [COORDINATOR_SYSTEM_USER.id]: ["producer_dispatcher"],
  },
};

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Tagia",
  roles: ["owner"],
};

function lineItem(skuId: string, name: string) {
  return {
    skuId,
    serviceId: skuId,
    serviceName: name,
    billingType: "one_time" as const,
    exactPriceCents: 10000,
    priceDisplay: "$100",
    deliverables: ["Concept set"],
    exclusions: [],
    timingWindowLabel: "3-5 days",
    revisionRule: "1 round",
    clientResponsibilities: [],
    executionResponsibility: "Studio",
  };
}

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "dc-camp",
    campaignName: "Acme Co",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: "2026-07-01T10:00:00.000Z",
    projectDetailsSubmittedAt: "2026-07-01T12:00:00.000Z",
    approvedStudioPlan: {
      selectedServiceIds: ["ma-flyer-v2"],
      includedServiceIds: ["ma-flyer-v2"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 10000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 10000,
      lineItems: [lineItem("ma-flyer-v2", "Flyer")],
      approvedAt: "2026-07-01T09:00:00.000Z",
    },
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    ...overrides,
  } as CampaignRecord;
}

function envelope(jobs: PurchasedJobRecord[] = [], tasks: ServerTasksEnvelope["tasks"] = []): ServerTasksEnvelope {
  return {
    campaignId: "dc-camp",
    tasks,
    planFingerprint: "test",
    updatedAt: NOW,
    syncedAt: NOW,
    version: 9,
    jobRecords: jobs,
    jobActivityEvents: [],
    jobCommunicationRecords: [],
    exceptionRecords: [],
    exceptionEvents: [],
  };
}

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: "dc-camp:ma-flyer-v2",
    campaignId: "dc-camp",
    skuId: "ma-flyer-v2",
    serviceName: "Flyer",
    spineStatus: "ready_for_queue",
    productionLane: "standard",
    intakeComplete: true,
    laneQueuedAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function executionState(
  overrides: {
    campaign?: Partial<CampaignRecord>;
    jobs?: PurchasedJobRecord[];
    envelope?: Partial<ServerTasksEnvelope>;
  } = {},
) {
  const jobs = overrides.jobs ?? [job()];
  return {
    campaign: campaign(overrides.campaign),
    envelope: { ...envelope(jobs), ...overrides.envelope },
    materials: [] as CampaignMaterialItem[],
    jobs,
  };
}

describe("studio-coordinator communication parity", () => {
  it("matches syncJobCommunicationRecords envelope via coordinateClientEvent", () => {
    const record = campaign();
    const env = envelope([job()]);
    const materials: CampaignMaterialItem[] = [];

    const synced = syncJobRecordsFromCampaign(
      record,
      env.tasks ?? [],
      materials,
      env.exceptionRecords ?? [],
      env.jobRecords,
    );
    const jobs = applyWaitingOnClientPolicies(synced, materials, new Date(NOW).getTime());

    const direct = syncJobCommunicationRecords({
      envelope: env,
      campaign: record,
      clientId: CLIENT_ID,
      jobs,
      materials,
      nowMs: new Date(NOW).getTime(),
    });

    const coordinated = coordinateClientEvent(
      {
        type: "communication_sync",
        campaignId: record.campaignId,
        occurredAt: NOW,
        facts: { clientId: CLIENT_ID, nowMs: new Date(NOW).getTime() },
      },
      {
        campaign: record,
        envelope: env,
        materials,
        jobs,
      },
      createCoordinatorSession(),
      { user: COORDINATOR_SYSTEM_USER, assignments: coordinatorAssignments, clientId: CLIENT_ID },
    );

    expect(coordinated.state.envelope.jobCommunicationRecords?.map((entry) => entry.id)).toEqual(
      direct.envelope.jobCommunicationRecords?.map((entry) => entry.id),
    );
    expect(coordinated.session.auditLog.some((entry) => entry.step === "decision_evaluated")).toBe(
      true,
    );
  });
});

describe("studio-coordinator client escalation parity", () => {
  it("handles reserve revision through Squishy without Owner Desk exception", () => {
    const state = executionState({
      campaign: { revisionRoundsUsed: 3, revisionRoundsIncluded: 3 },
      envelope: {
        tasks: [
          {
            id: "ma-flyer-v2:creative",
            title: "Creative",
            phase: "creative",
            status: "ready",
            relatedServiceIds: ["ma-flyer-v2"],
            familyId: "flyer",
            catalogFamilyId: "marketing",
            serviceName: "Flyer",
            dependsOn: [],
            workflowState: "ready_for_qa",
          },
        ],
      },
    });

    const coordinated = coordinateClientEvent(
      {
        type: "revision_request",
        campaignId: state.campaign.campaignId,
        jobId: state.jobs[0].jobId,
        occurredAt: NOW,
        facts: {},
      },
      state,
      createCoordinatorSession(),
      {
        user: COORDINATOR_SYSTEM_USER,
        assignments: coordinatorAssignments,
        taskId: "ma-flyer-v2:creative",
      },
    );

    expect(coordinated.outcome.determination).toBe("respond");
    expect(coordinated.outcome.humanReviewRequired).toBe(false);
    expect(coordinated.state.envelope.exceptionRecords ?? []).toHaveLength(0);
    expect(coordinated.summary.message).toContain("reserve revision round");
  });

  it("raises scope_change exception for scope_request", () => {
    const coordinated = coordinateClientEvent(
      {
        type: "scope_request",
        campaignId: "dc-camp",
        occurredAt: NOW,
        facts: {},
      },
      executionState(),
      createCoordinatorSession(),
      { user: COORDINATOR_SYSTEM_USER, assignments: coordinatorAssignments },
    );

    expect(coordinated.outcome.determination).toBe("escalate");
    expect(coordinated.state.envelope.exceptionRecords?.[0]?.kind).toBe("scope_change");
    expect(coordinated.state.envelope.exceptionRecords?.[0]?.status).toBe("waiting_owner");
  });
});

describe("studio-coordinator owner outcomes", () => {
  it("executes owner resolve without auto-learning routine kinds", () => {
    const exception: CampaignExceptionRecord = {
      id: "ex-routine",
      campaignId: "dc-camp",
      kind: "routine_internal",
      status: "open",
      title: "Routine",
      createdAt: NOW,
      updatedAt: NOW,
      raisedByUserId: "staff-1",
      raisedByDisplayName: "Staff",
      raisedByRole: "producer_dispatcher",
    };

    const state = executionState({
      envelope: { exceptionRecords: [exception], exceptionEvents: [] },
    });

    const result = coordinateOwnerOutcome(
      {
        campaignId: "dc-camp",
        exceptionId: exception.id,
        action: "resolve_exception",
        occurredAt: NOW,
        user: owner,
        assignments: coordinatorAssignments,
      },
      state,
    );

    expect(result.state.envelope.exceptionRecords?.[0]?.status).toBe("resolved");
    expect(result.summary.learningCandidateRecorded).toBe(false);
    expect(result.session.learningCandidates).toHaveLength(0);
  });

  it("records learning candidate as pending_review for noteworthy owner resolve", () => {
    const exception: CampaignExceptionRecord = {
      id: "ex-scope",
      campaignId: "dc-camp",
      kind: "scope_change",
      status: "waiting_owner",
      title: "Scope change",
      createdAt: NOW,
      updatedAt: NOW,
      raisedByUserId: "staff-1",
      raisedByDisplayName: "Staff",
      raisedByRole: "producer_dispatcher",
    };

    const state = executionState({
      envelope: { exceptionRecords: [exception], exceptionEvents: [] },
    });

    const result = coordinateOwnerOutcome(
      {
        campaignId: "dc-camp",
        exceptionId: exception.id,
        action: "resolve_exception",
        occurredAt: NOW,
        user: owner,
        assignments: coordinatorAssignments,
        payload: { resolutionNotes: "Approved minor copy tweak." },
      },
      state,
    );

    expect(result.summary.learningCandidateRecorded).toBe(true);
    expect(result.session.learningCandidates).toHaveLength(1);
    expect(result.session.learningCandidates[0]?.status).toBe("pending_review");
    expect(result.session.auditLog.some((entry) => entry.step === "learning_candidate_recorded")).toBe(
      true,
    );
  });
});

describe("studio-coordinator issue detection", () => {
  it("records stalled observation without changing production state", () => {
    const waitingSince = "2026-06-28T10:00:00.000Z";
    const state = executionState({
      jobs: [
        job({
          spineStatus: "waiting_on_client",
          waitingOnClientSince: waitingSince,
        }),
      ],
    });

    const beforeJobs = JSON.stringify(state.jobs);
    const coordinated = coordinateClientEvent(
      {
        type: "status_inquiry",
        campaignId: "dc-camp",
        occurredAt: NOW,
        facts: {},
      },
      state,
      createCoordinatorSession(),
      { user: COORDINATOR_SYSTEM_USER, assignments: coordinatorAssignments },
    );

    expect(coordinated.observations.some((entry) => entry.kind === "stalled")).toBe(true);
    expect(JSON.stringify(coordinated.state.jobs)).toBe(beforeJobs);
  });
});

describe("studio-coordinator audit trail", () => {
  it("logs received → context → outcome → effects for client events", () => {
    const coordinated = coordinateClientEvent(
      {
        type: "project_question",
        campaignId: "dc-camp",
        occurredAt: NOW,
        facts: {},
      },
      executionState(),
      createCoordinatorSession(),
      { user: COORDINATOR_SYSTEM_USER, assignments: coordinatorAssignments },
    );

    const steps = coordinated.session.auditLog.map((entry) => entry.step);
    expect(steps).toContain("received");
    expect(steps).toContain("context_built");
    expect(steps).toContain("decision_evaluated");
    expect(steps).toContain("effects_executed");
    expect(coordinated.session.auditLog.some((entry) => entry.outcome?.matchedRules.length)).toBe(
      true,
    );
  });
});
