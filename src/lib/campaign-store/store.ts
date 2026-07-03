import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";

import { assertCampaignSyncAllowed } from "./fixture-guard";
import type { ServerCampaignEnvelope } from "./types";

const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");

function campaignPath(campaignId: string): string {
  return path.join(CAMPAIGNS_DIR, `${campaignId}.json`);
}

async function ensureCampaignsDir(): Promise<void> {
  await fs.mkdir(CAMPAIGNS_DIR, { recursive: true });
}

export async function readCampaignEnvelope(
  campaignId: string,
): Promise<ServerCampaignEnvelope | null> {
  try {
    const raw = await fs.readFile(campaignPath(campaignId), "utf8");
    return JSON.parse(raw) as ServerCampaignEnvelope;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeCampaignEnvelope(
  envelope: ServerCampaignEnvelope,
): Promise<ServerCampaignEnvelope> {
  assertCampaignSyncAllowed(envelope.campaignId);
  await ensureCampaignsDir();
  const target = campaignPath(envelope.campaignId);
  const payload = JSON.stringify(envelope, null, 2);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, payload, "utf8");
  await fs.rename(temp, target);
  return envelope;
}

export async function listCampaignEnvelopes(): Promise<ServerCampaignEnvelope[]> {
  await ensureCampaignsDir();
  let files: string[];
  try {
    files = await fs.readdir(CAMPAIGNS_DIR);
  } catch {
    return [];
  }

  const envelopes: ServerCampaignEnvelope[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const campaignId = file.slice(0, -".json".length);
    const envelope = await readCampaignEnvelope(campaignId);
    if (envelope) envelopes.push(envelope);
  }

  return envelopes.sort(
    (a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime(),
  );
}

/** Upsert by campaignId — one server record per campaign (idempotent). */
export async function upsertCampaignRecord(
  record: CampaignRecord,
  clientUserId?: string,
): Promise<ServerCampaignEnvelope> {
  assertCampaignSyncAllowed(record.campaignId);

  const existing = await readCampaignEnvelope(record.campaignId);
  const now = new Date().toISOString();

  const envelope: ServerCampaignEnvelope = {
    campaignId: record.campaignId,
    clientUserId: existing?.clientUserId ?? clientUserId,
    record,
    syncedAt: now,
    syncVersion: (existing?.syncVersion ?? 0) + 1,
  };

  return writeCampaignEnvelope(envelope);
}
