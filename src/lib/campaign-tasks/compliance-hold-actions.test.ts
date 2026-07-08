import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import {
  applyEscalateComplianceHoldToOwner,
  applyOwnerAskTeamComplianceHold,
  applyOwnerAssignComplianceHold,
  applyOwnerClearComplianceHold,
  applyOwnerHoldComplianceHold,
} from "./compliance-hold-actions";
import type { CampaignExceptionRecord, CampaignTaskItem, ServerTasksEnvelope } from "./types";

const now = "2026-07-06T18:00:00.000Z";

const owner: StudioUser = {
  id: "owner-1",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner"],
};

const qaStaff: StudioUser = {
  id: "staff-qa",
  email: "qa@local.dev",
  displayName: "QA",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: {
    "staff-qa": ["compliance-hold-v1"],
  },
  staffCapabilities: {
    "staff-qa": ["qa"],
  },
};

const EXCEPTION_ID = "exc-compliance-hold-v1";
const TASK_ID = "sm-001:copy";

function blockedCopyTask(): CampaignTaskItem {
  return {
    id: TASK_ID,
    title: "Copy",
    phase: "copy",
    status: "blocked",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: [],
    workflowState: "blocked",
    workflowBlockedReason: "compliance_hold: Unverified claim",
  };
}

function complianceException(
  overrides: Partial<CampaignExceptionRecord> = {},
): CampaignExceptionRecord {
  return {
    id: EXCEPTION_ID,
    campaignId: "compliance-hold-v1",
    kind: "compliance_hold",
    status: "waiting_owner",
    title: "Compliance hold — test",
    description: "QA flagged concern",
    createdAt: now,
    updatedAt: now,
    raisedByUserId: "staff-qa",
    raisedByDisplayName: "QA",
    raisedByRole: "qa",
    taskId: TASK_ID,
    ...overrides,
  };
}

function envelope(
  exception: CampaignExceptionRecord = complianceException(),
  tasks: CampaignTaskItem[] = [blockedCopyTask()],
): ServerTasksEnvelope {
  return {
    campaignId: "compliance-hold-v1",
    tasks,
    planFingerprint: "fp",
    updatedAt: now,
    version: 7,
    syncedAt: now,
    exceptionRecords: [exception],
    exceptionEvents: [],
    qaRecords: [],
  };
}

describe("compliance hold owner actions", () => {
  it("owner_clear_compliance_hold resolves and clears task blocker", () => {
    const result = applyOwnerClearComplianceHold(
      envelope(),
      { exceptionId: EXCEPTION_ID, ownerNotes: "Cleared — claim documented." },
      owner,
      assignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.exception.status).toBe("resolved");
    expect(result.exception.resolutionNotes).toContain("Cleared — claim documented");

    const task = result.envelope.tasks.find((entry) => entry.id === TASK_ID);
    expect(task?.workflowBlockedReason).toBeUndefined();
    expect(task?.workflowState).toBe("ready_for_qa");
  });

  it("owner_hold_compliance_hold moves exception to waiting_internal", () => {
    const result = applyOwnerHoldComplianceHold(
      envelope(),
      {
        exceptionId: EXCEPTION_ID,
        note: "Need legal review",
        ownerNotes: "Hold until counsel responds.",
      },
      owner,
      assignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.exception.status).toBe("waiting_internal");
    expect(result.envelope.exceptionEvents?.some((entry) => entry.action === "assigned")).toBe(
      true,
    );

    const task = result.envelope.tasks.find((entry) => entry.id === TASK_ID);
    expect(task?.workflowState).toBe("blocked");
  });

  it("owner_ask_team_compliance_hold assigns optional team member", () => {
    const result = applyOwnerAskTeamComplianceHold(
      envelope(),
      {
        exceptionId: EXCEPTION_ID,
        note: "QA re-check caption",
        ownerNotes: "Ask team to verify wording.",
        assignToUserId: "staff-qa",
      },
      owner,
      assignments,
      qaStaff,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.exception.status).toBe("waiting_internal");
    expect(result.exception.assignedToUserId).toBe("staff-qa");
  });

  it("owner_assign_compliance_hold requires assignee", () => {
    const result = applyOwnerAssignComplianceHold(
      envelope(),
      {
        exceptionId: EXCEPTION_ID,
        assignToUserId: "staff-qa",
        ownerNotes: "Route to QA for fix.",
      },
      owner,
      assignments,
      qaStaff,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.exception.status).toBe("waiting_internal");
    expect(result.exception.assignedToDisplayName).toBe("QA");
  });

  it("producer cannot clear compliance hold", () => {
    const producer: StudioUser = {
      id: "staff-producer",
      email: "producer@local.dev",
      displayName: "Producer",
      roles: ["staff"],
    };
    const producerAssignments: CampaignAssignmentsFile = {
      staffByUserId: { "staff-producer": ["compliance-hold-v1"] },
      staffCapabilities: { "staff-producer": ["producer_dispatcher"] },
    };
    const result = applyOwnerClearComplianceHold(
      envelope(),
      { exceptionId: EXCEPTION_ID },
      producer,
      producerAssignments,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(403);
  });
});

describe("compliance hold escalation to Owner", () => {
  const producer: StudioUser = {
    id: "staff-producer",
    email: "producer@local.dev",
    displayName: "Producer",
    roles: ["staff"],
  };
  const producerAssignments: CampaignAssignmentsFile = {
    staffByUserId: { "staff-producer": ["compliance-hold-v1"] },
    staffCapabilities: { "staff-producer": ["producer_dispatcher"] },
  };

  it("producer escalates a routine hold to Owner with a stated criterion", () => {
    const routine = complianceException({ status: "waiting_internal" });
    const result = applyEscalateComplianceHoldToOwner(
      envelope(routine),
      {
        exceptionId: EXCEPTION_ID,
        criterion: "unresolved_legal_or_business_risk",
        note: "Legal has not signed off on the claim language.",
      },
      producer,
      producerAssignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.exception.status).toBe("waiting_owner");
    const event = result.envelope.exceptionEvents?.at(-1);
    expect(event?.notes).toContain("Unresolved legal or business risk remains");
    expect(event?.notes).toContain("Legal has not signed off on the claim language.");
  });

  it("rejects escalation without a stated reason", () => {
    const routine = complianceException({ status: "waiting_internal" });
    const result = applyEscalateComplianceHoldToOwner(
      envelope(routine),
      { exceptionId: EXCEPTION_ID, criterion: "policy_exception_requested", note: "  " },
      producer,
      producerAssignments,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
  });

  it("rejects escalating a hold that is already routed to Owner", () => {
    const alreadyEscalated = complianceException({ status: "waiting_owner" });
    const result = applyEscalateComplianceHoldToOwner(
      envelope(alreadyEscalated),
      {
        exceptionId: EXCEPTION_ID,
        criterion: "refund_scope_deadline_or_relationship_risk",
        note: "Client threatening to cancel.",
      },
      producer,
      producerAssignments,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
  });
});
