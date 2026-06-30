import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";

import {
  canAccessOwnerConsole,
  resolveOwnerConsoleAccess,
} from "./owner-console-access";

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

const staff: StudioUser = {
  id: "staff-1",
  email: "staff@local.dev",
  displayName: "Staff",
  roles: ["staff"],
};

describe("owner-console-access", () => {
  it("allows owner", () => {
    expect(canAccessOwnerConsole(owner)).toBe(true);
    expect(resolveOwnerConsoleAccess(owner)).toEqual({ kind: "ok" });
  });

  it("forbids staff", () => {
    expect(canAccessOwnerConsole(staff)).toBe(false);
    expect(resolveOwnerConsoleAccess(staff)).toEqual({ kind: "forbidden" });
  });

  it("forbids null user", () => {
    expect(canAccessOwnerConsole(null)).toBe(false);
    expect(resolveOwnerConsoleAccess(null)).toEqual({ kind: "forbidden" });
  });
});
