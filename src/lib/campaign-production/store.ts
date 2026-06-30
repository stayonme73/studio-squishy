import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { computePlanFingerprint } from "@/lib/campaign-tasks/generate";

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
  await ensureProductionDir();
  await fs.writeFile(
    productionPath(envelope.campaignId),
    JSON.stringify(envelope, null, 2),
    "utf8",
  );
  return envelope;
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
  const base =
    existing ??
    emptyProductionRecord(campaignId, planFingerprint);

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
