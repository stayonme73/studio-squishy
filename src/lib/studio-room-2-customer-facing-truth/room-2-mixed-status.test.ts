import { describe, expect, it } from "vitest";

import { feedbackStudio } from "@/config/feedback-studio";
import { helpCenter } from "@/config/help-center";
import { studioPolicies } from "@/config/policies";
import { REFUND_REQUEST_CUSTOMER_V1 } from "@/config/refund-request-customer-v1";
import type { CampaignRecord } from "@/config/studio-board";
import { studioCustomerCurrentStatusV1 as currentStatus } from "@/config/studio-customer-current-status-v1";
import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom2MixedStatusAndTerminologyTruthV1 as cfg } from "@/config/studio-room-2-mixed-status-and-terminology-truth-v1";
import { RAW_SERVICE_CATALOG } from "@/catalog/services";
import { resolveCampaignDetailsView } from "@/lib/campaign-details-view";
import { resolveBoardNextActionPresentation } from "@/lib/studio-board-next-action";
import { resolveStudioBoardView } from "@/lib/studio-board-view";
import { customerStatusLabel } from "@/lib/project-record-status";
import type { CustomerJobStatusSummary } from "@/lib/project-record-status";
import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";

const JOB_NOUN = /\bjobs?\b/i;

function campaign(status: CampaignRecord["campaignStatus"], extras: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = "2026-08-18T16:00:00.000Z";
  return {
    campaignId: "room2-s4-maya",
    campaignName: "Cedar & Bloom Home Organizing",
    campaignStatus: status,
    campaignDescription: "Back-to-School Reset flyer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
    deliverablesDelivered: {},
    ...extras,
  };
}

function jobSummary(
  spine: Parameters<typeof customerStatusLabel>[0],
  extras: Partial<CustomerJobStatusSummary> = {},
): CustomerJobStatusSummary {
  return {
    jobId: "job-flyer",
    campaignId: "room2-s4-maya",
    skuId: "v2-rtu-flyer",
    serviceName: "Make Me a Flyer",
    statusLabel: customerStatusLabel(spine),
    isWaitingOnClient: spine === "waiting_on_client",
    hasProductionStarted: spine !== "ready_for_queue",
    deliveredAt: spine === "delivered" ? "2026-08-18T18:00:00.000Z" : null,
    clientDeadline: null,
    ...extras,
  };
}

describe("STUDIO-OPERATING-ROOM-2-MIXED-STATUS-AND-TERMINOLOGY-TRUTH-1", () => {
  it("is CLOSED at 6cf9ca0 and is not the current Room 2 section", () => {
    expect(cfg.packageId).toBe(
      "STUDIO-OPERATING-ROOM-2-MIXED-STATUS-AND-TERMINOLOGY-TRUTH-1",
    );
    expect(cfg.room).toBe(2);
    expect(cfg.sectionClosed).toBe(true);
    expect(cfg.parkForManager).toBe(false);
    expect(cfg.closeEvidence.liveCustomerWalk).toBe("17/17");
    expect(cfg.closeEvidence.targetedTests).toBe("136/136");
    expect(cfg.closeTip).toBe("6cf9ca0");
    expect(cfg.doNotAutoAdvance).toBe(true);
    expect(cfg.doNotStartOwnerConsole).toBe(true);
    expect(cfg.doNotReopenResend).toBe(true);
    expect(cfg.doNotReopenSection3UnlessNewDefect).toBe(true);
    expect(cfg.visualRedesign).toBe(false);
    expect(cfg.priorSections.section1CloseTip).toBe("45b09b1");
    expect(cfg.priorSections.section2CloseTip).toBe("e609203");
    expect(cfg.priorSections.section3CloseTip).toBe("3328807");
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoom).toBe(4);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section3.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section3.closeTip).toBe("3328807");
    expect(studioLaunchReadinessExecutionOrderV1.room2Section4.packageId).toBe(cfg.packageId);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section4.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section4.closeTip).toBe("6cf9ca0");
    expect(studioLaunchReadinessExecutionOrderV1.room2Section4.nextSectionWaitsForScoutPackage).toBe(
      false,
    );
    expect(studioLaunchReadinessExecutionOrderV1.room2Section5.packageId).toBe(
      "STUDIO-OPERATING-ROOM-2-WHOLE-CUSTOMER-TRUTH-AND-FRICTION-SWEEP-1",
    );
    expect(studioLaunchReadinessExecutionOrderV1.room2Section5.sectionClosed).toBe(true);
    expect([...cfg.scopedSpine]).toEqual([
      "mixed-state-board",
      "status-hierarchy",
      "customer-facing-terminology",
      "help-center-residue",
      "update-history",
      "concept-strategy-labels",
      "cross-surface-agreement",
      "stale-tab-and-mixed-state",
      "customer-eyes-walk",
    ]);
  });

  it("keeps paid intake-needed and intake-received from competing with later Review language", () => {
    const paid = campaign("PAYMENT_RECEIVED");
    const paidView = resolveStudioBoardView(paid);
    expect(paidView.statusLabel).toBe(currentStatus.labels.intakeNeeded);
    expect(resolveBoardNextActionPresentation({ campaign: paid }).lead).not.toMatch(
      /open the review room/i,
    );

    const received = campaign("BUILDING_CONCEPTS", {
      projectDetailsSubmittedAt: "2026-08-18T16:10:00.000Z",
    });
    const receivedView = resolveStudioBoardView(received, {
      productionGatePassed: false,
      movedToProduction: false,
      blockingRequiredCount: 0,
      jobs: [jobSummary("building_concepts", { hasProductionStarted: false })],
    });
    expect(receivedView.statusLabel).toBe("Project Intake Received");
    expect(receivedView.statusLabel).not.toBe(currentStatus.labels.reviewReady);
  });

  it("does not keep Ready for Review as the current state during revision or after approval", () => {
    const reviewCampaign = campaign("READY_FOR_REVIEW", {
      projectDetailsSubmittedAt: "2026-08-18T16:10:00.000Z",
    });

    const revision = resolveStudioBoardView(reviewCampaign, {
      jobs: [jobSummary("revision_requested")],
      movedToProduction: true,
      productionGatePassed: true,
    });
    expect(revision.statusLabel).toBe(currentStatus.labels.revisionUnderway);
    expect(revision.progressSteps.find((step) => step.state === "current")?.detail).toBe(
      currentStatus.progressDetails.revisionUnderway,
    );
    const revisionAction = resolveBoardNextActionPresentation({
      campaign: reviewCampaign,
      displayFacts: {
        jobs: [jobSummary("revision_requested")],
        movedToProduction: true,
        productionGatePassed: true,
      },
    });
    expect(revisionAction.action).toBeNull();
    expect(revisionAction.lead).not.toMatch(/open the review room/i);

    const approved = resolveStudioBoardView(reviewCampaign, {
      jobs: [jobSummary("approved")],
      movedToProduction: true,
      productionGatePassed: true,
    });
    expect(approved.statusLabel).toBe(currentStatus.labels.approvedPreparing);
    expect(approved.progressSteps.find((step) => step.id === "READY_FOR_REVIEW")?.state).toBe(
      "complete",
    );
    const approvedRecord = resolveCampaignDetailsView(reviewCampaign, {
      jobs: [jobSummary("approved")],
    });
    expect(approvedRecord.statusLabel).toBe(approved.statusLabel);
    expect(approvedRecord.deliverables.ready).toBe(false);

    const delivery = resolveStudioBoardView(reviewCampaign, {
      jobs: [jobSummary("ready_for_delivery")],
      movedToProduction: true,
      productionGatePassed: true,
    });
    expect(delivery.statusLabel).toBe(currentStatus.labels.deliveryReady);
    expect(delivery.progressSteps.find((step) => step.state === "current")?.id).toBe("DELIVERED");
    const deliveryAction = resolveBoardNextActionPresentation({
      campaign: reviewCampaign,
      displayFacts: {
        jobs: [jobSummary("ready_for_delivery")],
        movedToProduction: true,
        productionGatePassed: true,
      },
    });
    expect(deliveryAction.action?.type).toBe("navigate");
    if (deliveryAction.action?.type === "navigate") {
      expect(deliveryAction.action.href).toContain("deliverables");
    }
  });

  it("aligns Board, Project Record, and job-status labels for the same spine", () => {
    const reviewCampaign = campaign("READY_FOR_REVIEW", {
      projectDetailsSubmittedAt: "2026-08-18T16:10:00.000Z",
    });
    const jobs = [jobSummary("ready_for_review")];
    const board = resolveStudioBoardView(reviewCampaign, {
      jobs,
      movedToProduction: true,
      productionGatePassed: true,
    });
    const record = resolveCampaignDetailsView(reviewCampaign, { jobs });
    expect(board.statusLabel).toBe(currentStatus.labels.reviewReady);
    expect(record.statusLabel).toBe(board.statusLabel);
    expect(jobs[0]?.statusLabel).toBe(board.statusLabel);
    expect(studioCustomerLifeV1.customerCopy.statusReviewReady).toMatch(/ready for review/i);
    expect(studioCustomerLifeV1.customerCopy.holdingRevision).toMatch(/revision is in progress/i);
  });

  it("removes customer-visible job residue from Help Center and refund copy", () => {
    const policyText = JSON.stringify(studioPolicies);
    const helpText = JSON.stringify(helpCenter);
    const refundText = Object.values(REFUND_REQUEST_CUSTOMER_V1)
      .filter((value): value is string => typeof value === "string")
      .join(" ");
    expect(policyText).not.toMatch(/\beach job\b/i);
    expect(policyText).not.toMatch(/\bper job\b/i);
    expect(helpText).not.toMatch(JOB_NOUN);
    expect(refundText).not.toMatch(/\bjobs?\b/i);
    expect(REFUND_REQUEST_CUSTOMER_V1.jobLabel).toBe("Which service is this request about?");
    expect(REFUND_REQUEST_CUSTOMER_V1.jobSelectPlaceholder).toBe("Select a service");
    expect(REFUND_REQUEST_CUSTOMER_V1.jobSelectPlaceholder).not.toMatch(JOB_NOUN);
    expect(studioPolicies.faq.items.find((item) => item.id === "revision-count")?.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringMatching(/each service/i),
        }),
      ]),
    );
  });

  it("records Campaign Strategy labels as dormant limited-SKU residue, not Maya flyer copy", () => {
    expect(feedbackStudio.previewSections["campaign-strategy-launch"]).toBe(
      "Campaign Strategy & Launch Plan",
    );
    const strategy = RAW_SERVICE_CATALOG.find((service) => service.id === "cp-001");
    expect(strategy?.name).toBe("Campaign Launch Kit");
    expect(strategy?.launchStatus).toBe("limited");
    expect(strategy?.id).not.toBe("v2-rtu-flyer");
  });
});
