import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";

import {
  resolveReassignCandidatesForTask,
  resolveTaskPermissions,
} from "./file-room-controls";
import type { CampaignTaskItem } from "./types";

const copyStaff: StudioUser = {
  id: "staff-copy",
  email: "copy@local.dev",
  displayName: "Copy Staff",
  roles: ["staff"],
};

const producerStaff: StudioUser = {
  id: "staff-producer",
  email: "producer@local.dev",
  displayName: "Producer Staff",
  roles: ["staff"],
};

const creativeStaff: StudioUser = {
  id: "staff-creative",
  email: "creative@local.dev",
  displayName: "Creative Staff",
  roles: ["staff"],
};

const qaStaff: StudioUser = {
  id: "staff-qa",
  email: "qa@local.dev",
  displayName: "QA Staff",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: {
    "staff-copy": ["campaign-1"],
    "staff-producer": ["campaign-1"],
    "staff-creative": ["campaign-1"],
    "staff-strategy": ["campaign-1"],
    "staff-qa": ["campaign-1"],
  },
  staffCapabilities: {
    "staff-copy": ["copy"],
    "staff-producer": ["producer_dispatcher", "copy"],
    "staff-creative": ["creative_production"],
    "staff-strategy": ["strategy"],
    "staff-qa": ["qa"],
  },
};

function copyTask(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
  return {
    id: "sm-001:copy",
    title: "Social — Copy",
    phase: "copy",
    status: "ready",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social Media Launch Set",
    dependsOn: ["sm-001:strategy_content_direction"],
    workflowState: "unstarted",
    responsibleRole: "copy",
    ...overrides,
  };
}

describe("resolveTaskPermissions", () => {
  it("allows copy staff to claim a ready unstarted copy task", () => {
    const permissions = resolveTaskPermissions(copyStaff, copyTask(), assignments);
    expect(permissions.canClaim).toBe(true);
    expect(permissions.canReassign).toBe(false);
  });

  it("allows producer to reassign in-progress tasks", () => {
    const permissions = resolveTaskPermissions(
      producerStaff,
      copyTask({
        workflowState: "in_progress",
        status: "in_progress",
        claimedByUserId: "staff-copy",
        claimedByDisplayName: "Copy Staff",
        claimedAt: "2026-06-28T12:00:00.000Z",
      }),
      assignments,
    );
    expect(permissions.canReassign).toBe(true);
    expect(permissions.canClaim).toBe(false);
  });

  it("allows claimant to submit handoff and release", () => {
    const permissions = resolveTaskPermissions(
      copyStaff,
      copyTask({
        workflowState: "in_progress",
        status: "in_progress",
        claimedByUserId: "staff-copy",
        claimedByDisplayName: "Copy Staff",
        claimedAt: "2026-06-28T12:00:00.000Z",
      }),
      assignments,
    );
    expect(permissions.canSubmitHandoff).toBe(true);
    expect(permissions.canRelease).toBe(true);
    expect(permissions.canReassign).toBe(false);
  });

  it("blocks claim when task is not ready", () => {
    const permissions = resolveTaskPermissions(
      copyStaff,
      copyTask({ status: "not_ready", workflowState: "unstarted" }),
      assignments,
    );
    expect(permissions.canClaim).toBe(false);
  });

  it("blocks claim when another user holds the claim", () => {
    const permissions = resolveTaskPermissions(
      copyStaff,
      copyTask({
        workflowState: "in_progress",
        status: "in_progress",
        claimedByUserId: "staff-creative",
        claimedByDisplayName: "Creative Staff",
      }),
      assignments,
    );
    expect(permissions.canClaim).toBe(false);
    expect(permissions.canSubmitHandoff).toBe(false);
  });

  it("allows QA staff QA actions on ready_for_qa tasks", () => {
    const permissions = resolveTaskPermissions(
      qaStaff,
      copyTask({ workflowState: "ready_for_qa", status: "ready_for_qa" }),
      assignments,
    );
    expect(permissions.canQaPass).toBe(true);
    expect(permissions.canQaFail).toBe(true);
    expect(permissions.canQaBlock).toBe(true);
    expect(permissions.canClaim).toBe(false);
  });

  it("forbids copy staff QA actions", () => {
    const permissions = resolveTaskPermissions(
      copyStaff,
      copyTask({ workflowState: "ready_for_qa", status: "ready_for_qa" }),
      assignments,
    );
    expect(permissions.canQaPass).toBe(false);
  });
});

describe("resolveReassignCandidatesForTask", () => {
  it("excludes staff without a family-capable reassign role", () => {
    const candidates = resolveReassignCandidatesForTask(
      copyTask(),
      "campaign-1",
      assignments,
      [copyStaff, producerStaff, qaStaff],
    );
    const userIds = candidates.map((entry) => entry.userId);
    expect(userIds).toContain("staff-copy");
    expect(userIds).not.toContain("staff-qa");
  });

  it("filters roles per candidate to family-capable roles", () => {
    const candidates = resolveReassignCandidatesForTask(
      copyTask(),
      "campaign-1",
      assignments,
      [producerStaff],
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.roles).toEqual(["copy", "producer_dispatcher"]);
  });
});
