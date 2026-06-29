import { randomUUID } from "crypto";

import type {
  ApproveClientRequestPayload,
  CampaignExceptionRecord,
} from "@/lib/campaign-tasks/exceptions-types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { containsSecretLikeContent } from "@/lib/materials/payload-validation";

import type {
  CampaignMaterialItem,
  CampaignMaterialsRecord,
  MaterialCategory,
  MaterialContentKind,
  ServerMaterialsEnvelope,
} from "./types";

export {
  isPromotableExceptionKind,
  PROMOTABLE_EXCEPTION_KINDS,
} from "@/lib/campaign-tasks/exceptions-types";

export const AD_HOC_MATERIAL_CATEGORIES: readonly MaterialCategory[] = [
  "logo-brand",
  "photo-video",
  "document-reference",
  "url-link",
  "access-instructions",
  "factual-confirmation",
] as const;

const AD_HOC_CATEGORY_SET = new Set<MaterialCategory>(AD_HOC_MATERIAL_CATEGORIES);

function isOpenExceptionStatus(status: CampaignExceptionRecord["status"]): boolean {
  return status !== "resolved" && status !== "cancelled";
}

export function contentKindForCategory(category: MaterialCategory): MaterialContentKind {
  switch (category) {
    case "url-link":
      return "url";
    case "factual-confirmation":
      return "confirmation";
    case "access-instructions":
      return "text";
    case "logo-brand":
    case "photo-video":
    case "document-reference":
      return "file-metadata";
    default:
      return "text";
  }
}

export function isClientVisibleMaterialItem(item: CampaignMaterialItem): boolean {
  if (!item.sourceExceptionId) return true;
  return Boolean(item.promotionApprovedAt);
}

export function filterClientVisibleItems(
  items: readonly CampaignMaterialItem[],
): CampaignMaterialItem[] {
  return items.filter(isClientVisibleMaterialItem);
}

function validateClientFacingField(
  value: string | undefined,
  fieldName: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = value?.trim();
  if (!trimmed) {
    return { ok: false, error: `${fieldName} is required.` };
  }
  if (containsSecretLikeContent(trimmed)) {
    return {
      ok: false,
      error: `${fieldName} cannot include passwords, credentials, or secrets.`,
    };
  }
  return { ok: true, value: trimmed };
}

export function validateApproveClientRequestPayload(
  payload: ApproveClientRequestPayload,
): { ok: true; payload: ApproveClientRequestPayload } | { ok: false; error: string } {
  if (!AD_HOC_CATEGORY_SET.has(payload.category)) {
    return {
      ok: false,
      error: "Category is not allowed for client-material promotion.",
    };
  }

  const label = validateClientFacingField(payload.clientFacingLabel, "clientFacingLabel");
  if (!label.ok) return label;

  const prompt = validateClientFacingField(payload.clientFacingPrompt, "clientFacingPrompt");
  if (!prompt.ok) return prompt;

  const whyNeeded = validateClientFacingField(payload.whyNeeded, "whyNeeded");
  if (!whyNeeded.ok) return whyNeeded;

  if (payload.requirementLevel !== "required" && payload.requirementLevel !== "optional") {
    return { ok: false, error: "requirementLevel must be required or optional." };
  }

  const contentKind = payload.contentKind ?? contentKindForCategory(payload.category);

  return {
    ok: true,
    payload: {
      ...payload,
      clientFacingLabel: label.value,
      clientFacingPrompt: prompt.value,
      whyNeeded: whyNeeded.value,
      contentKind,
      relatedServiceIds: payload.relatedServiceIds?.filter(Boolean) ?? [],
      existingMaterialItemIds: payload.existingMaterialItemIds?.filter(Boolean) ?? [],
    },
  };
}

function promotionPatchForItem(
  exceptionId: string,
  approvedAt: string,
  payload: ApproveClientRequestPayload,
): Partial<CampaignMaterialItem> {
  return {
    sourceExceptionId: exceptionId,
    promotionApprovedAt: approvedAt,
    clientFacingLabel: payload.clientFacingLabel,
    clientFacingPrompt: payload.clientFacingPrompt,
    whyNeeded: payload.whyNeeded,
    requirementLevel: payload.requirementLevel,
    reviewStatus: "requested",
  };
}

function attachExistingSlots(
  record: CampaignMaterialsRecord,
  exceptionId: string,
  approvedAt: string,
  payload: ApproveClientRequestPayload,
): { record: CampaignMaterialsRecord; itemIds: string[] } {
  const idSet = new Set(payload.existingMaterialItemIds ?? []);
  const contentKind = payload.contentKind ?? contentKindForCategory(payload.category);
  const itemIds: string[] = [];

  const items = record.items.map((item) => {
    if (!idSet.has(item.id)) return item;
    if (item.category !== payload.category || item.contentKind !== contentKind) {
      return item;
    }
    itemIds.push(item.id);
    return {
      ...item,
      ...promotionPatchForItem(exceptionId, approvedAt, payload),
      label: payload.clientFacingLabel,
      reason: payload.whyNeeded,
      relatedServiceIds:
        payload.relatedServiceIds && payload.relatedServiceIds.length > 0
          ? [...payload.relatedServiceIds]
          : item.relatedServiceIds,
    };
  });

  return { record: { ...record, items }, itemIds };
}

function findMatchingSlots(
  record: CampaignMaterialsRecord,
  payload: ApproveClientRequestPayload,
): CampaignMaterialItem[] {
  const contentKind = payload.contentKind ?? contentKindForCategory(payload.category);
  const serviceSet = new Set(payload.relatedServiceIds ?? []);

  return record.items.filter((item) => {
    if (item.category !== payload.category || item.contentKind !== contentKind) return false;
    if (item.sourceExceptionId && item.sourceExceptionId !== payload.exceptionId) return false;
    if (serviceSet.size === 0) return true;
    return item.relatedServiceIds.some((serviceId) => serviceSet.has(serviceId));
  });
}

function createAdHocItem(
  campaignId: string,
  exceptionId: string,
  approvedAt: string,
  payload: ApproveClientRequestPayload,
  suffix: string,
): CampaignMaterialItem {
  const contentKind = payload.contentKind ?? contentKindForCategory(payload.category);
  return {
    id: `${payload.category}-${exceptionId}-${suffix}`,
    category: payload.category,
    requirementLevel: payload.requirementLevel,
    reviewStatus: "requested",
    contentKind,
    label: payload.clientFacingLabel,
    reason: payload.whyNeeded,
    relatedServiceIds: [...(payload.relatedServiceIds ?? [])],
    uploadStatus: "none",
    sourceExceptionId: exceptionId,
    promotionApprovedAt: approvedAt,
    clientFacingLabel: payload.clientFacingLabel,
    clientFacingPrompt: payload.clientFacingPrompt,
    whyNeeded: payload.whyNeeded,
  };
}

export function applyPromotionToMaterials(
  materialsEnvelope: ServerMaterialsEnvelope,
  exception: CampaignExceptionRecord,
  payload: ApproveClientRequestPayload,
  approvedAt: string,
): { envelope: ServerMaterialsEnvelope; materialItemIds: string[] } {
  if (exception.promotion) {
    return {
      envelope: materialsEnvelope,
      materialItemIds: [...exception.promotion.materialItemIds],
    };
  }

  const contentKind = payload.contentKind ?? contentKindForCategory(payload.category);

  let working: CampaignMaterialsRecord = {
    campaignId: materialsEnvelope.campaignId,
    items: [...materialsEnvelope.items],
    updatedAt: materialsEnvelope.updatedAt,
    version: materialsEnvelope.version,
  };

  let materialItemIds: string[] = [];

  if (payload.existingMaterialItemIds && payload.existingMaterialItemIds.length > 0) {
    const attached = attachExistingSlots(working, exception.id, approvedAt, payload);
    working = attached.record;
    materialItemIds = attached.itemIds;
  } else {
    const matches = findMatchingSlots(working, payload);
    const unattached = matches.filter((item) => !item.promotionApprovedAt);

    if (unattached.length > 0) {
      const idSet = new Set(unattached.map((item) => item.id));
      working = {
        ...working,
        items: working.items.map((item) => {
          if (!idSet.has(item.id)) return item;
          materialItemIds.push(item.id);
          return {
            ...item,
            ...promotionPatchForItem(exception.id, approvedAt, payload),
            label: payload.clientFacingLabel,
            reason: payload.whyNeeded,
            relatedServiceIds:
              payload.relatedServiceIds && payload.relatedServiceIds.length > 0
                ? [...payload.relatedServiceIds]
                : item.relatedServiceIds,
          };
        }),
      };
    } else {
      const adHoc = createAdHocItem(
        materialsEnvelope.campaignId,
        exception.id,
        approvedAt,
        payload,
        randomUUID().slice(0, 8),
      );
      materialItemIds = [adHoc.id];
      working = { ...working, items: [...working.items, adHoc] };
    }
  }

  const dedupedIds = [
    ...new Set(
      working.items
        .filter(
          (item) =>
            item.sourceExceptionId === exception.id &&
            item.category === payload.category &&
            item.contentKind === contentKind,
        )
        .map((item) => item.id),
    ),
  ];

  if (dedupedIds.length > 0) {
    materialItemIds = dedupedIds;
  }

  const now = new Date().toISOString();
  return {
    envelope: {
      ...working,
      updatedAt: now,
      version: working.version + 1,
      syncedAt: now,
    },
    materialItemIds,
  };
}

export function promotionMaterialsApproved(
  items: readonly CampaignMaterialItem[],
  materialItemIds: readonly string[],
): boolean {
  const linked = items.filter((item) => materialItemIds.includes(item.id));
  if (linked.length === 0) return false;
  return linked.every((item) => item.reviewStatus === "approved_for_use");
}

export function findPromotedExceptionsForMaterialItems(
  records: readonly CampaignExceptionRecord[] | undefined,
  itemIds: readonly string[],
): CampaignExceptionRecord[] {
  const idSet = new Set(itemIds);
  return (records ?? []).filter(
    (record) =>
      record.promotion &&
      isOpenExceptionStatus(record.status) &&
      record.promotion.materialItemIds.some((materialId) => idSet.has(materialId)),
  );
}

export function applyExceptionStatusOnClientMaterialSubmit(
  tasksEnvelope: ServerTasksEnvelope,
  itemIds: readonly string[],
): ServerTasksEnvelope {
  const exceptions = findPromotedExceptionsForMaterialItems(
    tasksEnvelope.exceptionRecords,
    itemIds,
  ).filter((record) => record.status === "waiting_client");

  if (exceptions.length === 0) return tasksEnvelope;

  const now = new Date().toISOString();
  const exceptionIds = new Set(exceptions.map((entry) => entry.id));
  const records = (tasksEnvelope.exceptionRecords ?? []).map((record) => {
    if (!exceptionIds.has(record.id)) return record;
    return { ...record, status: "waiting_internal" as const, updatedAt: now };
  });

  return {
    ...tasksEnvelope,
    exceptionRecords: records,
    updatedAt: now,
    syncedAt: now,
  };
}
