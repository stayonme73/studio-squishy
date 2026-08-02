import { describe, expect, it } from "vitest";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import { campaignTasksConfig } from "@/config/campaign-tasks";

import { resolveNextRequiredAction } from "./exceptions-view";
import type { CampaignExceptionRecord } from "./exceptions-types";
import { resolveFileRoomTaskOwnershipPresentation } from "./task-ownership-presentation";

describe("resolveFileRoomTaskOwnershipPresentation (Gate #15)", () => {
  it("shows responsible role and Unclaimed when no claimer", () => {
    const view = resolveFileRoomTaskOwnershipPresentation({
      responsibleRole: "copy",
      claimedByDisplayName: null,
    });
    expect(view.responsibleRoleLabel).toBe(
      campaignTasksConfig.productionRoleLabels.copy,
    );
    expect(view.responsibleRoleLine).toBe(
      `${campaignTasksConfig.responsibleRoleLabel}: ${campaignTasksConfig.productionRoleLabels.copy}`,
    );
    expect(view.claimStatus).toBe("unclaimed");
    expect(view.claimLine).toBe(campaignTasksConfig.unclaimedLabel);
    expect(view.claimLine).not.toMatch(/^\s*$/);
  });

  it("shows responsible role and Claimed by when claimed", () => {
    const view = resolveFileRoomTaskOwnershipPresentation({
      responsibleRole: "strategy",
      claimedByDisplayName: "Alex Producer",
    });
    expect(view.responsibleRoleLabel).toBe(
      campaignTasksConfig.productionRoleLabels.strategy,
    );
    expect(view.claimStatus).toBe("claimed");
    expect(view.claimLine).toBe(
      `${campaignTasksConfig.claimedByLabel} Alex Producer`,
    );
  });

  it("treats whitespace-only claimer as Unclaimed", () => {
    const view = resolveFileRoomTaskOwnershipPresentation({
      responsibleRole: "qa",
      claimedByDisplayName: "   ",
    });
    expect(view.claimStatus).toBe("unclaimed");
    expect(view.claimLine).toBe(campaignTasksConfig.unclaimedLabel);
  });

  it("covers every production role label without blank ownership", () => {
    const roles = Object.keys(
      campaignTasksConfig.productionRoleLabels,
    ) as Array<keyof typeof campaignTasksConfig.productionRoleLabels>;
    for (const role of roles) {
      const view = resolveFileRoomTaskOwnershipPresentation({
        responsibleRole: role,
      });
      expect(view.responsibleRoleLine.length).toBeGreaterThan(0);
      expect(view.claimLine).toBe(campaignTasksConfig.unclaimedLabel);
    }
  });
});

describe("existing waiting-state / nextRequiredAction authorities (Gate #15 reuse)", () => {
  function exception(
    overrides: Partial<CampaignExceptionRecord>,
  ): CampaignExceptionRecord {
    return {
      id: "exc-1",
      campaignId: "campaign-1",
      kind: "routine_internal",
      status: "open",
      title: "Blocker",
      createdAt: "2026-08-02T12:00:00.000Z",
      updatedAt: "2026-08-02T12:00:00.000Z",
      raisedByUserId: "staff-1",
      raisedByDisplayName: "Staff",
      raisedByRole: "producer_dispatcher",
      ...overrides,
    };
  }

  it("waiting on client", () => {
    expect(
      resolveNextRequiredAction(exception({ status: "waiting_client" })),
    ).toBe(campaignExceptionsConfig.nextActionLabels.waitingClient);
  });

  it("owner review", () => {
    expect(
      resolveNextRequiredAction(
        exception({ kind: "compliance_hold", status: "waiting_owner" }),
      ),
    ).toBe(campaignExceptionsConfig.nextActionLabels.ownerReview);
  });

  it("waiting on studio / internal assignee", () => {
    expect(
      resolveNextRequiredAction(
        exception({
          status: "waiting_internal",
          assignedToUserId: "staff-2",
          assignedToDisplayName: "Pat",
        }),
      ),
    ).toBe(campaignExceptionsConfig.nextActionLabels.waitingInternal);
  });

  it("reassignment visibility — assigned open exception", () => {
    expect(
      resolveNextRequiredAction(
        exception({
          status: "open",
          assignedToUserId: "staff-2",
          assignedToDisplayName: "Pat",
        }),
      ),
    ).toBe(campaignExceptionsConfig.nextActionLabels.openAssigned);
  });

  it("unassigned open exception stays truthful", () => {
    expect(resolveNextRequiredAction(exception({ status: "open" }))).toBe(
      campaignExceptionsConfig.nextActionLabels.openUnassigned,
    );
  });
});
