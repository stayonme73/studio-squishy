import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import {
  applyOwnerAskTeamDirectionDisagreement,
  applyOwnerAssignDirectionDisagreement,
  applyOwnerConfirmDirectionDisagreement,
  applyOwnerHoldDirectionDisagreement,
} from "./direction-disagreement-actions";
import type { CampaignExceptionRecord, CampaignTaskItem, ServerTasksEnvelope } from "./types";

const now = "2026-07-06T19:00:00.000Z";

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
    "staff-qa": ["direction-disagreement-v1"],
  },
  staffCapabilities: {
    "staff-qa": ["qa"],
  },
};

const EXCEPTION_ID = "exc-direction-disagreement-v1";
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
    workflowBlockedReason: "owner_escalation: Strategy brief conflicts with production alternate",
  };
}

function directionException(
  overrides: Partial<CampaignExceptionRecord> = {},
): CampaignExceptionRecord {
  return {
    id: EXCEPTION_ID,
    campaignId: "direction-disagreement-v1",
    kind: "direction_disagreement",
    status: "waiting_owner",
    title: "Direction disagreement — strategy vs production",
    description: "QA flagged direction conflict",
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
  exception: CampaignExceptionRecord = directionException(),
  tasks: CampaignTaskItem[] = [blockedCopyTask()],
): ServerTasksEnvelope {
  return {
    campaignId: "direction-disagreement-v1",
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

describe("direction disagreement owner actions", () => {
  it("owner_confirm_direction_disagreement resolves and clears task blocker", () => {
    const result = applyOwnerConfirmDirectionDisagreement(
      envelope(),
      { exceptionId: EXCEPTION_ID, ownerNotes: "Direction B stands — strategy brief wins." },
      owner,
      assignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.exception.status).toBe("resolved");
    expect(result.exception.resolutionNotes).toContain("Direction B stands");

    const task = result.envelope.tasks.find((entry) => entry.id === TASK_ID);
    expect(task?.workflowBlockedReason).toBeUndefined();
    expect(task?.workflowState).toBe("ready_for_qa");
  });

  it("owner_hold_direction_disagreement moves exception to waiting_internal", () => {
    const result = applyOwnerHoldDirectionDisagreement(
      envelope(),
      {
        exceptionId: EXCEPTION_ID,
        note: "Need strategy call before confirming",
        ownerNotes: "Hold until Producer and Strategy align.",
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

  it("owner_ask_team_direction_disagreement assigns optional team member", () => {
    const result = applyOwnerAskTeamDirectionDisagreement(
      envelope(),
      {
        exceptionId: EXCEPTION_ID,
        note: "Strategy and production reconcile direction",
        ownerNotes: "Ask team to compare brief vs draft.",
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

  it("owner_assign_direction_disagreement requires assignee", () => {
    const result = applyOwnerAssignDirectionDisagreement(
      envelope(),
      {
        exceptionId: EXCEPTION_ID,
        assignToUserId: "staff-qa",
        ownerNotes: "Route to QA for direction fix.",
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

  it("producer cannot confirm direction disagreement", () => {
    const producer: StudioUser = {
      id: "staff-producer",
      email: "producer@local.dev",
      displayName: "Producer",
      roles: ["staff"],
    };
    const producerAssignments: CampaignAssignmentsFile = {
      staffByUserId: { "staff-producer": ["direction-disagreement-v1"] },
      staffCapabilities: { "staff-producer": ["producer_dispatcher"] },
    };
    const result = applyOwnerConfirmDirectionDisagreement(
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
