import { describe, expect, it } from "vitest";

import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";

import {
  resolveAvailableOwnerActions,
  resolveOwnerConsoleView,
  shouldIncludeCampaignInOwnerConsoleAggregate,
  type OwnerConsoleCampaignBundle,
} from "./owner-console-view";
import type { CampaignExceptionRecord } from "./exceptions-types";
import type { CampaignTaskItem, ServerTasksEnvelope } from "./types";

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "staff-qa": ["campaign-1"] },
  staffCapabilities: { "staff-qa": ["qa"] },
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
    description: "Unverified claim",
    createdAt: "2026-06-29T10:00:00.000Z",
    updatedAt: "2026-06-29T10:00:00.000Z",
    raisedByUserId: "staff-qa",
    raisedByDisplayName: "QA",
    raisedByRole: "qa",
    taskId: "sm-001:copy",
    qaRecordId: "qa-1",
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
    qaRecords: [
      {
        id: "qa-1",
        taskId: "sm-001:copy",
        campaignId,
        createdAt: "2026-06-29T09:00:00.000Z",
        actorUserId: "staff-qa",
        actorDisplayName: "QA",
        actorRole: "qa",
        action: "block",
        notes: "Claim needs verification",
      },
    ],
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

describe("owner-console-view", () => {
  it("aggregates waiting-on-owner cards across campaigns", () => {
    const bundles = [
      bundle("campaign-1", "Alpha Co", [exception()]),
      bundle("campaign-2", "Beta LLC", [
        exception({
          id: "exc-2",
          campaignId: "campaign-2",
          kind: "scope_change",
          status: "waiting_owner",
          title: "Scope change",
          qaRecordId: undefined,
          updatedAt: "2026-06-28T10:00:00.000Z",
        }),
      ]),
    ];

    const view = resolveOwnerConsoleView(bundles, owner, assignments, {});

    expect(view.waitingCount).toBe(2);
    expect(view.campaignCount).toBe(2);
    expect(view.waitingOnOwner.map((card) => card.campaignId)).toEqual([
      "campaign-1",
      "campaign-2",
    ]);
    expect(view.waitingOnOwner[0]?.whatHappened).toContain("QA: Claim needs verification");
    expect(view.waitingOnOwner[0]?.availableActions.some((a) => a.kind === "resolve")).toBe(
      true,
    );
  });

  it("sorts QA-auto-created before other waiting items", () => {
    const bundles = [
      bundle("campaign-1", "Alpha Co", [
        exception({
          id: "exc-old",
          updatedAt: "2026-06-20T10:00:00.000Z",
          qaRecordId: undefined,
        }),
        exception({
          id: "exc-qa",
          updatedAt: "2026-06-29T10:00:00.000Z",
          qaRecordId: "qa-1",
        }),
      ]),
    ];

    const view = resolveOwnerConsoleView(bundles, owner, assignments, {});
    expect(view.waitingOnOwner[0]?.id).toBe("exc-qa");
  });

  it("excludes resolved and non-owner-review exceptions", () => {
    const bundles = [
      bundle("campaign-1", "Alpha Co", [
        exception({ status: "resolved" }),
        exception({
          id: "exc-internal",
          kind: "routine_internal",
          status: "waiting_internal",
          assignedToUserId: "staff-qa",
          assignedToDisplayName: "QA",
        }),
      ]),
    ];

    const view = resolveOwnerConsoleView(bundles, owner, assignments, {});
    expect(view.isEmpty).toBe(true);
  });

  it("builds anti-standstill card fields", () => {
    const bundles = [bundle("campaign-1", "Alpha Co", [exception()])];
    const view = resolveOwnerConsoleView(bundles, owner, assignments, {});
    const card = view.waitingOnOwner[0];

    expect(card?.whyOwner).toContain("Compliance hold");
    expect(card?.recommendedNextAction).toContain("Owner");
    expect(card?.impactIfNoAction.length).toBeGreaterThan(0);
    expect(card?.whereWorkGoesAfter.length).toBeGreaterThan(0);
    expect(card?.campaignName).toBe("Alpha Co");
  });

  it("resolveAvailableOwnerActions lists promotion actions for promotable rows", () => {
    const bundles = [
      bundle("campaign-1", "Alpha Co", [
        exception({
          kind: "missing_client_fact",
          status: "waiting_owner",
          title: "Need client logo file",
        }),
      ]),
    ];
    const view = resolveOwnerConsoleView(bundles, owner, assignments, {});
    const actions = resolveAvailableOwnerActions(view.waitingOnOwner[0]!.row);
    expect(actions.map((entry) => entry.kind)).toEqual(
      expect.arrayContaining(["approve", "hold", "decline"]),
    );
  });

  it("shouldIncludeCampaignInOwnerConsoleAggregate skips delivered with no waiting", () => {
    const delivered = envelope("campaign-x", "Done Co");
    delivered.record.campaignStatus = "DELIVERED";
    expect(shouldIncludeCampaignInOwnerConsoleAggregate(delivered, false)).toBe(false);
    expect(shouldIncludeCampaignInOwnerConsoleAggregate(delivered, true)).toBe(true);
  });
});
