import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { isPostgresPersistenceEnabled } from "@/config/studio-durable-persistence-v1";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { atomicReplaceFile, withCampaignWriteLock } from "@/lib/campaign-store/file-io";
import { computePlanFingerprint } from "@/lib/campaign-tasks/generate";
import {
  pgMutateProductionEnvelope,
  pgReadProductionEnvelope,
  pgWriteProductionEnvelope,
} from "@/lib/studio-durable-persistence/postgres-activity-production";

import { emptyProductionRecord, syncProductionWithPlan } from "./plan-sync";
import type { CampaignProductionRecord, ServerProductionEnvelope } from "./types";

const PRODUCTION_DIR = path.join(process.cwd(), "data", "campaign-production");

function productionPath(campaignId: string): string {
  return path.join(PRODUCTION_DIR, `${campaignId}.json`);
}

async function ensureProductionDir(): Promise<void> {
  await fs.mkdir(PRODUCTION_DIR, { recursive: true });
}

export async function readProductionEnvelope(
  campaignId: string,
): Promise<ServerProductionEnvelope | null> {
  if (isPostgresPersistenceEnabled()) {
    return pgReadProductionEnvelope(campaignId);
  }
  try {
    const raw = await fs.readFile(productionPath(campaignId), "utf8");
    return JSON.parse(raw) as ServerProductionEnvelope;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeProductionEnvelope(
  envelope: ServerProductionEnvelope,
): Promise<ServerProductionEnvelope> {
  if (isPostgresPersistenceEnabled()) {
    return pgWriteProductionEnvelope(envelope);
  }
  return withCampaignWriteLock(envelope.campaignId, async () => {
    await ensureProductionDir();
    await atomicReplaceFile(productionPath(envelope.campaignId), JSON.stringify(envelope, null, 2));
    return envelope;
  });
}

/** Read-modify-write under campaign lock (Postgres `FOR UPDATE` or in-process FS lock). */
export async function mutateProductionEnvelope<T>(
  campaignId: string,
  mutate: (current: ServerProductionEnvelope | null) => {
    envelope: ServerProductionEnvelope;
    value: T;
  },
): Promise<T> {
  if (isPostgresPersistenceEnabled()) {
    return pgMutateProductionEnvelope(campaignId, mutate);
  }

  return withCampaignWriteLock(campaignId, async () => {
    const current = await readProductionEnvelope(campaignId);
    const { envelope, value } = mutate(current);
    await ensureProductionDir();
    await atomicReplaceFile(productionPath(envelope.campaignId), JSON.stringify(envelope, null, 2));
    return value;
  });
}

/**
 * Read production store for a campaign. On first access, initialize from approved plan.
 * Re-syncs work units when plan fingerprint changes.
 */
export async function getOrInitializeProduction(
  campaignId: string,
  campaign?: CampaignRecord,
): Promise<ServerProductionEnvelope> {
  let record = campaign;
  if (!record) {
    const envelope = await readCampaignEnvelope(campaignId);
    record = envelope?.record;
  }
  if (!record) {
    throw new Error(`Cannot initialize production — campaign "${campaignId}" not found.`);
  }

  const plan = record.approvedStudioPlan;
  const planFingerprint = plan ? computePlanFingerprint(plan) : "";
  const existing = await readProductionEnvelope(campaignId);
  const base = existing ?? emptyProductionRecord(campaignId, planFingerprint);

  const synced = syncProductionWithPlan(base, record);
  const envelope = { ...synced, syncedAt: new Date().toISOString() };

  const shouldPersist =
    !existing ||
    existing.planFingerprint !== synced.planFingerprint ||
    JSON.stringify(existing.workUnits) !== JSON.stringify(synced.workUnits);

  if (shouldPersist) {
    return writeProductionEnvelope(envelope);
  }

  return envelope;
}

export async function persistProductionRecord(
  record: CampaignProductionRecord,
): Promise<ServerProductionEnvelope> {
  return writeProductionEnvelope({
    ...record,
    syncedAt: new Date().toISOString(),
  });
}
