import { describe, expect, it } from "vitest";

import { sanitizeClientOptionalRequests } from "@/lib/materials/client-requests";
import type { OptionalClientRequest } from "@/lib/materials/client-requests";

function optionalRequest(
  extras: Partial<OptionalClientRequest> = {},
): OptionalClientRequest {
  return {
    id: "opt-1",
    itemId: "opt-1",
    category: "other",
    contentKind: "text",
    label: "Extra note",
    reason: "Helpful if you have it.",
    reviewStatus: "requested",
    statusLabel: "Optional",
    canSubmit: true,
    isPendingReview: false,
    ...extras,
  };
}

describe("optional client request routing contract", () => {
  it("copies routing fields that the resolver already attaches", () => {
    const [routed] = sanitizeClientOptionalRequests([
      optionalRequest({
        contentRoutingState: "RECEIVED",
        contentRoutingLabel: "Received",
        contentRoutingExplanation: "We have the file.",
        canWithdrawFile: true,
      }),
    ]);
    expect(routed?.contentRoutingState).toBe("RECEIVED");
    expect(routed?.contentRoutingLabel).toBe("Received");
    expect(routed?.contentRoutingExplanation).toBe("We have the file.");
    expect(routed?.canWithdrawFile).toBe(true);
  });

  it("does not invent routing or withdraw flags", () => {
    const [plain] = sanitizeClientOptionalRequests([optionalRequest()]);
    expect(plain?.contentRoutingState).toBeUndefined();
    expect(plain?.contentRoutingLabel).toBeUndefined();
    expect(plain?.contentRoutingExplanation).toBeUndefined();
    expect(plain?.canWithdrawFile).toBeUndefined();
  });
});
