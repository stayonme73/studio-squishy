import { describe, expect, it } from "vitest";

import {
  SHORT_FORM_CUSTOMER_DELIVERY_FILES,
  shortFormCustomerDeliveryFacts,
} from "./short-form-current-door-delivery-copy";

describe("short-form customer delivery copy", () => {
  it("names the four approved files and the paid three-round package", () => {
    expect(SHORT_FORM_CUSTOMER_DELIVERY_FILES.map((file) => file.label)).toEqual([
      "Finished vertical video",
      "Post caption",
      "Cover",
      "Posting guide",
    ]);
    const facts = shortFormCustomerDeliveryFacts({ paidAmountCents: 14900, revisionRounds: 3 });
    expect(facts.paidLabel).toBe("$149.00");
    expect(facts.revisionLabel).toBe("Three revision rounds are included.");
    const visible = JSON.stringify({ files: SHORT_FORM_CUSTOMER_DELIVERY_FILES, facts });
    expect(visible).not.toMatch(/349|Content Pack|one revision|Clip Repurposing|Maya/i);
    expect(visible).not.toMatch(/\b(visit|book|click|tap)\b/i);
  });
});
