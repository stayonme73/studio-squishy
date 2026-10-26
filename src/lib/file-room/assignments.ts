import { promises as fs } from "fs";
import path from "path";

import { isPostgresPersistenceEnabled } from "@/config/studio-durable-persistence-v1";
import {
  pgReadCampaignAssignments,
  pgWriteCampaignAssignments,
} from "@/lib/studio-durable-persistence/postgres-assignments";

import type { CampaignAssignmentsFile } from "./assignments-shared";
import seedAssignments from "./campaign-assignments.seed.json";

export type { CampaignAssignmentsFile } from "./assignments-shared";
export { isStaffAssignedToCampaign, staffAssignedCampaignIds } from "./assignments-shared";

function assignmentsFilePath(): string {
  return path.join(process.cwd(), "data", "campaign-assignments.json");
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

function normalizeCapabilities(
  raw: CampaignAssignmentsFile["staffCapabilities"] | undefined,
): CampaignAssignmentsFile["staffCapabilities"] {
  if (!raw) return undefined;
  const staffCapabilities: Record<string, readonly string[]> = {};
  for (const [userId, roles] of Object.entries(raw)) {
    staffCapabilities[userId] = [...new Set(roles.filter(Boolean))];
  }
  return staffCapabilities;
}

function normalizeAssignments(raw: CampaignAssignmentsFile): CampaignAssignmentsFile {
  const staffByUserId: Record<string, readonly string[]> = {};
  for (const [userId, campaignIds] of Object.entries(raw.staffByUserId ?? {})) {
    staffByUserId[userId] = [...new Set(campaignIds.filter(Boolean))];
  }
  return {
    staffByUserId,
    staffCapabilities: normalizeCapabilities(raw.staffCapabilities),
  };
}

/**
 * Repository staff assignments are for local development and tests.
 * Production never copies them. `next start` sets NODE_ENV=production
 * itself, so this does not depend on a second flag.
 */
function seedAssignmentsPayload(): CampaignAssignmentsFile {
  if (isProductionRuntime()) {
    return { staffByUserId: {} };
  }
  const { _comment: _ignored, ...seed } = seedAssignments as CampaignAssignmentsFile & {
    _comment?: string;
  };
  return normalizeAssignments(seed);
}

function isEmptyAssignments(file: CampaignAssignmentsFile): boolean {
  return Object.keys(file.staffByUserId).length === 0;
}

async function ensureAssignmentsFile(): Promise<void> {
  const assignmentsPath = assignmentsFilePath();
  await fs.mkdir(path.dirname(assignmentsPath), { recursive: true });
  const seed = seedAssignmentsPayload();
  const seedHasStaff = !isEmptyAssignments(seed);

  try {
    const raw = await fs.readFile(assignmentsPath, "utf8");
    const existing = normalizeAssignments(JSON.parse(raw) as CampaignAssignmentsFile);
    if (isEmptyAssignments(existing) && seedHasStaff) {
      await fs.writeFile(assignmentsPath, JSON.stringify(seed, null, 2), "utf8");
    }
    return;
  } catch {
    await fs.writeFile(assignmentsPath, JSON.stringify(seed, null, 2), "utf8");
  }
}

export async function readCampaignAssignments(): Promise<CampaignAssignmentsFile> {
  if (isPostgresPersistenceEnabled()) {
    const stored = await pgReadCampaignAssignments();
    if (stored) return normalizeAssignments(stored);
    const seed = seedAssignmentsPayload();
    if (!isEmptyAssignments(seed)) {
      await pgWriteCampaignAssignments(seed);
      return seed;
    }
    return { staffByUserId: {} };
  }
  await ensureAssignmentsFile();
  const raw = await fs.readFile(assignmentsFilePath(), "utf8");
  return normalizeAssignments(JSON.parse(raw) as CampaignAssignmentsFile);
}

export async function writeCampaignAssignments(
  assignments: CampaignAssignmentsFile,
): Promise<CampaignAssignmentsFile> {
  const normalized = normalizeAssignments(assignments);
  if (isPostgresPersistenceEnabled()) {
    return pgWriteCampaignAssignments(normalized);
  }
  const assignmentsPath = assignmentsFilePath();
  await fs.mkdir(path.dirname(assignmentsPath), { recursive: true });
  await fs.writeFile(assignmentsPath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

/** Dev-only helper — assign one staff user to a single campaign. */
export async function assignStaffToCampaign(
  userId: string,
  campaignId: string,
): Promise<CampaignAssignmentsFile> {
  return writeCampaignAssignments({
    staffByUserId: {
      [userId]: [campaignId],
    },
  });
}
