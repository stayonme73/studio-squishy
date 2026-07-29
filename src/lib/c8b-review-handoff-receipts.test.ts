import { describe, expect, it } from "vitest";

import { C8A_HANDOFF_PRESENTATION_LABEL } from "@/config/c8a-review-handoff-presentation-v1";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import {
  buildFeedbackPackageInventory,
  buildLockedFeedbackPackageReceipt,
  buildStudioSubmissionReceipt,
  findLatestStudioReviewRelease,
  resolveC8bHandoffStep,
} from "@/lib/job-control/review-handoff-receipts";
import type { JobActivityEvent } from "@/lib/job-control/types";
import { deriveJobCustomerStage } from "@/lib/review-delivery-stage/derive-job-stage";

const jobId = "review-v1__sm-001";

function releaseEvent(): JobActivityEvent {
  return {
    id: "status_change:release-1",
    campaignId: "review-v1",
    jobId,
    kind: "status_change",
    occurredAt: "2026-07-03T11:00:00.000Z",
    actor: { role: "staff", userId: "prod-1", displayName: "Production Lead" },
    spineStatus: "ready_for_review",
    reason: "Production submitted client-ready work to Review Room",
  };
}

function receivedEvent(): JobActivityEvent {
  return {
    id: "client_review_received:release:status_change:release-1",
    campaignId: "review-v1",
    jobId,
    kind: "client_review_received",
    occurredAt: "2026-07-03T12:00:00.000Z",
    actor: { role: "client", userId: "client-1", displayName: "Client" },
    messageRef: "release:status_change:release-1",
  };
}

describe("C8b review handoff receipts", () => {
  it("builds Studio submission receipt from real release + version evidence", () => {
    const receipt = buildStudioSubmissionReceipt({
      jobId,
      activity: [releaseEvent()],
      deliverables: [
        {
          key: "deliverable-0",
          label: "Post concepts",
          prepared: true,
          proofFiles: [
            {
              id: "f1",
              filename: "proof.png",
              fileType: "image/png",
              accessHref: "/files/f1",
              versionLabel: "Proof v2",
              addedAt: "2026-07-03T10:55:00.000Z",
            },
          ],
        },
      ],
    });

    expect(receipt).not.toBeNull();
    expect(receipt?.statusLabel).toBe(
      C8A_HANDOFF_PRESENTATION_LABEL.submittedToCustomer,
    );
    expect(receipt?.versionLabel).toBe("Proof v2");
    expect(receipt?.submittedByLabel).toBe("Production Lead");
    expect(receipt?.actionRequired).toMatch(/return feedback or approve/i);
  });

  it("does not invent a Studio submission receipt without release evidence", () => {
    expect(
      buildStudioSubmissionReceipt({
        jobId,
        activity: [],
        deliverables: [],
      }),
    ).toBeNull();
  });

  it("uses truthful fallbacks when version evidence is missing", () => {
    const receipt = buildStudioSubmissionReceipt({
      jobId,
      activity: [releaseEvent()],
      deliverables: [
        {
          key: "deliverable-0",
          label: "Post concepts",
          prepared: true,
          proofFiles: [],
        },
      ],
    });
    expect(receipt?.versionLabel).toBe("Version label not provided");
    expect(receipt?.hasCompleteEvidence).toBe(false);
  });

  it("finds the latest Studio release for the job only", () => {
    const otherJob: JobActivityEvent = {
      ...releaseEvent(),
      id: "status_change:other",
      jobId: "other-job",
      occurredAt: "2026-07-04T11:00:00.000Z",
    };
    const later: JobActivityEvent = {
      ...releaseEvent(),
      id: "status_change:release-2",
      occurredAt: "2026-07-03T14:00:00.000Z",
    };
    const latest = findLatestStudioReviewRelease(
      [releaseEvent(), otherJob, later],
      jobId,
    );
    expect(latest?.activityId).toBe("status_change:release-2");
  });

  it("advances handoff presentation from received → reviewing → returned", () => {
    const feedback = createEmptyJobReviewFeedback("review-v1", jobId, ["d0"]);

    expect(
      resolveC8bHandoffStep({
        feedback,
        activity: [releaseEvent()],
        jobId,
      }).currentStepId,
    ).toBe("submitted_to_customer");

    expect(
      resolveC8bHandoffStep({
        feedback,
        activity: [releaseEvent(), receivedEvent()],
        jobId,
      }).currentStepId,
    ).toBe("received_by_customer");

    feedback.stickyNotes.push({
      id: "s1",
      deliverableKey: "d0",
      color: "yellow",
      text: "Tighten headline",
      createdAt: "2026-07-03T12:30:00.000Z",
    });
    expect(
      resolveC8bHandoffStep({
        feedback,
        activity: [releaseEvent(), receivedEvent()],
        jobId,
      }).currentStepId,
    ).toBe("customer_reviewing");

    feedback.submittedAt = "2026-07-03T13:00:00.000Z";
    feedback.submissionType = "revision_requested";
    expect(
      resolveC8bHandoffStep({
        feedback,
        activity: [releaseEvent(), receivedEvent()],
        jobId,
      }).currentLabel,
    ).toBe(C8A_HANDOFF_PRESENTATION_LABEL.feedbackReturned);
  });

  it("inventories feedback for pre-submit revision summary without fabricating notes", () => {
    const feedback = createEmptyJobReviewFeedback("review-v1", jobId, ["d0"]);
    expect(buildFeedbackPackageInventory(feedback, []).isEmpty).toBe(true);

    feedback.stickyNotes.push({
      id: "s1",
      deliverableKey: "d0",
      color: "yellow",
      text: "Tighten headline",
      createdAt: "2026-07-03T12:30:00.000Z",
    });
    feedback.drawSections.push("d0");
    feedback.sectionStatuses.d0 = "revision";

    const inventory = buildFeedbackPackageInventory(feedback, []);
    expect(inventory.stickyNoteCount).toBe(1);
    expect(inventory.stickyNoteTexts).toEqual(["Tighten headline"]);
    expect(inventory.drawingSectionCount).toBe(1);
    expect(inventory.sectionDecisions).toHaveLength(1);
    expect(inventory.isEmpty).toBe(false);
  });

  it("builds locked package receipt from persisted submitted feedback only", () => {
    const feedback = createEmptyJobReviewFeedback("review-v1", jobId, ["d0"]);
    expect(
      buildLockedFeedbackPackageReceipt({
        feedback,
        deliverables: [],
        senderLabel: "Client",
      }),
    ).toBeNull();

    feedback.submittedAt = "2026-07-03T13:00:00.000Z";
    feedback.submissionType = "approved_for_delivery";
    feedback.sectionStatuses.d0 = "approved";

    const locked = buildLockedFeedbackPackageReceipt({
      feedback,
      deliverables: [],
      senderLabel: "Client",
    });
    expect(locked?.statusLabel).toBe(C8A_HANDOFF_PRESENTATION_LABEL.approved);
    expect(locked?.submissionTypeLabel).toBe("Approved for delivery");
    expect(locked?.inventory.sectionDecisions).toHaveLength(1);
  });

  it("does not alter 7A stage derivation", () => {
    const stage = deriveJobCustomerStage({
      spineStatus: "ready_for_review",
      ownerApprovalPending: null,
      hasUnsubmittedReviewDraft: true,
      hasPriorRevisionCycle: false,
    });
    expect(stage.stageId).toBe("customer-reviewing");
  });
});
