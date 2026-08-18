import { describe, expect, it } from "vitest";

import { c8bReviewHandoffReceiptsV1 } from "@/config/c8b-review-handoff-receipts-v1";
import { C8D_ROOM_STATE_COPY } from "@/config/c8d-unified-room-state-v1";
import { customerVisibleFileFormatLabel, deliverables } from "@/config/deliverables";
import { feedbackStudio } from "@/config/feedback-studio";
import { PROJECT_COMMUNICATION_PROBLEM_REPORT_V1 } from "@/config/project-communication-problem-report-v1";
import { reviewRoom } from "@/config/review-room";
import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";
import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom2ReviewFinalDeliveryTruthAndFrictionV1 as cfg } from "@/config/studio-room-2-review-final-delivery-truth-and-friction-v1";
import { CORRECTION_EXHAUSTED_WORDING } from "@/lib/job-control/review-room-view";
import { customerFacingVersionLabel } from "@/lib/studio-customer-life/assemble-truth";
import { answerCustomerLifeQuestion } from "@/lib/studio-customer-life/answer-question";
import { clientDeliveryFileLabelsForSku } from "@/lib/studio-review-revision/flyer-purchase-delivery-truth";

const SQUISHY = /squishy/i;
const FEEDBACK_STUDIO = /feedback studio/i;
const CORRECTION_ROUNDS = /correction rounds/i;
const THIS_VERSION = /in this version|in this build/i;

describe("STUDIO-OPERATING-ROOM-2-REVIEW-FINAL-DELIVERY-TRUTH-AND-FRICTION-1", () => {
  it("is the current Room 2 section, parked for Manager, not closed", () => {
    expect(cfg.packageId).toBe(
      "STUDIO-OPERATING-ROOM-2-REVIEW-FINAL-DELIVERY-TRUTH-AND-FRICTION-1",
    );
    expect(cfg.room).toBe(2);
    expect(cfg.sectionClosed).toBe(false);
    expect(cfg.parkForManager).toBe(true);
    expect(cfg.parkEvidence.liveCustomerWalk).toBe("23/23");
    expect(cfg.parkEvidence.targetedTests).toBe("118/118");
    expect(cfg.parkEvidence.ownerRoutine).toBe("NONE");
    expect(cfg.doNotAutoAdvance).toBe(true);
    expect(cfg.doNotStartOwnerConsole).toBe(true);
    expect(cfg.doNotReopenResend).toBe(true);
    expect(cfg.doNotReopenRoom1UnlessNewDefect).toBe(true);
    expect(cfg.visualRedesign).toBe(false);
    expect(cfg.ownerRoutine).toBe("NONE");
    expect(cfg.priorSections.section1CloseTip).toBe("45b09b1");
    expect(cfg.priorSections.section2CloseTip).toBe("e609203");
    expect(cfg.priorSections.section2LedgerStampNotClose).toBe("be8fd06");
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoom).toBe(2);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section2.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section2.nextSectionWaitsForScoutPackage).toBe(
      false,
    );
    expect(studioLaunchReadinessExecutionOrderV1.room2Section3.packageId).toBe(cfg.packageId);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section3.sectionClosed).toBe(false);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section3.parkForManager).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section3.nextSectionWaitsForScoutPackage).toBe(
      true,
    );
    expect([...cfg.scopedSpine]).toEqual([
      "review-entry",
      "version-truth",
      "question-revision-approval",
      "revision-allowance",
      "approval-clarity",
      "final-state",
      "delivery-and-download",
      "return-later",
      "help-and-communication-in-review",
    ]);
  });

  it("keeps Review, revision, and approval actions visibly distinct", () => {
    expect(feedbackStudio.pageSubtitle).toBe("Review your work");
    expect(feedbackStudio.pageSubtitle).not.toMatch(FEEDBACK_STUDIO);
    expect(feedbackStudio.feedbackPanel.requestRevision).toBe("Mark section for changes");
    expect(feedbackStudio.feedbackPanel.requestRevisionJob).toBe("Request a revision");
    expect(feedbackStudio.feedbackPanel.approveForDelivery).toBe("Approve this version");
    expect(feedbackStudio.feedbackPanel.requestRevision).not.toBe(
      feedbackStudio.feedbackPanel.requestRevisionJob,
    );
    expect(c8bReviewHandoffReceiptsV1.confirmRevision.confirmCta).toBe("Send revision request");
    expect(c8bReviewHandoffReceiptsV1.confirmApproval.confirmCta).toBe(
      "Yes, approve this version",
    );
    expect(c8bReviewHandoffReceiptsV1.confirmRevision.lead("Version 1")).toMatch(
      /uses one included revision round/i,
    );
    expect(c8bReviewHandoffReceiptsV1.confirmApproval.lead("Version 1")).toMatch(
      /You are approving Version 1/i,
    );
    expect(PROJECT_COMMUNICATION_PROBLEM_REPORT_V1.intentQuestionLabel).toBe("Ask a question");
    expect(PROJECT_COMMUNICATION_PROBLEM_REPORT_V1.intentQuestionLabel).not.toMatch(/revision/i);
  });

  it("uses revision-round language the customer can understand, not correction accounting jargon", () => {
    expect(feedbackStudio.correctionAccounting.label).toBe("Revision rounds");
    expect(feedbackStudio.correctionAccounting.label).not.toMatch(CORRECTION_ROUNDS);
    expect(feedbackStudio.feedbackPanel.revisionLimitNotice).toMatch(/included revision rounds/i);
    expect(feedbackStudio.feedbackPanel.revisionLimitNotice).not.toMatch(CORRECTION_ROUNDS);
    expect(CORRECTION_EXHAUSTED_WORDING).toBe(feedbackStudio.feedbackPanel.revisionLimitNotice);
    expect(feedbackStudio.feedbackPanel.revisionLimitShort).toMatch(/included revision rounds/i);
  });

  it("keeps customer Voice version answers free of hashes and artifact ids", () => {
    expect(customerFacingVersionLabel("flyer-v1")).toBe("Version 1");
    expect(customerFacingVersionLabel("Version 2")).toBe("Version 2");
    expect(studioCustomerLifeV1.customerCopy.approvedVersion("Version 1")).toMatch(
      /You approved Version 1/i,
    );
    expect(studioCustomerLifeV1.customerCopy.approvedVersion("Version 1")).not.toMatch(/sha256/i);
    expect(studioCustomerLifeV1.customerCopy.qaPassed).not.toMatch(/internal quality/i);
    expect(studioCustomerLifeV1.customerCopy.holdingQa).not.toMatch(/internal quality/i);
    const unlabeled = answerCustomerLifeQuestion("Which version did I approve?", {
      campaign: null,
    });
    expect(unlabeled.text).not.toMatch(/sha256/i);
    expect(unlabeled.text).not.toMatch(SQUISHY);
  });

  it("labels flyer files as print-ready PDF and digital PNG, not MIME", () => {
    expect(customerVisibleFileFormatLabel("image/png", "flyer-version-1.png")).toBe(
      "Digital PNG",
    );
    expect(customerVisibleFileFormatLabel("application/pdf", "flyer-version-1.pdf")).toBe(
      "Print-ready PDF",
    );
    expect(deliverables.jobDelivery.downloadNamed("Print-ready PDF")).toBe(
      "Download Print-ready PDF",
    );
    expect(deliverables.eyebrow).toBe("Final Delivery");
    expect(deliverables.footer.startNewCampaign).toBe("START NEW PROJECT");
    expect(deliverables.pageSubtitle).not.toMatch(/marketing campaign/i);
    expect(C8D_ROOM_STATE_COPY.delivery.pageLead).not.toMatch(/truthful/i);
    expect(C8D_ROOM_STATE_COPY.final.pageLead).toMatch(/Review is complete/i);
  });

  it("removes Campaign / Kitchen / Squishy residue from Review and Delivery customer copy", () => {
    expect(JSON.stringify(feedbackStudio.clientAccess)).not.toMatch(SQUISHY);
    expect(JSON.stringify(feedbackStudio.noCampaign)).not.toMatch(/campaign/i);
    expect(feedbackStudio.noCampaign.title).toBe("No project yet");
    expect(reviewRoom.pageTitle).toBe("Review Room");
    expect(reviewRoom.noCampaign.title).toBe("No project yet");
    expect(deliverables.sidebar.nav.campaignDetails).toBe("Project Record");
    expect(deliverables.sidebar.nav.reviewCampaigns).toBe("Review Room");
    expect(JSON.stringify(feedbackStudio.pageSubtitle)).not.toMatch(THIS_VERSION);
    expect(JSON.stringify(C8D_ROOM_STATE_COPY)).not.toMatch(SQUISHY);
    expect(JSON.stringify(C8D_ROOM_STATE_COPY)).not.toMatch(/kitchen/i);
    expect(clientDeliveryFileLabelsForSku("v2-rtu-flyer", [
      "One defined design direction",
      "One finished single-sided flyer design — one agreed size only",
      "Print-ready PDF",
      "Digital PNG or JPG version for sharing online (one agreed size)",
      "Studio quality-control review before delivery",
    ])).toEqual([
      "Print-ready PDF",
      "Digital PNG or JPG version for sharing online (one agreed size)",
    ]);
  });
});
