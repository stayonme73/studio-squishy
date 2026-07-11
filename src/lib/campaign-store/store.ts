import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import {
  ensureCustomerFieldTokensBackfill,
  preserveDirectApplyFieldsOnUpsert,
  seedCustomerFieldTokensFromProjectDetails,
} from "@/lib/customer-field-tokens";

import { assertCampaignSyncAllowed } from "./fixture-guard";
import { atomicReplaceFile, withCampaignWriteLock } from "./file-io";
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
    try {
      return JSON.parse(raw) as ServerCampaignEnvelope;
    } catch {
      const firstObjectEnd = raw.indexOf("\n}");
      if (firstObjectEnd === -1) throw new SyntaxError(`Invalid campaign JSON: ${campaignId}`);
      const recovered = `${raw.slice(0, firstObjectEnd + 2).trim()}\n`;
      return JSON.parse(recovered) as ServerCampaignEnvelope;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function atomicReplaceCampaignFile(target: string, payload: string): Promise<void> {
  await atomicReplaceFile(target, payload);
}
export async function writeCampaignEnvelope(
  envelope: ServerCampaignEnvelope,
): Promise<ServerCampaignEnvelope> {
  return withCampaignWriteLock(envelope.campaignId, async () => {
    assertCampaignSyncAllowed(envelope.campaignId);
    await ensureCampaignsDir();
    const target = campaignPath(envelope.campaignId);
    const payload = JSON.stringify(envelope, null, 2);
    await atomicReplaceCampaignFile(target, payload);
    return envelope;
  });
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
    const envelope = await readCampaignEnvelope(campaignId).catch(() => null);
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

  let mergedRecord = existing
    ? preserveDirectApplyFieldsOnUpsert(existing.record, record)
    : record;

  if (
    !existing?.record.projectDetailsSubmittedAt &&
    mergedRecord.projectDetailsSubmittedAt &&
    mergedRecord.projectDetails?.form
  ) {
    mergedRecord = seedCustomerFieldTokensFromProjectDetails(mergedRecord);
  } else {
    mergedRecord = ensureCustomerFieldTokensBackfill(mergedRecord);
  }

  const envelope: ServerCampaignEnvelope = {
    campaignId: mergedRecord.campaignId,
    clientUserId: existing?.clientUserId ?? clientUserId,
    record: { ...mergedRecord, updatedAt: now },
    syncedAt: now,
    syncVersion: (existing?.syncVersion ?? 0) + 1,
  };
  return writeCampaignEnvelope(envelope);
}
