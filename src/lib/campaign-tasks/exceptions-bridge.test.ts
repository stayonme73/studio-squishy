import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";

import { applyQaBlock, applyQaFail } from "./actions";
import { bridgeExceptionsAfterQaBlock } from "./exceptions-bridge";
import { buildQaRecord, qaActorRole } from "./qa";
import { buildKitchenCopyStageFixture } from "./kitchen-test-fixtures";
import type { CampaignTaskItem, QaRecord, ServerTasksEnvelope } from "./types";

const now = "2026-06-29T12:00:00.000Z";

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

const qaStaff: StudioUser = {
  id: "staff-qa",
  email: "qa@local.dev",
  displayName: "QA",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "staff-qa": ["campaign-1"] },
  staffCapabilities: { "staff-qa": ["qa"] },
};

const campaign: CampaignRecord = {
  campaignId: "campaign-1",
  campaignName: "Test",
  campaignStatus: "BUILDING_CONCEPTS",
  campaignDescription: "Test",
  estimatedCompletion: "Soon",
  packageId: "custom-studio-plan",
  packageLabel: "Custom Studio Plan",
  approvedStudioPlan: {
    selectedServiceIds: ["sm-001"],
    includedServiceIds: ["sm-001"],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: 50000,
    monthlyTotalCents: 0,
    amountDueTodayCents: 50000,
    lineItems: [
      {
        skuId: "sm-001",
        serviceName: "Social",
        billingType: "one_time",
        exactPriceCents: 50000,
        priceDisplay: "$500",
        deliverables: [],
        exclusions: [],
        timingWindowLabel: "2 weeks",
        revisionRule: "1 round",
        clientResponsibilities: [],
        executionResponsibility: "studio",
      },
    ],
    approvedAt: now,
  },
  projectDetailsSubmittedAt: now,
  paymentReceivedAt: now,
  selectedCampaignOption: "Option A",
  createdAt: now,
  updatedAt: now,
};

function copyTask(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
  return {
    id: "sm-001:copy",
    title: "Copy",
    phase: "copy",
    status: "ready_for_qa",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: [],
    workflowState: "ready_for_qa",
    responsibleRole: "copy",
    ...overrides,
  };
}

function envelope(tasks: CampaignTaskItem[], qaRecords: QaRecord[] = []): ServerTasksEnvelope {
  return {
    campaignId: "campaign-1",
    tasks,
    planFingerprint: "fp",
    updatedAt: now,
    version: 5,
    syncedAt: now,
    qaRecords,
    exceptionRecords: [],
    exceptionEvents: [],
  };
}

const kitchenCopyFixture = buildKitchenCopyStageFixture(campaign, qaStaff, now);

const actionContext = {
  campaign,
  materials: [],
  assignments,
  production: kitchenCopyFixture.production,
};

describe("exceptions-bridge", () => {
  it("qa_block auto-links compliance exception", () => {
    const result = applyQaBlock(
      envelope([copyTask()]),
      {
        action: "qa_block",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        category: "compliance_concern",
        notes: "Claims need review",
      },
      qaStaff,
      actionContext,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.exceptionRecords?.length).toBe(1);
    expect(result.envelope.exceptionRecords?.[0].kind).toBe("compliance_hold");
    expect(result.envelope.exceptionRecords?.[0].qaRecordId).toBeDefined();
  });

  it("qa_fail missing_client_fact auto-links exception", () => {
    const result = applyQaFail(
      envelope([copyTask()]),
      {
        action: "qa_fail",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        category: "missing_client_fact",
        missingFactDescription: "Brand hex codes",
        missingFactReason: "Cannot finalize palette",
        workVersionId: kitchenCopyFixture.copyWorkVersionId,
      },
      qaStaff,
      actionContext,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.exceptionRecords?.length).toBe(1);
    expect(result.envelope.exceptionRecords?.[0].kind).toBe("missing_client_fact");
    expect(result.envelope.exceptionRecords?.[0].taskId).toBe("sm-001:copy");
  });

  it("does not double-bridge the same qa record", () => {
    const qaRecord = buildQaRecord({
      campaignId: "campaign-1",
      taskId: "sm-001:copy",
      user: qaStaff,
      actorRole: qaActorRole(qaStaff, assignments),
      action: "qa_block",
      category: "compliance_concern",
    });
    const base = envelope([copyTask()], [qaRecord]);
    const once = bridgeExceptionsAfterQaBlock(
      base,
      qaRecord,
      "compliance_concern",
      qaStaff,
      assignments,
    );
    const twice = bridgeExceptionsAfterQaBlock(
      once,
      qaRecord,
      "compliance_concern",
      qaStaff,
      assignments,
    );
    expect(once.exceptionRecords?.length).toBe(1);
    expect(twice.exceptionRecords?.length).toBe(1);
  });

  it("revision exhausted bridges on second production_correction fail", () => {
    const priorFail = buildQaRecord({
      campaignId: "campaign-1",
      taskId: "sm-001:copy",
      user: qaStaff,
      actorRole: qaActorRole(qaStaff, assignments),
      action: "qa_fail",
      category: "production_correction",
      routedTaskId: "sm-001:copy",
    });

    const result = applyQaFail(
      envelope([copyTask()], [priorFail]),
      {
        action: "qa_fail",
        taskId: "sm-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
        workVersionId: kitchenCopyFixture.copyWorkVersionId,
      },
      qaStaff,
      actionContext,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const revisionException = result.envelope.exceptionRecords?.find(
      (entry) => entry.kind === "revision_exhausted",
    );
    expect(revisionException).toBeDefined();
    expect(result.task?.workflowState).toBe("needs_revision");
  });
});
