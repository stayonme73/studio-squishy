import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { getOrInitializeMaterials } from "@/lib/materials/store";

import { regenerateIfPlanChanged } from "./generate";
import type { ServerTasksEnvelope } from "./types";

const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");

function tasksPath(campaignId: string): string {
  return path.join(TASKS_DIR, `${campaignId}.json`);
}

async function ensureTasksDir(): Promise<void> {
  await fs.mkdir(TASKS_DIR, { recursive: true });
}

export async function readTasksEnvelope(
  campaignId: string,
): Promise<ServerTasksEnvelope | null> {
  try {
    const raw = await fs.readFile(tasksPath(campaignId), "utf8");
    return JSON.parse(raw) as ServerTasksEnvelope;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeTasksEnvelope(
  envelope: ServerTasksEnvelope,
): Promise<ServerTasksEnvelope> {
  await ensureTasksDir();
  await fs.writeFile(tasksPath(envelope.campaignId), JSON.stringify(envelope, null, 2), "utf8");
  return envelope;
}

function toEnvelope(record: ReturnType<typeof regenerateIfPlanChanged>): ServerTasksEnvelope {
  const now = new Date().toISOString();
  return { ...record, syncedAt: now };
}

/**
 * Read production tasks for a campaign. On first access, generate from approved plan.
 * Regenerates when planFingerprint changes; refreshes statuses on each read.
 */
export async function getOrGenerateTasks(
  campaignId: string,
  campaign?: CampaignRecord,
): Promise<ServerTasksEnvelope> {
  let record = campaign;
  if (!record) {
    const envelope = await readCampaignEnvelope(campaignId);
    record = envelope?.record;
  }
  if (!record) {
    throw new Error(`Cannot generate tasks — campaign "${campaignId}" not found.`);
  }

  const materialsEnvelope = await getOrInitializeMaterials(campaignId, record);
  const existing = await readTasksEnvelope(campaignId);
  const generated = regenerateIfPlanChanged(
    existing,
    record,
    materialsEnvelope.items,
  );
  const envelope = toEnvelope(generated);

  const shouldPersist =
    !existing ||
    existing.planFingerprint !== generated.planFingerprint ||
    JSON.stringify(existing.tasks) !== JSON.stringify(generated.tasks);

  if (shouldPersist) {
    return writeTasksEnvelope(envelope);
  }

  return envelope;
}
