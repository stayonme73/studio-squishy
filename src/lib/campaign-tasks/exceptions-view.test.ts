import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";

import {
  resolveFileRoomExceptionsView,
  resolveNextRequiredAction,
  resolveOpenExceptionCountByTaskId,
  resolveRaiseableExceptionKinds,
} from "./exceptions-view";
import type { CampaignExceptionRecord } from "./exceptions-types";
import type { CampaignTaskItem } from "./types";
import { resolveAssignCandidatesForException } from "./file-room-controls";

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

const tasks: CampaignTaskItem[] = [
  {
    id: "sm-001:copy",
    title: "Copy draft",
    serviceName: "Social",
    familyId: "social",
    catalogFamilyId: "social_media",
    relatedServiceIds: ["sm-001"],
    phase: "copy",
    status: "blocked",
    dependsOn: [],
  },
];

function exception(overrides: Partial<CampaignExceptionRecord> = {}): CampaignExceptionRecord {
  return {
    id: "exc-1",
    campaignId: "campaign-1",
    kind: "compliance_hold",
    status: "waiting_owner",
    title: "Compliance hold",
    description: "Unverified claim",
    createdAt: "2026-06-29T12:00:00.000Z",
    updatedAt: "2026-06-29T12:00:00.000Z",
    raisedByUserId: "staff-qa",
    raisedByDisplayName: "QA",
    raisedByRole: "qa",
    taskId: "sm-001:copy",
    qaRecordId: "qa-1",
    ...overrides,
  };
}

describe("exceptions-view", () => {
  it("marks owner-held kinds with owner review required", () => {
    const view = resolveFileRoomExceptionsView([exception()], tasks, {
      user: owner,
      assignments,
    });
    expect(view.rows[0]?.ownerReviewRequired).toBe(true);
    expect(view.rows[0]?.isAutoCreatedFromQa).toBe(true);
    expect(view.rows[0]?.taskTitle).toBe("Copy draft");
  });

  it("counts open exceptions per task", () => {
    const counts = resolveOpenExceptionCountByTaskId([
      exception(),
      exception({ id: "exc-2", kind: "routine_internal", status: "open" }),
      exception({ id: "exc-3", status: "resolved", taskId: "sm-001:copy" }),
    ]);
    expect(counts.get("sm-001:copy")).toBe(2);
  });

  it("hides client_request from QA raiseable kinds", () => {
    const kinds = resolveRaiseableExceptionKinds(qaStaff, assignments);
    expect(kinds).not.toContain("client_request");
    expect(kinds).toContain("deadline_risk");
  });

  it("includes client_request for producer and owner", () => {
    expect(resolveRaiseableExceptionKinds(producer, assignments)).toContain("client_request");
    expect(resolveRaiseableExceptionKinds(owner, assignments)).toContain("client_request");
  });

  it("assign candidates include owner and campaign staff only", () => {
    const candidates = resolveAssignCandidatesForException(
      "campaign-1",
      assignments,
      [owner, producer, qaStaff],
    );
    expect(candidates.map((entry) => entry.userId).sort()).toEqual(
      ["owner-1", "staff-producer", "staff-qa"].sort(),
    );
    expect(candidates.find((entry) => entry.userId === "owner-1")?.isOwner).toBe(true);
  });

  it("next action reflects owner-held status", () => {
    expect(resolveNextRequiredAction(exception())).toContain("Owner");
    expect(resolveNextRequiredAction(exception({ kind: "routine_internal", status: "open" }))).toBeTruthy();
    expect(resolveNextRequiredAction(exception({ status: "resolved" }))).toContain("Resolved");
  });

  it("tracks open and resolved counts", () => {
    const view = resolveFileRoomExceptionsView(
      [exception(), exception({ id: "exc-2", status: "resolved" })],
      tasks,
      { user: owner, assignments },
    );
    expect(view.openCount).toBe(1);
    expect(view.resolvedCount).toBe(1);
    expect(view.rows).toHaveLength(2);
  });

  it("clears action permissions on resolved and cancelled rows", () => {
    const view = resolveFileRoomExceptionsView(
      [
        exception({ id: "exc-resolved", status: "resolved" }),
        exception({ id: "exc-cancelled", status: "cancelled" }),
      ],
      tasks,
      { user: owner, assignments },
    );
    for (const row of view.rows) {
      expect(row.permissions.canAssign).toBe(false);
      expect(row.permissions.canResolve).toBe(false);
      expect(row.permissions.canApproveClientRequest).toBe(false);
    }
  });
});
