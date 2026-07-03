import type { StudioUser } from "@/lib/campaign-store/types";
import { createReferenceOnlyStorageRef } from "@/lib/file-registry/job-files";

import {
  parseConsolidatedRequestId,
  resolveUnderlyingItemIdsForConsolidated,
} from "./client-requests";
import { isBlockingMaterialItem } from "./materials-view";
import {
  type ClientSubmitPayload,
  payloadContainsSecrets,
  validateClientSubmitPayload,
} from "./payload-validation";
import type {
  CampaignMaterialItem,
  CampaignMaterialsRecord,
  MaterialReviewStatus,
  MaterialSubmittedBy,
  ServerMaterialsEnvelope,
} from "./types";

const TEAM_REVIEW_STATUSES = new Set<MaterialReviewStatus>([
  "approved_for_use",
  "needs_clarification",
  "not_needed",
]);

function submittedByFromUser(user: StudioUser): MaterialSubmittedBy {
  const role = user.roles.includes("client")
    ? "client"
    : user.roles.includes("owner")
      ? "owner"
      : "staff";
  return {
    role,
    userId: user.id,
    displayName: user.displayName,
  };
}

function applyPayloadToItem(
  item: CampaignMaterialItem,
  payload: ClientSubmitPayload,
  user: StudioUser,
): CampaignMaterialItem {
  const now = new Date().toISOString();
  const patch: Partial<CampaignMaterialItem> = {
    reviewStatus: "submitted",
    submittedBy: submittedByFromUser(user),
    submittedAt: now,
    uploadStatus: item.contentKind === "file-metadata" ? "metadata_only" : "none",
    teamNote: undefined,
  };

  if (payload.text?.trim()) patch.text = payload.text.trim();
  if (payload.url?.trim()) patch.url = payload.url.trim();
  if (payload.fileName?.trim()) patch.fileName = payload.fileName.trim();
  if (payload.mimeType?.trim()) patch.mimeType = payload.mimeType.trim();
  if (item.contentKind === "file-metadata" && payload.fileName?.trim()) {
    patch.storageRef = createReferenceOnlyStorageRef({
      reference: payload.url?.trim() || payload.fileName.trim(),
      displayLabel: payload.fileName.trim(),
      referenceKind: payload.url?.trim() ? undefined : "path_hint",
    });
  }
  if (payload.note?.trim()) {
    patch.text = [patch.text, payload.note.trim()].filter(Boolean).join("\n\n");
  }

  if (item.contentKind === "confirmation") {
    patch.confirmedAt = now;
  }

  return { ...item, ...patch };
}

function updateItems(
  record: CampaignMaterialsRecord,
  itemIds: readonly string[],
  updater: (item: CampaignMaterialItem) => CampaignMaterialItem,
): CampaignMaterialsRecord {
  const idSet = new Set(itemIds);
  const now = new Date().toISOString();
  return {
    ...record,
    updatedAt: now,
    version: record.version + 1,
    items: record.items.map((item) => (idSet.has(item.id) ? updater(item) : item)),
  };
}

export function applyClientSubmitConsolidated(
  envelope: ServerMaterialsEnvelope,
  consolidatedItemId: string,
  payload: ClientSubmitPayload,
  user: StudioUser,
): { ok: true; envelope: ServerMaterialsEnvelope } | { ok: false; error: string; status: number } {
  const parsed = parseConsolidatedRequestId(consolidatedItemId);
  if (!parsed) {
    return { ok: false, error: "Invalid consolidated item id.", status: 400 };
  }

  const underlyingIds = resolveUnderlyingItemIdsForConsolidated(envelope, consolidatedItemId);
  if (underlyingIds.length === 0) {
    return { ok: false, error: "No outstanding items match that request.", status: 404 };
  }

  const validation = validateClientSubmitPayload(
    payload,
    parsed.contentKind,
    parsed.category,
  );
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 400 };
  }

  const updated = updateItems(envelope, underlyingIds, (item) =>
    applyPayloadToItem(item, payload, user),
  );

  return {
    ok: true,
    envelope: {
      ...updated,
      syncedAt: new Date().toISOString(),
    },
  };
}

export function applyClientSubmitItem(
  envelope: ServerMaterialsEnvelope,
  itemId: string,
  payload: ClientSubmitPayload,
  user: StudioUser,
): { ok: true; envelope: ServerMaterialsEnvelope } | { ok: false; error: string; status: number } {
  const item = envelope.items.find((entry) => entry.id === itemId);
  if (!item) {
    return { ok: false, error: "Material item not found.", status: 404 };
  }

  if (item.requirementLevel === "required" && isBlockingMaterialItem(item)) {
    return {
      ok: false,
      error: "Use the consolidated request list for required blocking items.",
      status: 400,
    };
  }

  if (!["missing", "requested", "needs_clarification"].includes(item.reviewStatus)) {
    return { ok: false, error: "This item is not open for client submission.", status: 400 };
  }

  const validation = validateClientSubmitPayload(payload, item.contentKind, item.category);
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 400 };
  }

  const updated = updateItems(envelope, [itemId], (entry) =>
    applyPayloadToItem(entry, payload, user),
  );

  return {
    ok: true,
    envelope: {
      ...updated,
      syncedAt: new Date().toISOString(),
    },
  };
}

export function applyTeamReview(
  envelope: ServerMaterialsEnvelope,
  itemId: string,
  reviewStatus: MaterialReviewStatus,
  teamNote: string | undefined,
  user: StudioUser,
): { ok: true; envelope: ServerMaterialsEnvelope } | { ok: false; error: string; status: number } {
  if (!TEAM_REVIEW_STATUSES.has(reviewStatus)) {
    return { ok: false, error: "Invalid team review status.", status: 400 };
  }

  const item = envelope.items.find((entry) => entry.id === itemId);
  if (!item) {
    return { ok: false, error: "Material item not found.", status: 404 };
  }

  if (reviewStatus === "needs_clarification" && !teamNote?.trim()) {
    return { ok: false, error: "A team note is required when requesting clarification.", status: 400 };
  }

  if (teamNote && payloadContainsSecrets({ note: teamNote })) {
    return { ok: false, error: "Team notes cannot include passwords or credentials.", status: 400 };
  }

  const now = new Date().toISOString();
  const updated = updateItems(envelope, [itemId], (entry) => ({
    ...entry,
    reviewStatus,
    reviewedBy: submittedByFromUser(user),
    reviewedAt: now,
    teamNote: teamNote?.trim() || undefined,
  }));

  return {
    ok: true,
    envelope: {
      ...updated,
      syncedAt: new Date().toISOString(),
    },
  };
}
