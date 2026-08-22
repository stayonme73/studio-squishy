import type { StudioUser } from "@/lib/campaign-store/types";
import { createReferenceOnlyStorageRef } from "@/lib/file-registry/job-files";

import {
  parseConsolidatedRequestId,
  resolveUnderlyingItemIdsForConsolidated,
} from "./client-requests";
import {
  applyMaterialUseDecisionToItem,
  buildUseAuthorization,
  categoryRequiresUseClearance,
} from "@/lib/studio-material-use";
import { teamResolvesTechnicalContentReview } from "@/lib/studio-customer-content-intake";

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
  "owner_policy_review",
  "blocked_from_use",
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
  campaignId: string,
): CampaignMaterialItem {
  const now = new Date().toISOString();
  const actor = submittedByFromUser(user);
  const patch: Partial<CampaignMaterialItem> = {
    reviewStatus: "submitted",
    submittedBy: actor,
    submittedAt: now,
    uploadStatus: item.contentKind === "file-metadata" ? "metadata_only" : "none",
    teamNote: undefined,
    useHold: null,
  };

  if (payload.text?.trim()) patch.text = payload.text.trim();
  if (payload.url?.trim()) patch.url = payload.url.trim();
  if (payload.fileName?.trim()) patch.fileName = payload.fileName.trim();
  if (payload.mimeType?.trim()) patch.mimeType = payload.mimeType.trim();
  if (
    item.contentKind === "file-metadata" &&
    payload.fileName?.trim() &&
    payload.availability !== "not_available_yet"
  ) {
    patch.storageRef = createReferenceOnlyStorageRef({
      reference: payload.url?.trim() || payload.fileName.trim(),
      displayLabel: payload.fileName.trim(),
      referenceKind: payload.url?.trim() ? undefined : "path_hint",
    });
  }
  if (payload.note?.trim()) {
    patch.text = [patch.text, payload.note.trim()].filter(Boolean).join("\n\n");
  }
  if (payload.availability === "not_available_yet") {
    patch.clientAvailability = "not_available_yet";
  } else if (payload.availability === "available") {
    patch.clientAvailability = undefined;
  }

  if (item.contentKind === "confirmation") {
    patch.confirmedAt = now;
  }

  if (payload.useAuthorizationBasis) {
    patch.useAuthorization = buildUseAuthorization({
      basis: payload.useAuthorizationBasis,
      attestedAt: now,
      attestedBy: actor,
    });
  } else if (!categoryRequiresUseClearance(item.category) && actor.role === "client") {
    // Low-friction categories: customer submission is the operational use basis.
    patch.useAuthorization = buildUseAuthorization({
      basis: "customer_owns",
      attestedAt: now,
      attestedBy: actor,
      statement: "Submitted customer material in a non-clearance category.",
    });
  } else if (actor.role === "staff" || actor.role === "owner") {
    patch.useAuthorization = buildUseAuthorization({
      basis: "studio_generated",
      attestedAt: now,
      attestedBy: actor,
      statement: "Studio-sourced material.",
    });
  }

  return applyMaterialUseDecisionToItem({
    item: { ...item, ...patch },
    campaignId,
    evaluatedAt: now,
  });
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

/** Filename + MIME is not receipt. Real bytes must be stored via multipart upload. */
export function isFilenameOnlyFileMetadataClaim(
  payload: ClientSubmitPayload,
  items: readonly CampaignMaterialItem[],
): boolean {
  if (payload.availability === "not_available_yet") return false;
  return items.some((item) => item.contentKind === "file-metadata");
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
    applyPayloadToItem(item, payload, user, envelope.campaignId),
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

  if (item.requirementLevel === "required" && isBlockingMaterialItem(item, envelope.campaignId)) {
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
    applyPayloadToItem(entry, payload, user, envelope.campaignId),
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
  const updated = updateItems(envelope, [itemId], (entry) => {
    const next: CampaignMaterialItem = {
      ...entry,
      reviewStatus,
      reviewedBy: submittedByFromUser(user),
      reviewedAt: now,
      teamNote: teamNote?.trim() || undefined,
      useHold:
        reviewStatus === "owner_policy_review" || reviewStatus === "blocked_from_use"
          ? reviewStatus
          : null,
      useAuthorization:
        reviewStatus === "approved_for_use"
          ? entry.useAuthorization ??
            buildUseAuthorization({
              basis:
                user.roles.includes("owner") || user.roles.includes("staff")
                  ? "studio_controlled_licensed"
                  : "customer_has_permission",
              attestedAt: now,
              attestedBy: submittedByFromUser(user),
              statement: "Team approved material for Studio use.",
            })
          : entry.useAuthorization,
      contentCertification:
        reviewStatus === "approved_for_use" && entry.contentCertification
          ? teamResolvesTechnicalContentReview(entry.contentCertification, entry.category, now)
          : entry.contentCertification,
    };
    return applyMaterialUseDecisionToItem({
      item: next,
      campaignId: envelope.campaignId,
      evaluatedAt: now,
    });
  });

  return {
    ok: true,
    envelope: {
      ...updated,
      syncedAt: new Date().toISOString(),
    },
  };
}
