import { promises as fs } from "fs";
import path from "path";

import { atomicReplaceFile, withCampaignWriteLock } from "@/lib/campaign-store/file-io";

import {
  PROJECT_COMMUNICATION_ACK_ENVELOPE_VERSION,
  type ProjectCommunicationAckEnvelope,
} from "./types";

const ACK_DIR = path.join(process.cwd(), "data", "project-communication-ack");

function ackPath(campaignId: string, customerUserId: string): string {
  // One ack file per campaign+customer — multi-campaign customers do not share markers.
  const safeCustomer = customerUserId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(ACK_DIR, `${campaignId}__${safeCustomer}.json`);
}

async function ensureAckDir(): Promise<void> {
  await fs.mkdir(ACK_DIR, { recursive: true });
}

export function emptyProjectCommunicationAckEnvelope(
  campaignId: string,
  customerUserId: string,
): ProjectCommunicationAckEnvelope {
  const now = new Date().toISOString();
  return {
    version: PROJECT_COMMUNICATION_ACK_ENVELOPE_VERSION,
    campaignId,
    customerUserId,
    lastAcknowledgedStudioReplyId: null,
    lastAcknowledgedStudioReplyCreatedAt: null,
    acknowledgedAt: null,
    channel: null,
    updatedAt: now,
  };
}

export async function readProjectCommunicationAckEnvelope(
  campaignId: string,
  customerUserId: string,
): Promise<ProjectCommunicationAckEnvelope | null> {
  try {
    const raw = await fs.readFile(ackPath(campaignId, customerUserId), "utf8");
    return JSON.parse(raw) as ProjectCommunicationAckEnvelope;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeProjectCommunicationAckEnvelope(
  envelope: ProjectCommunicationAckEnvelope,
): Promise<ProjectCommunicationAckEnvelope> {
  const lockKey = `comm-ack:${envelope.campaignId}:${envelope.customerUserId}`;
  return withCampaignWriteLock(lockKey, async () => {
    await ensureAckDir();
    const target = ackPath(envelope.campaignId, envelope.customerUserId);
    await atomicReplaceFile(target, JSON.stringify(envelope, null, 2));
    return envelope;
  });
}

export async function getOrInitializeProjectCommunicationAck(
  campaignId: string,
  customerUserId: string,
): Promise<ProjectCommunicationAckEnvelope> {
  const existing = await readProjectCommunicationAckEnvelope(campaignId, customerUserId);
  if (existing) {
    if (existing.campaignId !== campaignId || existing.customerUserId !== customerUserId) {
      throw new Error("Acknowledgment identity mismatch.");
    }
    return existing;
  }
  return emptyProjectCommunicationAckEnvelope(campaignId, customerUserId);
}
