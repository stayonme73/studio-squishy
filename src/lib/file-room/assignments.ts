import { promises as fs } from "fs";
import path from "path";

import type { CampaignAssignmentsFile } from "./assignments-shared";
import seedAssignments from "./campaign-assignments.seed.json";

export type { CampaignAssignmentsFile } from "./assignments-shared";
export { isStaffAssignedToCampaign, staffAssignedCampaignIds } from "./assignments-shared";

const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");

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

function seedAssignmentsPayload(): CampaignAssignmentsFile {
  const { _comment: _ignored, ...seed } = seedAssignments as CampaignAssignmentsFile & {
    _comment?: string;
  };
  return normalizeAssignments(seed);
}

function isEmptyAssignments(file: CampaignAssignmentsFile): boolean {
  return Object.keys(file.staffByUserId).length === 0;
}

async function ensureAssignmentsFile(): Promise<void> {
  await fs.mkdir(path.dirname(ASSIGNMENTS_PATH), { recursive: true });
  const seed = seedAssignmentsPayload();
  const seedHasStaff = !isEmptyAssignments(seed);

  try {
    const raw = await fs.readFile(ASSIGNMENTS_PATH, "utf8");
    const existing = normalizeAssignments(JSON.parse(raw) as CampaignAssignmentsFile);
    if (isEmptyAssignments(existing) && seedHasStaff) {
      await fs.writeFile(ASSIGNMENTS_PATH, JSON.stringify(seed, null, 2), "utf8");
    }
    return;
  } catch {
    await fs.writeFile(ASSIGNMENTS_PATH, JSON.stringify(seed, null, 2), "utf8");
  }
}

export async function readCampaignAssignments(): Promise<CampaignAssignmentsFile> {
  await ensureAssignmentsFile();
  const raw = await fs.readFile(ASSIGNMENTS_PATH, "utf8");
  return normalizeAssignments(JSON.parse(raw) as CampaignAssignmentsFile);
}

export async function writeCampaignAssignments(
  assignments: CampaignAssignmentsFile,
): Promise<CampaignAssignmentsFile> {
  await fs.mkdir(path.dirname(ASSIGNMENTS_PATH), { recursive: true });
  const normalized = normalizeAssignments(assignments);
  await fs.writeFile(ASSIGNMENTS_PATH, JSON.stringify(normalized, null, 2), "utf8");
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
