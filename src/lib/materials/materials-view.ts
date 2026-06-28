import { materialCategoryLabel, materialStatusLabel, materialsConfig } from "@/config/materials";

import type {
  CampaignMaterialItem,
  CampaignMaterialsRecord,
  MaterialCategory,
  MaterialReviewStatus,
} from "./types";

export type FileRoomMaterialRow = {
  id: string;
  category: MaterialCategory;
  categoryLabel: string;
  label: string;
  reason: string;
  requirementLevel: CampaignMaterialItem["requirementLevel"];
  requirementLabel: string;
  reviewStatus: MaterialReviewStatus;
  statusLabel: string;
  isBlocking: boolean;
  submittedByLabel: string | null;
  fileName: string | null;
  url: string | null;
  text: string | null;
  uploadStatus: CampaignMaterialItem["uploadStatus"];
};

export type FileRoomMaterialGroup = {
  category: MaterialCategory;
  categoryLabel: string;
  items: readonly FileRoomMaterialRow[];
};

export type FileRoomMaterialsView = {
  blockingRequiredCount: number;
  groups: readonly FileRoomMaterialGroup[];
  isEmpty: boolean;
};

const BLOCKING_STATUSES = new Set<MaterialReviewStatus>([
  "missing",
  "requested",
  "needs_clarification",
]);

export function isBlockingMaterialItem(item: CampaignMaterialItem): boolean {
  return item.requirementLevel === "required" && BLOCKING_STATUSES.has(item.reviewStatus);
}

export function countBlockingRequiredMaterials(items: readonly CampaignMaterialItem[]): number {
  return items.filter(isBlockingMaterialItem).length;
}

function resolveSubmittedByLabel(item: CampaignMaterialItem): string | null {
  if (!item.submittedBy) return null;
  return item.submittedBy.displayName ?? item.submittedBy.userId;
}

function toRow(item: CampaignMaterialItem): FileRoomMaterialRow {
  return {
    id: item.id,
    category: item.category,
    categoryLabel: materialCategoryLabel(item.category),
    label: item.label,
    reason: item.reason,
    requirementLevel: item.requirementLevel,
    requirementLabel: materialsConfig.requirementLabels[item.requirementLevel],
    reviewStatus: item.reviewStatus,
    statusLabel: materialStatusLabel(item.reviewStatus),
    isBlocking: isBlockingMaterialItem(item),
    submittedByLabel: resolveSubmittedByLabel(item),
    fileName: item.fileName ?? null,
    url: item.url ?? null,
    text: item.text ?? null,
    uploadStatus: item.uploadStatus,
  };
}

export function resolveFileRoomMaterialsView(
  record: CampaignMaterialsRecord,
): FileRoomMaterialsView {
  const groupsMap = new Map<MaterialCategory, FileRoomMaterialRow[]>();

  for (const item of record.items) {
    const rows = groupsMap.get(item.category) ?? [];
    rows.push(toRow(item));
    groupsMap.set(item.category, rows);
  }

  const groups: FileRoomMaterialGroup[] = [...groupsMap.entries()]
    .sort(([a], [b]) => materialCategoryLabel(a).localeCompare(materialCategoryLabel(b)))
    .map(([category, items]) => ({
      category,
      categoryLabel: materialCategoryLabel(category),
      items,
    }));

  return {
    blockingRequiredCount: countBlockingRequiredMaterials(record.items),
    groups,
    isEmpty: record.items.length === 0,
  };
}

export function resolveMaterialsApiPayload(record: CampaignMaterialsRecord): {
  materials: CampaignMaterialsRecord;
  blockingRequiredCount: number;
} {
  return {
    materials: record,
    blockingRequiredCount: countBlockingRequiredMaterials(record.items),
  };
}
