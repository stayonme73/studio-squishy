import { promises as fs } from "fs";
import path from "path";

import { isPostgresPersistenceEnabled } from "@/config/studio-durable-persistence-v1";
import { atomicReplaceFile, withCampaignWriteLock } from "@/lib/campaign-store/file-io";
import {
  pgReadProjectCommunicationEnvelope,
  pgWriteProjectCommunicationEnvelope,
} from "@/lib/studio-durable-persistence/postgres-comms";
import {
  rowEnvelope,
  withPostgresTransaction,
} from "@/lib/studio-durable-persistence/postgres-pool";

import {
  PROJECT_COMMUNICATION_ENVELOPE_VERSION,
  type ProjectCommunicationEnvelope,
} from "./types";

const COMMUNICATION_DIR = path.join(process.cwd(), "data", "project-communication");

function communicationPath(campaignId: string): string {
  return path.join(COMMUNICATION_DIR, `${campaignId}.json`);
}

async function ensureCommunicationDir(): Promise<void> {
  await fs.mkdir(COMMUNICATION_DIR, { recursive: true });
}

export async function readProjectCommunicationEnvelope(
  campaignId: string,
): Promise<ProjectCommunicationEnvelope | null> {
  if (isPostgresPersistenceEnabled()) {
    return pgReadProjectCommunicationEnvelope(campaignId);
  }
  try {
    const raw = await fs.readFile(communicationPath(campaignId), "utf8");
    return JSON.parse(raw) as ProjectCommunicationEnvelope;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeProjectCommunicationEnvelope(
  envelope: ProjectCommunicationEnvelope,
): Promise<ProjectCommunicationEnvelope> {
  if (isPostgresPersistenceEnabled()) {
    return pgWriteProjectCommunicationEnvelope(envelope);
  }
  return withCampaignWriteLock(envelope.campaignId, async () => {
    await ensureCommunicationDir();
    const target = communicationPath(envelope.campaignId);
    const payload = JSON.stringify(envelope, null, 2);
    await atomicReplaceFile(target, payload);
    return envelope;
  });
}

export function emptyProjectCommunicationEnvelope(
  campaignId: string,
): ProjectCommunicationEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId,
    messages: [],
    updatedAt: now,
    version: PROJECT_COMMUNICATION_ENVELOPE_VERSION,
  };
}

export async function getOrInitializeProjectCommunication(
  campaignId: string,
): Promise<ProjectCommunicationEnvelope> {
  const existing = await readProjectCommunicationEnvelope(campaignId);
  if (existing) return existing;
  const envelope = emptyProjectCommunicationEnvelope(campaignId);
  return writeProjectCommunicationEnvelope(envelope);
}

/** Read-modify-write under campaign comms lock (Postgres advisory or in-process FS lock). */
export async function mutateProjectCommunicationEnvelope<T>(
  campaignId: string,
  mutate: (envelope: ProjectCommunicationEnvelope) => {
    envelope: ProjectCommunicationEnvelope;
    value: T;
  },
): Promise<T> {
  if (isPostgresPersistenceEnabled()) {
    return withPostgresTransaction(async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`comms:${campaignId}`]);
      const result = await client.query(
        `SELECT envelope FROM studio_project_communication WHERE campaign_id = $1 FOR UPDATE`,
        [campaignId],
      );
      const current =
        rowEnvelope<ProjectCommunicationEnvelope>(result.rows[0], "envelope") ??
        emptyProjectCommunicationEnvelope(campaignId);
      const { envelope, value } = mutate(current);
      await client.query(
        `INSERT INTO studio_project_communication (campaign_id, envelope, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (campaign_id) DO UPDATE SET
           envelope = EXCLUDED.envelope,
           updated_at = NOW()`,
        [campaignId, JSON.stringify(envelope)],
      );
      return value;
    });
  }

  return withCampaignWriteLock(campaignId, async () => {
    const current =
      (await readProjectCommunicationEnvelope(campaignId)) ??
      emptyProjectCommunicationEnvelope(campaignId);
    const { envelope, value } = mutate(current);
    await ensureCommunicationDir();
    const target = communicationPath(envelope.campaignId);
    await atomicReplaceFile(target, JSON.stringify(envelope, null, 2));
    return value;
  });
}
