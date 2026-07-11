import { describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import type { CampaignExceptionRecord, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { seedCustomerFieldTokensFromProjectDetails } from "@/lib/customer-field-tokens";
import {
  classifyInformationUpdateRequest,
  escalateProjectChangeRequest,
  submitInformationUpdateRequest,
} from "@/lib/project-activity/actions";
import {
  projectActivityToCustomerTimeline,
  resolveCustomerPendingProjectChangeConsent,
} from "@/lib/project-activity/customer-view";
import { readProjectActivityEnvelope, writeProjectActivityEnvelope } from "@/lib/project-activity/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";

import { orchestrateProjectChangeConsentResponse } from "./consent-orchestrator";
import { planProjectChangeConsentActivityResponse } from "./consent-response";
import { orchestrateProjectChangeOwnerScopeAction } from "./owner-outcome-orchestrator";

const clientUser: StudioUser = {
  id: "client-consent",
  email: "client@example.com",
  displayName: "Client",
  roles: ["client"],
};

const otherClientUser: StudioUser = {
  id: "other-client-consent",
  email: "other@example.com",
  displayName: "Other Client",
  roles: ["client"],
};

const ownerUser: StudioUser = {
  id: "owner-consent",
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

function scopeException(campaignId: string, exceptionId: string, status: CampaignExceptionRecord["status"] = "waiting_owner"): CampaignExceptionRecord {
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

async function seedPendingConsent(campaignId: string) {
  const seeded = await seedEscalatedProjectChange(campaignId);
  const clientMessage = "Please confirm you want to add another social platform.";

  const askResult = await orchestrateProjectChangeOwnerScopeAction({
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
  if (!askResult.ok) throw new Error("ask approval failed");

  return { ...seeded, clientMessage };
}

function respondConsent(
  campaignId: string,
  requestId: string,
  response: "granted" | "declined",
  user: StudioUser = clientUser,
  tasks?: ServerTasksEnvelope,
  persistence?: Parameters<typeof orchestrateProjectChangeConsentResponse>[0]["persistence"],
) {
  return orchestrateProjectChangeConsentResponse({
    campaignId,
    requestId,
    response,
    user,
    tasksEnvelope: tasks ?? tasksEnvelope(campaignId, "placeholder"),
    persistence,
  });
}

describe("orchestrateProjectChangeConsentResponse", () => {
  it("records consent grant without mutating the approved plan", async () => {
    const campaignId = `camp-consent-grant-${Date.now()}`;
    const { record, requestId, exceptionId } = await seedPendingConsent(campaignId);
    const planBefore = structuredClone(record.approvedStudioPlan);

    const result = await respondConsent(
      campaignId,
      requestId,
      "granted",
      clientUser,
      tasksEnvelope(campaignId, exceptionId, "waiting_client"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.request.consentStatus).toBe("granted");
    expect(result.request.status).toBe("held");

    const campaignAfter = await readCampaignEnvelope(campaignId);
    expect(campaignAfter?.record.approvedStudioPlan).toEqual(planBefore);

    const timeline = projectActivityToCustomerTimeline(result.activityEnvelope.events);
    expect(timeline.some((item) => item.kind === "customer_approval_granted")).toBe(true);
    expect(timeline.some((item) => item.kind === "project_change_applied")).toBe(false);
    expect(
      timeline.find((item) => item.kind === "customer_approval_granted")?.detail?.toLowerCase(),
    ).not.toContain("applied");

    const tasksAfter = await readTasksEnvelope(campaignId);
    expect(tasksAfter?.exceptionRecords?.find((entry) => entry.id === exceptionId)?.status).toBe(
      "waiting_owner",
    );
  });

  it("records consent decline and synchronizes Owner Desk state", async () => {
    const campaignId = `camp-consent-decline-${Date.now()}`;
    const { requestId, exceptionId } = await seedPendingConsent(campaignId);

    const result = await respondConsent(
      campaignId,
      requestId,
      "declined",
      clientUser,
      tasksEnvelope(campaignId, exceptionId, "waiting_client"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.request.consentStatus).toBe("declined");
    expect(result.request.status).toBe("rejected");

    const activity = await readProjectActivityEnvelope(campaignId);
    expect(
      activity?.events.some((event) => event.kind === "customer_approval_declined"),
    ).toBe(true);
    expect(activity?.events.some((event) => event.kind === "project_change_closed")).toBe(true);

    const tasksAfter = await readTasksEnvelope(campaignId);
    expect(tasksAfter?.exceptionRecords?.find((entry) => entry.id === exceptionId)?.status).toBe(
      "resolved",
    );
  });

  it("is idempotent for duplicate identical responses", async () => {
    const campaignId = `camp-consent-idempotent-${Date.now()}`;
    const { requestId, exceptionId } = await seedPendingConsent(campaignId);
    const tasks = tasksEnvelope(campaignId, exceptionId, "waiting_client");

    const first = await respondConsent(campaignId, requestId, "granted", clientUser, tasks);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const activityAfterFirst = await readProjectActivityEnvelope(campaignId);
    const second = await respondConsent(campaignId, requestId, "granted", clientUser, tasks);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.idempotent).toBe(true);

    const activityAfterSecond = await readProjectActivityEnvelope(campaignId);
    expect(activityAfterSecond?.events.length).toBe(activityAfterFirst?.events.length);
  });

  it("rejects conflicting second responses", async () => {
    const campaignId = `camp-consent-conflict-${Date.now()}`;
    const { requestId, exceptionId } = await seedPendingConsent(campaignId);
    const tasks = tasksEnvelope(campaignId, exceptionId, "waiting_client");

    const granted = await respondConsent(campaignId, requestId, "granted", clientUser, tasks);
    expect(granted.ok).toBe(true);

    const declined = await respondConsent(campaignId, requestId, "declined", clientUser, tasks);
    expect(declined.ok).toBe(false);
    if (declined.ok) return;
    expect(declined.status).toBe(409);
  });

  it("rejects unauthorized campaign access for non-owning clients", async () => {
    const campaignId = `camp-consent-unauthorized-${Date.now()}`;
    const { requestId, exceptionId } = await seedPendingConsent(campaignId);

    const result = await respondConsent(
      campaignId,
      requestId,
      "granted",
      otherClientUser,
      tasksEnvelope(campaignId, exceptionId, "waiting_client"),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(403);
  });

  it("rejects non-client actors", async () => {
    const campaignId = `camp-consent-non-client-${Date.now()}`;
    const { requestId, exceptionId } = await seedPendingConsent(campaignId);

    const result = await respondConsent(
      campaignId,
      requestId,
      "granted",
      ownerUser,
      tasksEnvelope(campaignId, exceptionId, "waiting_client"),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(403);
  });

  it("rejects responses when no pending consent exists", async () => {
    const campaignId = `camp-consent-no-pending-${Date.now()}`;
    const { requestId, exceptionId } = await seedEscalatedProjectChange(campaignId);

    const result = await respondConsent(
      campaignId,
      requestId,
      "granted",
      clientUser,
      tasksEnvelope(campaignId, exceptionId),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(409);
  });

  it("fails safely when the canonical exception link is broken", async () => {
    const campaignId = `camp-consent-broken-link-${Date.now()}`;
    const { requestId, exceptionId } = await seedPendingConsent(campaignId);
    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity).toBeTruthy();

    const broken = {
      ...activity!,
      requests: activity!.requests.map((entry) => ({
        ...entry,
        projectChangeExceptionId: undefined,
      })),
    };
    await writeProjectActivityEnvelope(broken);

    const result = await respondConsent(
      campaignId,
      requestId,
      "declined",
      clientUser,
      tasksEnvelope(campaignId, exceptionId, "waiting_client"),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(409);
  });

  it("rolls activity back when Owner Desk persistence fails on decline", async () => {
    const campaignId = `camp-consent-rollback-${Date.now()}`;
    const { requestId, exceptionId } = await seedPendingConsent(campaignId);
    const activityBefore = await readProjectActivityEnvelope(campaignId);

    const result = await respondConsent(
      campaignId,
      requestId,
      "declined",
      clientUser,
      tasksEnvelope(campaignId, exceptionId, "waiting_client"),
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
    expect(activityAfter?.requests[0]?.consentStatus).toBe(activityBefore?.requests[0]?.consentStatus);
    expect(activityAfter?.events.length).toBe(activityBefore?.events.length);
  });
});

describe("resolveCustomerPendingProjectChangeConsent", () => {
  it("exposes safe consent copy only", async () => {
    const campaignId = `camp-consent-projection-${Date.now()}`;
    const { clientMessage } = await seedPendingConsent(campaignId);
    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity).toBeTruthy();

    const pending = resolveCustomerPendingProjectChangeConsent(activity!);
    expect(pending).toBeTruthy();
    if (!pending) return;

    expect(pending.ownerMessage).toBe(clientMessage);
    expect(pending.requestSummary).toContain("Add another social platform");
    expect(Object.keys(pending)).toEqual(["requestId", "ownerMessage", "requestSummary"]);
    expect(JSON.stringify(pending)).not.toContain("exceptionId");
    expect(JSON.stringify(pending)).not.toContain("ownerNotes");
  });

  it("returns null when consent is not pending", async () => {
    const campaignId = `camp-consent-projection-null-${Date.now()}`;
    await seedEscalatedProjectChange(campaignId);
    const activity = await readProjectActivityEnvelope(campaignId);
    expect(resolveCustomerPendingProjectChangeConsent(activity!)).toBeNull();
  });
});

describe("planProjectChangeConsentActivityResponse", () => {
  it("does not append apply events on grant", async () => {
    const campaignId = `camp-consent-plan-grant-${Date.now()}`;
    const { requestId } = await seedPendingConsent(campaignId);
    const activity = await readProjectActivityEnvelope(campaignId);
    const request = activity!.requests.find((entry) => entry.id === requestId)!;

    const plan = planProjectChangeConsentActivityResponse({
      envelope: activity!,
      request,
      response: "granted",
      user: clientUser,
    });

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(
      plan.nextEnvelope.events.some((event) => event.kind === "project_change_applied"),
    ).toBe(false);
  });
});
