import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";
import { seedCustomerFieldTokensFromProjectDetails } from "@/lib/customer-field-tokens";
import {
  classifyInformationUpdateRequest,
  escalateProjectChangeRequest,
  submitInformationUpdateRequest,
} from "@/lib/project-activity/actions";
import type { InformationUpdateRequest } from "@/lib/project-activity/types";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";

import {
  bridgeProjectChangeToOwnerDesk,
  findNewScopeChangeException,
  validateProjectChangeEscalation,
} from "./escalate";

const clientUser: StudioUser = {
  id: "client-pc-1",
  email: "client@example.com",
  displayName: "Client",
  roles: ["client"],
  currentCampaignId: "camp-pc-bridge",
};

const ownerUser: StudioUser = {
  id: "owner-pc-1",
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

function heldProjectChangeRequest(overrides: Partial<InformationUpdateRequest> = {}): InformationUpdateRequest {
  return {
    id: "req-pc-1",
    campaignId: "camp-pc-bridge",
    idempotencyKey: "idem-pc-1",
    targetKey: "freeform_request",
    targetLabel: "Freeform request",
    previousValueCaptured: null,
    requestedValue: "Add another social platform",
    status: "held",
    classification: "project_change",
    fieldTokenAtCapture: null,
    submittedBy: { userId: clientUser.id },
    submittedAt: "2026-07-11T14:00:00.000Z",
    ...overrides,
  };
}

describe("validateProjectChangeEscalation", () => {
  it("requires held project_change requests", () => {
    expect(validateProjectChangeEscalation(heldProjectChangeRequest())).toEqual({ ok: true });
    expect(validateProjectChangeEscalation(heldProjectChangeRequest({ classification: "information_update" }))).toEqual({
      ok: false,
      error: "Only classified Project Changes can be escalated.",
      status: 400,
    });
    expect(validateProjectChangeEscalation(heldProjectChangeRequest({ status: "approved_for_apply" }))).toEqual({
      ok: false,
      error: "Project Change must be held before escalation.",
      status: 400,
    });
  });
});

describe("findNewScopeChangeException", () => {
  it("returns the new scope_change record", () => {
    const existing: CampaignExceptionRecord = {
      id: "ex-old",
      campaignId: "camp-pc-bridge",
      kind: "scope_change",
      status: "waiting_owner",
      title: "Old",
      createdAt: "2026-07-11T10:00:00.000Z",
      updatedAt: "2026-07-11T10:00:00.000Z",
      raisedByUserId: "owner-pc-1",
      raisedByDisplayName: "Owner",
      raisedByRole: "owner",
    };
    const created: CampaignExceptionRecord = {
      ...existing,
      id: "ex-new",
      title: "New",
    };

    expect(findNewScopeChangeException(new Set(["ex-old"]), [existing, created])?.id).toBe("ex-new");
  });
});

describe("bridgeProjectChangeToOwnerDesk", () => {
  it("creates a scope_change exception through Coordinator and links idempotently", async () => {
    const campaignId = `camp-pc-bridge-${Date.now()}`;
    const record = campaign(campaignId);
    const request = heldProjectChangeRequest({ campaignId });

    const tasksBefore = await readTasksEnvelope(campaignId);
    const scopeBefore = (tasksBefore?.exceptionRecords ?? []).filter((entry) => entry.kind === "scope_change").length;

    const first = await bridgeProjectChangeToOwnerDesk({
      campaignId,
      request,
      user: ownerUser,
      assignments: ownerAssignments,
      campaign: record,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.alreadyEscalated).toBe(false);
    expect(first.exceptionId).toBeTruthy();

    const tasks = await readTasksEnvelope(campaignId);
    expect(tasks?.exceptionRecords?.some((entry) => entry.id === first.exceptionId)).toBe(true);
    expect(tasks?.exceptionRecords?.find((entry) => entry.id === first.exceptionId)?.kind).toBe("scope_change");
    expect((tasks?.exceptionRecords ?? []).filter((entry) => entry.kind === "scope_change").length).toBe(
      scopeBefore + 1,
    );

    const second = await bridgeProjectChangeToOwnerDesk({
      campaignId,
      request: { ...request, projectChangeExceptionId: first.exceptionId, escalatedAt: "2026-07-11T15:00:00.000Z" },
      user: ownerUser,
      assignments: ownerAssignments,
      campaign: record,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyEscalated).toBe(true);
    expect(second.exceptionId).toBe(first.exceptionId);

    const tasksAfter = await readTasksEnvelope(campaignId);
    expect((tasksAfter?.exceptionRecords ?? []).filter((entry) => entry.kind === "scope_change").length).toBe(
      scopeBefore + 1,
    );
  });

  it("does not create an exception when the actor cannot raise exceptions", async () => {
    const campaignId = "camp-pc-bridge-deny";
    const record = campaign(campaignId);
    const before = await readTasksEnvelope(campaignId);
    const beforeCount = before?.exceptionRecords?.length ?? 0;

    const result = await bridgeProjectChangeToOwnerDesk({
      campaignId,
      request: heldProjectChangeRequest({ campaignId }),
      user: clientUser,
      assignments: ownerAssignments,
      campaign: record,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(502);
    expect(result.error).toBe("Owner Desk exception was not created.");

    const after = await readTasksEnvelope(campaignId);
    expect(after?.exceptionRecords?.length ?? 0).toBe(beforeCount);
  });
});

describe("escalateProjectChangeRequest", () => {
  it("records project_change_escalated after Coordinator success", async () => {
    const campaignId = "camp-pc-action";
    const record = campaign(campaignId);

    const submitted = await submitInformationUpdateRequest({
      campaignId,
      user: clientUser,
      idempotencyKey: "idem-pc-action",
      targetKey: "freeform_request",
      requestedValue: "Add another social platform",
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

    const escalated = await escalateProjectChangeRequest({
      campaignId,
      requestId: submitted.request.id,
      user: ownerUser,
      assignments: ownerAssignments,
      campaign: record,
    });
    expect(escalated.ok).toBe(true);
    if (!escalated.ok) return;

    expect(escalated.request.projectChangeExceptionId).toBeTruthy();
    expect(escalated.request.escalatedAt).toBeTruthy();
    expect(
      escalated.envelope.events.some(
        (event) =>
          event.kind === "project_change_escalated" &&
          event.requestId === submitted.request.id &&
          event.payload?.exceptionId === escalated.exceptionId,
      ),
    ).toBe(true);
    expect(
      escalated.envelope.events.filter((event) => event.kind === "project_change_escalated"),
    ).toHaveLength(1);

    const repeat = await escalateProjectChangeRequest({
      campaignId,
      requestId: submitted.request.id,
      user: ownerUser,
      assignments: ownerAssignments,
      campaign: record,
    });
    expect(repeat.ok).toBe(true);
    if (!repeat.ok) return;
    expect(repeat.alreadyEscalated).toBe(true);
    expect(
      repeat.envelope.events.filter((event) => event.kind === "project_change_escalated"),
    ).toHaveLength(1);
  });
});
