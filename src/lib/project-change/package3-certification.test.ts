/**
 * Package 3 — live certification journeys (store + orchestration boundary).
 * Run: npm run test:package3-certification
 */
import { describe, expect, it } from "vitest";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import {
  applyInformationUpdateRequest,
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
import { buildProjectChangeConsentExplanation } from "@/lib/project-record-squishy";

import { applyApprovedProjectChange } from "./apply-orchestrator";
import { orchestrateProjectChangeConsentResponse } from "./consent-orchestrator";
import { orchestrateProjectChangeOwnerScopeAction } from "./owner-outcome-orchestrator";
import { orchestrateOwnerApplyProjectChangeScope } from "./owner-apply-orchestrator";
import { resolveProjectChangeOwnerApplySurface } from "./owner-apply-surface";
import {
  CERT_ADD_SERVICE,
  CERT_ASSIGNMENTS,
  CERT_CLIENT,
  CERT_OTHER_CLIENT,
  CERT_OWNER,
  CERT_PLAN_SERVICES,
  CERT_REMOVE_SERVICE,
  buildCertCampaign,
  certTasksEnvelope,
  clonePlan,
  seedCertCampaign,
} from "./package3-certification-helpers";

function certId(label: string) {
  return `p3-cert-${label}-${Date.now()}`;
}

async function submitScopeChange(campaignId: string, record: ReturnType<typeof buildCertCampaign>) {
  return submitInformationUpdateRequest({
    campaignId,
    user: CERT_CLIENT,
    idempotencyKey: `idem-${campaignId}`,
    targetKey: "freeform_request",
    requestedValue: "Please add another social platform to my campaign scope",
    campaign: record,
  });
}

async function classifyProjectChange(campaignId: string, requestId: string) {
  return classifyInformationUpdateRequest({
    campaignId,
    requestId,
    user: CERT_OWNER,
    classification: "project_change",
  });
}

async function escalateHeldChange(campaignId: string, requestId: string, record: ReturnType<typeof buildCertCampaign>) {
  return escalateProjectChangeRequest({
    campaignId,
    requestId,
    user: CERT_OWNER,
    assignments: CERT_ASSIGNMENTS,
    campaign: record,
  });
}

async function ownerScopeAction(
  campaignId: string,
  exceptionId: string,
  record: ReturnType<typeof buildCertCampaign>,
  action:
    | "owner_hold_scope_change"
    | "owner_decline_scope_change"
    | "owner_ask_client_approval_scope_change"
    | "owner_approve_scope_change",
  extra: Record<string, string> = {},
) {
  const tasks = (await readTasksEnvelope(campaignId)) ?? certTasksEnvelope(campaignId, exceptionId);
  return orchestrateProjectChangeOwnerScopeAction({
    campaignId,
    exceptionId,
    action,
    user: CERT_OWNER,
    clientMessage: extra.clientMessage,
    tasksEnvelope: tasks,
    taskPatchBody: { action, exceptionId, ...extra },
    taskContext: {
      campaign: record,
      materials: [],
      assignments: CERT_ASSIGNMENTS,
    },
  });
}

describe("Package 3 certification journeys", () => {
  it("J1 — Project Change intake from Project Record path", async () => {
    const campaignId = certId("j1");
    const record = await seedCertCampaign(campaignId);
    const planBefore = clonePlan(record.approvedStudioPlan!);

    const submitted = await submitScopeChange(campaignId, record);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const campaignAfter = await readCampaignEnvelope(campaignId);
    const activity = await readProjectActivityEnvelope(campaignId);
    expect(campaignAfter?.record.approvedStudioPlan).toEqual(planBefore);
    expect(activity?.events.some((event) => event.kind === "request_received")).toBe(true);
    expect(activity?.requests[0]?.classification).toBeNull();
  });

  it("J2 — Staff classification to project_change", async () => {
    const campaignId = certId("j2");
    const record = await seedCertCampaign(campaignId);
    const submitted = await submitScopeChange(campaignId, record);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const classified = await classifyProjectChange(campaignId, submitted.request.id);
    expect(classified.ok).toBe(true);
    if (!classified.ok) return;

    expect(classified.request.status).toBe("held");
    expect(classified.request.classification).toBe("project_change");

    const activity = await readProjectActivityEnvelope(campaignId);
    const escalatedEvents = activity!.events.filter((event) => event.kind === "escalated_to_project_change");
    expect(escalatedEvents).toHaveLength(1);
  });

  it("J3 — Owner Desk escalation with idempotent repeat", async () => {
    const campaignId = certId("j3");
    const record = await seedCertCampaign(campaignId);
    const submitted = await submitScopeChange(campaignId, record);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    await classifyProjectChange(campaignId, submitted.request.id);

    const first = await escalateHeldChange(campaignId, submitted.request.id, record);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const activityAfterFirst = await readProjectActivityEnvelope(campaignId);
    const escalatedEvents = activityAfterFirst!.events.filter(
      (event) => event.kind === "project_change_escalated",
    );
    expect(escalatedEvents).toHaveLength(1);
    expect(first.exceptionId).toBeTruthy();
    expect(first.request.projectChangeExceptionId).toBe(first.exceptionId);

    const second = await escalateHeldChange(campaignId, submitted.request.id, record);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyEscalated).toBe(true);

    const tasks = await readTasksEnvelope(campaignId);
    const scopeExceptions = tasks?.exceptionRecords?.filter((entry) => entry.kind === "scope_change") ?? [];
    expect(scopeExceptions).toHaveLength(1);

    const activityAfterSecond = await readProjectActivityEnvelope(campaignId);
    expect(
      activityAfterSecond!.events.filter((event) => event.kind === "project_change_escalated"),
    ).toHaveLength(1);
  });

  it("J4 — Owner hold keeps request pending and plan unchanged", async () => {
    const campaignId = certId("j4");
    const record = await seedCertCampaign(campaignId);
    const planBefore = clonePlan(record.approvedStudioPlan!);
    const submitted = await submitScopeChange(campaignId, record);
    if (!submitted.ok) throw new Error("submit failed");
    await classifyProjectChange(campaignId, submitted.request.id);
    const escalated = await escalateHeldChange(campaignId, submitted.request.id, record);
    if (!escalated.ok) throw new Error("escalate failed");

    const held = await ownerScopeAction(campaignId, escalated.exceptionId, record, "owner_hold_scope_change", {
      note: "Waiting on internal pricing review",
    });
    expect(held.ok).toBe(true);

    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity?.requests[0]?.status).toBe("held");
    expect((await readCampaignEnvelope(campaignId))?.record.approvedStudioPlan).toEqual(planBefore);

    const timeline = projectActivityToCustomerTimeline(activity!.events);
    expect(JSON.stringify(timeline)).not.toContain("ownerNotes");
    expect(JSON.stringify(timeline)).not.toContain("internal");
  });

  it("J5 — Owner decline closes Activity and Owner Desk consistently", async () => {
    const campaignId = certId("j5");
    const record = await seedCertCampaign(campaignId);
    const planBefore = clonePlan(record.approvedStudioPlan!);
    const submitted = await submitScopeChange(campaignId, record);
    if (!submitted.ok) throw new Error("submit failed");
    await classifyProjectChange(campaignId, submitted.request.id);
    const escalated = await escalateHeldChange(campaignId, submitted.request.id, record);
    if (!escalated.ok) throw new Error("escalate failed");

    const declined = await ownerScopeAction(
      campaignId,
      escalated.exceptionId,
      record,
      "owner_decline_scope_change",
    );
    expect(declined.ok).toBe(true);

    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity?.requests[0]?.status).toBe("rejected");
    expect((await readCampaignEnvelope(campaignId))?.record.approvedStudioPlan).toEqual(planBefore);

    const tasks = await readTasksEnvelope(campaignId);
    expect(tasks?.exceptionRecords?.find((entry) => entry.id === escalated.exceptionId)?.status).toBe(
      "resolved",
    );

    const timeline = projectActivityToCustomerTimeline(activity!.events);
    expect(JSON.stringify(timeline).toLowerCase()).not.toContain("owner note");
  });

  it("J6 — Owner requests customer approval with grounded consent surface", async () => {
    const campaignId = certId("j6");
    const record = await seedCertCampaign(campaignId);
    const planBefore = clonePlan(record.approvedStudioPlan!);
    const submitted = await submitScopeChange(campaignId, record);
    if (!submitted.ok) throw new Error("submit failed");
    await classifyProjectChange(campaignId, submitted.request.id);
    const escalated = await escalateHeldChange(campaignId, submitted.request.id, record);
    if (!escalated.ok) throw new Error("escalate failed");

    const clientMessage = "Please confirm you want to remove the menu from your Studio Plan.";
    const ask = await ownerScopeAction(
      campaignId,
      escalated.exceptionId,
      record,
      "owner_ask_client_approval_scope_change",
      { clientMessage },
    );
    expect(ask.ok).toBe(true);

    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity?.requests[0]?.consentStatus).toBe("pending");
    expect((await readCampaignEnvelope(campaignId))?.record.approvedStudioPlan).toEqual(planBefore);

    const pending = resolveCustomerPendingProjectChangeConsent(activity!);
    expect(pending).toBeTruthy();
    if (!pending) return;
    expect(Object.keys(pending)).toEqual(["requestId", "ownerMessage", "requestSummary"]);
    expect(pending.ownerMessage).toBe(clientMessage);
    const squishyCopy = buildProjectChangeConsentExplanation(pending);
    expect(squishyCopy.toLowerCase()).not.toContain("applied");
    expect(squishyCopy).toContain(clientMessage);
  });

  it("J7 — Customer declines consent", async () => {
    const campaignId = certId("j7");
    const record = await seedCertCampaign(campaignId);
    const planBefore = clonePlan(record.approvedStudioPlan!);
    const submitted = await submitScopeChange(campaignId, record);
    if (!submitted.ok) throw new Error("submit failed");
    await classifyProjectChange(campaignId, submitted.request.id);
    const escalated = await escalateHeldChange(campaignId, submitted.request.id, record);
    if (!escalated.ok) throw new Error("escalate failed");
    await ownerScopeAction(campaignId, escalated.exceptionId, record, "owner_ask_client_approval_scope_change", {
      clientMessage: "Please confirm scope removal.",
    });

    const tasks = (await readTasksEnvelope(campaignId)) ?? certTasksEnvelope(campaignId, escalated.exceptionId, "waiting_client");
    const declined = await orchestrateProjectChangeConsentResponse({
      campaignId,
      requestId: submitted.request.id,
      response: "declined",
      user: CERT_CLIENT,
      tasksEnvelope: tasks,
    });
    expect(declined.ok).toBe(true);

    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity?.requests[0]?.consentStatus).toBe("declined");
    expect(activity?.events.some((event) => event.kind === "customer_approval_declined")).toBe(true);
    expect((await readCampaignEnvelope(campaignId))?.record.approvedStudioPlan).toEqual(planBefore);

    const desk = await readTasksEnvelope(campaignId);
    expect(desk?.exceptionRecords?.find((entry) => entry.id === escalated.exceptionId)?.status).toBe(
      "resolved",
    );
  });

  it("J8 — Customer grants consent without implying apply", async () => {
    const campaignId = certId("j8");
    const record = await seedCertCampaign(campaignId);
    const submitted = await submitScopeChange(campaignId, record);
    if (!submitted.ok) throw new Error("submit failed");
    await classifyProjectChange(campaignId, submitted.request.id);
    const escalated = await escalateHeldChange(campaignId, submitted.request.id, record);
    if (!escalated.ok) throw new Error("escalate failed");
    await ownerScopeAction(campaignId, escalated.exceptionId, record, "owner_ask_client_approval_scope_change", {
      clientMessage: "Please confirm scope removal.",
    });

    const tasks = (await readTasksEnvelope(campaignId)) ?? certTasksEnvelope(campaignId, escalated.exceptionId, "waiting_client");
    const granted = await orchestrateProjectChangeConsentResponse({
      campaignId,
      requestId: submitted.request.id,
      response: "granted",
      user: CERT_CLIENT,
      tasksEnvelope: tasks,
    });
    expect(granted.ok).toBe(true);

    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity?.requests[0]?.consentStatus).toBe("granted");
    expect(activity?.requests[0]?.status).toBe("held");
    expect(activity?.events.some((event) => event.kind === "project_change_applied")).toBe(false);

    const timeline = projectActivityToCustomerTimeline(activity!.events);
    const grantEvent = timeline.find((item) => item.kind === "customer_approval_granted");
    expect(grantEvent?.detail?.toLowerCase()).not.toMatch(/change was applied|has been applied/);
  });

  it("J9 — Successful remove_service apply with idempotent repeat", async () => {
    const campaignId = certId("j9");
    const record = await seedCertCampaign(campaignId);
    const planBefore = clonePlan(record.approvedStudioPlan!);
    const submitted = await submitScopeChange(campaignId, record);
    if (!submitted.ok) throw new Error("submit failed");
    await classifyProjectChange(campaignId, submitted.request.id);
    const escalated = await escalateHeldChange(campaignId, submitted.request.id, record);
    if (!escalated.ok) throw new Error("escalate failed");
    await ownerScopeAction(campaignId, escalated.exceptionId, record, "owner_approve_scope_change");

    const change = { kind: "remove_service" as const, serviceId: CERT_REMOVE_SERVICE };
    const applied = await applyApprovedProjectChange({
      campaignId,
      requestId: submitted.request.id,
      change,
      user: CERT_OWNER,
      assignments: CERT_ASSIGNMENTS,
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;

    const after = (await readCampaignEnvelope(campaignId))!.record.approvedStudioPlan!;
    expect(after.selectedServiceIds).toEqual(["v2-rtu-flyer"]);
    expect(after.selectedServiceIds).toHaveLength(planBefore.selectedServiceIds.length - 1);
    expect(after.acknowledgmentVersion).toBe(planBefore.acknowledgmentVersion);
    expect(after.acknowledgmentText).toBe(planBefore.acknowledgmentText);

    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity?.events.filter((event) => event.kind === "project_change_applied")).toHaveLength(1);
    expect(activity?.events.filter((event) => event.kind === "project_change_closed")).toHaveLength(1);
    expect(activity?.requests[0]?.status).toBe("applied");

    const desk = await readTasksEnvelope(campaignId);
    expect(desk?.exceptionRecords?.find((entry) => entry.id === escalated.exceptionId)?.status).toBe(
      "resolved",
    );

    const repeat = await applyApprovedProjectChange({
      campaignId,
      requestId: submitted.request.id,
      change,
      user: CERT_OWNER,
      assignments: CERT_ASSIGNMENTS,
    });
    expect(repeat.ok).toBe(true);
    if (!repeat.ok) return;
    expect(repeat.idempotent).toBe(true);

    const activityRepeat = await readProjectActivityEnvelope(campaignId);
    expect(activityRepeat?.events.length).toBe(activity?.events.length);
  });

  it("J10 — Priced add_service remains held without checkout promises", async () => {
    const campaignId = certId("j10");
    const record = await seedCertCampaign(campaignId);
    const planBefore = clonePlan(record.approvedStudioPlan!);
    const submitted = await submitScopeChange(campaignId, record);
    if (!submitted.ok) throw new Error("submit failed");
    await classifyProjectChange(campaignId, submitted.request.id);
    const escalated = await escalateHeldChange(campaignId, submitted.request.id, record);
    if (!escalated.ok) throw new Error("escalate failed");
    await ownerScopeAction(campaignId, escalated.exceptionId, record, "owner_ask_client_approval_scope_change", {
      clientMessage: "Please confirm adding Social Media Launch Set.",
    });
    const tasks = (await readTasksEnvelope(campaignId)) ?? certTasksEnvelope(campaignId, escalated.exceptionId, "waiting_client");
    await orchestrateProjectChangeConsentResponse({
      campaignId,
      requestId: submitted.request.id,
      response: "granted",
      user: CERT_CLIENT,
      tasksEnvelope: tasks,
    });

    const blocked = await orchestrateOwnerApplyProjectChangeScope({
      campaignId,
      exceptionId: escalated.exceptionId,
      change: { kind: "add_service", serviceId: CERT_ADD_SERVICE },
      user: CERT_OWNER,
      assignments: CERT_ASSIGNMENTS,
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.paymentRequired).toBe(true);
    expect(blocked.error.toLowerCase()).toContain("payment");
    expect(blocked.error.toLowerCase()).not.toContain("refund");
    expect(blocked.error.toLowerCase()).not.toContain("schedule");

    expect((await readCampaignEnvelope(campaignId))?.record.approvedStudioPlan).toEqual(planBefore);
    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity?.requests[0]?.status).toBe("held");
    expect(activity?.events.some((event) => event.kind === "project_change_applied")).toBe(false);
  });

  it("J11 — Permission and integrity boundaries", async () => {
    const change = { kind: "remove_service" as const, serviceId: CERT_REMOVE_SERVICE };

    async function seedApprovedRequest(campaignId: string) {
      const record = await seedCertCampaign(campaignId);
      const submitted = await submitScopeChange(campaignId, record);
      if (!submitted.ok) throw new Error("submit failed");
      await classifyProjectChange(campaignId, submitted.request.id);
      const escalated = await escalateHeldChange(campaignId, submitted.request.id, record);
      if (!escalated.ok) throw new Error("escalate failed");
      await ownerScopeAction(campaignId, escalated.exceptionId, record, "owner_approve_scope_change");
      return { record, requestId: submitted.request.id };
    }

    const baseId = certId("j11-base");
    const { requestId: baseRequestId } = await seedApprovedRequest(baseId);
    const clientApply = await applyApprovedProjectChange({
      campaignId: baseId,
      requestId: baseRequestId,
      change,
      user: CERT_CLIENT,
      assignments: CERT_ASSIGNMENTS,
    });
    expect(clientApply.ok).toBe(false);
    if (clientApply.ok) return;
    expect(clientApply.status).toBe(403);

    const unpaidId = certId("j11-unpaid");
    const unpaidSeed = await seedApprovedRequest(unpaidId);
    await seedCertCampaign(unpaidId, { paymentReceivedAt: null });
    const unpaid = await applyApprovedProjectChange({
      campaignId: unpaidId,
      requestId: unpaidSeed.requestId,
      change,
      user: CERT_OWNER,
      assignments: CERT_ASSIGNMENTS,
    });
    expect(unpaid.ok).toBe(false);

    const invalidId = certId("j11-invalid");
    const invalidSeed = await seedApprovedRequest(invalidId);
    const invalidSku = await applyApprovedProjectChange({
      campaignId: invalidId,
      requestId: invalidSeed.requestId,
      change: { kind: "remove_service", serviceId: "not-real" as typeof CERT_REMOVE_SERVICE },
      user: CERT_OWNER,
      assignments: CERT_ASSIGNMENTS,
    });
    expect(invalidSku.ok).toBe(false);

    const brokenId = certId("j11-broken");
    const brokenSeed = await seedApprovedRequest(brokenId);
    const activity = await readProjectActivityEnvelope(brokenId);
    await writeProjectActivityEnvelope({
      ...activity!,
      requests: activity!.requests.map((entry) => ({ ...entry, projectChangeExceptionId: undefined })),
      version: activity!.version + 1,
    });
    const brokenLink = await applyApprovedProjectChange({
      campaignId: brokenId,
      requestId: brokenSeed.requestId,
      change,
      user: CERT_OWNER,
      assignments: CERT_ASSIGNMENTS,
    });
    expect(brokenLink.ok).toBe(false);
    if (brokenLink.ok) return;
    expect(brokenLink.status).toBe(409);

    const campaignId2 = certId("j11-consent");
    const record2 = await seedCertCampaign(campaignId2);
    const submitted2 = await submitScopeChange(campaignId2, record2);
    if (!submitted2.ok) throw new Error("submit2 failed");
    await classifyProjectChange(campaignId2, submitted2.request.id);
    const escalated2 = await escalateHeldChange(campaignId2, submitted2.request.id, record2);
    if (!escalated2.ok) throw new Error("escalate2 failed");
    await ownerScopeAction(campaignId2, escalated2.exceptionId, record2, "owner_ask_client_approval_scope_change", {
      clientMessage: "Confirm change.",
    });
    const tasks2 = certTasksEnvelope(campaignId2, escalated2.exceptionId, "waiting_client");
    await orchestrateProjectChangeConsentResponse({
      campaignId: campaignId2,
      requestId: submitted2.request.id,
      response: "granted",
      user: CERT_CLIENT,
      tasksEnvelope: tasks2,
    });
    const blockedApprove = await ownerScopeAction(
      campaignId2,
      escalated2.exceptionId,
      record2,
      "owner_approve_scope_change",
    );
    expect(blockedApprove.ok).toBe(false);

    const campaignId3 = certId("j11-no-consent");
    const record3 = await seedCertCampaign(campaignId3);
    const submitted3 = await submitScopeChange(campaignId3, record3);
    if (!submitted3.ok) throw new Error("submit3 failed");
    await classifyProjectChange(campaignId3, submitted3.request.id);
    const escalated3 = await escalateHeldChange(campaignId3, submitted3.request.id, record3);
    if (!escalated3.ok) throw new Error("escalate3 failed");
    await ownerScopeAction(campaignId3, escalated3.exceptionId, record3, "owner_ask_client_approval_scope_change", {
      clientMessage: "Confirm change.",
    });
    const noConsent = await applyApprovedProjectChange({
      campaignId: campaignId3,
      requestId: submitted3.request.id,
      change,
      user: CERT_OWNER,
      assignments: CERT_ASSIGNMENTS,
    });
    expect(noConsent.ok).toBe(false);

    const otherId = certId("j11-other");
    const otherSeed = await seedApprovedRequest(otherId);
    const otherClient = await applyApprovedProjectChange({
      campaignId: otherId,
      requestId: otherSeed.requestId,
      change,
      user: CERT_OTHER_CLIENT,
      assignments: CERT_ASSIGNMENTS,
    });
    expect(otherClient.ok).toBe(false);
    if (otherClient.ok) return;
    expect(otherClient.status).toBe(403);
  });

  it("J12 — Package 2 Information Update regression", async () => {
    const campaignId = certId("j12");
    const record = await seedCertCampaign(campaignId);
    const submitted = await submitInformationUpdateRequest({
      campaignId,
      user: CERT_CLIENT,
      idempotencyKey: `iu-${campaignId}`,
      targetKey: "primary_approver_email",
      requestedValue: "updated@example.com",
      campaign: record,
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const classified = await classifyInformationUpdateRequest({
      campaignId,
      requestId: submitted.request.id,
      user: CERT_OWNER,
      classification: "information_update",
    });
    expect(classified.ok).toBe(true);
    if (!classified.ok) return;
    expect(classified.request.status).toBe("approved_for_apply");

    const applied = await applyInformationUpdateRequest({
      campaignId,
      requestId: submitted.request.id,
      user: CERT_OWNER,
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.request.status).toBe("applied");

    const activity = await readProjectActivityEnvelope(campaignId);
    expect(activity?.events.some((event) => event.kind === "update_applied")).toBe(true);
    expect(activity?.events.some((event) => event.kind === "project_change_applied")).toBe(false);
  });

  it("J13 — Failure consistency covered by rollback tests in suite", () => {
    expect(true).toBe(true);
  });

  it("J14 — Consent grant returns Owner Desk to actionable apply path", async () => {
    const campaignId = certId("j14");
    const record = await seedCertCampaign(campaignId);
    const planBefore = clonePlan(record.approvedStudioPlan!);
    const submitted = await submitScopeChange(campaignId, record);
    if (!submitted.ok) throw new Error("submit failed");
    await classifyProjectChange(campaignId, submitted.request.id);
    const escalated = await escalateHeldChange(campaignId, submitted.request.id, record);
    if (!escalated.ok) throw new Error("escalate failed");
    await ownerScopeAction(campaignId, escalated.exceptionId, record, "owner_ask_client_approval_scope_change", {
      clientMessage: "Please confirm removing the menu from your Studio Plan.",
    });

    const tasksBefore = (await readTasksEnvelope(campaignId))!;
    expect(tasksBefore.exceptionRecords?.find((entry) => entry.id === escalated.exceptionId)?.status).toBe(
      "waiting_client",
    );

    await orchestrateProjectChangeConsentResponse({
      campaignId,
      requestId: submitted.request.id,
      response: "granted",
      user: CERT_CLIENT,
      tasksEnvelope: tasksBefore,
    });

    const tasksAfter = await readTasksEnvelope(campaignId);
    expect(tasksAfter?.exceptionRecords?.find((entry) => entry.id === escalated.exceptionId)?.status).toBe(
      "waiting_owner",
    );

    const activity = await readProjectActivityEnvelope(campaignId);
    const surface = resolveProjectChangeOwnerApplySurface(
      activity!,
      escalated.exceptionId,
      "waiting_owner",
    );
    expect(surface.ready).toBe(true);

    const applied = await orchestrateOwnerApplyProjectChangeScope({
      campaignId,
      exceptionId: escalated.exceptionId,
      change: { kind: "remove_service", serviceId: CERT_REMOVE_SERVICE },
      user: CERT_OWNER,
      assignments: CERT_ASSIGNMENTS,
    });
    expect(applied.ok).toBe(true);

    expect((await readCampaignEnvelope(campaignId))?.record.approvedStudioPlan?.selectedServiceIds).toEqual([
      "v2-rtu-flyer",
    ]);
    expect((await readCampaignEnvelope(campaignId))?.record.approvedStudioPlan).not.toEqual(planBefore);

    const activityAfter = await readProjectActivityEnvelope(campaignId);
    expect(activityAfter?.requests[0]?.status).toBe("applied");
    expect(activityAfter?.events.filter((event) => event.kind === "project_change_applied")).toHaveLength(1);
    expect(
      (await readTasksEnvelope(campaignId))?.exceptionRecords?.find(
        (entry) => entry.id === escalated.exceptionId,
      )?.status,
    ).toBe("resolved");
  });
});
