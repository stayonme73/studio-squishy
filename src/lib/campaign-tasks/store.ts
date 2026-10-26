import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { isPostgresPersistenceEnabled } from "@/config/studio-durable-persistence-v1";
import {
  atomicReplaceFile,
  withCampaignWriteLock,
} from "@/lib/campaign-store/file-io";
import {
  pgListTasksEnvelopes,
  pgReadTasksEnvelope,
  pgWriteTasksEnvelope,
} from "@/lib/studio-durable-persistence/postgres-spine";
import { preserveProtectedCorrectionLedger } from "@/lib/campaign-store/protected-campaign-guard";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { getOrInitializeMaterials } from "@/lib/materials/store";

import { regenerateIfPlanChanged } from "./generate";
import {
  isLegacyWorkflowDefaultOnlyChange,
  normalizeLegacyRecord,
} from "./plan-change";
import type { CampaignTasksRecord, ServerTasksEnvelope } from "./types";

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
  if (isPostgresPersistenceEnabled()) {
    return pgReadTasksEnvelope(campaignId);
  }
  const file = tasksPath(campaignId);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const raw = await fs.readFile(file, "utf8");
      if (!raw.trim()) {
        await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
        continue;
      }
      return normalizeLegacyRecord(JSON.parse(raw) as ServerTasksEnvelope);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      if (error instanceof SyntaxError && attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new SyntaxError(`Tasks envelope for ${campaignId} was unreadable.`);
}

export async function listTasksEnvelopes(): Promise<ServerTasksEnvelope[]> {
  if (isPostgresPersistenceEnabled()) {
    return pgListTasksEnvelopes();
  }
  await ensureTasksDir();
  let files: string[];
  try {
    files = await fs.readdir(TASKS_DIR);
  } catch {
    return [];
  }

  const envelopes: ServerTasksEnvelope[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const campaignId = file.slice(0, -".json".length);
    const envelope = await readTasksEnvelope(campaignId);
    if (envelope) envelopes.push(envelope);
  }

  return envelopes.sort((a, b) => b.syncedAt.localeCompare(a.syncedAt));
}

export async function writeTasksEnvelope(
  envelope: ServerTasksEnvelope,
): Promise<ServerTasksEnvelope> {
  const protectedLedger = preserveProtectedCorrectionLedger(envelope);
  const guarded = protectedLedger.envelope;
  if (protectedLedger.genuineRowMissing) {
    // The stored ledger no longer backs the protected campaign's frozen counters.
    // Not thrown — a refused write here would break unrelated flows — but it must
    // not pass in silence either. Repair with
    // `scripts/maya-revision-entitlement-repair.mts`.
    console.warn(
      `[protected-campaign-guard] ${guarded.campaignId}: genuine correction-use row absent from the ledger; frozen revision counters are unbacked.`,
    );
  }
  return withCampaignWriteLock(guarded.campaignId, async () => {
    if (isPostgresPersistenceEnabled()) {
      return pgWriteTasksEnvelope(guarded);
    }
    await ensureTasksDir();
    await atomicReplaceFile(
      tasksPath(guarded.campaignId),
      JSON.stringify(guarded, null, 2),
    );
    return guarded;
  });
}

function toEnvelope(record: CampaignTasksRecord): ServerTasksEnvelope {
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
    (JSON.stringify(existing.tasks) !== JSON.stringify(generated.tasks) &&
      !isLegacyWorkflowDefaultOnlyChange(existing, generated));

  if (shouldPersist) {
    return writeTasksEnvelope(envelope);
  }

  return envelope;
}
