import { describe, expect, it } from "vitest";

import { helpCenter } from "@/config/help-center";
import { studioPolicies } from "@/config/policies";
import { PROJECT_COMMUNICATION_PROBLEM_REPORT_V1 } from "@/config/project-communication-problem-report-v1";
import { REFUND_REQUEST_CUSTOMER_V1 } from "@/config/refund-request-customer-v1";
import type { CampaignRecord } from "@/config/studio-board";
import { studioBoard } from "@/config/studio-board";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { studioCustomerCurrentStatusV1 as currentStatus } from "@/config/studio-customer-current-status-v1";
import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";
import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioLobbyEntryV1 } from "@/config/studio-lobby-entry-v1";
import { feedbackStudio, isJobReviewClosedSpine } from "@/config/feedback-studio";
import { clientMaterialStatusLabel, materialsConfig } from "@/config/materials";
import { studioMaterialsUploadV1, isAllowedCustomerMaterialFile } from "@/config/studio-materials-upload-v1";
import { studioReviewRevisionFullLoopV1 } from "@/config/studio-review-revision-full-loop-v1";
import { studioRoom2WholeCustomerTruthAndFrictionSweepV1 as cfg } from "@/config/studio-room-2-whole-customer-truth-and-friction-sweep-v1";
import { clientDeliveryFileLabelsForSku } from "@/lib/studio-review-revision/flyer-purchase-delivery-truth";
import { resolveCampaignDetailsView } from "@/lib/campaign-details-view";
import { resolveBoardNextActionPresentation } from "@/lib/studio-board-next-action";
import { resolveStudioBoardView } from "@/lib/studio-board-view";
import { customerStatusLabel } from "@/lib/project-record-status";
import type { CustomerJobStatusSummary } from "@/lib/project-record-status";
import { answerCustomerLifeQuestion } from "@/lib/studio-customer-life/answer-question";
import { statusSummaryHasObsoleteContradiction } from "@/lib/studio-customer-life/summarize-status";
import type { JobSpineStatus } from "@/lib/job-control/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

const JOB_NOUN = /\bjobs?\b/i;
const FORBIDDEN_CUSTOMER = /squishy|this build|this version of the studio|decision core|studio kitchen|\bqa\b|sha256|release checks/i;

function campaign(
  status: CampaignRecord["campaignStatus"],
  extras: Partial<CampaignRecord> = {},
): CampaignRecord {
  const now = "2026-08-18T18:00:00.000Z";
  return {
    campaignId: "room2-s5-maya",
    campaignName: "Cedar & Bloom Home Organizing",
    campaignStatus: status,
    campaignDescription: "Back-to-School Reset flyer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: "cs_room2_s5",
      selectedServiceIds: ["v2-rtu-flyer"],
      decisionId: "dec_room2_s5",
      factFingerprint: "fp_room2_s5",
      draftRevision: 1,
      confirmedAt: now,
    },
    createdAt: now,
    updatedAt: now,
    deliverablesDelivered: {},
    ...extras,
  };
}

function jobSummary(
  spine: JobSpineStatus,
  extras: Partial<CustomerJobStatusSummary> = {},
): CustomerJobStatusSummary {
  return {
    jobId: "job-flyer",
    campaignId: "room2-s5-maya",
    skuId: "v2-rtu-flyer",
    serviceName: "Make Me a Flyer",
    statusLabel: customerStatusLabel(spine),
    isWaitingOnClient: spine === "waiting_on_client",
    hasProductionStarted: spine !== "ready_for_queue",
    deliveredAt: spine === "delivered" ? "2026-08-18T20:00:00.000Z" : null,
    clientDeadline: null,
    ...extras,
  };
}

function tasksForSpine(spine: JobSpineStatus): ServerTasksEnvelope {
  const now = "2026-08-18T18:00:00.000Z";
  return {
    campaignId: "room2-s5-maya",
    version: 12,
    planFingerprint: "fp_room2_s5",
    updatedAt: now,
    syncedAt: now,
    tasks: [],
    jobRecords: [
      {
        jobId: "job-flyer",
        campaignId: "room2-s5-maya",
        skuId: "v2-rtu-flyer",
        serviceName: "Make Me a Flyer",
        spineStatus: spine,
        productionLane: "quick",
        intakeComplete: true,
        updatedAt: now,
        productionStartedAt: spine === "ready_for_queue" ? undefined : now,
      },
    ],
  } as ServerTasksEnvelope;
}

describe("STUDIO-OPERATING-ROOM-2-WHOLE-CUSTOMER-TRUTH-AND-FRICTION-SWEEP-1", () => {
  it("is CLOSED at b3397a6 and is not the current execution room", () => {
    expect(cfg.packageId).toBe(
      "STUDIO-OPERATING-ROOM-2-WHOLE-CUSTOMER-TRUTH-AND-FRICTION-SWEEP-1",
    );
    expect(cfg.room).toBe(2);
    expect(cfg.sectionClosed).toBe(true);
    expect(cfg.parkForManager).toBe(false);
    expect(cfg.closeTip).toBe("b3397a6");
    expect(cfg.doNotAutoAdvance).toBe(true);
    expect(cfg.doNotStartOwnerConsole).toBe(false);
    expect(cfg.doNotStartRoom3).toBe(false);
    expect(cfg.doNotReopenResend).toBe(true);
    expect(cfg.doNotReopenSection4UnlessNewDefect).toBe(true);
    expect(cfg.visualRedesign).toBe(false);
    expect(cfg.priorSections.section1CloseTip).toBe("45b09b1");
    expect(cfg.priorSections.section2CloseTip).toBe("e609203");
    expect(cfg.priorSections.section3CloseTip).toBe("3328807");
    expect(cfg.priorSections.section4CloseTip).toBe("6cf9ca0");
    expect(cfg.comeBackLaterEmail.protectedCheckpoint).toBe("d6974eb");
    expect(cfg.comeBackLaterEmail.neitherPassNorFailForThisSweep).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoom).toBe(3);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoomClosed).toBe(false);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section4.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section4.closeTip).toBe("6cf9ca0");
    expect(studioLaunchReadinessExecutionOrderV1.room2Section5.packageId).toBe(cfg.packageId);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section5.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section5.closeTip).toBe("b3397a6");
    expect(studioLaunchReadinessExecutionOrderV1.room2Section5.nextSectionWaitsForScoutPackage).toBe(
      false,
    );
    expect(cfg.closeEvidence.liveCustomerWalk).toBe("46/46");
    expect(cfg.closeEvidence.targetedTests).toBe("111/111");
    expect(cfg.closeEvidence.ownerRoutine).toBe("NONE");
    expect(cfg.closeEvidence.merge).toBe(false);
    expect(cfg.closeEvidence.room2Verdict).toBe(
      "READY_TO_CLOSE_WITH_EXPLICIT_NON_BLOCKING_LIMITS",
    );
    expect([...cfg.scopedSpine]).toEqual([
      "front-door",
      "post-pay-intake",
      "materials",
      "board-and-project-record",
      "voice-and-status",
      "help-and-problem-reporting",
      "review",
      "revision-and-re-review",
      "approval-and-final",
      "delivery",
      "return-later",
      "stale-tab-and-mixed-state",
      "terminology-and-friction",
    ]);
  });

  it("keeps first-time entry distinct from Returning Client and checkout unpaid until Stripe", () => {
    expect(studioLobbyEntryV1.copy.newToStudio.cta).toMatch(/let.?s get started/i);
    expect(studioLobbyEntryV1.copy.returningSignedOut.cta).toMatch(/sign in/i);
    expect(studioLobbyEntryV1.copy.newToStudio.cta).not.toBe(
      studioLobbyEntryV1.copy.returningSignedOut.cta,
    );
    expect(conversationRoomGuideV1.routeRecommendedBadge).toBe("Suggested starting point");
    expect(conversationRoomGuideV1.checkoutOpenPanelCta).toBe("Open checkout");
    expect(conversationRoomGuideV1.checkoutCompleteCta).toMatch(/continue to secure checkout/i);
    expect(conversationRoomGuideV1.checkoutOpenPanelCta).not.toBe(
      conversationRoomGuideV1.checkoutCompleteCta,
    );
  });

  it("keeps Board, Project Record, and Voice on one current meaning", () => {
    const reviewCampaign = campaign("READY_FOR_REVIEW", {
      projectDetailsSubmittedAt: "2026-08-18T18:10:00.000Z",
    });
    const revisionJobs = [jobSummary("revision_requested")];
    const board = resolveStudioBoardView(reviewCampaign, {
      jobs: revisionJobs,
      movedToProduction: true,
      productionGatePassed: true,
    });
    const record = resolveCampaignDetailsView(reviewCampaign, { jobs: revisionJobs });
    expect(board.statusLabel).toBe(currentStatus.labels.revisionUnderway);
    expect(record.statusLabel).toBe(board.statusLabel);
    const voice = answerCustomerLifeQuestion("What is happening with my project?", {
      campaign: reviewCampaign,
      tasks: tasksForSpine("revision_requested"),
    });
    expect(voice.text).toMatch(/revision is in progress/i);
    expect(voice.text).not.toMatch(/open the review room/i);
    expect(statusSummaryHasObsoleteContradiction(voice.text)).toBe(false);

    const deliveryJobs = [jobSummary("ready_for_delivery")];
    const deliveryBoard = resolveStudioBoardView(reviewCampaign, {
      jobs: deliveryJobs,
      movedToProduction: true,
      productionGatePassed: true,
    });
    expect(deliveryBoard.statusLabel).toBe(currentStatus.labels.deliveryReady);
    const deliveryAction = resolveBoardNextActionPresentation({
      campaign: reviewCampaign,
      displayFacts: {
        jobs: deliveryJobs,
        movedToProduction: true,
        productionGatePassed: true,
      },
    });
    expect(deliveryAction.lead).not.toMatch(/open the review room/i);
    const deliveryVoice = answerCustomerLifeQuestion("Are my final files ready?", {
      campaign: reviewCampaign,
      tasks: tasksForSpine("ready_for_delivery"),
    });
    expect(deliveryVoice.text).toMatch(/final files are ready/i);
    expect(deliveryVoice.text).not.toMatch(/intake is still needed/i);

    const readyVoice = answerCustomerLifeQuestion("Is my work ready to review?", {
      campaign: reviewCampaign,
      tasks: tasksForSpine("ready_for_review"),
    });
    expect(readyVoice.text).toMatch(/ready for review|open the review room/i);
    expect(readyVoice.text).not.toMatch(/review is not open yet/i);
  });

  it("keeps Ask a question distinct from Report a problem and Help Center job-free", () => {
    expect(PROJECT_COMMUNICATION_PROBLEM_REPORT_V1.intentQuestionLabel).toBe("Ask a question");
    expect(PROJECT_COMMUNICATION_PROBLEM_REPORT_V1.intentProblemLabel).toBe("Report a problem");
    expect(studioBoard.campaignDetails.squishy.title).toBe("Ask the Studio");
    expect(studioBoard.campaignDetails.squishy.askLabel).toBe("Ask the Studio");
    const helpText = JSON.stringify(helpCenter);
    const policyText = JSON.stringify(studioPolicies);
    expect(helpText).not.toMatch(JOB_NOUN);
    expect(policyText).not.toMatch(/\beach job\b/i);
    expect(REFUND_REQUEST_CUSTOMER_V1.jobLabel).toBe("Which service is this request about?");
    expect(REFUND_REQUEST_CUSTOMER_V1.jobSelectPlaceholder).toBe("Select a service");
    expect(REFUND_REQUEST_CUSTOMER_V1.jobSelectPlaceholder).not.toMatch(JOB_NOUN);
  });

  it("keeps wordmark-only flyer materials from demanding a logo", () => {
    expect(studioMaterialsUploadV1.customerCopy.optionalLogoPrompt).toMatch(
      /a logo is not required for this flyer/i,
    );
    expect(studioMaterialsUploadV1.customerCopy.receivedStored).toMatch(
      /uploaded is not the same as approved for use/i,
    );
    expect(studioMaterialsUploadV1.customerCopy.duplicateKept).toMatch(/already have this exact file/i);
    expect(studioMaterialsUploadV1.customerCopy.unsupportedType).toMatch(/not supported/i);
    expect(isAllowedCustomerMaterialFile("maya.png", "image/png")).toBe(true);
    expect(isAllowedCustomerMaterialFile("notes.exe", "application/x-msdownload")).toBe(false);
    expect(studioCustomerLifeV1.customerCopy.uploadReceived).toMatch(
      /does not automatically mean it is approved for use/i,
    );
    expect(clientMaterialStatusLabel("missing", "optional")).toBe("Optional");
    expect(clientMaterialStatusLabel("missing")).toBe("Still needed");
    expect(materialsConfig.intakeSyncingBody).not.toMatch(/campaign/i);
  });

  it("does not keep a closed Review looking like the next action", () => {
    expect(isJobReviewClosedSpine("approved")).toBe(true);
    expect(isJobReviewClosedSpine("ready_for_delivery")).toBe(true);
    expect(isJobReviewClosedSpine("delivered")).toBe(true);
    expect(isJobReviewClosedSpine("ready_for_review")).toBe(false);
    expect(
      studioReviewRevisionFullLoopV1.customerCopy.approvedVersionLead("Version 1"),
    ).toMatch(/you approved Version 1/i);
    expect(
      studioReviewRevisionFullLoopV1.customerCopy.approvedVersionLead("Version 1"),
    ).not.toMatch(/you are reviewing/i);
    expect(feedbackStudio.jobReview.submittedApproval).toMatch(/approved/i);
    expect(feedbackStudio.jobReview.deliverableReady).toBe("Ready for review");
  });

  it("keeps flyer delivery labels as print-ready PDF and digital PNG", () => {
    const labels = clientDeliveryFileLabelsForSku("v2-rtu-flyer", [
      "One defined design direction",
      "One finished single-sided flyer design — one agreed size only",
      "Print-ready PDF",
      "Digital PNG or JPG version for sharing online (one agreed size)",
      "Studio quality-control review before delivery",
    ]);
    expect(labels).toEqual([
      "Print-ready PDF",
      "Digital PNG or JPG version for sharing online (one agreed size)",
    ]);
    expect(JSON.stringify(labels)).not.toMatch(/image\/png|application\/pdf/i);
  });

  it("does not put forbidden implementation language in live customer copy sources", () => {
    const surfaces = [
      JSON.stringify(helpCenter),
      JSON.stringify(studioPolicies),
      JSON.stringify(studioCustomerLifeV1.customerCopy),
      JSON.stringify(currentStatus),
      conversationRoomGuideV1.checkoutOpenPanelCta,
      conversationRoomGuideV1.checkoutCompleteCta,
      studioMaterialsUploadV1.customerCopy.optionalLogoPrompt,
      studioBoard.campaignDetails.squishy.title,
    ].join("\n");
    expect(surfaces).not.toMatch(FORBIDDEN_CUSTOMER);
  });
});
