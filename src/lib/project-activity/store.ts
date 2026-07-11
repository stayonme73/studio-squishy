import { promises as fs } from "fs";
import path from "path";

import { atomicReplaceFile, withCampaignWriteLock } from "@/lib/campaign-store/file-io";

import type { ProjectActivityEnvelope } from "./types";

const ACTIVITY_DIR = path.join(process.cwd(), "data", "project-activity");

function activityPath(campaignId: string): string {
  return path.join(ACTIVITY_DIR, `${campaignId}.json`);
}

async function ensureActivityDir(): Promise<void> {
  await fs.mkdir(ACTIVITY_DIR, { recursive: true });
}

export async function readProjectActivityEnvelope(
  campaignId: string,
): Promise<ProjectActivityEnvelope | null> {
  try {
    const raw = await fs.readFile(activityPath(campaignId), "utf8");
    return JSON.parse(raw) as ProjectActivityEnvelope;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeProjectActivityEnvelope(
  envelope: ProjectActivityEnvelope,
): Promise<ProjectActivityEnvelope> {
  return withCampaignWriteLock(envelope.campaignId, async () => {
    await ensureActivityDir();
    const target = activityPath(envelope.campaignId);
    const payload = JSON.stringify(envelope, null, 2);
    await atomicReplaceFile(target, payload);
    return envelope;
  });
}

export function emptyProjectActivityEnvelope(campaignId: string): ProjectActivityEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId,
    events: [],
    requests: [],
    updatedAt: now,
    version: 0,
  };
}

export async function getOrInitializeProjectActivity(
  campaignId: string,
): Promise<ProjectActivityEnvelope> {
  const existing = await readProjectActivityEnvelope(campaignId);
  if (existing) return existing;
  const envelope = emptyProjectActivityEnvelope(campaignId);
  return writeProjectActivityEnvelope(envelope);
}
