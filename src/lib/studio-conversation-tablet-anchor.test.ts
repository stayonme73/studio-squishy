import { describe, expect, it } from "vitest";

import {
  CONVERSATION_ROOM_TABLET_HREF,
  CONVERSATION_ROOM_TABLET_ID,
} from "./studio-conversation-tablet-anchor";

describe("conversation room tablet anchor", () => {
  it("uses a stable in-page hash Samsung can follow without React click", () => {
    expect(CONVERSATION_ROOM_TABLET_ID).toBe("conversation-room-tablet");
    expect(CONVERSATION_ROOM_TABLET_HREF).toBe("#conversation-room-tablet");
  });
});
