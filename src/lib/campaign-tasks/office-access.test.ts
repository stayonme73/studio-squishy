import { describe, expect, it } from "vitest";

import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import type { StudioUser } from "@/lib/campaign-store/types";

import { canEnterTeamOffice, resolveTeamOfficeAccess } from "./office-access";

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "copy-staff": ["campaign-1"] },
  staffCapabilities: { "copy-staff": ["copy"] },
};

const copyStaff: StudioUser = {
  id: "copy-staff",
  email: "copy@local.dev",
  displayName: "Copy",
  roles: ["staff"],
};

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

describe("office-access", () => {
  it("allows owner into copy office", () => {
    expect(canEnterTeamOffice(owner, "campaign-1", "copy", assignments)).toBe(true);
  });

  it("allows copy-capable staff assigned to campaign", () => {
    expect(canEnterTeamOffice(copyStaff, "campaign-1", "copy", assignments)).toBe(true);
  });

  it("returns not-built for non-v1 offices", () => {
    expect(resolveTeamOfficeAccess(copyStaff, "campaign-1", "strategy", assignments).kind).toBe(
      "not-built",
    );
  });

  it("returns ok for live copy office", () => {
    const access = resolveTeamOfficeAccess(copyStaff, "campaign-1", "copy", assignments);
    expect(access).toEqual({ kind: "ok", officeRole: "copy" });
  });
});
