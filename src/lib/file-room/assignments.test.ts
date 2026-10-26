import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";

import {
  assignStaffToCampaign,
  isStaffAssignedToCampaign,
  readCampaignAssignments,
  staffAssignedCampaignIds,
  writeCampaignAssignments,
} from "./assignments";

function assignmentsPath(): string {
  return path.join(process.cwd(), "data", "campaign-assignments.json");
}

describe("campaign assignments", () => {
  let restoreDir = process.cwd();
  let tempDir = "";

  beforeEach(async () => {
    restoreDir = process.cwd();
    tempDir = mkdtempSync(path.join(tmpdir(), "studio-assignments-"));
    process.chdir(tempDir);
    await fs.mkdir(path.dirname(assignmentsPath()), { recursive: true });
    await fs.writeFile(
      assignmentsPath(),
      JSON.stringify({ staffByUserId: { "staff-dev": ["campaign-a"] } }, null, 2),
      "utf8",
    );
  });

  afterEach(() => {
    process.chdir(restoreDir);
    rmSync(tempDir, { recursive: true, force: true });
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
    await fs.writeFile(assignmentsPath(), JSON.stringify({ staffByUserId: {} }, null, 2), "utf8");
    const assignments = await readCampaignAssignments();
    expect(assignments.staffByUserId["staff-dev"]).toEqual([
      "6babd2a8-7a5f-4009-b4ab-69dd2587a059",
    ]);
  });
});
