import { describe, expect, it } from "vitest";

import {
  isStudioCommunicationLightState,
  STUDIO_COMMUNICATION_LIGHT_STATES,
  studioConversationRoomV1,
} from "@/config/studio-conversation-room-v1";

describe("studio conversation room foundation", () => {
  it("locks the five communication light states", () => {
    expect([...STUDIO_COMMUNICATION_LIGHT_STATES]).toEqual([
      "idle",
      "listening",
      "speaking",
      "thinking",
      "unavailable",
    ]);
  });

  it("keeps workspace portrait and presentation landscape", () => {
    const { workspaceViewport, presentationViewport } = studioConversationRoomV1;
    expect(workspaceViewport.height).toBeGreaterThan(workspaceViewport.width);
    expect(presentationViewport.width).toBeGreaterThan(
      presentationViewport.height,
    );
  });

  it("validates light state helpers", () => {
    expect(isStudioCommunicationLightState("idle")).toBe(true);
    expect(isStudioCommunicationLightState("dashboard")).toBe(false);
  });

  it("points the permanent route at Conversation Room", () => {
    expect(studioConversationRoomV1.route).toBe("/studio-conversation-room");
    expect(studioConversationRoomV1.legacyTabletRoute).toBe("/studio-tablet");
  });
});
