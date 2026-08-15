import type { ApprovedStudioPlanLineItem } from "@/config/studio-board";
import { clientMaterialStatusLabel, materialCategoryLabel, materialsConfig } from "@/config/materials";
import { studioMaterialsUploadV1 } from "@/config/studio-materials-upload-v1";

import {
  clientFacingPromotionKey,
  filterClientConsolidationItems,
  isClientVisibleMaterialItem,
  winningClientFacingKeyForBucket,
} from "./promotion";
import type {
  CampaignMaterialItem,
  CampaignMaterialsRecord,
  MaterialCategory,
  MaterialContentKind,
  MaterialReviewStatus,
} from "./types";

const MATERIAL_CATEGORIES = new Set<MaterialCategory>([
  "logo-brand",
  "photo-video",
  "document-reference",
  "url-link",
  "access-instructions",
  "factual-confirmation",
  "other",
]);

const CLIENT_INTAKE_STATUSES = new Set<MaterialReviewStatus>([
  "missing",
  "requested",
  "needs_clarification",
  "submitted",
]);

const CLIENT_SUBMIT_STATUSES = new Set<MaterialReviewStatus>([
  "missing",
  "requested",
  "needs_clarification",
]);

const OPTIONAL_INTAKE_STATUSES = new Set<MaterialReviewStatus>([
  "missing",
  "requested",
  "needs_clarification",
  "submitted",
]);

/** Internal consolidation shape — may include server-only fields. */
export type ConsolidatedClientRequest = {
  id: string;
  category: MaterialCategory;
  contentKind: MaterialContentKind;
  label: string;
  prompt: string;
  reason: string;
  relatedServiceIds: readonly string[];
  underlyingItemIds: readonly string[];
  reviewStatus: MaterialReviewStatus;
  statusLabel: string;
  isBlocking: boolean;
  isPendingReview: boolean;
  canSubmit: boolean;
  submittedAt?: string;
  clientAvailability?: CampaignMaterialItem["clientAvailability"];
  /** Customer-facing stored filename only — never a checksum, path, or item id. */
  fileName?: string;
};

/** Client API payload — no internal IDs or mapping fields (Slice 3d-c-c L4). */
export type ClientConsolidatedRequest = {
  id: string;
  category: MaterialCategory;
  contentKind: MaterialContentKind;
  label: string;
  prompt: string;
  reason: string;
  reviewStatus: MaterialReviewStatus;
  statusLabel: string;
  canSubmit: boolean;
  isPendingReview: boolean;
  submittedAt?: string;
  clientAvailability?: CampaignMaterialItem["clientAvailability"];
  fileName?: string;
};

export type OptionalClientRequest = {
  id: string;
  itemId: string;
  category: MaterialCategory;
  contentKind: MaterialContentKind;
  label: string;
  reason: string;
  reviewStatus: MaterialReviewStatus;
  statusLabel: string;
  canSubmit: boolean;
  isPendingReview: boolean;
  submittedAt?: string;
  clientAvailability?: CampaignMaterialItem["clientAvailability"];
  fileName?: string;
};

/** Client API payload for optional rows (Slice 3d-c-c L4). */
export type ClientOptionalRequest = {
  id: string;
  category: MaterialCategory;
  contentKind: MaterialContentKind;
  label: string;
  reason: string;
  reviewStatus: MaterialReviewStatus;
  statusLabel: string;
  canSubmit: boolean;
  isPendingReview: boolean;
  submittedAt?: string;
  clientAvailability?: CampaignMaterialItem["clientAvailability"];
  fileName?: string;
};

export function isClientIntakeMaterialItem(item: CampaignMaterialItem): boolean {
  return item.requirementLevel === "required" && CLIENT_INTAKE_STATUSES.has(item.reviewStatus);
}

export function canClientSubmitMaterialItem(item: CampaignMaterialItem): boolean {
  if (
    item.reviewStatus === "approved_for_use" ||
    item.reviewStatus === "not_needed" ||
    item.reviewStatus === "blocked_from_use" ||
    item.reviewStatus === "owner_policy_review"
  ) {
    return false;
  }
  if (CLIENT_SUBMIT_STATUSES.has(item.reviewStatus)) return true;
  return item.contentKind === "file-metadata" && item.reviewStatus === "submitted";
}

export function consolidatedRequestId(
  category: MaterialCategory,
  contentKind: MaterialContentKind,
): string {
  return `${category}:${contentKind}`;
}

export function parseConsolidatedRequestId(
  id: string,
): { category: MaterialCategory; contentKind: MaterialContentKind } | null {
  const separator = id.indexOf(":");
  if (separator <= 0) return null;
  const category = id.slice(0, separator) as MaterialCategory;
  const contentKind = id.slice(separator + 1) as MaterialContentKind;
  if (!MATERIAL_CATEGORIES.has(category)) return null;
  return { category, contentKind };
}

function clientRequestLabel(
  category: MaterialCategory,
  contentKind: MaterialContentKind,
  item?: CampaignMaterialItem,
): string {
  if (item?.clientFacingLabel?.trim()) return item.clientFacingLabel.trim();
  const key = `${category}:${contentKind}` as keyof typeof materialsConfig.clientRequestLabels;
  return materialsConfig.clientRequestLabels[key] ?? materialCategoryLabel(category);
}

function clientRequestPrompt(
  category: MaterialCategory,
  contentKind: MaterialContentKind,
  item?: CampaignMaterialItem,
): string {
  if (item?.clientFacingPrompt?.trim()) return item.clientFacingPrompt.trim();
  if (item?.requirementLevel === "optional" && category === "logo-brand") {
    return studioMaterialsUploadV1.customerCopy.optionalLogoPrompt;
  }
  if (item?.requirementLevel === "optional" && category === "photo-video") {
    return studioMaterialsUploadV1.customerCopy.optionalPhotoPrompt;
  }
  const key = `${category}:${contentKind}` as keyof typeof materialsConfig.clientRequestPrompts;
  return materialsConfig.clientRequestPrompts[key] ?? `Please send your ${clientRequestLabel(category, contentKind).toLowerCase()}`;
}

function consolidatedReviewStatus(
  statuses: readonly MaterialReviewStatus[],
): MaterialReviewStatus {
  const priority: MaterialReviewStatus[] = [
    "needs_clarification",
    "requested",
    "missing",
    "submitted",
  ];
  for (const status of priority) {
    if (statuses.includes(status)) return status;
  }
  return "submitted";
}

export function buildApprovedServiceNameLookup(
  lineItems: readonly ApprovedStudioPlanLineItem[] | undefined,
): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const lineItem of lineItems ?? []) {
    const serviceName = lineItem.serviceName?.trim();
    if (lineItem.skuId && serviceName) {
      lookup.set(lineItem.skuId, serviceName);
    }
  }
  return lookup;
}

function slotReasonServiceNames(items: readonly CampaignMaterialItem[]): string[] {
  return [...new Set(items.flatMap((item) => (item.reason?.trim() ? [item.reason.trim()] : [])))];
}

function resolveClientReasonServiceNames(
  relatedServiceIds: readonly string[],
  serviceNameById: ReadonlyMap<string, string> | undefined,
  fallbackItems: readonly CampaignMaterialItem[],
): string[] {
  if (serviceNameById && serviceNameById.size > 0 && relatedServiceIds.length > 0) {
    const fromPlan = relatedServiceIds
      .map((serviceId) => serviceNameById.get(serviceId))
      .filter((name): name is string => Boolean(name?.trim()));
    if (fromPlan.length > 0) return [...new Set(fromPlan)];
  }
  return slotReasonServiceNames(fallbackItems);
}

function formatServiceReason(serviceNames: readonly string[]): string {
  const unique = [...new Set(serviceNames.filter(Boolean))];
  if (unique.length === 0) return "Needed for your approved Studio Plan services";
  if (unique.length === 1) return `Needed for ${unique[0]}`;
  if (unique.length === 2) return `Needed for ${unique[0]} and ${unique[1]}`;
  const head = unique.slice(0, -1).join(", ");
  return `Needed for ${head}, and ${unique[unique.length - 1]}`;
}

function formatServiceNameList(serviceNames: readonly string[]): string {
  const unique = [...new Set(serviceNames.filter(Boolean))];
  if (unique.length === 0) return "your approved Studio Plan services";
  if (unique.length === 1) return unique[0]!;
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  const head = unique.slice(0, -1).join(", ");
  return `${head}, and ${unique[unique.length - 1]}`;
}

function latestSubmittedAt(items: readonly CampaignMaterialItem[]): string | undefined {
  return items
    .map((item) => item.submittedAt)
    .filter((submittedAt): submittedAt is string => Boolean(submittedAt))
    .sort()
    .at(-1);
}

function latestStoredCustomerFileName(
  items: readonly CampaignMaterialItem[],
): string | undefined {
  const named = items
    .filter((item) => item.uploadStatus === "stored" && Boolean(item.fileName?.trim()))
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
  return named.at(-1)?.fileName?.trim();
}

function clientAvailabilityForItems(
  items: readonly CampaignMaterialItem[],
): CampaignMaterialItem["clientAvailability"] {
  const responded = items.filter((item) => item.reviewStatus === "submitted");
  if (responded.length === 0) return undefined;
  return responded.every((item) => item.clientAvailability === "not_available_yet")
    ? "not_available_yet"
    : undefined;
}

function bucketItemsForConsolidatedId(
  record: CampaignMaterialsRecord,
  consolidatedItemId: string,
): CampaignMaterialItem[] {
  const parsed = parseConsolidatedRequestId(consolidatedItemId);
  if (!parsed) return [];

  return record.items.filter(
    (item) =>
      isClientVisibleMaterialItem(item) &&
      item.category === parsed.category &&
      item.contentKind === parsed.contentKind,
  );
}

function groupClientIntakeItems(
  items: readonly CampaignMaterialItem[],
): Map<string, CampaignMaterialItem[]> {
  const visible = filterClientConsolidationItems(items);
  const groups = new Map<string, CampaignMaterialItem[]>();

  for (const item of visible) {
    if (!isClientIntakeMaterialItem(item)) continue;
    const key = consolidatedRequestId(item.category, item.contentKind);
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }

  return groups;
}

export function countClientIntakeMaterials(items: readonly CampaignMaterialItem[]): number {
  return filterClientConsolidationItems(items).filter(isClientIntakeMaterialItem).length;
}

export function resolveConsolidatedClientRequests(
  record: CampaignMaterialsRecord,
  serviceNameById?: ReadonlyMap<string, string>,
): ConsolidatedClientRequest[] {
  const groups = groupClientIntakeItems(record.items);

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, groupItems]) => {
      const winnerKey = winningClientFacingKeyForBucket(groupItems);
      const visibleItems = groupItems.filter((item) => {
        if (!winnerKey) return true;
        if (!item.promotionApprovedAt) return true;
        return clientFacingPromotionKey(item) === winnerKey;
      });

      const first = visibleItems[0] ?? groupItems[0]!;
      const relatedServiceIds = [
        ...new Set(visibleItems.flatMap((item) => [...item.relatedServiceIds])),
      ];
      const serviceNames = resolveClientReasonServiceNames(
        relatedServiceIds,
        serviceNameById,
        visibleItems,
      );

      const reviewStatus = consolidatedReviewStatus(visibleItems.map((item) => item.reviewStatus));
      const canSubmit = visibleItems.some(canClientSubmitMaterialItem);

      return {
        id,
        category: first.category,
        contentKind: first.contentKind,
        label: clientRequestLabel(first.category, first.contentKind, first),
        prompt: clientRequestPrompt(first.category, first.contentKind, first),
        reason: formatServiceReason(serviceNames),
        relatedServiceIds,
        underlyingItemIds: visibleItems.map((item) => item.id),
        reviewStatus,
        statusLabel: clientMaterialStatusLabel(reviewStatus),
        isBlocking: canSubmit,
        isPendingReview: reviewStatus === "submitted",
        canSubmit,
        submittedAt: latestSubmittedAt(visibleItems),
        clientAvailability: clientAvailabilityForItems(visibleItems),
        fileName: latestStoredCustomerFileName(visibleItems),
      };
    });
}

export function sanitizeClientConsolidatedRequests(
  requests: readonly ConsolidatedClientRequest[],
): ClientConsolidatedRequest[] {
  return requests.map((request) => ({
    id: request.id,
    category: request.category,
    contentKind: request.contentKind,
    label: request.label,
    prompt: request.prompt,
    reason: request.reason,
    reviewStatus: request.reviewStatus,
    statusLabel: request.statusLabel,
    canSubmit: request.canSubmit,
    isPendingReview: request.isPendingReview,
    submittedAt: request.submittedAt,
    clientAvailability: request.clientAvailability,
    ...(request.fileName ? { fileName: request.fileName } : {}),
  }));
}

export function resolveOptionalClientRequests(
  record: CampaignMaterialsRecord,
  serviceNameById?: ReadonlyMap<string, string>,
): OptionalClientRequest[] {
  return record.items
    .filter(
      (item) =>
        isClientVisibleMaterialItem(item) &&
        item.requirementLevel === "optional" &&
        OPTIONAL_INTAKE_STATUSES.has(item.reviewStatus),
    )
    .map((item) => {
      const canSubmit = canClientSubmitMaterialItem(item);
      const serviceNames = resolveClientReasonServiceNames(
        item.relatedServiceIds,
        serviceNameById,
        [item],
      );
      return {
        id: item.id,
        itemId: item.id,
        category: item.category,
        contentKind: item.contentKind,
        label: item.label,
        reason: formatServiceNameList(serviceNames),
        reviewStatus: item.reviewStatus,
        statusLabel: clientMaterialStatusLabel(item.reviewStatus),
        canSubmit,
        isPendingReview: item.reviewStatus === "submitted",
        submittedAt: item.submittedAt,
        clientAvailability: item.clientAvailability,
        fileName: latestStoredCustomerFileName([item]),
      };
    });
}

export function sanitizeClientOptionalRequests(
  requests: readonly OptionalClientRequest[],
): ClientOptionalRequest[] {
  return requests.map((request) => ({
    id: request.id,
    category: request.category,
    contentKind: request.contentKind,
    label: request.label,
    reason: request.reason,
    reviewStatus: request.reviewStatus,
    statusLabel: request.statusLabel,
    canSubmit: request.canSubmit,
    isPendingReview: request.isPendingReview,
    submittedAt: request.submittedAt,
    clientAvailability: request.clientAvailability,
    ...(request.fileName ? { fileName: request.fileName } : {}),
  }));
}

export function resolveUnderlyingItemIdsForConsolidated(
  record: CampaignMaterialsRecord,
  consolidatedItemId: string,
): readonly string[] {
  const bucketItems = bucketItemsForConsolidatedId(record, consolidatedItemId);
  const winnerKey = winningClientFacingKeyForBucket(bucketItems);

  return bucketItems
    .filter((item) => {
      if (!canClientSubmitMaterialItem(item)) return false;
      if (!winnerKey) return true;
      if (!item.promotionApprovedAt) return true;
      return clientFacingPromotionKey(item) === winnerKey;
    })
    .map((item) => item.id);
}
