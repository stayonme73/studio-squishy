import { describe, expect, it } from "vitest";

import type { ServiceId } from "@/catalog/types";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import {
  classifyInformationUpdateRequest,
  escalateProjectChangeRequest,
  submitInformationUpdateRequest,
} from "@/lib/project-activity/actions";
import { readProjectActivityEnvelope } from "@/lib/project-activity/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { resolveProjectChangeOwnerApplySurface } from "@/lib/project-change/owner-apply-surface";

import { orchestrateProjectChangeConsentResponse } from "./consent-orchestrator";
import { orchestrateProjectChangeOwnerScopeAction } from "./owner-outcome-orchestrator";
import { orchestrateOwnerApplyProjectChangeScope } from "./owner-apply-orchestrator";
import {
  CERT_ASSIGNMENTS,
  CERT_CLIENT,
  CERT_OWNER,
  CERT_PLAN_SERVICES,
  CERT_REMOVE_SERVICE,
  buildCertCampaign,
  certTasksEnvelope,
  clonePlan,
  seedCertCampaign,
} from "./package3-certification-helpers";

async function seedConsentedProjectChange(campaignId: string) {
  const record = await seedCertCampaign(campaignId);
  const submitted = await submitInformationUpdateRequest({
    campaignId,
    user: CERT_CLIENT,
    idempotencyKey: `idem-${campaignId}`,
    targetKey: "freeform_request",
    requestedValue: "Please remove the menu from my campaign scope",
    campaign: record,
  });
  if (!submitted.ok) throw new Error("submit failed");

  await classifyInformationUpdateRequest({
    campaignId,
    requestId: submitted.request.id,
    user: CERT_OWNER,
    classification: "project_change",
  });

  const escalated = await escalateProjectChangeRequest({
    campaignId,
    requestId: submitted.request.id,
    user: CERT_OWNER,
    assignments: CERT_ASSIGNMENTS,
    campaign: record,
  });
  if (!escalated.ok) throw new Error("escalate failed");

  const clientMessage = "Please confirm removing the menu from your Studio Plan.";
  await orchestrateProjectChangeOwnerScopeAction({
    campaignId,
    exceptionId: escalated.exceptionId,
    action: "owner_ask_client_approval_scope_change",
    user: CERT_OWNER,
    clientMessage,
    tasksEnvelope:
      (await readTasksEnvelope(campaignId)) ??
      certTasksEnvelope(campaignId, escalated.exceptionId),
    taskPatchBody: {
      action: "owner_ask_client_approval_scope_change",
      exceptionId: escalated.exceptionId,
      clientMessage,
    },
    taskContext: {
      campaign: record,
      materials: [],
      assignments: CERT_ASSIGNMENTS,
    },
  });

  const tasksBeforeConsent =
    (await readTasksEnvelope(campaignId)) ??
    certTasksEnvelope(campaignId, escalated.exceptionId, "waiting_client");
  expect(tasksBeforeConsent.exceptionRecords?.[0]?.status).toBe("waiting_client");

  const granted = await orchestrateProjectChangeConsentResponse({
    campaignId,
    requestId: submitted.request.id,
    response: "granted",
    user: CERT_CLIENT,
    tasksEnvelope: tasksBeforeConsent,
  });
  if (!granted.ok) throw new Error("consent grant failed");

  return {
    record,
    requestId: submitted.request.id,
    exceptionId: escalated.exceptionId,
  };
}

describe("orchestrateOwnerApplyProjectChangeScope", () => {
  it("completes consent → Owner Desk actionable → owner apply remove_service", async () => {
    const campaignId = `p3-owner-apply-${Date.now()}`;
    const planBefore = buildCertCampaign(campaignId).approvedStudioPlan!;
    await seedCertCampaign(campaignId);
    const seeded = await seedConsentedProjectChange(campaignId);

    const tasksAfterConsent = await readTasksEnvelope(campaignId);
    expect(tasksAfterConsent?.exceptionRecords?.find((entry) => entry.id === seeded.exceptionId)?.status).toBe(
      "waiting_owner",
    );

    const activity = await readProjectActivityEnvelope(campaignId);
    const surface = resolveProjectChangeOwnerApplySurface(
      activity!,
      seeded.exceptionId,
      "waiting_owner",
    );
    expect(surface.ready).toBe(true);
    expect(surface.requestId).toBe(seeded.requestId);

    const blockedApprove = await orchestrateProjectChangeOwnerScopeAction({
      campaignId,
      exceptionId: seeded.exceptionId,
      action: "owner_approve_scope_change",
      user: CERT_OWNER,
      tasksEnvelope: tasksAfterConsent!,
      taskPatchBody: { action: "owner_approve_scope_change", exceptionId: seeded.exceptionId },
      taskContext: {
        campaign: (await readCampaignEnvelope(campaignId))!.record,
        materials: [],
        assignments: CERT_ASSIGNMENTS,
      },
    });
    expect(blockedApprove.ok).toBe(false);
    if (blockedApprove.ok) return;
    expect(blockedApprove.status).toBe(409);

    const applied = await orchestrateOwnerApplyProjectChangeScope({
      campaignId,
      exceptionId: seeded.exceptionId,
      change: { kind: "remove_service", serviceId: CERT_REMOVE_SERVICE },
      user: CERT_OWNER,
      assignments: CERT_ASSIGNMENTS,
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;

    const afterPlan = (await readCampaignEnvelope(campaignId))!.record.approvedStudioPlan!;
    expect(afterPlan.selectedServiceIds).toEqual(["v2-rtu-flyer"]);
    expect(afterPlan.selectedServiceIds).toHaveLength(planBefore.selectedServiceIds.length - 1);
    expect(afterPlan.acknowledgmentVersion).toBe(planBefore.acknowledgmentVersion);

    const activityAfter = await readProjectActivityEnvelope(campaignId);
    expect(activityAfter?.requests[0]?.status).toBe("applied");
    expect(activityAfter?.requests[0]?.ownerDecision).toBe("approved");
    expect(activityAfter?.events.filter((event) => event.kind === "project_change_applied")).toHaveLength(1);
    expect(activityAfter?.events.filter((event) => event.kind === "project_change_closed")).toHaveLength(1);

    const deskAfter = await readTasksEnvelope(campaignId);
    expect(
      deskAfter?.exceptionRecords?.find((entry) => entry.id === seeded.exceptionId)?.status,
    ).toBe("resolved");
  });

  it("keeps customer decline resolving waiting_client without plan mutation", async () => {
    const campaignId = `p3-owner-decline-${Date.now()}`;
    const record = await seedCertCampaign(campaignId);
    const planBefore = clonePlan(record.approvedStudioPlan!);
    const submitted = await submitInformationUpdateRequest({
      campaignId,
      user: CERT_CLIENT,
      idempotencyKey: `idem-${campaignId}`,
      targetKey: "freeform_request",
      requestedValue: "Please remove the menu",
      campaign: record,
    });
    if (!submitted.ok) throw new Error("submit failed");
    await classifyInformationUpdateRequest({
      campaignId,
      requestId: submitted.request.id,
      user: CERT_OWNER,
      classification: "project_change",
    });
    const escalated = await escalateProjectChangeRequest({
      campaignId,
      requestId: submitted.request.id,
      user: CERT_OWNER,
      assignments: CERT_ASSIGNMENTS,
      campaign: record,
    });
    if (!escalated.ok) throw new Error("escalate failed");
    await orchestrateProjectChangeOwnerScopeAction({
      campaignId,
      exceptionId: escalated.exceptionId,
      action: "owner_ask_client_approval_scope_change",
      user: CERT_OWNER,
      clientMessage: "Please confirm scope removal.",
      tasksEnvelope:
        (await readTasksEnvelope(campaignId)) ??
        certTasksEnvelope(campaignId, escalated.exceptionId),
      taskPatchBody: {
        action: "owner_ask_client_approval_scope_change",
        exceptionId: escalated.exceptionId,
        clientMessage: "Please confirm scope removal.",
      },
      taskContext: { campaign: record, materials: [], assignments: CERT_ASSIGNMENTS },
    });

    const tasks = (await readTasksEnvelope(campaignId))!;
    const declined = await orchestrateProjectChangeConsentResponse({
      campaignId,
      requestId: submitted.request.id,
      response: "declined",
      user: CERT_CLIENT,
      tasksEnvelope: tasks,
    });
    expect(declined.ok).toBe(true);

    expect((await readCampaignEnvelope(campaignId))?.record.approvedStudioPlan).toEqual(planBefore);
    expect(
      (await readTasksEnvelope(campaignId))?.exceptionRecords?.find(
        (entry) => entry.id === escalated.exceptionId,
      )?.status,
    ).toBe("resolved");

    const applyAfterDecline = await orchestrateOwnerApplyProjectChangeScope({
      campaignId,
      exceptionId: escalated.exceptionId,
      change: { kind: "remove_service", serviceId: CERT_REMOVE_SERVICE as ServiceId },
      user: CERT_OWNER,
      assignments: CERT_ASSIGNMENTS,
    });
    expect(applyAfterDecline.ok).toBe(false);
  });
});
