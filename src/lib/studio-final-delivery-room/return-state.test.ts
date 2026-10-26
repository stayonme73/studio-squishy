import { describe, expect, it } from "vitest";

import { isSafeFinalDeliveryReturnHref } from "./return-state";

const job = "messy-customer-social-promo-recovery:social_and_promo_graphics";

describe("final delivery help return", () => {
  it("accepts only this job's existing delivery address", () => {
    expect(
      isSafeFinalDeliveryReturnHref(
        `/feedback-studio?jobId=${encodeURIComponent(job)}&roomState=delivery`,
      ),
    ).toBe(true);
  });

  it("rejects addresses that are not the open delivery room", () => {
    expect(isSafeFinalDeliveryReturnHref("/deliverables")).toBe(false);
    expect(isSafeFinalDeliveryReturnHref("/feedback-studio?roomState=delivery")).toBe(false);
    expect(isSafeFinalDeliveryReturnHref("/final-delivery-room")).toBe(false);
    expect(isSafeFinalDeliveryReturnHref("https://example.com/feedback-studio?jobId=a&roomState=delivery")).toBe(
      false,
    );
    expect(isSafeFinalDeliveryReturnHref("//example.com/feedback-studio?jobId=a&roomState=delivery")).toBe(
      false,
    );
  });
});
