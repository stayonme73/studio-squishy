import { describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import type { CampaignExceptionRecord, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { seedCustomerFieldTokensFromProjectDetails } from "@/lib/customer-field-tokens";
import {
  classifyInformationUpdateRequest,
  escalateProjectChangeRequest,
  submitInformationUpdateRequest,
} from "@/lib/project-activity/actions";
import { projectActivityToCustomerTimeline } from "@/lib/project-activity/customer-view";
import { readProjectActivityEnvelope, writeProjectActivityEnvelope } from "@/lib/project-activity/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";

import { orchestrateProjectChangeOwnerScopeAction } from "./owner-outcome-orchestrator";
import {
  isPackage3EscalatedException,
  planProjectChangeOwnerActivitySync,
  resolveProjectChangeLinkage,
  validateLinkedProjectChangeRequest,
} from "./sync-owner-outcome";

const clientUser: StudioUser = {
  id: "client-owner-sync",
  email: "client@example.com",
  displayName: "Client",
  roles: ["client"],
};

const ownerUser: StudioUser = {
  id: "owner-owner-sync",
  email: "owner@studio.local",
  displayName: "Owner",
  roles: ["owner"],
};

const ownerAssignments: CampaignAssignmentsFile = {
  staffByUserId: {},
  staffCapabilities: {},
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

function campaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  const base: CampaignRecord = {
    campaignId,
    campaignName: "Test",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Test",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: ["ma-flyer-v2"],
      includedServiceIds: ["ma-flyer-v2"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 10000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 10000,
      lineItems: [lineItem("ma-flyer-v2", "Flyer")],
      approvedAt: now,
    },
    projectDetails: {
      form: { ...EMPTY_PROJECT_DETAILS_FORM, primaryApproverEmail: "old@example.com" },
      files: [],
      submittedAt: now,
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
  };
  return seedCustomerFieldTokensFromProjectDetails(base);
}

function scopeException(campaignId: string, exceptionId: string): CampaignExceptionRecord {
  const now = new Date().toISOString();
  return {
    id: exceptionId,
    campaignId,
    kind: "scope_change",
    status: "waiting_owner",
    title: "Client scope request",
    createdAt: now,
    updatedAt: now,
    raisedByUserId: ownerUser.id,
    raisedByDisplayName: "Owner",
    raisedByRole: "owner",
  };
}

function tasksEnvelope(campaignId: string, exceptionId: string): ServerTasksEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId,
    tasks: [],
    planFingerprint: "test",
    updatedAt: now,
    syncedAt: now,
    version: 9,
    exceptionRecords: [scopeException(campaignId, exceptionId)],
    exceptionEvents: [],
  };
}

async function seedEscalatedProjectChange(campaignId: string) {
  const record = campaign(campaignId);
  const submitted = await submitInformationUpdateRequest({
    campaignId,
    user: clientUser,
    idempotencyKey: `idem-${campaignId}`,
    targetKey: "freeform_request",
    requestedValue: "Add another social platform",
    campaign: record,
  });
  if (!submitted.ok) throw new Error("submit failed");

  const classified = await classifyInformationUpdateRequest({
    campaignId,
    requestId: submitted.request.id,
    user: ownerUser,
    classification: "project_change",
  });
  if (!classified.ok) throw new Error("classify failed");

  const escalated = await escalateProjectChangeRequest({
    campaignId,
    requestId: submitted.request.id,
    user: ownerUser,
    assignments: ownerAssignments,
    campaign: record,
  });
  if (!escalated.ok) throw new Error("escalate failed");

  return { record, requestId: submitted.request.id, exceptionId: escalated.exceptionId };
}

function orchestrateDecline(
  campaignId: string,
  exceptionId: string,
  record: CampaignRecord,
  tasks: ServerTasksEnvelope,
  persistence?: Parameters<typeof orchestrateProjectChangeOwnerScopeAction>[0]["persistence"],
) {
  return orchestrateProjectChangeOwnerScopeAction({
    campaignId,
    exceptionId,
    action: "owner_decline_scope_change",
    user: ownerUser,
    tasksEnvelope: tasks,
    taskPatchBody: { action: "owner_decline_scope_change", exceptionId },
    taskContext: {
      campaign: record,
      materials: [],
      assignments: ownerAssignments,
    },
    persistence,
  });
}

describe("resolveProjectChangeLinkage", () => {
  it("blocks Package 3 escalated exceptions when the canonical link is missing", async () => {
    const campaignId = `camp-owner-orphan-${Date.now()}`;
    const { exceptionId } = await seedEscalatedProjectChange(campaignId);
    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity).toBeTruthy();
    expect(isPackage3EscalatedException(activity!, exceptionId)).toBe(true);

    const broken = {
      ...activity!,
      requests: activity!.requests.map((request) => ({
        ...request,
        projectChangeExceptionId: undefined,
      })),
    };

    const linkage = resolveProjectChangeLinkage(broken, exceptionId);
    expect(linkage.ok).toBe(false);
    if (linkage.ok) return;
    expect(linkage.status).toBe(409);
  });
});

describe("orchestrateProjectChangeOwnerScopeAction", () => {
  it("decline updates both records through one orchestration boundary", async () => {
    const campaignId = `camp-owner-decline-${Date.now()}`;
    const { record, exceptionId } = await seedEscalatedProjectChange(campaignId);
    const tasksBefore = await readTasksEnvelope(campaignId);

    const result = await orchestrateDecline(
      campaignId,
      exceptionId,
      record,
      tasksEnvelope(campaignId, exceptionId),
    );
    expect(result.ok).toBe(true);
    if (!result.ok || !result.linked) return;

    expect(result.taskResult.exception?.status).toBe("resolved");
    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity?.requests[0]?.status).toBe("rejected");
    expect(
      activity?.events.some(
        (event) => event.kind === "owner_decision_recorded" && event.payload?.decision === "declined",
      ),
    ).toBe(true);

    const tasksAfter = await readTasksEnvelope(campaignId);
    expect(tasksAfter?.exceptionRecords?.find((entry) => entry.id === exceptionId)?.status).toBe(
      "resolved",
    );
    expect(tasksBefore?.exceptionRecords?.find((entry) => entry.id === exceptionId)?.status).toBe(
      "waiting_owner",
    );
  });

  it("ask client approval sets consent pending and records customer approval requested", async () => {
    const campaignId = `camp-owner-consent-${Date.now()}`;
    const { record, exceptionId } = await seedEscalatedProjectChange(campaignId);
    const clientMessage = "Please confirm you want to add another social platform.";

    const result = await orchestrateProjectChangeOwnerScopeAction({
      campaignId,
      exceptionId,
      action: "owner_ask_client_approval_scope_change",
      user: ownerUser,
      clientMessage,
      tasksEnvelope: tasksEnvelope(campaignId, exceptionId),
      taskPatchBody: {
        action: "owner_ask_client_approval_scope_change",
        exceptionId,
        clientMessage,
      },
      taskContext: {
        campaign: record,
        materials: [],
        assignments: ownerAssignments,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok || !result.linked) return;
    expect(result.activityEnvelope.requests[0]?.consentStatus).toBe("pending");

    const timeline = projectActivityToCustomerTimeline(result.activityEnvelope.events);
    expect(timeline.some((item) => item.kind === "customer_approval_requested")).toBe(true);
  });

  it("does not persist activity when owner desk computation fails", async () => {
    const campaignId = `camp-owner-desk-fail-${Date.now()}`;
    const { record, exceptionId } = await seedEscalatedProjectChange(campaignId);
    const activityBefore = await readProjectActivityEnvelope(campaignId);

    const result = await orchestrateProjectChangeOwnerScopeAction({
      campaignId,
      exceptionId,
      action: "owner_decline_scope_change",
      user: ownerUser,
      tasksEnvelope: {
        ...tasksEnvelope(campaignId, exceptionId),
        exceptionRecords: [],
      },
      taskPatchBody: { action: "owner_decline_scope_change", exceptionId },
      taskContext: {
        campaign: record,
        materials: [],
        assignments: ownerAssignments,
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const activityAfter = await readProjectActivityEnvelope(campaignId);
    expect(activityAfter?.requests[0]?.status).toBe(activityBefore?.requests[0]?.status);
    expect(activityAfter?.events.length).toBe(activityBefore?.events.length);
  });

  it("rolls activity back when owner desk persistence fails", async () => {
    const campaignId = `camp-owner-rollback-${Date.now()}`;
    const { record, exceptionId } = await seedEscalatedProjectChange(campaignId);
    const activityBefore = await readProjectActivityEnvelope(campaignId);

    const result = await orchestrateDecline(
      campaignId,
      exceptionId,
      record,
      tasksEnvelope(campaignId, exceptionId),
      {
        writeActivity: writeProjectActivityEnvelope,
        writeTasks: vi.fn(async () => {
          throw new Error("tasks write failed");
        }),
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const activityAfter = await readProjectActivityEnvelope(campaignId);
    expect(activityAfter?.requests[0]?.status).toBe(activityBefore?.requests[0]?.status);
    expect(activityAfter?.events.length).toBe(activityBefore?.events.length);

    const tasksAfter = await readTasksEnvelope(campaignId);
    expect(tasksAfter?.exceptionRecords?.find((entry) => entry.id === exceptionId)?.status).toBe(
      "waiting_owner",
    );
  });

  it("does not write owner desk state when activity persistence fails first", async () => {
    const campaignId = `camp-owner-activity-fail-${Date.now()}`;
    const { record, exceptionId } = await seedEscalatedProjectChange(campaignId);
    const tasksBefore = await readTasksEnvelope(campaignId);

    const writeTasks = vi.fn(async (envelope: ServerTasksEnvelope) => envelope);

    const result = await orchestrateDecline(
      campaignId,
      exceptionId,
      record,
      tasksEnvelope(campaignId, exceptionId),
      {
        writeActivity: vi.fn(async () => {
          throw new Error("activity write failed");
        }),
        writeTasks,
      },
    );

    expect(result.ok).toBe(false);
    expect(writeTasks).not.toHaveBeenCalled();

    const tasksAfter = await readTasksEnvelope(campaignId);
    expect(tasksAfter?.exceptionRecords?.find((entry) => entry.id === exceptionId)?.status).toBe(
      tasksBefore?.exceptionRecords?.find((entry) => entry.id === exceptionId)?.status,
    );
  });

  it("allows legacy unlinked scope_change actions without project activity sync", async () => {
    const campaignId = `camp-owner-legacy-${Date.now()}`;
    const exceptionId = "exc-legacy-scope";
    const record = campaign(campaignId);
    const desk = tasksEnvelope(campaignId, exceptionId);

    const result = await orchestrateDecline(campaignId, exceptionId, record, desk);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.linked).toBe(false);
    expect(result.taskResult.exception?.status).toBe("resolved");
  });
});

describe("validateLinkedProjectChangeRequest", () => {
  it("requires escalation before owner sync", async () => {
    const campaignId = `camp-owner-sync-validate-${Date.now()}`;
    const record = campaign(campaignId);
    const submitted = await submitInformationUpdateRequest({
      campaignId,
      user: clientUser,
      idempotencyKey: "idem-validate",
      targetKey: "freeform_request",
      requestedValue: "Add posts",
      campaign: record,
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const classified = await classifyInformationUpdateRequest({
      campaignId,
      requestId: submitted.request.id,
      user: ownerUser,
      classification: "project_change",
    });
    expect(classified.ok).toBe(true);
    if (!classified.ok) return;

    const held = classified.envelope.requests.find((request) => request.id === submitted.request.id)!;
    expect(validateLinkedProjectChangeRequest(held, "exc-1")).toEqual({
      ok: false,
      error: "Project change link does not match the Owner Desk record.",
      status: 409,
    });
  });
});

describe("planProjectChangeOwnerActivitySync", () => {
  it("computes activity changes without persisting", async () => {
    const campaignId = `camp-owner-plan-${Date.now()}`;
    const { exceptionId } = await seedEscalatedProjectChange(campaignId);
    const before = await readProjectActivityEnvelope(campaignId);
    expect(before).toBeTruthy();
    const linked = before!.requests[0]!;

    const planned = planProjectChangeOwnerActivitySync({
      envelope: before!,
      request: linked,
      exceptionId,
      action: "owner_hold_scope_change",
      user: ownerUser,
    });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;

    const afterRead = await readProjectActivityEnvelope(campaignId);
    expect(afterRead?.requests[0]?.ownerDecision).toBeUndefined();
    expect(planned.nextEnvelope.requests[0]?.ownerDecision).toBe("held");
  });
});
