import { describe, expect, it, vi } from "vitest";

import type { ServiceId } from "@/catalog/types";
import type { ApprovedStudioPlan, CampaignRecord } from "@/config/studio-board";
import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";
import { readCampaignEnvelope, upsertCampaignRecord, writeCampaignEnvelope } from "@/lib/campaign-store/store";
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
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import { allocateSelectedServices, computeAdditionalCostUsd } from "@/studio-plan-review";

import { applyApprovedProjectChange, createDefaultApplyPersistence, resolvePersistedApplyClientUserId } from "./apply-orchestrator";
import { orchestrateProjectChangeConsentResponse } from "./consent-orchestrator";
import { orchestrateProjectChangeOwnerScopeAction } from "./owner-outcome-orchestrator";
import { orchestrateOwnerApplyProjectChangeScope } from "./owner-apply-orchestrator";

const clientUser: StudioUser = {
  id: "client-apply",
  email: "client@example.com",
  displayName: "Client",
  roles: ["client"],
};

const ownerUser: StudioUser = {
  id: "owner-apply",
  email: "owner@studio.local",
  displayName: "Owner",
  roles: ["owner"],
};

const ownerAssignments: CampaignAssignmentsFile = {
  staffByUserId: {},
  staffCapabilities: {},
};

const PLAN_SERVICES = ["v2-rtu-flyer", "v2-rtu-menu"] as const satisfies readonly ServiceId[];
const REMOVE_SERVICE = "v2-rtu-menu" as ServiceId;
const ADD_SERVICE = "sm-001" as ServiceId;

function buildApprovedPlan(selectedServiceIds: readonly ServiceId[]): ApprovedStudioPlan {
  const { includedServiceIds, additionalServiceIds } = allocateSelectedServices(selectedServiceIds);
  const pricing = computePlanPricingTotals(selectedServiceIds);
  const { amountUsd } = computeAdditionalCostUsd(additionalServiceIds);
  return {
    selectedServiceIds: [...selectedServiceIds],
    includedServiceIds,
    additionalServiceIds,
    additionalCostUsd: amountUsd,
    oneTimeTotalCents: pricing.oneTimeTotalCents,
    monthlyTotalCents: pricing.monthlySubtotalCents,
    amountDueTodayCents: pricing.amountDueTodayCents,
    lineItems: buildServiceScopeSnapshot(selectedServiceIds),
    approvedAt: new Date().toISOString(),
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
    approvedStudioPlan: buildApprovedPlan(PLAN_SERVICES),
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

function scopeException(
  campaignId: string,
  exceptionId: string,
  status: CampaignExceptionRecord["status"] = "waiting_owner",
): CampaignExceptionRecord {
  const now = new Date().toISOString();
  return {
    id: exceptionId,
    campaignId,
    kind: "scope_change",
    status,
    title: "Client scope request",
    createdAt: now,
    updatedAt: now,
    raisedByUserId: ownerUser.id,
    raisedByDisplayName: "Owner",
    raisedByRole: "owner",
  };
}

function tasksEnvelope(
  campaignId: string,
  exceptionId: string,
  status: CampaignExceptionRecord["status"] = "waiting_owner",
): ServerTasksEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId,
    tasks: [],
    planFingerprint: "test",
    updatedAt: now,
    syncedAt: now,
    version: 9,
    exceptionRecords: [scopeException(campaignId, exceptionId, status)],
    exceptionEvents: [],
  };
}

async function seedEscalatedProjectChange(campaignId: string) {
  const record = campaign(campaignId);
  await upsertCampaignRecord(record, clientUser.id);
  const submitted = await submitInformationUpdateRequest({
    campaignId,
    user: clientUser,
    idempotencyKey: `idem-${campaignId}`,
    targetKey: "freeform_request",
    requestedValue: "Remove menu from my plan",
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

async function ownerApprove(campaignId: string, exceptionId: string, record: CampaignRecord) {
  const tasks = (await readTasksEnvelope(campaignId)) ?? tasksEnvelope(campaignId, exceptionId);
  return orchestrateProjectChangeOwnerScopeAction({
    campaignId,
    exceptionId,
    action: "owner_approve_scope_change",
    user: ownerUser,
    tasksEnvelope: tasks,
    taskPatchBody: { action: "owner_approve_scope_change", exceptionId },
    taskContext: {
      campaign: record,
      materials: [],
      assignments: ownerAssignments,
    },
  });
}

async function seedApprovedProjectChange(campaignId: string) {
  const seeded = await seedEscalatedProjectChange(campaignId);
  const approved = await ownerApprove(campaignId, seeded.exceptionId, seeded.record);
  if (!approved.ok) throw new Error("owner approve failed");
  return seeded;
}

async function seedApprovedWithConsent(campaignId: string) {
  const seeded = await seedEscalatedProjectChange(campaignId);
  const clientMessage = "Please confirm removing the menu from your plan.";
  const ask = await orchestrateProjectChangeOwnerScopeAction({
    campaignId,
    exceptionId: seeded.exceptionId,
    action: "owner_ask_client_approval_scope_change",
    user: ownerUser,
    clientMessage,
    tasksEnvelope: tasksEnvelope(campaignId, seeded.exceptionId),
    taskPatchBody: {
      action: "owner_ask_client_approval_scope_change",
      exceptionId: seeded.exceptionId,
      clientMessage,
    },
    taskContext: {
      campaign: seeded.record,
      materials: [],
      assignments: ownerAssignments,
    },
  });
  if (!ask.ok) throw new Error("ask approval failed");

  const tasks = (await readTasksEnvelope(campaignId)) ?? tasksEnvelope(campaignId, seeded.exceptionId, "waiting_client");
  const granted = await orchestrateProjectChangeConsentResponse({
    campaignId,
    requestId: seeded.requestId,
    response: "granted",
    user: clientUser,
    tasksEnvelope: tasks,
  });
  if (!granted.ok) throw new Error("consent grant failed");

  return seeded;
}

function applyChange(
  campaignId: string,
  requestId: string,
  change: { kind: "add_service" | "remove_service"; serviceId: ServiceId },
  user: StudioUser = ownerUser,
  persistence?: Parameters<typeof applyApprovedProjectChange>[0]["persistence"],
) {
  return applyApprovedProjectChange({
    campaignId,
    requestId,
    change,
    user,
    assignments: ownerAssignments,
    persistence,
  });
}

describe("applyApprovedProjectChange", () => {
  it("applies an owner-approved and customer-consented project change", async () => {
    const campaignId = `camp-apply-success-${Date.now()}`;
    const seeded = await seedApprovedWithConsent(campaignId);
    const before = (await readCampaignEnvelope(campaignId))!.record.approvedStudioPlan!;

    const result = await orchestrateOwnerApplyProjectChangeScope({
      campaignId,
      exceptionId: seeded.exceptionId,
      change: { kind: "remove_service", serviceId: REMOVE_SERVICE },
      user: ownerUser,
      assignments: ownerAssignments,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.approvedStudioPlan?.oneTimeTotalCents).toBeTypeOf("number");

    const after = (await readCampaignEnvelope(campaignId))!.record.approvedStudioPlan!;
    expect(after.selectedServiceIds).toEqual(["v2-rtu-flyer"]);
    expect(after.selectedServiceIds).not.toContain(REMOVE_SERVICE);
    expect(after.selectedServiceIds.length).toBe(before.selectedServiceIds.length - 1);
    expect(after.oneTimeTotalCents).toBeTypeOf("number");
    expect(after.lineItems.some((item) => item.skuId === REMOVE_SERVICE)).toBe(false);
    expect(after.acknowledgmentVersion).toBe(before.acknowledgmentVersion);

    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity?.requests[0]?.status).toBe("applied");
    expect(activity?.requests[0]?.appliedChange).toEqual({
      kind: "remove_service",
      serviceId: REMOVE_SERVICE,
    });

    const timeline = projectActivityToCustomerTimeline(activity!.events);
    const applied = timeline.find((item) => item.kind === "project_change_applied");
    expect(applied?.headline).toBe("Project change applied");
    expect(applied?.detail).toContain("removed");
    expect(JSON.stringify(applied)).not.toContain("exceptionId");
  });

  it("rejects apply when owner approved but required customer consent is missing", async () => {
    const campaignId = `camp-apply-no-consent-${Date.now()}`;
    const seeded = await seedEscalatedProjectChange(campaignId);
    const clientMessage = "Please confirm removing the menu from your plan.";
    await orchestrateProjectChangeOwnerScopeAction({
      campaignId,
      exceptionId: seeded.exceptionId,
      action: "owner_ask_client_approval_scope_change",
      user: ownerUser,
      clientMessage,
      tasksEnvelope: tasksEnvelope(campaignId, seeded.exceptionId),
      taskPatchBody: {
        action: "owner_ask_client_approval_scope_change",
        exceptionId: seeded.exceptionId,
        clientMessage,
      },
      taskContext: {
        campaign: seeded.record,
        materials: [],
        assignments: ownerAssignments,
      },
    });

    const result = await applyChange(campaignId, seeded.requestId, {
      kind: "remove_service",
      serviceId: REMOVE_SERVICE,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(409);
  });

  it("applies when consent is granted and owner uses typed desk apply", async () => {
    const campaignId = `camp-apply-no-owner-${Date.now()}`;
    const seeded = await seedApprovedWithConsent(campaignId);

    const result = await orchestrateOwnerApplyProjectChangeScope({
      campaignId,
      exceptionId: seeded.exceptionId,
      change: { kind: "remove_service", serviceId: REMOVE_SERVICE },
      user: ownerUser,
      assignments: ownerAssignments,
    });

    expect(result.ok).toBe(true);
  });

  it("blocks owner_approve_scope_change after customer consent is granted", async () => {
    const campaignId = `camp-apply-block-approve-${Date.now()}`;
    const seeded = await seedApprovedWithConsent(campaignId);
    const tasks = (await readTasksEnvelope(campaignId))!;

    const approve = await orchestrateProjectChangeOwnerScopeAction({
      campaignId,
      exceptionId: seeded.exceptionId,
      action: "owner_approve_scope_change",
      user: ownerUser,
      tasksEnvelope: tasks,
      taskPatchBody: { action: "owner_approve_scope_change", exceptionId: seeded.exceptionId },
      taskContext: {
        campaign: seeded.record,
        materials: [],
        assignments: ownerAssignments,
      },
    });

    expect(approve.ok).toBe(false);
    if (approve.ok) return;
    expect(approve.status).toBe(409);
  });

  it("rejects broken exception links", async () => {
    const campaignId = `camp-apply-broken-link-${Date.now()}`;
    const { requestId } = await seedApprovedProjectChange(campaignId);
    const activity = await readProjectActivityEnvelope(campaignId);
    await writeProjectActivityEnvelope({
      ...activity!,
      requests: activity!.requests.map((entry) => ({
        ...entry,
        projectChangeExceptionId: undefined,
      })),
      version: activity!.version + 1,
    });

    const result = await applyChange(campaignId, requestId, {
      kind: "remove_service",
      serviceId: REMOVE_SERVICE,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(409);
  });

  it("rejects unauthorized actors", async () => {
    const campaignId = `camp-apply-unauthorized-${Date.now()}`;
    const { requestId } = await seedApprovedProjectChange(campaignId);

    const result = await applyChange(
      campaignId,
      requestId,
      { kind: "remove_service", serviceId: REMOVE_SERVICE },
      clientUser,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(403);
  });

  it("rejects unpaid campaigns", async () => {
    const campaignId = `camp-apply-unpaid-${Date.now()}`;
    const { requestId, record } = await seedApprovedProjectChange(campaignId);
    await upsertCampaignRecord(
      { ...record, paymentReceivedAt: null, approvedStudioPlan: record.approvedStudioPlan },
      clientUser.id,
    );

    const result = await applyChange(campaignId, requestId, {
      kind: "remove_service",
      serviceId: REMOVE_SERVICE,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(403);
  });

  async function stripCampaignClientOwner(
    campaignId: string,
    clientUserId?: string,
  ) {
    const envelope = (await readCampaignEnvelope(campaignId))!;
    const rest = { ...envelope };
    delete rest.clientUserId;
    return writeCampaignEnvelope({
      ...rest,
      ...(clientUserId !== undefined ? { clientUserId } : {}),
      syncedAt: new Date().toISOString(),
      syncVersion: envelope.syncVersion + 1,
    });
  }

  it("rejects apply when paid campaign has no client owner", async () => {
    const campaignId = `camp-apply-unclaimed-${Date.now()}`;
    const { requestId } = await seedApprovedProjectChange(campaignId);
    const planBefore = (await readCampaignEnvelope(campaignId))!.record.approvedStudioPlan!;
    const activityBefore = (await readProjectActivityEnvelope(campaignId))!;
    const tasksBefore = (await readTasksEnvelope(campaignId))!;
    const requestStatusBefore = activityBefore.requests.find((r) => r.id === requestId)?.status;
    const exceptionStatusBefore = tasksBefore.exceptionRecords?.[0]?.status;

    await stripCampaignClientOwner(campaignId);

    const result = await applyChange(campaignId, requestId, {
      kind: "remove_service",
      serviceId: REMOVE_SERVICE,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(409);
    expect(result.error).toBe("Campaign has no client account on record.");

    const after = await readCampaignEnvelope(campaignId);
    expect(after?.clientUserId).toBeUndefined();
    expect(after?.record.approvedStudioPlan).toEqual(planBefore);

    const activityAfter = await readProjectActivityEnvelope(campaignId);
    expect(activityAfter?.requests.find((r) => r.id === requestId)?.status).toBe(requestStatusBefore);

    const tasksAfter = await readTasksEnvelope(campaignId);
    expect(tasksAfter?.exceptionRecords?.[0]?.status).toBe(exceptionStatusBefore);
  });

  it("rejects apply when client owner is blank", async () => {
    const campaignId = `camp-apply-blank-owner-${Date.now()}`;
    const { requestId } = await seedApprovedProjectChange(campaignId);
    const planBefore = (await readCampaignEnvelope(campaignId))!.record.approvedStudioPlan!;
    const activityBefore = (await readProjectActivityEnvelope(campaignId))!;
    const tasksBefore = (await readTasksEnvelope(campaignId))!;
    const requestStatusBefore = activityBefore.requests.find((r) => r.id === requestId)?.status;
    const exceptionStatusBefore = tasksBefore.exceptionRecords?.[0]?.status;

    await stripCampaignClientOwner(campaignId, "   ");

    const result = await applyChange(campaignId, requestId, {
      kind: "remove_service",
      serviceId: REMOVE_SERVICE,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(409);
    expect(result.error).toBe("Campaign has no client account on record.");

    const after = await readCampaignEnvelope(campaignId);
    expect(after?.clientUserId).toBe("   ");
    expect(after?.record.approvedStudioPlan).toEqual(planBefore);
    expect(
      (await readProjectActivityEnvelope(campaignId))?.requests.find((r) => r.id === requestId)?.status,
    ).toBe(requestStatusBefore);
    expect((await readTasksEnvelope(campaignId))?.exceptionRecords?.[0]?.status).toBe(
      exceptionStatusBefore,
    );
  });

  it("rejects invalid or non-catalog service IDs", async () => {
    const campaignId = `camp-apply-invalid-sku-${Date.now()}`;
    const { requestId } = await seedApprovedProjectChange(campaignId);

    const result = await applyChange(campaignId, requestId, {
      kind: "remove_service",
      serviceId: "not-a-real-service" as ServiceId,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
  });

  it("blocks add_service when payment would be required", async () => {
    const campaignId = `camp-apply-payment-${Date.now()}`;
    const { requestId } = await seedApprovedProjectChange(campaignId);
    const before = (await readCampaignEnvelope(campaignId))!.record.approvedStudioPlan!;

    const result = await applyChange(campaignId, requestId, {
      kind: "add_service",
      serviceId: ADD_SERVICE,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.paymentRequired).toBe(true);

    const after = (await readCampaignEnvelope(campaignId))!.record.approvedStudioPlan!;
    expect(after).toEqual(before);

    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity?.requests[0]?.status).toBe("held");
  });

  it("is idempotent and does not duplicate services or events", async () => {
    const campaignId = `camp-apply-idempotent-${Date.now()}`;
    const { requestId } = await seedApprovedProjectChange(campaignId);
    const change = { kind: "remove_service" as const, serviceId: REMOVE_SERVICE };

    const first = await applyChange(campaignId, requestId, change);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const activityAfterFirst = await readProjectActivityEnvelope(campaignId);
    const planAfterFirst = (await readCampaignEnvelope(campaignId))!.record.approvedStudioPlan!;

    const second = await applyChange(campaignId, requestId, change);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.idempotent).toBe(true);

    const activityAfterSecond = await readProjectActivityEnvelope(campaignId);
    expect(activityAfterSecond?.events.length).toBe(activityAfterFirst?.events.length);

    const planAfterSecond = (await readCampaignEnvelope(campaignId))!.record.approvedStudioPlan!;
    expect(planAfterSecond.selectedServiceIds).toEqual(planAfterFirst.selectedServiceIds);
  });

  it("rolls back activity and owner desk when campaign persistence fails", async () => {
    const campaignId = `camp-apply-campaign-rollback-${Date.now()}`;
    const { requestId } = await seedApprovedProjectChange(campaignId);
    const activityBefore = await readProjectActivityEnvelope(campaignId);
    const tasksBefore = await readTasksEnvelope(campaignId);
    const campaignBefore = (await readCampaignEnvelope(campaignId))!.record;

    const result = await applyChange(
      campaignId,
      requestId,
      { kind: "remove_service", serviceId: REMOVE_SERVICE },
      ownerUser,
      {
        writeCampaign: vi.fn(async () => {
          throw new Error("campaign write failed");
        }),
        writeActivity: writeProjectActivityEnvelope,
        writeTasks: writeTasksEnvelope,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const activityAfter = await readProjectActivityEnvelope(campaignId);
    expect(activityAfter?.requests[0]?.status).toBe(activityBefore?.requests[0]?.status);
    expect(activityAfter?.events.length).toBe(activityBefore?.events.length);

    const campaignAfter = (await readCampaignEnvelope(campaignId))!.record;
    expect(campaignAfter.approvedStudioPlan).toEqual(campaignBefore.approvedStudioPlan);

    const tasksAfter = await readTasksEnvelope(campaignId);
    expect(tasksAfter?.exceptionRecords?.[0]?.status).toBe(tasksBefore?.exceptionRecords?.[0]?.status);
  });

  it("leaves the plan unchanged when activity persistence fails", async () => {
    const campaignId = `camp-apply-activity-rollback-${Date.now()}`;
    const { requestId } = await seedApprovedProjectChange(campaignId);
    const campaignBefore = (await readCampaignEnvelope(campaignId))!.record;

    const result = await applyChange(
      campaignId,
      requestId,
      { kind: "remove_service", serviceId: REMOVE_SERVICE },
      ownerUser,
      {
        writeCampaign: upsertCampaignRecord,
        writeActivity: vi.fn(async () => {
          throw new Error("activity write failed");
        }),
        writeTasks: writeTasksEnvelope,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const campaignAfter = (await readCampaignEnvelope(campaignId))!.record;
    expect(campaignAfter.approvedStudioPlan).toEqual(campaignBefore.approvedStudioPlan);
  });
});

describe("resolvePersistedApplyClientUserId", () => {
  it("uses validated campaign identity when existing identity is missing", () => {
    expect(resolvePersistedApplyClientUserId(undefined, "client-apply")).toBe("client-apply");
  });

  it("uses validated campaign identity when existing identity is empty", () => {
    expect(resolvePersistedApplyClientUserId("", "client-apply")).toBe("client-apply");
  });

  it("uses validated campaign identity when existing identity is whitespace-only", () => {
    expect(resolvePersistedApplyClientUserId("   \t", "client-apply")).toBe("client-apply");
  });

  it("preserves a valid existing client owner over a different validated id", () => {
    expect(resolvePersistedApplyClientUserId("client-1", "client-2")).toBe("client-1");
  });
});

describe("createDefaultApplyPersistence ownership merge", () => {
  it("persists validated owner when on-disk stamp is missing or blank", async () => {
    const campaignId = `camp-apply-persist-blank-${Date.now()}`;
    const record = campaign(campaignId);
    await upsertCampaignRecord(record, clientUser.id);

    const envelope = (await readCampaignEnvelope(campaignId))!;
    const rest = { ...envelope };
    delete rest.clientUserId;
    await writeCampaignEnvelope({
      ...rest,
      clientUserId: "",
      syncedAt: new Date().toISOString(),
      syncVersion: envelope.syncVersion + 1,
    });

    const persistence = createDefaultApplyPersistence();
    const written = await persistence.writeCampaign(record, clientUser.id);
    expect(written.clientUserId).toBe(clientUser.id);
    expect((await readCampaignEnvelope(campaignId))?.clientUserId).toBe(clientUser.id);
  });

  it("persists validated owner when on-disk stamp is whitespace-only", async () => {
    const campaignId = `camp-apply-persist-ws-${Date.now()}`;
    const record = campaign(campaignId);
    await upsertCampaignRecord(record, clientUser.id);

    const envelope = (await readCampaignEnvelope(campaignId))!;
    await writeCampaignEnvelope({
      ...envelope,
      clientUserId: "  \n",
      syncedAt: new Date().toISOString(),
      syncVersion: envelope.syncVersion + 1,
    });

    const persistence = createDefaultApplyPersistence();
    const written = await persistence.writeCampaign(record, clientUser.id);
    expect(written.clientUserId).toBe(clientUser.id);
    expect((await readCampaignEnvelope(campaignId))?.clientUserId).toBe(clientUser.id);
  });

  it("preserves a valid existing on-disk owner (first-claim rule)", async () => {
    const campaignId = `camp-apply-persist-preserve-${Date.now()}`;
    const record = campaign(campaignId);
    await upsertCampaignRecord(record, "client-first");

    const persistence = createDefaultApplyPersistence();
    const written = await persistence.writeCampaign(
      { ...record, campaignStatus: "READY_FOR_REVIEW" },
      "client-second",
    );
    expect(written.clientUserId).toBe("client-first");
    expect((await readCampaignEnvelope(campaignId))?.clientUserId).toBe("client-first");
  });
});
