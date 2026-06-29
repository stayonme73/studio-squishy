import { clientMaterialStatusLabel, materialCategoryLabel, materialsConfig } from "@/config/materials";

import { isBlockingMaterialItem } from "./materials-view";
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
  isBlocking: true;
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
};

const BLOCKING_STATUSES = new Set<MaterialReviewStatus>([
  "missing",
  "requested",
  "needs_clarification",
]);

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

function clientRequestLabel(category: MaterialCategory, contentKind: MaterialContentKind): string {
  const key = `${category}:${contentKind}` as keyof typeof materialsConfig.clientRequestLabels;
  return materialsConfig.clientRequestLabels[key] ?? materialCategoryLabel(category);
}

function clientRequestPrompt(category: MaterialCategory, contentKind: MaterialContentKind): string {
  const key = `${category}:${contentKind}` as keyof typeof materialsConfig.clientRequestPrompts;
  return materialsConfig.clientRequestPrompts[key] ?? `Please send your ${clientRequestLabel(category, contentKind).toLowerCase()}`;
}

function worstBlockingStatus(
  statuses: readonly MaterialReviewStatus[],
): MaterialReviewStatus {
  const priority: MaterialReviewStatus[] = [
    "needs_clarification",
    "requested",
    "missing",
  ];
  for (const status of priority) {
    if (statuses.includes(status)) return status;
  }
  return "missing";
}

function formatServiceReason(serviceNames: readonly string[]): string {
  const unique = [...new Set(serviceNames.filter(Boolean))];
  if (unique.length === 0) return "Needed for your approved Studio Plan services";
  if (unique.length === 1) return `Needed for ${unique[0]}`;
  if (unique.length === 2) return `Needed for ${unique[0]} and ${unique[1]}`;
  const head = unique.slice(0, -1).join(", ");
  return `Needed for ${head}, and ${unique[unique.length - 1]}`;
}

function groupBlockingItems(
  items: readonly CampaignMaterialItem[],
): Map<string, CampaignMaterialItem[]> {
  const groups = new Map<string, CampaignMaterialItem[]>();
  for (const item of items) {
    if (!isBlockingMaterialItem(item)) continue;
    const key = consolidatedRequestId(item.category, item.contentKind);
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return groups;
}

export function resolveConsolidatedClientRequests(
  record: CampaignMaterialsRecord,
): ConsolidatedClientRequest[] {
  const groups = groupBlockingItems(record.items);

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, groupItems]) => {
      const first = groupItems[0]!;
      const serviceNames = groupItems.flatMap((item) =>
        item.reason ? [item.reason] : [],
      );
      const relatedServiceIds = [
        ...new Set(groupItems.flatMap((item) => [...item.relatedServiceIds])),
      ];

      const reviewStatus = worstBlockingStatus(groupItems.map((item) => item.reviewStatus));

      return {
        id,
        category: first.category,
        contentKind: first.contentKind,
        label: clientRequestLabel(first.category, first.contentKind),
        prompt: clientRequestPrompt(first.category, first.contentKind),
        reason: formatServiceReason(serviceNames),
        relatedServiceIds,
        underlyingItemIds: groupItems.map((item) => item.id),
        reviewStatus,
        statusLabel: clientMaterialStatusLabel(reviewStatus),
        isBlocking: true as const,
      };
    });
}

export function resolveOptionalClientRequests(
  record: CampaignMaterialsRecord,
): OptionalClientRequest[] {
  return record.items
    .filter(
      (item) =>
        item.requirementLevel === "optional" &&
        BLOCKING_STATUSES.has(item.reviewStatus),
    )
    .map((item) => ({
      id: item.id,
      itemId: item.id,
      category: item.category,
      contentKind: item.contentKind,
      label: item.label,
      reason: item.reason,
      reviewStatus: item.reviewStatus,
      statusLabel: clientMaterialStatusLabel(item.reviewStatus),
    }));
}

export function resolveUnderlyingItemIdsForConsolidated(
  record: CampaignMaterialsRecord,
  consolidatedItemId: string,
): readonly string[] {
  const parsed = parseConsolidatedRequestId(consolidatedItemId);
  if (!parsed) return [];

  return record.items
    .filter(
      (item) =>
        isBlockingMaterialItem(item) &&
        item.category === parsed.category &&
        item.contentKind === parsed.contentKind,
    )
    .map((item) => item.id);
}
