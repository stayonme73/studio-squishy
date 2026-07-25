import { describe, expect, it } from "vitest";

import {
  REVIEW_DELIVERY_STAGE_DEFINITIONS,
  SPINE_TO_DEFAULT_STAGE,
} from "@/config/review-delivery-stage-v1";
import type { JobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import type { JobSpineStatus } from "@/lib/job-control/types";

import { deriveCampaignCustomerStageSummary } from "./derive-campaign-summary";
import { deriveJobCustomerStage } from "./derive-job-stage";
import { hasUnsubmittedReviewDraft } from "./draft-progress";
import type { JobCustomerStage, JobCustomerStageFacts } from "./types";

const ALL_SPINE: JobSpineStatus[] = [
  "ready_for_queue",
  "building_concepts",
  "ready_for_review",
  "revision_requested",
  "approved",
  "ready_for_delivery",
  "delivered",
  "waiting_on_client",
  "refunded_cancelled",
];

function stage(
  facts: JobCustomerStageFacts,
): JobCustomerStage {
  return deriveJobCustomerStage(facts);
}

function job(
  spineStatus: JobSpineStatus,
  overlays: Omit<JobCustomerStageFacts, "spineStatus"> = {},
): JobCustomerStage {
  return deriveJobCustomerStage({ spineStatus, ...overlays });
}

describe("SPINE_TO_DEFAULT_STAGE", () => {
  it("covers every JobSpineStatus", () => {
    for (const spine of ALL_SPINE) {
      expect(SPINE_TO_DEFAULT_STAGE[spine]).toBeTruthy();
      expect(REVIEW_DELIVERY_STAGE_DEFINITIONS[SPINE_TO_DEFAULT_STAGE[spine]]).toBeTruthy();
    }
  });
});

describe("deriveJobCustomerStage — spine-only", () => {
  const expected: Record<JobSpineStatus, string> = {
    ready_for_queue: "studio-working",
    building_concepts: "studio-working",
    ready_for_review: "work-ready-for-review",
    revision_requested: "revision-submitted",
    approved: "approved-for-final-delivery",
    ready_for_delivery: "approved-for-final-delivery",
    delivered: "final-delivery",
    waiting_on_client: "waiting-on-you",
    refunded_cancelled: "cancelled",
  };

  for (const spine of ALL_SPINE) {
    it(`maps ${spine} → ${expected[spine]}`, () => {
      const result = stage({ spineStatus: spine });
      expect(result.stageId).toBe(expected[spine]);
      expect(result.label).toBe(
        REVIEW_DELIVERY_STAGE_DEFINITIONS[expected[spine] as keyof typeof REVIEW_DELIVERY_STAGE_DEFINITIONS]
          .label,
      );
      expect(result.spineStatus).toBe(spine);
      expect(result.explanation.length).toBeGreaterThan(0);
    });
  }

  it("keeps Waiting on You separate from Studio Working", () => {
    expect(stage({ spineStatus: "waiting_on_client" }).stageId).toBe("waiting-on-you");
    expect(stage({ spineStatus: "building_concepts" }).stageId).toBe("studio-working");
    expect(stage({ spineStatus: "waiting_on_client" }).actionOwner).toBe("customer");
    expect(stage({ spineStatus: "building_concepts" }).actionOwner).toBe("studio");
  });

  it("marks delivered and cancelled terminal", () => {
    expect(stage({ spineStatus: "delivered" }).terminal).toBe(true);
    expect(stage({ spineStatus: "refunded_cancelled" }).terminal).toBe(true);
    expect(stage({ spineStatus: "building_concepts" }).terminal).toBe(false);
  });
});

describe("deriveJobCustomerStage — overlays", () => {
  it("treats ownerApprovalPending before_review as Studio Working", () => {
    const result = stage({
      spineStatus: "ready_for_review",
      ownerApprovalPending: "before_review",
    });
    expect(result.stageId).toBe("studio-working");
  });

  it("does not treat before_delivery as a review overlay", () => {
    const result = stage({
      spineStatus: "ready_for_delivery",
      ownerApprovalPending: "before_delivery",
    });
    expect(result.stageId).toBe("approved-for-final-delivery");
  });

  it("uses Customer Reviewing for material unsubmitted draft", () => {
    const result = stage({
      spineStatus: "ready_for_review",
      hasUnsubmittedReviewDraft: true,
    });
    expect(result.stageId).toBe("customer-reviewing");
  });

  it("uses Revised Work Ready only with prior revision evidence", () => {
    const result = stage({
      spineStatus: "ready_for_review",
      hasPriorRevisionCycle: true,
    });
    expect(result.stageId).toBe("revised-work-ready");
  });

  it("falls back to Work Ready for Review when prior revision evidence is absent", () => {
    const result = stage({ spineStatus: "ready_for_review" });
    expect(result.stageId).toBe("work-ready-for-review");
  });

  it("lets draft progress win over revised-work labeling", () => {
    const result = stage({
      spineStatus: "ready_for_review",
      hasUnsubmittedReviewDraft: true,
      hasPriorRevisionCycle: true,
    });
    expect(result.stageId).toBe("customer-reviewing");
  });
});

describe("hasUnsubmittedReviewDraft", () => {
  function feedback(
    overrides: Partial<JobReviewFeedback> = {},
  ): JobReviewFeedback {
    return {
      ...createEmptyJobReviewFeedback("c1", "j1", ["d1", "d2"]),
      ...overrides,
    };
  }

  it("returns false for null/undefined", () => {
    expect(hasUnsubmittedReviewDraft(null)).toBe(false);
    expect(hasUnsubmittedReviewDraft(undefined)).toBe(false);
  });

  it("returns false for empty all-neutral shells", () => {
    expect(hasUnsubmittedReviewDraft(feedback())).toBe(false);
  });

  it("returns true for non-neutral section status", () => {
    expect(
      hasUnsubmittedReviewDraft(
        feedback({
          sectionStatuses: { d1: "revision", d2: "neutral" },
        }),
      ),
    ).toBe(true);
  });

  it("returns true for sticky notes", () => {
    expect(
      hasUnsubmittedReviewDraft(
        feedback({
          stickyNotes: [
            {
              id: "n1",
              deliverableKey: "d1",
              color: "yellow",
              text: "note",
              createdAt: "2026-07-01T00:00:00.000Z",
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("returns true for voice-note metadata", () => {
    expect(
      hasUnsubmittedReviewDraft(
        feedback({
          voiceNotes: [
            {
              id: "v1",
              deliverableKey: "d1",
              durationSec: 4,
              createdAt: "2026-07-01T00:00:00.000Z",
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("returns true for drawing sections", () => {
    expect(
      hasUnsubmittedReviewDraft(feedback({ drawSections: ["d1"] })),
    ).toBe(true);
  });

  it("returns false when formally submitted", () => {
    expect(
      hasUnsubmittedReviewDraft(
        feedback({
          sectionStatuses: { d1: "revision", d2: "neutral" },
          submittedAt: "2026-07-02T00:00:00.000Z",
          submissionType: "revision_requested",
        }),
      ),
    ).toBe(false);
  });
});

describe("deriveCampaignCustomerStageSummary", () => {
  it("no jobs → No Active Work", () => {
    const summary = deriveCampaignCustomerStageSummary([]);
    expect(summary.summaryId).toBe("no-active-jobs");
    expect(summary.label).toBe("No Active Work");
    expect(summary.jobStages).toEqual([]);
  });

  it("all cancelled → Cancelled", () => {
    const jobs = [job("refunded_cancelled"), job("refunded_cancelled")];
    const summary = deriveCampaignCustomerStageSummary(jobs);
    expect(summary.summaryId).toBe("cancelled");
    expect(summary.jobStages).toHaveLength(2);
  });

  it("cancelled plus active ignores cancelled for summary", () => {
    const jobs = [job("refunded_cancelled"), job("building_concepts")];
    const summary = deriveCampaignCustomerStageSummary(jobs);
    expect(summary.summaryId).toBe("studio-working");
    expect(summary.jobStages).toHaveLength(2);
  });

  it("all production → Studio Working", () => {
    const jobs = [job("ready_for_queue"), job("building_concepts")];
    expect(deriveCampaignCustomerStageSummary(jobs).summaryId).toBe(
      "studio-working",
    );
  });

  it("all review-ready → Work Ready for Review", () => {
    const jobs = [job("ready_for_review"), job("ready_for_review")];
    expect(deriveCampaignCustomerStageSummary(jobs).summaryId).toBe(
      "work-ready-for-review",
    );
  });

  it("saved review draft → Customer Reviewing when all reviewing", () => {
    const jobs = [
      job("ready_for_review", { hasUnsubmittedReviewDraft: true }),
      job("ready_for_review"),
    ];
    expect(deriveCampaignCustomerStageSummary(jobs).summaryId).toBe(
      "customer-reviewing",
    );
  });

  it("waiting on customer plus production → Waiting on You", () => {
    const jobs = [job("waiting_on_client"), job("building_concepts")];
    expect(deriveCampaignCustomerStageSummary(jobs).summaryId).toBe(
      "waiting-on-you",
    );
  });

  it("review-ready plus production → Project in Progress", () => {
    const jobs = [job("ready_for_review"), job("building_concepts")];
    const summary = deriveCampaignCustomerStageSummary(jobs);
    expect(summary.summaryId).toBe("project-in-progress");
    expect(summary.label).toBe("Project in Progress");
    expect(summary.explanation).toBe(
      "Your project has work in multiple stages.",
    );
    expect(summary.jobStages.map((j) => j.stageId)).toEqual([
      "work-ready-for-review",
      "studio-working",
    ]);
  });

  it("revision submitted plus review-ready → Project in Progress", () => {
    const jobs = [job("revision_requested"), job("ready_for_review")];
    expect(deriveCampaignCustomerStageSummary(jobs).summaryId).toBe(
      "project-in-progress",
    );
  });

  it("delivered plus production → Project in Progress", () => {
    const jobs = [job("delivered"), job("building_concepts")];
    expect(deriveCampaignCustomerStageSummary(jobs).summaryId).toBe(
      "project-in-progress",
    );
  });

  it("all approved or ready for delivery → Approved for Final Delivery", () => {
    const jobs = [job("approved"), job("ready_for_delivery")];
    expect(deriveCampaignCustomerStageSummary(jobs).summaryId).toBe(
      "approved-for-final-delivery",
    );
  });

  it("all delivered → Final Delivery", () => {
    const jobs = [job("delivered"), job("delivered")];
    expect(deriveCampaignCustomerStageSummary(jobs).summaryId).toBe(
      "final-delivery",
    );
  });

  it("partial delivery (delivered + ready_for_delivery) → Project in Progress", () => {
    const jobs = [job("delivered"), job("ready_for_delivery")];
    expect(deriveCampaignCustomerStageSummary(jobs).summaryId).toBe(
      "project-in-progress",
    );
  });

  it("never erases per-job stages in the summary payload", () => {
    const jobs = [job("ready_for_review"), job("building_concepts")];
    const summary = deriveCampaignCustomerStageSummary(jobs);
    expect(summary.jobStages).toBe(jobs);
  });

  it("revised-work-ready wins reviewing family over plain ready", () => {
    const jobs = [
      job("ready_for_review", { hasPriorRevisionCycle: true }),
      job("ready_for_review"),
    ];
    expect(deriveCampaignCustomerStageSummary(jobs).summaryId).toBe(
      "revised-work-ready",
    );
  });
});
