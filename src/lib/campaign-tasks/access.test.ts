import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";

import {
  canUserClaimTask,
  canUserReassignTask,
  canUserReleaseClaim,
  canUserSubmitHandoff,
  canOperateProductionTasks,
  canReadProductionTasks,
  isProductionProducer,
} from "./access";
import { isRoleCapableForTaskFamily } from "./capabilities";
import type { CampaignTaskItem } from "./types";

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

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

const client: StudioUser = {
  id: "client-1",
  email: "client@local.dev",
  displayName: "Client",
  roles: ["client"],
  currentCampaignId: "campaign-1",
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: {
    "staff-copy": ["campaign-1"],
    "staff-producer": ["campaign-1"],
  },
  staffCapabilities: {
    "staff-copy": ["copy"],
    "staff-producer": ["producer_dispatcher", "copy"],
  },
};

function task(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
  return {
    id: "sm-001:copy",
    title: "Social — Copy",
    phase: "copy",
    status: "ready",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: [],
    workflowState: "unstarted",
    responsibleRole: "copy",
    ...overrides,
  };
}

describe("canReadProductionTasks", () => {
  it("allows owner and assigned staff", () => {
    expect(canReadProductionTasks(owner, "campaign-1", null, assignments)).toBe(true);
    expect(canReadProductionTasks(copyStaff, "campaign-1", null, assignments)).toBe(true);
  });

  it("forbids client and unassigned staff", () => {
    expect(canReadProductionTasks(client, "campaign-1", null, assignments)).toBe(false);
    expect(canReadProductionTasks(copyStaff, "campaign-2", null, assignments)).toBe(false);
  });
});

describe("canOperateProductionTasks", () => {
  it("forbids clients even when campaign matches", () => {
    expect(canOperateProductionTasks(client, "campaign-1", null, assignments)).toBe(false);
  });

  it("allows assigned staff", () => {
    expect(canOperateProductionTasks(copyStaff, "campaign-1", null, assignments)).toBe(true);
  });
});

describe("claim permissions", () => {
  it("allows copy staff on copy tasks", () => {
    expect(canUserClaimTask(copyStaff, task(), assignments)).toBe(true);
  });

  it("forbids copy staff when task claimed by another user", () => {
    expect(
      canUserClaimTask(
        copyStaff,
        task({ claimedByUserId: "other", claimedAt: "2026-01-01T00:00:00.000Z" }),
        assignments,
      ),
    ).toBe(false);
  });

  it("allows producer to claim any unclaimed task", () => {
    expect(canUserClaimTask(producerStaff, task(), assignments)).toBe(true);
  });
});

describe("handoff permissions", () => {
  const claimed = task({
    workflowState: "in_progress",
    claimedByUserId: "staff-copy",
    claimedAt: "2026-01-01T00:00:00.000Z",
  });

  it("allows claim holder to submit and release", () => {
    expect(canUserSubmitHandoff(copyStaff, claimed, assignments)).toBe(true);
    expect(canUserReleaseClaim(copyStaff, claimed, assignments)).toBe(true);
  });

  it("allows producer to release another user's claim", () => {
    expect(canUserReleaseClaim(producerStaff, claimed, assignments)).toBe(true);
  });

  it("forbids non-holder staff from submitting", () => {
    const otherStaff: StudioUser = {
      id: "staff-other",
      email: "other@local.dev",
      displayName: "Other",
      roles: ["staff"],
    };
    const otherAssignments: CampaignAssignmentsFile = {
      staffByUserId: { "staff-other": ["campaign-1"] },
      staffCapabilities: { "staff-other": ["copy"] },
    };
    expect(canUserSubmitHandoff(otherStaff, claimed, otherAssignments)).toBe(false);
  });
});

describe("reassign permissions", () => {
  it("allows producer and owner only", () => {
    expect(canUserReassignTask(producerStaff, assignments)).toBe(true);
    expect(canUserReassignTask(owner, assignments)).toBe(true);
    expect(canUserReassignTask(copyStaff, assignments)).toBe(false);
  });

  it("validates family-capable roles", () => {
    expect(isRoleCapableForTaskFamily("social", "copy")).toBe(true);
    expect(isRoleCapableForTaskFamily("social", "owner")).toBe(false);
  });
});

describe("isProductionProducer", () => {
  it("treats owner as producer", () => {
    expect(isProductionProducer(owner, assignments)).toBe(true);
  });
});
