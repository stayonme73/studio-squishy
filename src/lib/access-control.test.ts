import { describe, expect, it } from "vitest";

import { resolveAccessDeniedRoomFromPath } from "@/config/access-control";

describe("resolveAccessDeniedRoomFromPath", () => {
  it("maps nested studio-self-test production and office routes to their rooms", () => {
    expect(
      resolveAccessDeniedRoomFromPath(
        "/file-room/studio-self-test/production/studio-self-test%3Asm-001",
      ),
    ).toBe("production-workspace");
    expect(resolveAccessDeniedRoomFromPath("/file-room/studio-self-test/office/strategy")).toBe(
      "team-offices",
    );
  });

  it("maps the studio-self-test scoreboard route separately", () => {
    expect(resolveAccessDeniedRoomFromPath("/file-room/studio-self-test")).toBe("studio-self-test");
  });

  it("maps owner console and generic file room routes", () => {
    expect(resolveAccessDeniedRoomFromPath("/file-room/owner-console")).toBe("owner-console");
    expect(resolveAccessDeniedRoomFromPath("/file-room")).toBe("file-room");
  });
});
