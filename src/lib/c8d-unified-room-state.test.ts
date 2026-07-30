import { describe, expect, it } from "vitest";

import {
  buildDeliverablesCompatibilityRedirectPath,
  buildUnifiedRoomHref,
  parseUnifiedRoomStateParam,
  roomStateForReviewDeliveryStage,
} from "@/lib/c8d-unified-room-state";

describe("c8d unified room state mapping", () => {
  it("parses only the three locked room states", () => {
    expect(parseUnifiedRoomStateParam("review")).toBe("review");
    expect(parseUnifiedRoomStateParam("final")).toBe("final");
    expect(parseUnifiedRoomStateParam("delivery")).toBe("delivery");
    expect(parseUnifiedRoomStateParam("delivery-room")).toBeNull();
    expect(parseUnifiedRoomStateParam(null)).toBeNull();
  });

  it("maps 7A stages to room states without inventing files", () => {
    expect(roomStateForReviewDeliveryStage("work-ready-for-review")).toBe("review");
    expect(roomStateForReviewDeliveryStage("approved-for-final-delivery")).toBe("final");
    expect(roomStateForReviewDeliveryStage("final-delivery")).toBe("delivery");
    expect(roomStateForReviewDeliveryStage("studio-working")).toBeNull();
  });

  it("builds Final and Delivery hrefs on the canonical feedback-studio room", () => {
    expect(buildUnifiedRoomHref({ roomState: "final", jobId: "c:sm-001" })).toBe(
      "/feedback-studio?roomState=final&jobId=c%3Asm-001",
    );
    expect(buildUnifiedRoomHref({ roomState: "delivery" })).toBe(
      "/feedback-studio?roomState=delivery",
    );
    expect(buildUnifiedRoomHref({ roomState: "review", jobId: "c:sm-001" })).toBe(
      "/feedback-studio?jobId=c%3Asm-001",
    );
  });

  it("redirects legacy /deliverables query into Delivery state and preserves preview flags", () => {
    expect(
      buildDeliverablesCompatibilityRedirectPath({
        preview: "delivered",
        room: "1",
      }),
    ).toBe("/feedback-studio?roomState=delivery&preview=delivered&room=1");
  });
});
