import type { DraftIntakeFormValues, DraftIntakePayload } from "@/config/draft-room";
import { EMPTY_DRAFT_INTAKE_FORM } from "@/config/draft-room";
import {
  getPackageDeliverableQuotas,
  getPackageRevisionRounds,
  type DeliverableQuotaId,
} from "@/config/studio-guide";
import {
  studioBoard,
  type CampaignRecord,
  type StudioUpdate,
} from "@/config/studio-board";
import { readLastDraftIntake } from "@/lib/draft-intake";
import {
  mergeVisionData,
  normalizeDraftIntakeFormValues,
  resolveCampaignCustomerName,
  resolveDraftIntakeProject,
} from "@/lib/campaign-vision";

const { statusContent } = studioBoard;

export type DeliverableRemainingItem = {
  id: DeliverableQuotaId;
  label: string;
  total: number;
  delivered: number;
  remaining: number;
};

export type RevisionTrackerView = {
  included: number;
  used: number;
  remaining: number;
};

export type CampaignTimelineEntry = {
  date: string;
  label: string;
  sortKey: string;
};

/** Extract form fields from a full intake payload (legacy fields excluded). */
export function visionDataFromPayload(payload: DraftIntakePayload): DraftIntakeFormValues {
  const {
    idea: _idea,
    audience: _audience,
    action: _action,
    deadline: _deadline,
    packageId: _packageId,
    packageLabel: _packageLabel,
    submittedAt: _submittedAt,
    ...visionData
  } = payload;
  return normalizeDraftIntakeFormValues({
    ...EMPTY_DRAFT_INTAKE_FORM,
    ...visionData,
  });
}

export function resolveVisionData(campaign: CampaignRecord): DraftIntakeFormValues | null {
  const fromRecord = campaign.visionData
    ? normalizeDraftIntakeFormValues({
        ...EMPTY_DRAFT_INTAKE_FORM,
        ...campaign.visionData,
      })
    : null;

  const draft = readLastDraftIntake();
  const fromDraft = draft ? visionDataFromPayload(draft) : null;

  if (fromRecord && fromDraft) {
    return mergeVisionData(fromRecord, fromDraft);
  }

  const resolved = fromRecord ?? fromDraft;
  if (!resolved) return null;
  return normalizeDraftIntakeFormValues(resolved);
}

/** Short campaign label for board cards — project only, not the full intake blob. */
export function resolveCampaignDisplayName(campaign: CampaignRecord): string {
  const vision = resolveVisionData(campaign);
  if (vision) {
    const name = resolveCampaignCustomerName(vision);
    if (name) return name;
  }

  if (campaign.visionData) {
    const project = resolveCampaignCustomerName(
      normalizeDraftIntakeFormValues({
        ...EMPTY_DRAFT_INTAKE_FORM,
        ...campaign.visionData,
      }),
    );
    if (project) return project;
  }

  const name = campaign.campaignName.trim();
  if (!name) return name;

  // Legacy campaigns stored a concatenated intake summary as the name.
  const first = name.split(" · ")[0]?.trim();
  return first || name;
}

/** Campaign notes — persisted record first, then status template. */
export function resolveCampaignStudioNotes(campaign: CampaignRecord): readonly StudioUpdate[] {
  if (campaign.studioNotes?.length) return campaign.studioNotes;
  return statusContent[campaign.campaignStatus].studioUpdates;
}

export function resolveLastStudioNote(campaign: CampaignRecord | null): StudioUpdate | null {
  if (!campaign) return null;
  const notes = resolveCampaignStudioNotes(campaign);
  return notes.at(-1) ?? null;
}

export function resolveDeliverablesRemaining(
  campaign: CampaignRecord,
): DeliverableRemainingItem[] {
  const quotas = getPackageDeliverableQuotas(campaign.packageId);
  const delivered = campaign.deliverablesDelivered ?? {};

  return quotas.map((quota) => {
    const count = delivered[quota.id] ?? 0;
    return {
      id: quota.id,
      label: quota.label,
      total: quota.total,
      delivered: count,
      remaining: Math.max(0, quota.total - count),
    };
  });
}

/** Short board snapshot — top remaining items, capped for scanability. */
export function resolveDeliverablesRemainingSummary(
  campaign: CampaignRecord,
  maxItems = 3,
): string | null {
  const items = resolveDeliverablesRemaining(campaign).filter((item) => item.remaining > 0);
  if (items.length === 0) return "All deliverables complete";

  const shown = items.slice(0, maxItems);
  const summary = shown.map((item) => `${item.remaining} ${item.label}`).join(", ");
  if (items.length > maxItems) return `${summary}, +${items.length - maxItems} more`;
  return summary;
}

/** Total remaining deliverable units across all quota types. */
export function resolveDeliverablesRemainingCount(campaign: CampaignRecord): number {
  return resolveDeliverablesRemaining(campaign).reduce((sum, item) => sum + item.remaining, 0);
}

export type ActivityFeedEntry = {
  date: string;
  time: string | null;
  message: string;
};

/** Newest activity first — compact business updates for the command center feed. */
export function resolveActivityFeed(campaign: CampaignRecord | null): ActivityFeedEntry[] {
  if (!campaign) return [];

  const entries: { sortKey: string; date: string; message: string }[] = [];

  const pushIso = (iso: string | null | undefined, message: string) => {
    if (!iso) return;
    entries.push({
      sortKey: iso,
      date: formatActivityDate(iso),
      message,
    });
  };

  pushIso(campaign.visionSubmittedAt ?? campaign.createdAt, "Intake received");
  pushIso(campaign.discoverySubmittedAt, "Discovery received");
  pushIso(campaign.paymentReceivedAt, "Payment received");

  if (campaign.selectedCampaignOption) {
    pushIso(campaign.updatedAt, "Direction selected");
  }

  if (campaign.campaignStatus === "BUILDING_CONCEPTS") {
    pushIso(campaign.updatedAt, "Concept development started");
  }

  if (campaign.campaignStatus === "READY_FOR_REVIEW") {
    pushIso(campaign.updatedAt, "Concepts ready for review");
  }

  if (campaign.campaignStatus === "DELIVERED") {
    pushIso(campaign.updatedAt, "Package delivered");
  }

  for (const note of resolveCampaignStudioNotes(campaign)) {
    entries.push({
      sortKey: note.date === "Today" ? campaign.updatedAt : note.date,
      date: note.date,
      message: normalizeActivityMessage(note.message),
    });
  }

  const seen = new Set<string>();
  return entries
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .filter((entry) => {
      const key = `${entry.date}|${entry.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((entry) => ({
      date: entry.date,
      time: null,
      message: entry.message,
    }));
}

function formatActivityDate(value: string): string {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  }
  return value;
}

function normalizeActivityMessage(message: string): string {
  return message
    .replace(/\.$/, "")
    .replace(/^Vision Intake received$/i, "Intake received")
    .replace(/^Campaign concepts ready for your review\.$/i, "Concepts ready for review")
    .replace(/^Final package delivered\.$/i, "Package delivered");
}

export function resolveRevisionTracker(campaign: CampaignRecord): RevisionTrackerView {
  const included =
    campaign.revisionRoundsIncluded ?? getPackageRevisionRounds(campaign.packageId);
  const used = campaign.revisionRoundsUsed ?? 0;
  return {
    included,
    used,
    remaining: Math.max(0, included - used),
  };
}

function formatTimelineDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Key lifecycle dates for Campaign Page timeline. */
export function resolveCampaignTimeline(campaign: CampaignRecord): CampaignTimelineEntry[] {
  const entries: CampaignTimelineEntry[] = [
    {
      date: formatTimelineDate(campaign.createdAt),
      label: "Campaign created",
      sortKey: campaign.createdAt,
    },
  ];

  if (campaign.visionSubmittedAt) {
    entries.push({
      date: formatTimelineDate(campaign.visionSubmittedAt),
      label: "Vision Intake submitted",
      sortKey: campaign.visionSubmittedAt,
    });
  }

  if (campaign.paymentReceivedAt) {
    entries.push({
      date: formatTimelineDate(campaign.paymentReceivedAt),
      label: "Payment received",
      sortKey: campaign.paymentReceivedAt,
    });
  }

  if (campaign.targetCompletionDate) {
    entries.push({
      date: formatTimelineDate(campaign.targetCompletionDate),
      label: "Target completion",
      sortKey: campaign.targetCompletionDate,
    });
  }

  entries.push({
    date: statusContent[campaign.campaignStatus].statusLabel,
    label: "Current status",
    sortKey: campaign.updatedAt,
  });

  return entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
