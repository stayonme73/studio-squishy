import { describe, expect, it } from "vitest";

import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";

import type { CampaignExceptionRecord } from "./exceptions-types";
import {
  resolveOwnerConsoleScanView,
  resolveWaitingOwnerExceptionIds,
} from "./owner-console-scan-view";
import type { OwnerConsoleCampaignBundle } from "./owner-console-view";
import type { CampaignTaskItem, ServerTasksEnvelope } from "./types";

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "staff-copy": ["campaign-1"] },
  staffCapabilities: { "staff-copy": ["copy"] },
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
    workflowState: "blocked",
    workflowBlockedReason: "compliance_hold",
    dependsOn: [],
  },
  {
    id: "sm-001:strategy",
    title: "Strategy direction",
    serviceName: "Social",
    familyId: "social",
    catalogFamilyId: "social_media",
    relatedServiceIds: ["sm-001"],
    phase: "strategy_content_direction",
    status: "ready",
    workflowState: "unstarted",
    dependsOn: [],
  },
];

function envelope(campaignId: string, campaignName: string): ServerCampaignEnvelope {
  return {
    campaignId,
    syncVersion: 1,
    syncedAt: "2026-06-29T12:00:00.000Z",
    record: {
      campaignId,
      campaignName,
      businessName: campaignName,
      campaignStatus: "BUILDING_CONCEPTS",
      discoverySubmittedAt: "2026-06-01T00:00:00.000Z",
      approvedStudioPlan: { serviceIds: ["sm-001"], approvedAt: "2026-06-02T00:00:00.000Z" },
      paymentReceivedAt: "2026-06-03T00:00:00.000Z",
    },
  } as unknown as ServerCampaignEnvelope;
}

function exception(
  overrides: Partial<CampaignExceptionRecord> = {},
): CampaignExceptionRecord {
  return {
    id: "exc-1",
    campaignId: "campaign-1",
    kind: "compliance_hold",
    status: "waiting_owner",
    title: "Compliance hold",
    createdAt: "2026-06-29T10:00:00.000Z",
    updatedAt: "2026-06-29T10:00:00.000Z",
    raisedByUserId: "staff-qa",
    raisedByDisplayName: "QA",
    raisedByRole: "qa",
    taskId: "sm-001:copy",
    ...overrides,
  };
}

function tasksEnvelope(
  campaignId: string,
  exceptionRecords: CampaignExceptionRecord[],
): ServerTasksEnvelope {
  return {
    campaignId,
    tasks,
    exceptionRecords,
    exceptionEvents: [],
    qaRecords: [],
    handoffs: [],
    syncedAt: "2026-06-29T12:00:00.000Z",
    version: 5,
  } as unknown as ServerTasksEnvelope;
}

function bundle(
  campaignId: string,
  campaignName: string,
  exceptionRecords: CampaignExceptionRecord[],
): OwnerConsoleCampaignBundle {
  return {
    envelope: envelope(campaignId, campaignName),
    tasksEnvelope: tasksEnvelope(campaignId, exceptionRecords),
    materials: [],
  };
}

describe("owner-console-scan-view", () => {
  it("places blocked tasks without owner-waiting exception in blocked bucket", () => {
    const b = bundle("campaign-1", "Alpha Co", [
      exception({ status: "resolved", resolvedAt: "2026-06-28T00:00:00.000Z" }),
    ]);
    const waitingIds = resolveWaitingOwnerExceptionIds([]);
    const scan = resolveOwnerConsoleScanView([b], owner, assignments, waitingIds);
    const blocked = scan.buckets.find((entry) => entry.id === "blocked");
    expect(blocked?.items.some((item) => item.title === "Copy draft")).toBe(true);
  });

  it("excludes blocked task when owner exception is waiting", () => {
    const b = bundle("campaign-1", "Alpha Co", [exception()]);
    const waitingIds = resolveWaitingOwnerExceptionIds([{ id: "exc-1" }]);
    const scan = resolveOwnerConsoleScanView([b], owner, assignments, waitingIds);
    const blocked = scan.buckets.find((entry) => entry.id === "blocked");
    expect(blocked?.isEmpty).toBe(true);
  });

  it("lists waiting_internal exceptions", () => {
    const b = bundle("campaign-1", "Alpha Co", [
      exception({
        status: "waiting_internal",
        assignedToUserId: "staff-copy",
        assignedToDisplayName: "Copy AI",
      }),
    ]);
    const scan = resolveOwnerConsoleScanView([b], owner, assignments, new Set());
    const internal = scan.buckets.find((entry) => entry.id === "waiting_internal");
    expect(internal?.items).toHaveLength(1);
  });

  it("lists ready tasks in ready_to_move bucket", () => {
    const b = bundle("campaign-1", "Alpha Co", []);
    const scan = resolveOwnerConsoleScanView([b], owner, assignments, new Set());
    const ready = scan.buckets.find((entry) => entry.id === "ready_to_move");
    expect(ready?.items.some((item) => item.title === "Strategy direction")).toBe(true);
  });
});
