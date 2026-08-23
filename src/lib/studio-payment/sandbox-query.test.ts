import { describe, expect, it } from "vitest";

import {
  CONVERSATION_ROOM_SANDBOX_HREF,
  searchHasStudioPaymentSandbox,
  withStudioPaymentSandboxQuery,
} from "./sandbox-query";

describe("studio payment sandbox query", () => {
  it("detects the explicit local-cert flag", () => {
    expect(searchHasStudioPaymentSandbox("?studioPaymentSandbox=1")).toBe(true);
    expect(searchHasStudioPaymentSandbox("studioPaymentSandbox=1")).toBe(true);
    expect(searchHasStudioPaymentSandbox("?foo=1")).toBe(false);
    expect(searchHasStudioPaymentSandbox("")).toBe(false);
    expect(searchHasStudioPaymentSandbox(null)).toBe(false);
  });

  it("appends the flag only when the source already opted in", () => {
    expect(
      withStudioPaymentSandboxQuery(
        "/studio-conversation-room",
        "?studioPaymentSandbox=1",
      ),
    ).toBe("/studio-conversation-room?studioPaymentSandbox=1");
    expect(
      withStudioPaymentSandboxQuery("/lobby-entry/begin-new", "?studioPaymentSandbox=1"),
    ).toBe("/lobby-entry/begin-new?studioPaymentSandbox=1");
    expect(
      withStudioPaymentSandboxQuery("/studio-conversation-room", ""),
    ).toBe("/studio-conversation-room");
  });

  it("does not treat other query values as the sandbox opt-in", () => {
    expect(
      withStudioPaymentSandboxQuery(
        "/studio-conversation-room",
        "?studioPaymentSandbox=true",
      ),
    ).toBe("/studio-conversation-room");
  });

  it("exports the Conversation Room sandbox href used by Lobby handoff", () => {
    expect(CONVERSATION_ROOM_SANDBOX_HREF).toBe(
      "/studio-conversation-room?studioPaymentSandbox=1",
    );
  });
});
