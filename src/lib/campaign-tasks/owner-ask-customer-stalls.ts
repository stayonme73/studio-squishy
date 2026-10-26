/**
 * Customer-readable Owner-ask stalls.
 * Kept separate from Owner decision aftermath so the Conversation Room
 * does not import job-control file access.
 */

import { OWNER_HELD_EXCEPTION_KINDS } from "@/config/campaign-exceptions";
import type { CustomerLifeStall } from "@/lib/studio-customer-life/types";

import type {
  CampaignExceptionKind,
  CampaignExceptionRecord,
} from "./exceptions-types";
import type { ServerTasksEnvelope } from "./types";

const OWNER_ASK_RETURN_KIND_SET = new Set<CampaignExceptionKind>(
  OWNER_HELD_EXCEPTION_KINDS,
);

export function extractAskClientWording(notes?: string): string | null {
  const text = notes?.trim();
  if (!text) return null;
  const marker = "Owner ask-client";
  const index = text.lastIndexOf(marker);
  if (index >= 0) {
    const afterPrefix = text.slice(index);
    const colon = afterPrefix.indexOf(": ");
    if (colon >= 0) return afterPrefix.slice(colon + 2).trim() || null;
  }
  return text;
}

export function latestAskedClientMessage(
  envelope: ServerTasksEnvelope,
  exceptionId: string,
): string | null {
  const events = (envelope.exceptionEvents ?? []).filter(
    (event) => event.exceptionId === exceptionId && event.action === "asked_client",
  );
  if (events.length === 0) return null;
  const latest = events.reduce((current, event) =>
    event.createdAt.localeCompare(current.createdAt) >= 0 ? event : current,
  );
  return latest.resolutionNotes?.trim() || extractAskClientWording(latest.notes) || null;
}

export function shouldReturnOwnerAskException(record: CampaignExceptionRecord): boolean {
  if (record.status !== "waiting_client") return false;
  if (record.promotion) return false;
  if (!OWNER_ASK_RETURN_KIND_SET.has(record.kind)) return false;
  return true;
}

export function ownerAskReturnKind(kind: CampaignExceptionKind): boolean {
  return OWNER_ASK_RETURN_KIND_SET.has(kind);
}

export function ownerAskCustomerStalls(
  envelope: ServerTasksEnvelope | null | undefined,
): CustomerLifeStall[] {
  if (!envelope) return [];
  const stalls: CustomerLifeStall[] = [];

  for (const record of envelope.exceptionRecords ?? []) {
    if (!shouldReturnOwnerAskException(record) && record.status !== "waiting_client") continue;
    if (record.status !== "waiting_client") continue;
    if (record.kind === "missing_client_fact") continue;
    const prompt =
      latestAskedClientMessage(envelope, record.id) ??
      "The Studio needs a reply from you before this work can continue.";
    stalls.push({
      id: `owner_ask:${record.id}`,
      summary: prompt,
      recoveryClass: "waiting_on_customer",
    });
  }

  for (const interaction of envelope.ownerDecisionInteractions ?? []) {
    if (interaction.status !== "waiting_client") continue;
    const prompt =
      extractAskClientWording(interaction.resolutionNotes) ??
      "The Studio needs a little more information from you before this request can continue.";
    stalls.push({
      id: `owner_ask_interaction:${interaction.id}`,
      summary: prompt,
      recoveryClass: "waiting_on_customer",
    });
  }

  for (const job of envelope.jobRecords ?? []) {
    if (!job.ownerAskResumeGate) continue;
    const prompt =
      [...(envelope.jobCommunicationRecords ?? [])]
        .reverse()
        .find((record) => record.jobId === job.jobId && record.eventType === "owner_ask_client")
        ?.messageContent ??
      "The Studio needs a reply from you before this work can continue.";
    stalls.push({
      id: `owner_ask_gate:${job.jobId}`,
      summary: prompt,
      recoveryClass: "waiting_on_customer",
    });
  }

  return stalls;
}
