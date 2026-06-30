import { describe, expect, it } from "vitest";

import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import type { StudioUser } from "@/lib/campaign-store/types";

import { canEnterTeamOffice, resolveTeamOfficeAccess } from "./office-access";

const assignments: CampaignAssignmentsFile = {
  staffByUserId: {
    "copy-staff": ["campaign-1"],
    "strategy-staff": ["campaign-1"],
    "qa-staff": ["campaign-1"],
    "producer-staff": ["campaign-1"],
  },
  staffCapabilities: {
    "copy-staff": ["copy"],
    "strategy-staff": ["strategy"],
    "qa-staff": ["qa"],
    "producer-staff": ["producer_dispatcher"],
  },
};

const copyStaff: StudioUser = {
  id: "copy-staff",
  email: "copy@local.dev",
  displayName: "Copy",
  roles: ["staff"],
};

const strategyStaff: StudioUser = {
  id: "strategy-staff",
  email: "strategy@local.dev",
  displayName: "Strategy",
  roles: ["staff"],
};

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

describe("office-access", () => {
  it("allows owner into every live office", () => {
    for (const role of ["copy", "strategy", "creative_production", "qa", "producer_dispatcher"] as const) {
      expect(canEnterTeamOffice(owner, "campaign-1", role, assignments)).toBe(true);
    }
  });

  it("allows copy-capable staff assigned to campaign", () => {
    expect(canEnterTeamOffice(copyStaff, "campaign-1", "copy", assignments)).toBe(true);
  });

  it("allows strategy-capable staff into strategy office", () => {
    expect(canEnterTeamOffice(strategyStaff, "campaign-1", "strategy", assignments)).toBe(true);
    expect(resolveTeamOfficeAccess(strategyStaff, "campaign-1", "strategy", assignments)).toEqual({
      kind: "ok",
      officeRole: "strategy",
    });
  });

  it("denies copy staff from strategy office", () => {
    expect(canEnterTeamOffice(copyStaff, "campaign-1", "strategy", assignments)).toBe(false);
    expect(resolveTeamOfficeAccess(copyStaff, "campaign-1", "strategy", assignments).kind).toBe(
      "forbidden",
    );
  });

  it("returns ok for live copy office", () => {
    const access = resolveTeamOfficeAccess(copyStaff, "campaign-1", "copy", assignments);
    expect(access).toEqual({ kind: "ok", officeRole: "copy" });
  });
});
