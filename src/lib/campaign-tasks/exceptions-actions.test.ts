import { describe, expect, it } from "vitest";

import type { ServiceId } from "@/catalog/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import {
  applyApproveClientRequest,
  applyDeclinePromotion,
  applyRaiseException,
  applyResolveException,
} from "./exceptions-actions";
import type { CampaignTaskItem, ServerTasksEnvelope } from "./types";
import type { ServerMaterialsEnvelope } from "@/lib/materials/types";

const now = "2026-06-29T12:00:00.000Z";

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

const producer: StudioUser = {
  id: "staff-producer",
  email: "producer@local.dev",
  displayName: "Producer",
  roles: ["staff"],
};

const qaStaff: StudioUser = {
  id: "staff-qa",
  email: "qa@local.dev",
  displayName: "QA",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: {
    "staff-producer": ["campaign-1"],
    "staff-qa": ["campaign-1"],
  },
  staffCapabilities: {
    "staff-producer": ["producer_dispatcher"],
    "staff-qa": ["qa"],
  },
};

function blockedCopyTask(): CampaignTaskItem {
  return {
    id: "sm-001:copy",
    title: "Copy",
    phase: "copy",
    status: "blocked",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: [],
    workflowState: "blocked",
    workflowBlockedReason: "compliance_hold",
  };
}

function envelope(tasks: CampaignTaskItem[] = []): ServerTasksEnvelope {
  return {
    campaignId: "campaign-1",
    tasks,
    planFingerprint: "fp",
    updatedAt: now,
    version: 6,
    syncedAt: now,
    exceptionRecords: [],
    exceptionEvents: [],
    qaRecords: [],
  };
}

function materialsEnvelope(): ServerMaterialsEnvelope {
  return {
    campaignId: "campaign-1",
    items: [
      {
        id: "logo-brand-sm-001-slot",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Logo & brand assets",
        reason: "Social",
        relatedServiceIds: ["sm-001"],
        uploadStatus: "none",
      },
    ],
    updatedAt: now,
    version: 1,
    syncedAt: now,
  };
}

const approveBody = {
  exceptionId: "",
  category: "logo-brand" as const,
  clientFacingLabel: "Logo file",
  clientFacingPrompt: "Please send your logo file",
  whyNeeded: "Needed for Social",
  requirementLevel: "required" as const,
  relatedServiceIds: ["sm-001"] as const satisfies readonly ServiceId[],
};

describe("exceptions-actions", () => {
  it("raise_exception appends record and event", () => {
    const result = applyRaiseException(
      envelope(),
      { kind: "routine_internal", title: "Blocked asset" },
      producer,
      assignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.exceptionRecords).toHaveLength(1);
    expect(result.envelope.exceptionEvents).toHaveLength(1);
    expect(result.envelope.exceptionEvents?.[0].action).toBe("raised");
    expect(result.exception.kind).toBe("routine_internal");
  });

  it("producer can resolve routine_internal", () => {
    const raised = applyRaiseException(
      envelope(),
      { kind: "routine_internal", title: "Internal blocker" },
      producer,
      assignments,
    );
    if (!raised.ok) throw new Error("raise failed");
    const resolved = applyResolveException(
      raised.envelope,
      { exceptionId: raised.exception.id, resolutionNotes: "Handled" },
      producer,
      assignments,
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.exception.status).toBe("resolved");
    expect(resolved.envelope.exceptionEvents).toHaveLength(2);
  });

  it("producer can resolve a routine compliance_hold before it is escalated to Owner", () => {
    const raised = applyRaiseException(
      envelope([blockedCopyTask()]),
      {
        kind: "compliance_hold",
        title: "Compliance",
        taskId: "sm-001:copy",
      },
      owner,
      assignments,
    );
    if (!raised.ok) throw new Error("raise failed");
    expect(raised.exception.status).toBe("waiting_internal");
    const resolved = applyResolveException(
      raised.envelope,
      { exceptionId: raised.exception.id },
      producer,
      assignments,
    );
    expect(resolved.ok).toBe(true);
  });

  it("producer cannot resolve a compliance_hold once escalated to Owner", () => {
    const raised = applyRaiseException(
      envelope([blockedCopyTask()]),
      {
        kind: "compliance_hold",
        title: "Compliance",
        taskId: "sm-001:copy",
      },
      owner,
      assignments,
    );
    if (!raised.ok) throw new Error("raise failed");
    const escalated = {
      ...raised.envelope,
      exceptionRecords: raised.envelope.exceptionRecords.map((entry) =>
        entry.id === raised.exception.id
          ? { ...entry, status: "waiting_owner" as const }
          : entry,
      ),
    };
    const resolved = applyResolveException(
      escalated,
      { exceptionId: raised.exception.id },
      producer,
      assignments,
    );
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.status).toBe(403);
  });

  it("resolve clears QA compliance blocker without completing task", () => {
    const raised = applyRaiseException(
      envelope([blockedCopyTask()]),
      {
        kind: "compliance_hold",
        title: "Compliance",
        taskId: "sm-001:copy",
      },
      owner,
      assignments,
    );
    if (!raised.ok) throw new Error("raise failed");
    const resolved = applyResolveException(
      raised.envelope,
      { exceptionId: raised.exception.id },
      owner,
      assignments,
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const task = resolved.envelope.tasks.find((entry) => entry.id === "sm-001:copy");
    expect(task?.workflowState).toBe("ready_for_qa");
    expect(task?.workflowBlockedReason).toBeUndefined();
    expect(task?.workflowState).not.toBe("complete");
  });

  it("owner approves client_request and writes materials ledger", () => {
    const raised = applyRaiseException(
      envelope(),
      {
        kind: "client_request",
        title: "Need logo",
        clientRequestDraft: { exactClientOnlyItem: "Vector logo" },
      },
      owner,
      assignments,
    );
    if (!raised.ok) throw new Error("raise failed");
    const approved = applyApproveClientRequest(
      raised.envelope,
      { ...approveBody, exceptionId: raised.exception.id },
      owner,
      assignments,
      materialsEnvelope(),
    );
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.exception.status).toBe("waiting_client");
    expect(approved.exception.promotion?.materialItemIds.length).toBeGreaterThan(0);
    expect(approved.materialsEnvelope?.items.some((item) => item.reviewStatus === "requested")).toBe(
      true,
    );
    expect(approved.envelope.exceptionEvents?.some((event) => event.action === "approved_client_request")).toBe(
      true,
    );
  });

  it("producer cannot approve client_request", () => {
    const raised = applyRaiseException(
      envelope(),
      {
        kind: "client_request",
        title: "Need logo",
        clientRequestDraft: { exactClientOnlyItem: "Vector logo" },
      },
      owner,
      assignments,
    );
    if (!raised.ok) throw new Error("raise failed");
    const approved = applyApproveClientRequest(
      raised.envelope,
      { ...approveBody, exceptionId: raised.exception.id },
      producer,
      assignments,
      materialsEnvelope(),
    );
    expect(approved.ok).toBe(false);
    if (approved.ok) return;
    expect(approved.status).toBe(403);
  });

  it("compliance_hold approve returns 403", () => {
    const raised = applyRaiseException(
      envelope([blockedCopyTask()]),
      {
        kind: "compliance_hold",
        title: "Compliance",
        taskId: "sm-001:copy",
      },
      owner,
      assignments,
    );
    if (!raised.ok) throw new Error("raise failed");
    const approved = applyApproveClientRequest(
      raised.envelope,
      { ...approveBody, exceptionId: raised.exception.id },
      owner,
      assignments,
      materialsEnvelope(),
    );
    expect(approved.ok).toBe(false);
    if (approved.ok) return;
    expect(approved.status).toBe(403);
  });

  it("cannot resolve promoted exception before materials approved", () => {
    const raised = applyRaiseException(
      envelope(),
      {
        kind: "client_request",
        title: "Need logo",
        clientRequestDraft: { exactClientOnlyItem: "Vector logo" },
      },
      owner,
      assignments,
    );
    if (!raised.ok) throw new Error("raise failed");
    const approved = applyApproveClientRequest(
      raised.envelope,
      { ...approveBody, exceptionId: raised.exception.id },
      owner,
      assignments,
      materialsEnvelope(),
    );
    if (!approved.ok) throw new Error("approve failed");

    const resolved = applyResolveException(
      approved.envelope,
      { exceptionId: approved.exception.id },
      owner,
      assignments,
      approved.materialsEnvelope?.items ?? [],
    );
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.status).toBe(403);
  });

  it("owner can decline missing_client_fact promotion", () => {
    const raised = applyRaiseException(
      envelope(),
      { kind: "missing_client_fact", title: "Brand hex codes" },
      producer,
      assignments,
    );
    if (!raised.ok) throw new Error("raise failed");
    expect(raised.exception.status).toBe("waiting_owner");

    const declined = applyDeclinePromotion(
      raised.envelope,
      { exceptionId: raised.exception.id, notes: "Team will source internally" },
      owner,
      assignments,
    );
    expect(declined.ok).toBe(true);
    if (!declined.ok) return;
    expect(declined.exception.status).toBe("waiting_internal");
  });

  it("decline promotion requires internal reason", () => {
    const raised = applyRaiseException(
      envelope(),
      { kind: "client_request", title: "Need logo", clientRequestDraft: { exactClientOnlyItem: "Logo" } },
      owner,
      assignments,
    );
    if (!raised.ok) throw new Error("raise failed");
    const declined = applyDeclinePromotion(
      raised.envelope,
      { exceptionId: raised.exception.id },
      owner,
      assignments,
    );
    expect(declined.ok).toBe(false);
    if (declined.ok) return;
    expect(declined.status).toBe(400);
  });

  it("qa staff can raise exceptions", () => {
    const result = applyRaiseException(
      envelope(),
      { kind: "deadline_risk", title: "Timeline slip" },
      qaStaff,
      assignments,
    );
    expect(result.ok).toBe(true);
  });
});
