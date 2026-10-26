import { describe, expect, it } from "vitest";

import { studioMaterialsUploadV1 } from "@/config/studio-materials-upload-v1";
import { feedbackStudio } from "@/config/feedback-studio";
import { canRequestJobRevision } from "@/lib/job-control/review-room-gates";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import { validateCustomerMaterialFile } from "@/lib/materials/client-file-store";
import { productionGatePassedFromKnownFacts } from "@/lib/post-submit-customer-signals";

describe("messy customer machine gates", () => {
  it("does not start production from payment alone, and waits for intake and accepted materials", () => {
    expect(
      productionGatePassedFromKnownFacts({
        paymentReceived: true,
        projectDetailsComplete: false,
        materialsAccepted: false,
        movedToProduction: false,
      }),
    ).toBe(false);
    expect(
      productionGatePassedFromKnownFacts({
        paymentReceived: true,
        projectDetailsComplete: true,
        materialsAccepted: false,
        movedToProduction: false,
      }),
    ).toBe(false);
    expect(
      productionGatePassedFromKnownFacts({
        paymentReceived: true,
        projectDetailsComplete: true,
        materialsAccepted: true,
        movedToProduction: true,
      }),
    ).toBe(true);
  });

  it("rejects an unsupported file and accepts a real PNG", () => {
    const rejected = validateCustomerMaterialFile(
      new File(["not-a-real-program"], "offer.exe", { type: "application/octet-stream" }),
    );
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error).toBe(studioMaterialsUploadV1.customerCopy.unsupportedType);
    }
    const accepted = validateCustomerMaterialFile(
      new File(["fictional-logo"], "harbor-oak-logo.png", { type: "image/png" }),
    );
    expect(accepted.ok).toBe(true);
  });

  it("allows one included revision, then stops when the three rounds are used", () => {
    const job = { spineStatus: "ready_for_review" } as PurchasedJobRecord;
    const feedback = createEmptyJobReviewFeedback("messy-synth", "messy-synth:graphics", ["poster"]);
    feedback.sectionStatuses.poster = "revision";
    const open = canRequestJobRevision({
      job,
      feedback,
      revisionRoundsRemaining: 3,
      allDeliverablesPrepared: true,
    });
    expect(open.allowed).toBe(true);
    const exhausted = canRequestJobRevision({
      job,
      feedback,
      revisionRoundsRemaining: 0,
      allDeliverablesPrepared: true,
    });
    expect(exhausted.allowed).toBe(false);
    expect(exhausted.reasons).toContain(feedbackStudio.feedbackPanel.revisionLimitShort);
  });
});
