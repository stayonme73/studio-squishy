import { describe, expect, it } from "vitest";

import { ownerConsole } from "@/config/owner-console";
import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";
import { studioRoom2WholeCustomerTruthAndFrictionSweepV1 } from "@/config/studio-room-2-whole-customer-truth-and-friction-sweep-v1";
import { studioRoom3OwnerConsoleTruthAndDecisionDeskAuditV1 as cfg } from "@/config/studio-room-3-owner-console-truth-and-decision-desk-audit-v1";
import {
  classifyCommunicationDeliveryForOwnerDesk,
  classifyExceptionKindForOwnerDesk,
  classifyScanBucketForOwnerDesk,
  shouldExceptionKindAppearOnSequentialDesk,
} from "@/lib/campaign-tasks/owner-console-decision-boundary";
import { toOwnerDeskAwarenessScan } from "@/lib/campaign-tasks/owner-console-scan-view";
import {
  resolveStallCauseForDeskReason,
  resolveStallCauseForExceptionKind,
} from "@/lib/campaign-tasks/owner-console-stall-cause";
import {
  isOwnerWorthyCommunicationProblem,
  isRoutineCommunicationNoise,
  resolveOwnerCommunicationProblems,
} from "@/lib/job-control/owner-communication-visibility";
import type { JobCommunicationRecord } from "@/lib/job-control/types";
import { resolveOwnerDeskItems } from "@/lib/job-control/owner-desk";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { OwnerDecisionInteractionRecord } from "@/lib/campaign-tasks/owner-decision-interaction-types";
import { applyOwnerApproveRefund } from "@/lib/job-control/owner-decision-job-actions";
import { resolveCustomerCurrentStatusOverlay } from "@/lib/studio-customer-current-status";
import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

const SQUISHY = /squishy/i;
const DECISION_CORE = /decision core/i;
const KITCHEN = /kitchen v1/i;
const ALL_CAMPAIGNS = /all campaigns/i;

describe("STUDIO-OPERATING-ROOM-3-OWNER-CONSOLE-TRUTH-AND-DECISION-DESK-AUDIT-1", () => {
  it("is the current Room 3 section, parked for Manager, not closed", () => {
    expect(cfg.packageId).toBe(
      "STUDIO-OPERATING-ROOM-3-OWNER-CONSOLE-TRUTH-AND-DECISION-DESK-AUDIT-1",
    );
    expect(cfg.room).toBe(3);
    expect(cfg.sectionClosed).toBe(false);
    expect(cfg.parkForManager).toBe(true);
    expect(cfg.doNotAutoAdvance).toBe(true);
    expect(cfg.doNotStartSection2).toBe(true);
    expect(cfg.doNotStartRoom4).toBe(true);
    expect(cfg.doNotRebuildOwnerConsole).toBe(true);
    expect(cfg.doNotReopenResend).toBe(true);
    expect(cfg.visualRedesign).toBe(false);
    expect(cfg.priorRooms.room2Closed).toBe(true);
    expect(cfg.priorRooms.room2Section5CloseTip).toBe("b3397a6");
    expect(studioRoom2WholeCustomerTruthAndFrictionSweepV1.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoom).toBe(3);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoomId).toBe("owner-console");
    expect(studioLaunchReadinessExecutionOrderV1.room2Section5.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room3Section1.packageId).toBe(cfg.packageId);
    expect(studioLaunchReadinessExecutionOrderV1.room3Section1.parkForManager).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room3Section1.doNotStartSection2).toBe(true);
    expect(studioRoom1CustomerLifeCloseoutV1.roomClosed).toBe(false);
    expect(studioRoom1CustomerLifeCloseoutV1.room3Authorized).toBe(true);
    expect(cfg.comeBackLaterEmail.protectedCheckpoint).toBe("d6974eb");
    expect(cfg.outOfScope).toEqual(
      expect.arrayContaining(["rebuild_owner_console", "merge", "room_4"]),
    );
  });

  it("keeps genuine Owner decisions on the desk and routine work off it", () => {
    expect(shouldExceptionKindAppearOnSequentialDesk("scope_change")).toBe(true);
    expect(shouldExceptionKindAppearOnSequentialDesk("client_request")).toBe(true);
    expect(shouldExceptionKindAppearOnSequentialDesk("revision_exhausted")).toBe(true);
    expect(shouldExceptionKindAppearOnSequentialDesk("missing_client_fact")).toBe(false);
    expect(shouldExceptionKindAppearOnSequentialDesk("routine_internal")).toBe(false);
    expect(classifyExceptionKindForOwnerDesk("missing_client_fact")).toBe("routine_off_desk");
    expect(classifyScanBucketForOwnerDesk("ready_to_move")).toBe("routine_off_desk");
    expect(classifyScanBucketForOwnerDesk("blocked")).toBe("routine_off_desk");
    expect(classifyScanBucketForOwnerDesk("waiting_client")).toBe("useful_owner_visibility");
    expect(classifyCommunicationDeliveryForOwnerDesk("sent")).toBe("routine_off_desk");
    expect(classifyCommunicationDeliveryForOwnerDesk("pending_owner_send")).toBe("stale_residue");
    expect(classifyCommunicationDeliveryForOwnerDesk("delivery_failed")).toBe(
      "useful_owner_visibility",
    );
  });

  it("maps stall causes from existing kinds instead of a bare Stalled label", () => {
    expect(resolveStallCauseForExceptionKind("scope_change")?.category).toBe(
      "customer_requested_outside_scope",
    );
    expect(resolveStallCauseForExceptionKind("missing_client_fact")?.category).toBe(
      "waiting_on_customer",
    );
    expect(resolveStallCauseForDeskReason("refund_eligible").category).toBe(
      "policy_exception_requires_owner",
    );
    expect(resolveStallCauseForDeskReason("approval_before_review").label).not.toMatch(/^Stalled$/i);
  });

  it("does not treat successful notices or fake owner-send as Owner tasks", () => {
    const now = "2026-08-18T20:00:00.000Z";
    const records: JobCommunicationRecord[] = [
      {
        id: "comm-pay",
        campaignId: "c1",
        clientId: "client-1",
        jobId: "job-1",
        skuId: "v2-rtu-flyer",
        serviceName: "Make Me a Flyer",
        eventType: "payment_received",
        templateId: "comm.payment_received.v1",
        channel: "in_app_outbox",
        sender: { role: "system", displayName: "Studio" },
        reason: "Payment received",
        messageContent: "Paid",
        deliveryStatus: "pending_owner_send",
        createdAt: now,
        updatedAt: now,
        activityEventId: "act-pay",
      },
      {
        id: "comm-sent",
        campaignId: "c1",
        clientId: "client-1",
        jobId: "job-1",
        skuId: "v2-rtu-flyer",
        serviceName: "Make Me a Flyer",
        eventType: "production_started",
        templateId: "comm.production_started.v1",
        channel: "in_app_outbox",
        sender: { role: "system", displayName: "Studio" },
        reason: "Production started",
        messageContent: "Started",
        deliveryStatus: "sent",
        createdAt: now,
        updatedAt: now,
        activityEventId: "act-sent",
      },
      {
        id: "comm-fail",
        campaignId: "c1",
        clientId: "client-1",
        jobId: "job-1",
        skuId: "v2-rtu-flyer",
        serviceName: "Make Me a Flyer",
        eventType: "reminder_48_hour",
        templateId: "comm.reminder_48_hour.v1",
        channel: "in_app_outbox",
        sender: { role: "system", displayName: "Studio" },
        reason: "Contact failed",
        messageContent: "Failed",
        deliveryStatus: "delivery_failed",
        createdAt: now,
        updatedAt: now,
        activityEventId: "act-fail",
      },
    ];

    expect(isRoutineCommunicationNoise("sent")).toBe(true);
    expect(isOwnerWorthyCommunicationProblem("pending_owner_send")).toBe(false);
    expect(resolveOwnerCommunicationProblems(records).map((entry) => entry.id)).toEqual([
      "comm-fail",
    ]);
  });

  it("does not put a payment-confirmed job on the Owner desk without an exception", () => {
    const now = "2026-08-18T20:00:00.000Z";
    const job: PurchasedJobRecord = {
      jobId: "routine:v2-rtu-flyer",
      campaignId: "routine",
      skuId: "v2-rtu-flyer",
      serviceName: "Make Me a Flyer",
      spineStatus: "building_concepts",
      productionLane: "quick",
      createdAt: now,
      updatedAt: now,
    };
    const items = resolveOwnerDeskItems([
      {
        campaignId: "routine",
        campaignName: "Room 3 Routine Progress",
        jobs: [job],
        exceptions: [],
        laneViews: [],
        ownerDecisionInteractions: [],
      },
    ]);
    expect(items).toEqual([]);
  });

  it("records a refund Owner decision onto durable job truth", () => {
    const now = "2026-08-18T20:00:00.000Z";
    const owner: StudioUser = {
      id: "owner-1",
      email: "tagia@local.dev",
      displayName: "Tagia",
      roles: ["owner"],
    };
    const campaign: CampaignRecord = {
      campaignId: "room3-refund",
      campaignName: "Room 3 Refund Exception",
      campaignStatus: "BUILDING_CONCEPTS",
      campaignDescription: "",
      estimatedCompletion: "",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      paymentReceivedAt: now,
      createdAt: now,
      updatedAt: now,
    } as CampaignRecord;
    const job: PurchasedJobRecord = {
      jobId: "room3-refund:v2-rtu-flyer",
      campaignId: "room3-refund",
      skuId: "v2-rtu-flyer",
      serviceName: "Make Me a Flyer",
      spineStatus: "waiting_on_client",
      productionLane: "quick",
      createdAt: now,
      updatedAt: now,
    };
    const interaction: OwnerDecisionInteractionRecord = {
      id: "interaction-refund-room3",
      campaignId: "room3-refund",
      jobId: job.jobId,
      interactionKind: "refund_request",
      status: "waiting_owner",
      clientMessage: "I need a refund.",
      createdAt: now,
      updatedAt: now,
      refundSnapshot: {
        reason: "I need a refund.",
        requestedOutcome: "Full refund",
        productionStarted: false,
        receivedConceptsOrFiles: false,
        policyStatusLabel: "May be eligible",
        timelineFacts: "Waiting on client.",
        recommendedNextAction: "Approve or deny.",
        submittedAt: now,
      },
    };
    const envelope: ServerTasksEnvelope = {
      campaignId: "room3-refund",
      tasks: [],
      planFingerprint: "fp",
      updatedAt: now,
      version: 11,
      syncedAt: now,
      jobRecords: [job],
      jobActivityEvents: [],
      ownerDecisionInteractions: [interaction],
    };

    const before = resolveOwnerDeskItems([
      {
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        jobs: [job],
        exceptions: [],
        laneViews: [],
        ownerDecisionInteractions: [interaction],
      },
    ]);
    expect(before.some((item) => item.reason === "refund_eligible")).toBe(true);

    const result = applyOwnerApproveRefund(
      envelope,
      campaign,
      job.jobId,
      { reason: "Goodwill refund after stall.", ownerNotes: "Approved on desk." },
      owner,
      "client-1",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.spineStatus).toBe("refunded_cancelled");
    expect(result.job.refundOwnerDecisionAt).toBeTruthy();
    expect(
      result.envelope.ownerDecisionInteractions?.some(
        (entry) => entry.id === interaction.id && entry.status === "resolved",
      ),
    ).toBe(true);

    const after = resolveOwnerDeskItems([
      {
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        jobs: [result.job],
        exceptions: [],
        laneViews: [],
        ownerDecisionInteractions: result.envelope.ownerDecisionInteractions ?? [],
      },
    ]);
    expect(after.some((item) => item.reason === "refund_eligible")).toBe(false);
  });

  it("uses Owner operating language on the live desk copy", () => {
    const surfaces = [
      ownerConsole.coordinatorName,
      ownerConsole.squishySaysLabel,
      ownerConsole.pageLead,
      ownerConsole.allCampaignsLink,
      ownerConsole.campaignLabel,
      ownerConsole.refundDecision.decisionQuestion,
      ownerConsole.refundDecision.confirmApprove,
      ownerConsole.revisionDecision.whatTagiaReviews,
      ownerConsole.noProduction,
      ownerConsole.projectsCountLabel(2),
    ].join("\n");
    expect(surfaces).not.toMatch(SQUISHY);
    expect(surfaces).not.toMatch(DECISION_CORE);
    expect(surfaces).not.toMatch(KITCHEN);
    expect(surfaces).not.toMatch(ALL_CAMPAIGNS);
    expect(ownerConsole.squishySaysLabel).toBe("Desk briefing:");
    expect(ownerConsole.campaignLabel).toBe("Project");
  });

  it("maps cancelled spine to customer Board status after an Owner refund", () => {
    const overlay = resolveCustomerCurrentStatusOverlay(
      {
        campaignId: "room3-refund",
        campaignName: "Room 3 Refund Exception",
        campaignStatus: "BUILDING_CONCEPTS",
        campaignDescription: "",
        estimatedCompletion: "",
        packageId: "custom-studio-plan",
        packageLabel: "Custom Studio Plan",
        paymentReceivedAt: "2026-08-18T20:00:00.000Z",
        projectDetailsSubmittedAt: "2026-08-18T20:00:00.000Z",
        createdAt: "2026-08-18T20:00:00.000Z",
        updatedAt: "2026-08-18T20:00:00.000Z",
      } as CampaignRecord,
      {
        productionGatePassed: false,
        blockingRequiredCount: 0,
      },
      [
        {
          jobId: "room3-refund:v2-rtu-flyer",
          campaignId: "room3-refund",
          skuId: "v2-rtu-flyer",
          serviceName: "Make Me a Flyer",
          statusLabel: "Cancelled",
          isWaitingOnClient: false,
          hasProductionStarted: false,
          deliveredAt: null,
          clientDeadline: null,
        },
      ],
    );
    expect(overlay?.kind).toBe("cancelled");
    expect(overlay?.statusLabel).toBe("Cancelled");
    expect(overlay?.lead).toMatch(/Owner decision/i);
    expect(overlay?.lead).toMatch(/does not confirm that money has been returned/i);
  });

  it("keeps Scan noise buckets off the Owner awareness trays", () => {
    const filtered = toOwnerDeskAwarenessScan({
      buckets: [
        { id: "blocked", title: "Blocked", description: "", items: [{ id: "b1" } as never], isEmpty: false },
        { id: "ready_to_move", title: "Ready", description: "", items: [{ id: "r1" } as never], isEmpty: false },
        { id: "waiting_client", title: "Client", description: "", items: [{ id: "c1" } as never], isEmpty: false },
        { id: "recently_resolved", title: "Done", description: "", items: [], isEmpty: true },
        { id: "waiting_internal", title: "Internal", description: "", items: [{ id: "i1" } as never], isEmpty: false },
      ],
      totalItems: 4,
    });
    expect(filtered.buckets.map((bucket) => bucket.id)).toEqual([
      "waiting_client",
      "recently_resolved",
    ]);
    expect(filtered.totalItems).toBe(1);
  });
});
