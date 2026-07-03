import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignExceptionEvent } from "@/lib/campaign-tasks/exceptions-types";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import type { JobActivityActor, JobActivityEvent, JobActivityEventKind, PurchasedJobRecord } from "./types";

function eventId(prefix: string, key: string): string {
  return `${prefix}:${key}`;
}

function systemActor(): JobActivityActor {
  return { role: "system", displayName: "System" };
}

export function appendJobActivityEvent(
  events: readonly JobActivityEvent[],
  event: Omit<JobActivityEvent, "id">,
): JobActivityEvent[] {
  const id = eventId(event.kind, event.messageRef ?? `${event.jobId}:${event.occurredAt}`);
  if (events.some((entry) => entry.id === id)) return [...events];
  return [...events, { ...event, id }];
}

export function recordJobStatusChange(
  events: readonly JobActivityEvent[],
  job: PurchasedJobRecord,
  actor: JobActivityActor,
  reason: string,
  occurredAt = new Date().toISOString(),
): JobActivityEvent[] {
  return appendJobActivityEvent(events, {
    campaignId: job.campaignId,
    jobId: job.jobId,
    kind: "status_change",
    occurredAt,
    actor,
    spineStatus: job.spineStatus,
    reason,
  });
}

export function deriveBaselineActivityEvents(
  campaign: CampaignRecord,
  jobs: readonly PurchasedJobRecord[],
  materials: readonly CampaignMaterialItem[],
  exceptionEvents: readonly CampaignExceptionEvent[] | undefined,
): JobActivityEvent[] {
  const events: JobActivityEvent[] = [];

  for (const job of jobs) {
    if (campaign.paymentReceivedAt) {
      events.push({
        id: eventId("payment", job.jobId),
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "payment",
        occurredAt: campaign.paymentReceivedAt,
        actor: { role: "client", displayName: "Client" },
        reason: "Payment received",
      });
    }

    const intakeAt =
      campaign.routeMapIntakeSubmittedAt ?? campaign.projectDetailsSubmittedAt;
    if (intakeAt) {
      events.push({
        id: eventId("intake", job.jobId),
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "intake",
        occurredAt: intakeAt,
        actor: { role: "client", displayName: "Client" },
        reason: "Intake submitted",
      });
    }

    for (const item of materials) {
      if (!item.relatedServiceIds.includes(job.skuId)) continue;
      if (item.promotionApprovedAt) {
        events.push({
          id: eventId("missing_material_request", `${job.jobId}:${item.id}`),
          campaignId: job.campaignId,
          jobId: job.jobId,
          kind: "missing_material_request",
          occurredAt: item.promotionApprovedAt,
          actor: { role: "owner", displayName: "Owner" },
          reason: item.label,
          messageContent: item.clientFacingPrompt ?? item.whyNeeded,
        });
      }
      if (item.submittedAt && item.submittedBy?.role === "client") {
        events.push({
          id: eventId("client_upload", `${job.jobId}:${item.id}`),
          campaignId: job.campaignId,
          jobId: job.jobId,
          kind: "client_upload",
          occurredAt: item.submittedAt,
          actor: {
            role: "client",
            userId: item.submittedBy.userId,
            displayName: item.submittedBy.displayName ?? "Client",
          },
          reason: item.label,
        });
      }
    }
  }

  for (const entry of exceptionEvents ?? []) {
    if (entry.action !== "approved_client_request") continue;
    const jobId = jobs[0]?.jobId;
    if (!jobId) continue;

    events.push({
      id: eventId("approval", entry.id),
      campaignId: campaign.campaignId,
      jobId,
      kind: "approval",
      occurredAt: entry.createdAt,
      actor: {
        role: entry.actorRole === "owner" ? "owner" : "staff",
        userId: entry.actorUserId,
        displayName: entry.actorDisplayName,
      },
      reason: entry.notes ?? "Owner approval",
      messageRef: entry.exceptionId,
    });
  }

  if (campaign.campaignStatus === "READY_FOR_REVIEW") {
    for (const job of jobs) {
      events.push({
        id: eventId("review_notice", job.jobId),
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "review_notice",
        occurredAt: campaign.updatedAt,
        actor: systemActor(),
        reason: "Ready for client review",
        spineStatus: "ready_for_review",
      });
    }
  }

  if (campaign.campaignStatus === "DELIVERED") {
    for (const job of jobs) {
      events.push({
        id: eventId("delivery", job.jobId),
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "delivery",
        occurredAt: campaign.updatedAt,
        actor: systemActor(),
        reason: "Delivered to client",
        spineStatus: "delivered",
      });
    }
  }

  return sortActivityEvents(events);
}

export function sortActivityEvents(
  events: readonly JobActivityEvent[],
): JobActivityEvent[] {
  return [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function mergeActivityEvents(
  persisted: readonly JobActivityEvent[] | undefined,
  derived: readonly JobActivityEvent[],
): JobActivityEvent[] {
  const byId = new Map<string, JobActivityEvent>();
  for (const event of derived) {
    byId.set(event.id, event);
  }
  for (const event of persisted ?? []) {
    byId.set(event.id, event);
  }
  return sortActivityEvents([...byId.values()]);
}

export function formatActivityKind(kind: JobActivityEventKind): string {
  return kind.replace(/_/g, " ");
}
