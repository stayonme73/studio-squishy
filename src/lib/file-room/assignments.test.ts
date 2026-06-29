import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import {
  assignStaffToCampaign,
  isStaffAssignedToCampaign,
  readCampaignAssignments,
  staffAssignedCampaignIds,
  writeCampaignAssignments,
} from "./assignments";

const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");

describe("campaign assignments", () => {
  beforeEach(async () => {
    await fs.mkdir(path.dirname(ASSIGNMENTS_PATH), { recursive: true });
    await fs.writeFile(
      ASSIGNMENTS_PATH,
      JSON.stringify({ staffByUserId: { "staff-dev": ["campaign-a"] } }, null, 2),
      "utf8",
    );
  });

  afterEach(async () => {
    await fs.rm(ASSIGNMENTS_PATH, { force: true });
  });

  it("reads staff assignments by user id", async () => {
    const assignments = await readCampaignAssignments();
    expect(staffAssignedCampaignIds(assignments, "staff-dev")).toEqual(["campaign-a"]);
    expect(isStaffAssignedToCampaign(assignments, "staff-dev", "campaign-a")).toBe(true);
    expect(isStaffAssignedToCampaign(assignments, "staff-dev", "campaign-b")).toBe(false);
  });

  it("assignStaffToCampaign replaces with a single campaign (dev bridge)", async () => {
    await assignStaffToCampaign("staff-dev", "campaign-b");
    const assignments = await readCampaignAssignments();
    expect(assignments.staffByUserId["staff-dev"]).toEqual(["campaign-b"]);
  });

  it("deduplicates campaign ids on write", async () => {
    await writeCampaignAssignments({
      staffByUserId: { "staff-dev": ["campaign-a", "campaign-a"] },
    });
    const assignments = await readCampaignAssignments();
    expect(assignments.staffByUserId["staff-dev"]).toEqual(["campaign-a"]);
  });

  it("normalizes staff capabilities", async () => {
    await writeCampaignAssignments({
      staffByUserId: { "staff-dev": ["campaign-a"] },
      staffCapabilities: { "staff-dev": ["copy", "copy", "creative_production"] },
    });
    const assignments = await readCampaignAssignments();
    expect(assignments.staffCapabilities?.["staff-dev"]).toEqual([
      "copy",
      "creative_production",
    ]);
  });

  it("backfills empty runtime file from dev seed", async () => {
    await fs.writeFile(ASSIGNMENTS_PATH, JSON.stringify({ staffByUserId: {} }, null, 2), "utf8");
    const assignments = await readCampaignAssignments();
    expect(assignments.staffByUserId["staff-dev"]).toEqual([
      "6babd2a8-7a5f-4009-b4ab-69dd2587a059",
    ]);
  });
});
