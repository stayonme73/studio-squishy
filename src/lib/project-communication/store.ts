import { promises as fs } from "fs";
import path from "path";

import { atomicReplaceFile, withCampaignWriteLock } from "@/lib/campaign-store/file-io";

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
