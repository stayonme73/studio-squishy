import { describe, expect, it } from "vitest";

import type { OwnerConsoleScanView } from "@/lib/campaign-tasks/owner-console-scan-view";
import type { OwnerConsoleDecisionCard } from "@/lib/campaign-tasks/owner-console-view";
import type { OwnerControlRoomView } from "@/lib/job-control/control-room-view";
import type { OwnerDeskItem } from "@/lib/job-control/owner-desk";

import {
  resolveDeskUrgencyRank,
  resolveExceptionUrgencyRank,
  resolveOwnerConsoleSequentialDesk,
  resolveTrayForDeskItem,
  resolveTrayForException,
  sortWaitingCardsByUrgency,
} from "./owner-console-sequential";
import type { FileRoomExceptionRow } from "./exceptions-view";

function card(
  overrides: Partial<OwnerConsoleDecisionCard> & { kind?: FileRoomExceptionRow["kind"] },
): OwnerConsoleDecisionCard {
  const kind = overrides.kind ?? "compliance_hold";
  return {
    id: overrides.id ?? "exc-1",
    campaignId: overrides.campaignId ?? "campaign-1",
    campaignName: overrides.campaignName ?? "Alpha Co",
    businessLabel: "Alpha LLC",
    queueDifferentiator: "",
    updatedAt: overrides.updatedAt ?? "2026-06-29T10:00:00.000Z",
    ageLabel: "Jun 29",
    whatHappened: "Test",
    whyOwner: "Owner",
    recommendedNextAction: "Act",
    impactIfNoAction: "Blocked",
    whereWorkGoesAfter: "Team",
    availableActions: [],
    row: {
      id: overrides.id ?? "exc-1",
      kind,
      kindLabel: kind,
      title: "Test exception",
      status: "waiting_owner",
      promotion: { showApprovalPanel: false, showPromotedSummary: false },
      isAutoCreatedFromQa: false,
    } as FileRoomExceptionRow,
    ...overrides,
  };
}

function emptyScan(): OwnerConsoleScanView {
  return {
    buckets: [
      { id: "waiting_client", title: "", description: "", items: [], isEmpty: true },
      { id: "recently_resolved", title: "", description: "", items: [], isEmpty: true },
    ],
    totalItems: 0,
  } as OwnerConsoleScanView;
}

function emptyControlRoom(): OwnerControlRoomView {
  return {
    ownerDesk: [],
    needsCommunication: [],
    lanes: [],
    waitingOnClient: [],
    activity: [],
    jobs: [],
    jobCount: 0,
    campaignsWithJobs: 0,
  };
}

describe("owner-console-sequential", () => {
  it("ranks final delivery before scope change", () => {
    const delivery: OwnerDeskItem = {
      id: "desk:delivery:job-1",
      reason: "approval_before_delivery",
      reasonLabel: "Final release",
      campaignId: "c1",
      campaignName: "Acme",
      jobId: "job-1",
      serviceName: "Social",
      title: "Final release",
      detail: "Ready",
      drillDownHref: "/file-room/c1/owner-console",
      updatedAt: "2026-06-29T12:00:00.000Z",
    };

    expect(resolveDeskUrgencyRank(delivery)).toBeLessThan(
      resolveExceptionUrgencyRank(card({ kind: "scope_change" })),
    );
  });

  it("sorts waiting cards by urgency rank", () => {
    const sorted = sortWaitingCardsByUrgency([
      card({ id: "compliance", kind: "compliance_hold", updatedAt: "2026-06-29T12:00:00.000Z" }),
      card({ id: "scope", kind: "scope_change", updatedAt: "2026-06-28T10:00:00.000Z" }),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual(["scope", "compliance"]);
  });

  it("maps promotable exceptions to needs my approval tray", () => {
    const tray = resolveTrayForException(
      card({ kind: "missing_client_fact", row: { kind: "missing_client_fact" } as FileRoomExceptionRow }),
    );
    expect(tray).toBe("needs_my_approval");
  });

  it("maps delivery desk items to ready to release tray", () => {
    const desk: OwnerDeskItem = {
      id: "desk:delivery:job-1",
      reason: "approval_before_delivery",
      reasonLabel: "Final release",
      campaignId: "c1",
      campaignName: "Acme",
      jobId: "job-1",
      serviceName: "Social",
      title: "Final release",
      detail: "Ready",
      drillDownHref: "/x",
      updatedAt: "2026-06-29T12:00:00.000Z",
    };
    expect(resolveTrayForDeskItem(desk)).toBe("ready_to_release");
  });

  it("builds sequential desk with merged desk items and urgency order", () => {
    const view = {
      waitingOnOwner: [
        card({ id: "scope", kind: "scope_change", updatedAt: "2026-06-28T10:00:00.000Z" }),
      ],
      waitingCount: 1,
      campaignCount: 1,
      isEmpty: false,
      campaigns: [],
    };

    const controlRoom = {
      ...emptyControlRoom(),
      ownerDesk: [
        {
          id: "desk:delivery:job-1",
          reason: "approval_before_delivery",
          reasonLabel: "Final release",
          campaignId: "c1",
          campaignName: "Acme",
          jobId: "job-1",
          serviceName: "Social",
          title: "Final release",
          detail: "Ready",
          drillDownHref: "/x",
          updatedAt: "2026-06-29T12:00:00.000Z",
        } satisfies OwnerDeskItem,
      ],
    };

    const desk = resolveOwnerConsoleSequentialDesk(view, controlRoom, emptyScan());

    expect(desk.todaysDecisionCount).toBe(2);
    expect(desk.items[0]?.id).toBe("desk:delivery:job-1");
    expect(desk.items[1]?.id).toBe("exception:scope");
    expect(desk.trays.find((tray) => tray.id === "ready_to_release")?.count).toBe(1);
  });
});
