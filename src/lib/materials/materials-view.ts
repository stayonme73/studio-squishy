import { materialCategoryLabel, materialStatusLabel, materialsConfig } from "@/config/materials";

import type { CampaignRecord } from "@/config/studio-board";

import {
  buildApprovedServiceNameLookup,
  countClientIntakeMaterials,
  resolveConsolidatedClientRequests,
  resolveOptionalClientRequests,
  sanitizeClientConsolidatedRequests,
  sanitizeClientOptionalRequests,
} from "./client-requests";
import { materialBlocksProductionUse } from "@/lib/studio-material-use";

import { filterClientVisibleItems } from "./promotion";
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

/**
 * Production blocker — required materials that are not APPROVED_FOR_USE.
 * Submitted alone is insufficient for rights-sensitive categories.
 */
export function isBlockingMaterialItem(
  item: CampaignMaterialItem,
  campaignId = "unknown-campaign",
): boolean {
  return materialBlocksProductionUse(item, campaignId);
}

export function countBlockingRequiredMaterials(
  items: readonly CampaignMaterialItem[],
  campaignId = "unknown-campaign",
): number {
  return items.filter((item) => isBlockingMaterialItem(item, campaignId)).length;
}

function resolveSubmittedByLabel(item: CampaignMaterialItem): string | null {
  if (!item.submittedBy) return null;
  return item.submittedBy.displayName ?? item.submittedBy.userId;
}

function toRow(item: CampaignMaterialItem, campaignId: string): FileRoomMaterialRow {
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
    isBlocking: isBlockingMaterialItem(item, campaignId),
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
    rows.push(toRow(item, record.campaignId));
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
    blockingRequiredCount: countBlockingRequiredMaterials(record.items, record.campaignId),
    groups,
    isEmpty: record.items.length === 0,
  };
}

export function resolveMaterialsApiPayload(
  record: CampaignMaterialsRecord,
  audience: "client" | "team" = "team",
  campaign?: CampaignRecord,
): {
  materials?: CampaignMaterialsRecord;
  blockingRequiredCount: number;
  clientIntakeCount?: number;
  consolidatedRequests?: ReturnType<typeof sanitizeClientConsolidatedRequests>;
  optionalRequests?: ReturnType<typeof sanitizeClientOptionalRequests>;
} {
  const blockingRequiredCount = countBlockingRequiredMaterials(
    record.items,
    record.campaignId,
  );
  if (audience === "client") {
    const clientRecord = {
      ...record,
      items: filterClientVisibleItems(record.items),
    };
    const serviceNameById = buildApprovedServiceNameLookup(campaign?.approvedStudioPlan?.lineItems);
    const consolidated = resolveConsolidatedClientRequests(clientRecord, serviceNameById);
    return {
      blockingRequiredCount: countBlockingRequiredMaterials(
        clientRecord.items,
        record.campaignId,
      ),
      clientIntakeCount: countClientIntakeMaterials(clientRecord.items),
      consolidatedRequests: sanitizeClientConsolidatedRequests(consolidated),
      optionalRequests: sanitizeClientOptionalRequests(
        resolveOptionalClientRequests(clientRecord, serviceNameById),
      ),
    };
  }
  return {
    materials: record,
    blockingRequiredCount,
  };
}
