import { describe, expect, it } from "vitest";

import type {
  ClientConsolidatedRequest,
  ClientOptionalRequest,
} from "@/lib/materials/client-requests";

import { boardRequestStatus } from "./studio-board-materials-request-status";

function consolidated(
  overrides: Partial<ClientConsolidatedRequest> & Pick<ClientConsolidatedRequest, "isBlocking" | "canSubmit">,
): ClientConsolidatedRequest {
  return {
    id: "logo:file-metadata",
    category: "logo-brand",
    contentKind: "file-metadata",
    label: "Logo",
    prompt: "Share your logo.",
    reason: "Needed for the design.",
    reviewStatus: "requested",
    statusLabel: "Needed",
    isPendingReview: false,
    ...overrides,
  };
}

function optional(
  overrides: Partial<ClientOptionalRequest> = {},
): ClientOptionalRequest {
  return {
    id: "opt-1",
    category: "other",
    contentKind: "text",
    label: "Extra note",
    reason: "Helpful if you have it.",
    reviewStatus: "requested",
    statusLabel: "Optional",
    canSubmit: true,
    isPendingReview: false,
    ...overrides,
  };
}

describe("board materials request status", () => {
  it("keeps a blocking consolidated request as still needed", () => {
    expect(
      boardRequestStatus({
        kind: "consolidated",
        request: consolidated({ isBlocking: true, canSubmit: true }),
      }),
    ).toBe("Still Needed");
  });

  it("keeps a non-blocking consolidated slot optional", () => {
    expect(
      boardRequestStatus({
        kind: "consolidated",
        request: consolidated({ isBlocking: false, canSubmit: true }),
      }),
    ).toBe("Optional");
  });

  it("does not downgrade a blocking request that cannot be submitted", () => {
    expect(
      boardRequestStatus({
        kind: "consolidated",
        request: consolidated({ isBlocking: true, canSubmit: false, reviewStatus: "missing" }),
      }),
    ).toBe("Not Applicable");
  });

  it("keeps optional requests optional without an isBlocking field", () => {
    const request = optional({ canSubmit: true });
    expect("isBlocking" in request).toBe(false);
    expect(boardRequestStatus({ kind: "optional", request })).toBe("Optional");
  });

  it("does not promote an optional request that cannot be submitted", () => {
    expect(
      boardRequestStatus({
        kind: "optional",
        request: optional({ canSubmit: false, reviewStatus: "missing" }),
      }),
    ).toBe("Not Applicable");
  });

  it("keeps received and unavailable states ahead of blocking", () => {
    expect(
      boardRequestStatus({
        kind: "consolidated",
        request: consolidated({
          isBlocking: true,
          canSubmit: true,
          reviewStatus: "submitted",
          isPendingReview: true,
        }),
      }),
    ).toBe("Received");
    expect(
      boardRequestStatus({
        kind: "optional",
        request: optional({ clientAvailability: "not_available_yet", canSubmit: true }),
      }),
    ).toBe("Not Applicable");
  });
});
