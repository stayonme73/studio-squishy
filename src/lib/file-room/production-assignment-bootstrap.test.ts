import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { canReadProductionWork } from "@/lib/campaign-production/access";
import { canReadCampaign } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import { resolveReassignCandidatesForCampaign } from "@/lib/campaign-tasks/file-room-controls";
import { canReviewMaterials } from "@/lib/materials/access";

import { isStaffAssignedToCampaign, readCampaignAssignments } from "./assignments";
import seedAssignments from "./campaign-assignments.seed.json";

const REAL_ASSIGNMENTS = path.join(process.cwd(), "data", "campaign-assignments.json");
const ORIGINAL_CWD = process.cwd();
const DISPATCH_DIR = path.join(process.cwd(), "src", "lib", "studio-dispatch");

const seedUserIds = Object.keys(seedAssignments.staffByUserId);
const seedCampaignIds = Object.values(seedAssignments.staffByUserId).flat();

let realAssignmentsHash: string | null = null;

function fileHash(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function assignmentPath(directory: string): string {
  return path.join(directory, "data", "campaign-assignments.json");
}

function containsSeedIdentity(raw: string): boolean {
  return [...seedUserIds, ...seedCampaignIds].some((value) => raw.includes(value));
}

async function inTempDir<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = mkdtempSync(path.join(tmpdir(), "studio-assignment-bootstrap-"));
  const previousEnv = process.env.NODE_ENV;
  try {
    process.chdir(directory);
    return await run(directory);
  } finally {
    process.chdir(ORIGINAL_CWD);
    process.env.NODE_ENV = previousEnv;
    rmSync(directory, { recursive: true, force: true });
  }
}

function staffUser(id: string): StudioUser {
  return {
    id,
    email: `${id}@example.com`,
    displayName: id,
    roles: ["staff"],
    accountClass: "staff",
  };
}

const ownerUser: StudioUser = {
  id: "owner-isolated",
  email: "owner-isolated@example.com",
  displayName: "Isolated Owner",
  roles: ["owner"],
  accountClass: "staff",
};

function walkTypeScript(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTypeScript(fullPath));
      continue;
    }
    if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

beforeAll(() => {
  realAssignmentsHash = existsSync(REAL_ASSIGNMENTS) ? fileHash(REAL_ASSIGNMENTS) : null;
});

afterAll(() => {
  const after = existsSync(REAL_ASSIGNMENTS) ? fileHash(REAL_ASSIGNMENTS) : null;
  expect(after).toBe(realAssignmentsHash);
  expect(process.cwd()).toBe(ORIGINAL_CWD);
});

describe("production assignment bootstrap", () => {
  it("does not copy the development seed into a missing production file", async () => {
    await inTempDir(async (directory) => {
      process.env.NODE_ENV = "production";
      const assignments = await readCampaignAssignments();
      const raw = readFileSync(assignmentPath(directory), "utf8");
      expect(assignments.staffByUserId).toEqual({});
      expect(containsSeedIdentity(raw)).toBe(false);
      expect(isStaffAssignedToCampaign(assignments, seedUserIds[0], seedCampaignIds[0])).toBe(
        false,
      );
    });
  });

  it("leaves an empty production file empty", async () => {
    await inTempDir(async (directory) => {
      process.env.NODE_ENV = "production";
      const filePath = assignmentPath(directory);
      mkdirSync(path.dirname(filePath), { recursive: true });
      const original = JSON.stringify({ staffByUserId: {} }, null, 2);
      writeFileSync(filePath, original, "utf8");
      const assignments = await readCampaignAssignments();
      expect(readFileSync(filePath, "utf8")).toBe(original);
      expect(assignments.staffByUserId).toEqual({});
      expect(containsSeedIdentity(readFileSync(filePath, "utf8"))).toBe(false);
    });
  });

  it("preserves an existing production assignment and does not add the development staff id", async () => {
    await inTempDir(async (directory) => {
      process.env.NODE_ENV = "production";
      const filePath = assignmentPath(directory);
      mkdirSync(path.dirname(filePath), { recursive: true });
      const original = JSON.stringify(
        {
          staffByUserId: { "future-staff": ["campaign-real-isolated"] },
          staffCapabilities: { "future-staff": ["copy"] },
        },
        null,
        2,
      );
      writeFileSync(filePath, original, "utf8");
      const assignments = await readCampaignAssignments();
      expect(readFileSync(filePath, "utf8")).toBe(original);
      expect(isStaffAssignedToCampaign(assignments, "future-staff", "campaign-real-isolated")).toBe(
        true,
      );
      expect(isStaffAssignedToCampaign(assignments, seedUserIds[0], seedCampaignIds[0])).toBe(
        false,
      );

      expect(
        canReadCampaign(ownerUser, "campaign-real-isolated", null, assignments),
      ).toBe(true);
      expect(
        canReadCampaign(staffUser("future-staff"), "campaign-real-isolated", null, assignments),
      ).toBe(true);
      expect(
        canReadCampaign(staffUser(seedUserIds[0]), "campaign-real-isolated", null, assignments),
      ).toBe(false);
      expect(
        canReviewMaterials(staffUser(seedUserIds[0]), "campaign-real-isolated", null, assignments),
      ).toBe(false);
      expect(
        canReadProductionWork(staffUser(seedUserIds[0]), "campaign-real-isolated", null, assignments),
      ).toBe(false);
      expect(
        resolveReassignCandidatesForCampaign(
          "campaign-real-isolated",
          assignments,
          [staffUser("future-staff"), staffUser(seedUserIds[0]), ownerUser],
        ).map((candidate) => candidate.userId),
      ).toEqual(["future-staff"]);
    });
  });

  it("still copies the development seed for an empty development file", async () => {
    await inTempDir(async () => {
      process.env.NODE_ENV = "development";
      mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
      writeFileSync(
        path.join(process.cwd(), "data", "campaign-assignments.json"),
        JSON.stringify({ staffByUserId: {} }, null, 2),
        "utf8",
      );
      const assignments = await readCampaignAssignments();
      expect(assignments.staffByUserId[seedUserIds[0]]).toEqual([seedCampaignIds[0]]);
    });
  });

  it("still copies the development seed for an empty test file", async () => {
    await inTempDir(async () => {
      process.env.NODE_ENV = "test";
      mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
      writeFileSync(
        path.join(process.cwd(), "data", "campaign-assignments.json"),
        JSON.stringify({ staffByUserId: {} }, null, 2),
        "utf8",
      );
      const assignments = await readCampaignAssignments();
      expect(assignments.staffByUserId[seedUserIds[0]]).toEqual([seedCampaignIds[0]]);
    });
  });

  it("does not let Machine dispatch read the assignment seed", () => {
    const sources = walkTypeScript(DISPATCH_DIR).map((filePath) => readFileSync(filePath, "utf8"));
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source).not.toContain("readCampaignAssignments");
      expect(source).not.toContain("campaign-assignments.seed");
    }
  });
});
