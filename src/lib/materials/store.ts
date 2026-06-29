import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";

import { syncMaterialsSummaryOnCampaign } from "./campaign-summary";
import { migrateFromProjectDetails } from "./migrate-from-project-details";
import { countBlockingRequiredMaterials } from "./materials-view";
import type { CampaignMaterialItem, ServerMaterialsEnvelope } from "./types";

const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");

function materialsPath(campaignId: string): string {
  return path.join(MATERIALS_DIR, `${campaignId}.json`);
}

async function ensureMaterialsDir(): Promise<void> {
  await fs.mkdir(MATERIALS_DIR, { recursive: true });
}

export async function readMaterialsEnvelope(
  campaignId: string,
): Promise<ServerMaterialsEnvelope | null> {
  try {
    const raw = await fs.readFile(materialsPath(campaignId), "utf8");
    return JSON.parse(raw) as ServerMaterialsEnvelope;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeMaterialsEnvelope(
  envelope: ServerMaterialsEnvelope,
): Promise<ServerMaterialsEnvelope> {
  await ensureMaterialsDir();
  await fs.writeFile(materialsPath(envelope.campaignId), JSON.stringify(envelope, null, 2), "utf8");
  return envelope;
}

function toEnvelope(record: ReturnType<typeof migrateFromProjectDetails>): ServerMaterialsEnvelope {
  const now = new Date().toISOString();
  return { ...record, syncedAt: now };
}

async function ensureCampaignMaterialsSummary(
  campaignId: string,
  items: readonly CampaignMaterialItem[],
): Promise<void> {
  const campaignEnvelope = await readCampaignEnvelope(campaignId);
  if (!campaignEnvelope?.record.materialsSummary) {
    await syncMaterialsSummaryOnCampaign(campaignId, countBlockingRequiredMaterials(items));
  }
}

/**
 * Read materials for a campaign. On first access, migrate from campaign record + project details.
 */
export async function getOrInitializeMaterials(
  campaignId: string,
  campaign?: CampaignRecord,
): Promise<ServerMaterialsEnvelope> {
  const existing = await readMaterialsEnvelope(campaignId);
  if (existing) {
    await ensureCampaignMaterialsSummary(campaignId, existing.items);
    return existing;
  }

  let record = campaign;
  if (!record) {
    const envelope = await readCampaignEnvelope(campaignId);
    record = envelope?.record;
  }
  if (!record) {
    throw new Error(`Cannot initialize materials — campaign "${campaignId}" not found.`);
  }

  const migrated = migrateFromProjectDetails(record);
  const envelope = await writeMaterialsEnvelope(toEnvelope(migrated));
  await syncMaterialsSummaryOnCampaign(campaignId, countBlockingRequiredMaterials(envelope.items));
  return envelope;
}
