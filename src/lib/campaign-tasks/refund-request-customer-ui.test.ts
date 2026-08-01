import { describe, expect, it } from "vitest";

import { REFUND_REQUEST_CUSTOMER_V1 as copy } from "@/config/refund-request-customer-v1";
import {
  mapRefundRequestSubmitFailure,
  mapRefundRequestSubmitSuccess,
  refundProductionStartedCustomerNote,
} from "./refund-request-customer-ui";

describe("refund-request-customer-ui", () => {
  it("maps success to submitted-for-review without money-returned claims", () => {
    const outcome = mapRefundRequestSubmitSuccess();
    expect(outcome.kind).toBe("submitted_for_review");
    expect(outcome.message).toBe(copy.submittedForReview);
    expect(outcome.message.toLowerCase()).not.toMatch(/money|processed|funds|stripe|partial/);
  });

  it("maps 409 to already submitted + owner reviewing", () => {
    const outcome = mapRefundRequestSubmitFailure(
      409,
      "A refund request is already on Tagia's desk for this job.",
    );
    expect(outcome.kind).toBe("pending_owner_review");
    expect(outcome.message).toContain(copy.alreadySubmitted);
    expect(outcome.message).toContain(copy.ownerReviewing);
  });

  it("maps 422 already-decided without inventing approved or denied", () => {
    const outcome = mapRefundRequestSubmitFailure(422, "Owner has already decided on this refund.");
    expect(outcome.kind).toBe("already_decided");
    expect(outcome.message).toBe(copy.alreadyDecided);
    expect(outcome.message.toLowerCase()).not.toMatch(/approved|denied|money|returned/);
  });

  it("maps 400 to validation copy", () => {
    const outcome = mapRefundRequestSubmitFailure(
      400,
      "Refund reason and requested outcome are required.",
    );
    expect(outcome.kind).toBe("validation");
    expect(outcome.message).toContain("required");
  });

  it("maps 403 and 404 honestly", () => {
    expect(mapRefundRequestSubmitFailure(403).kind).toBe("forbidden");
    expect(mapRefundRequestSubmitFailure(404).message).toBe(copy.jobNotFound);
  });

  it("keeps production-started note free of money-returned claims", () => {
    const note = refundProductionStartedCustomerNote();
    expect(note).toContain("cannot be approved");
    expect(note.toLowerCase()).not.toMatch(/money has been returned|funds will arrive|processed/);
  });

  it("preserves may-be policy softness in customer config", () => {
    expect(copy.sectionLead).toMatch(/may be eligible/);
    expect(copy.policyNote).toMatch(/may be approved/);
    expect(copy.sectionLead.toLowerCase()).not.toMatch(/will be refunded|money returned/);
  });
});
