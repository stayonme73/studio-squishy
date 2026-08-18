import { describe, expect, it } from "vitest";

import type { OwnerConsoleDecisionCard } from "@/lib/campaign-tasks/owner-console-view";
import type {
  OwnerConsoleSequentialDeskView,
  OwnerConsoleSequentialItem,
} from "@/lib/campaign-tasks/owner-console-sequential";

import {
  resolveCoordinatorTraceForCard,
  resolveOwnerDeskBriefing,
  resolveOwnerDeskGreeting,
  resolveOwnerDeskGreetingParts,
  resolveOwnerDeskSummary,
  resolveOwnerComplianceHoldPostDecisionBriefing,
  resolveOwnerComplaintPostDecisionBriefing,
  resolveOwnerDeadlinePostDecisionBriefing,
  resolveOwnerDirectionDisagreementPostDecisionBriefing,
  resolveOwnerHeavyLanePostDecisionBriefing,
  resolveOwnerRefundPostDecisionBriefing,
  resolveOwnerRevisionPostDecisionBriefing,
  resolveOwnerScopePostDecisionBriefing,
  resolveOwnerDeskJobPostDecisionBriefing,
  resolveOwnerPostDecisionBriefing,
} from "./owner-desk";

const NOW = new Date("2026-07-03T12:00:00.000Z");

function sequentialItem(
  overrides: Partial<OwnerConsoleSequentialItem> = {},
): OwnerConsoleSequentialItem {
  return {
    id: "exception:ex-1",
    trayId: "needs_my_decision",
    urgencyRank: 6,
    campaignId: "camp-1",
    campaignName: "Northwind Studio",
    title: "Client Boundary Review",
    subtitle: "Client boundary review",
    tabLabel: "Decision",
    updatedAt: "2026-07-02T12:00:00.000Z",
    ageLabel: "Jul 2",
    exceptionCard: null,
    deskItem: null,
    ...overrides,
  };
}

function decisionCard(): OwnerConsoleDecisionCard {
  return {
    id: "ex-1",
    campaignId: "camp-1",
    campaignName: "Northwind Studio",
    businessLabel: "Northwind LLC",
    queueDifferentiator: "",
    updatedAt: "2026-07-02T12:00:00.000Z",
    ageLabel: "Jul 2",
    whatHappened: "Client requested another revision.",
    whyOwner: "Client boundary review — Owner business judgment required before work continues.",
    recommendedNextAction: "Review the request and approve the exception or hold the Studio boundary.",
    impactIfNoAction: "Client boundary remains unresolved.",
    whereWorkGoesAfter: "After resolve → Producer follows approved business judgment path.",
    availableActions: [{ kind: "resolve", label: "Resolve", irreversible: true }],
    row: {
      id: "ex-1",
      kind: "revision_exhausted",
      kindLabel: "Client boundary review",
      status: "waiting_owner",
      statusLabel: "Waiting on Owner",
      title: "Client Boundary Review",
      reasonPreview: null,
      taskId: "task-1",
      taskTitle: "Creative",
      assigneeDisplayName: null,
      raisedByDisplayName: "System",
      ownerReviewRequired: true,
      sentToClient: false,
      isAutoCreatedFromQa: false,
      nextRequiredAction: "Resolve",
      permissions: { canResolve: true, canAssign: true, canRaise: false },
      promotion: {
        showApprovalPanel: false,
        canApprove: false,
        canHold: false,
        canDecline: false,
        defaultWording: { clientFacingLabel: "", clientFacingPrompt: "", whyNeeded: "" },
      },
      resolvedAt: null,
    },
  };
}

function deskView(
  overrides: Partial<OwnerConsoleSequentialDeskView> = {},
): OwnerConsoleSequentialDeskView {
  return {
    items: [],
    trays: [
      { id: "needs_my_decision", label: "Needs My Decision", shortLabel: "🟠 Decisions", count: 0, actionRequired: true, itemIds: [] },
      { id: "needs_my_approval", label: "Needs My Approval", shortLabel: "🔵 Approvals", count: 0, actionRequired: true, itemIds: [] },
      { id: "ready_to_release", label: "Ready to Release", shortLabel: "🟢 Ready to Release", count: 0, actionRequired: true, itemIds: [] },
      { id: "needs_client", label: "Needs Client", shortLabel: "🟡 Waiting on Client", count: 0, actionRequired: false, itemIds: [] },
      { id: "recently_handled", label: "Recently Handled", shortLabel: "⚪ Completed Today", count: 0, actionRequired: false, itemIds: [] },
    ],
    todaysDecisionCount: 0,
    isEmpty: true,
    needsClientCount: 0,
    ...overrides,
  };
}

describe("owner-desk briefings", () => {
  it("builds a useful approval-first briefing instead of a generic desk line", () => {
    const currentItem = sequentialItem({
      trayId: "needs_my_approval",
      deskItem: {
        id: "desk:gate:1",
        campaignId: "camp-1",
        campaignName: "Make My Social Media Posts",
        jobId: "job-1",
        serviceName: "Social posts",
        title: "Ready for review — Make My Social Media Posts",
        reason: "approval_before_review",
        reasonLabel: "Needs My Approval",
        detail: "Production finished concepts.",
        drillDownHref: "/review-room",
        updatedAt: "2026-07-02T12:00:00.000Z",
      },
    });

    const parts = resolveOwnerDeskGreetingParts({
      ownerDisplayName: "Tagia",
      desk: deskView({
        isEmpty: false,
        todaysDecisionCount: 1,
        trays: deskView().trays.map((tray) =>
          tray.id === "needs_my_approval" ? { ...tray, count: 1 } : tray,
        ),
      }),
      currentItem,
      now: NOW,
    });

    expect(parts.briefing).toContain("Owner support or escalation review");
    expect(parts.briefing).not.toContain("folder waiting on your desk");
  });

  it("summarizes a large desk into manageable breakdown and estimate", () => {
    const summary = resolveOwnerDeskSummary(
      deskView({
        isEmpty: false,
        todaysDecisionCount: 22,
        trays: [
          { id: "needs_my_decision", label: "Needs My Decision", shortLabel: "🟠 Decisions", count: 3, actionRequired: true, itemIds: [] },
          { id: "needs_my_approval", label: "Needs My Approval", shortLabel: "🔵 Approvals", count: 18, actionRequired: true, itemIds: [] },
          { id: "ready_to_release", label: "Ready to Release", shortLabel: "🟢 Ready to Release", count: 1, actionRequired: true, itemIds: [] },
          { id: "needs_client", label: "Needs Client", shortLabel: "🟡 Waiting on Client", count: 0, actionRequired: false, itemIds: [] },
          { id: "recently_handled", label: "Recently Handled", shortLabel: "⚪ Completed Today", count: 0, actionRequired: false, itemIds: [] },
        ],
      }),
    );

    expect(summary.folderCount).toBe(22);
    expect(summary.breakdownLines).toEqual([
      { count: 18, label: "quick approvals" },
      { count: 3, label: "decisions" },
      { count: 1, label: "release" },
    ]);
    expect(summary.estimatedReviewLabel).toContain("29 minutes");
  });

  it("returns squishy says copy with one clear why sentence", () => {
    const briefing = resolveOwnerDeskBriefing({
      currentItem: sequentialItem({
        trayId: "needs_my_approval",
        deskItem: {
          id: "desk:gate:1",
          campaignId: "camp-1",
          campaignName: "Make My Social Media Posts",
          jobId: "job-1",
          serviceName: "Social posts",
          title: "Ready for review — Make My Social Media Posts",
          reason: "approval_before_review",
          reasonLabel: "Needs My Approval",
          detail: "Production finished concepts.",
          drillDownHref: "/review-room",
          updatedAt: "2026-07-02T12:00:00.000Z",
        },
      }),
      now: NOW,
    });

    expect(briefing?.squishySays).toContain("Production requested Owner support");
    expect(briefing?.squishySays).toContain("routine creative handoff");
  });

  it("builds greeting with factual decision context", () => {
    const line = resolveOwnerDeskGreeting({
      ownerDisplayName: "Tagia",
      desk: deskView({
        isEmpty: false,
        todaysDecisionCount: 1,
        trays: deskView().trays.map((tray) =>
          tray.id === "needs_my_decision" ? { ...tray, count: 1 } : tray,
        ),
      }),
      currentItem: sequentialItem({ exceptionCard: decisionCard() }),
      now: NOW,
    });
    expect(line).toContain("Good morning, Tagia.");
    expect(line).toContain("decision needs you");
    expect(line).not.toContain("...");
  });

  it("returns briefing with why reached and coordinator trace", () => {
    const briefing = resolveOwnerDeskBriefing({
      currentItem: sequentialItem({ exceptionCard: decisionCard() }),
      now: NOW,
    });
    expect(briefing?.whyReached).toContain("Owner business judgment required");
    expect(briefing?.squishySays).toContain("business judgment");
    expect(briefing?.coordinatorTrace.length).toBeGreaterThan(0);
    expect(resolveCoordinatorTraceForCard(decisionCard())).toContain("Policy:");
    expect(resolveCoordinatorTraceForCard(decisionCard())).toContain(
      "Revision allowance is exhausted",
    );
    expect(resolveCoordinatorTraceForCard(decisionCard())).not.toMatch(/campaign-exceptions:kind:/);
  });

  it("maps resolve to production destination copy that clears the desk", () => {
    const result = resolveOwnerPostDecisionBriefing("resolve_exception", decisionCard());
    expect(result.destination).toBe("production");
    expect(result.message).toContain("left your desk");
    expect(result.message).not.toContain("...");
  });

  it("maps approve to waiting on client", () => {
    const card = decisionCard();
    card.row.kind = "client_request";
    const result = resolveOwnerPostDecisionBriefing("approve_client_request", card);
    expect(result.destination).toBe("waiting_on_client");
    expect(result.message).toContain("left your desk");
  });

  it("maps owner approve for review to client review room", () => {
    const result = resolveOwnerDeskJobPostDecisionBriefing("owner_approve_for_review");
    expect(result.destination).toBe("client");
    expect(result.message).toContain("Review Room");
    expect(result.message).toContain("left your desk");
  });

  it("maps owner send-back to production destination", () => {
    const result = resolveOwnerDeskJobPostDecisionBriefing("owner_send_back_for_review");
    expect(result.destination).toBe("production");
    expect(result.message).toContain("left your desk");
  });

  it("maps owner ask-client to waiting on client", () => {
    const result = resolveOwnerDeskJobPostDecisionBriefing("owner_ask_client_review_gate");
    expect(result.destination).toBe("waiting_on_client");
    expect(result.message).toContain("client queue");
  });

  it("maps owner final release to Final Delivery", () => {
    const result = resolveOwnerDeskJobPostDecisionBriefing("owner_final_release");
    expect(result.destination).toBe("client");
    expect(result.message).toContain("Final Delivery");
    expect(result.message).toContain("left your desk");
  });

  it("maps owner send-back for release to production", () => {
    const result = resolveOwnerDeskJobPostDecisionBriefing("owner_send_back_for_release");
    expect(result.destination).toBe("production");
    expect(result.message).toContain("left your desk");
  });

  it("compliance hold — squishy says on closed folder", () => {
    const card = decisionCard();
    card.row.kind = "compliance_hold";
    const briefing = resolveOwnerDeskBriefing({
      currentItem: sequentialItem({
        exceptionCard: card,
        title: "Compliance hold — unverified claim",
      }),
      now: NOW,
    });
    expect(briefing?.squishySays).toContain("Compliance needs your review");
  });

  it("compliance hold — post-decision includes Owner Confirmation", () => {
    const clear = resolveOwnerComplianceHoldPostDecisionBriefing("owner_clear_compliance_hold");
    expect(clear.destination).toBe("production");
    expect(clear.message).toContain("left your desk");
    expect(clear.message).toContain("Confirmed:");

    const hold = resolveOwnerComplianceHoldPostDecisionBriefing("owner_hold_compliance_hold");
    expect(hold.destination).toBe("waiting_internal");
    expect(hold.message).toContain("internal QA review");
  });

  it("direction disagreement — squishy says on closed folder", () => {
    const card = decisionCard();
    card.row.kind = "direction_disagreement";
    const briefing = resolveOwnerDeskBriefing({
      currentItem: sequentialItem({
        exceptionCard: card,
        title: "Direction disagreement — strategy vs production",
      }),
      now: NOW,
    });
    expect(briefing?.squishySays).toContain("Production is paused");
  });

  it("direction disagreement — post-decision includes Owner Confirmation", () => {
    const confirm = resolveOwnerDirectionDisagreementPostDecisionBriefing(
      "owner_confirm_direction_disagreement",
    );
    expect(confirm.destination).toBe("production");
    expect(confirm.message).toContain("Direction confirmed");
    expect(confirm.message).toContain("Confirmed:");

    const hold = resolveOwnerDirectionDisagreementPostDecisionBriefing(
      "owner_hold_direction_disagreement",
    );
    expect(hold.destination).toBe("waiting_internal");
    expect(hold.message).toContain("internal direction review");
  });

  it("deadline — post-decision includes Owner Confirmation", () => {
    const commit = resolveOwnerDeadlinePostDecisionBriefing("owner_commit_deadline");
    expect(commit.message).toContain("Timeline committed");
    expect(commit.message).toContain("Confirmed:");
  });

  it("revision — post-decision includes Owner Confirmation", () => {
    const allow = resolveOwnerRevisionPostDecisionBriefing("owner_allow_revision");
    expect(allow.message).toContain("Business exception approved");
    expect(allow.message).toContain("Confirmed:");
  });

  it("scope — post-decision includes Owner Confirmation", () => {
    const approve = resolveOwnerScopePostDecisionBriefing("owner_approve_scope_change");
    expect(approve.message).toContain("Scope change approved");
    expect(approve.message).toContain("Confirmed:");
  });

  it("refund — post-decision includes Owner Confirmation", () => {
    const approve = resolveOwnerRefundPostDecisionBriefing("owner_approve_refund");
    expect(approve.message).toContain("Refund approved");
    expect(approve.message).toContain("Confirmed:");
  });

  it("complaint — post-decision includes Owner Confirmation", () => {
    const resolve = resolveOwnerComplaintPostDecisionBriefing("owner_resolve_complaint");
    expect(resolve.message).toContain("Response approved");
    expect(resolve.message).toContain("Confirmed:");
  });

  it("heavy lane — post-decision includes Owner Confirmation", () => {
    const resolve = resolveOwnerHeavyLanePostDecisionBriefing("owner_resolve_heavy_lane", "wait");
    expect(resolve.message).toContain("Lane order updated");
    expect(resolve.message).toContain("Confirmed:");
  });

  it("refund desk — squishy says on closed folder", () => {
    const briefing = resolveOwnerDeskBriefing({
      currentItem: sequentialItem({
        deskItem: {
          id: "desk:refund:job-1",
          reason: "refund_eligible",
          reasonLabel: "14-day refund eligible",
          campaignId: "c1",
          campaignName: "Acme",
          jobId: "job-1",
          serviceName: "Social",
          title: "Refund decision",
          detail: "Eligible",
          drillDownHref: "/x",
          updatedAt: "2026-07-03T12:00:00.000Z",
        },
        title: "Refund decision",
      }),
      now: NOW,
    });
    expect(briefing?.squishySays).toContain("refund decision needs you");
  });
});
