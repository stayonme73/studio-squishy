import type { ServiceId } from "@/catalog/types";
import { materialsConfig } from "@/config/materials";
import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import {
  AD_HOC_MATERIAL_CATEGORIES,
  contentKindForCategory,
  previewPromotionSlotMapping,
  type PromotionSlotPreview,
} from "@/lib/materials/promotion";
import type { CampaignMaterialItem, MaterialCategory, MaterialContentKind } from "@/lib/materials/types";

import {
  canApproveClientRequest,
  canDeclinePromotion,
  canHoldPromotionReview,
  exceptionPromotionDeclined,
  isOpenExceptionStatus,
} from "./exceptions";
import type {
  ApproveClientRequestPayload,
  CampaignExceptionEvent,
  CampaignExceptionKind,
  CampaignExceptionRecord,
} from "./exceptions-types";
import type { CampaignTaskItem } from "./types";

export type DefaultClientWording = {
  category: MaterialCategory;
  contentKind: MaterialContentKind;
  clientFacingLabel: string;
  clientFacingPrompt: string;
  whyNeeded: string;
  requirementLevel: "required" | "optional";
  relatedServiceIds: readonly ServiceId[];
};

export type FileRoomExceptionPromotionSummary = {
  clientFacingLabel: string;
  clientFacingPrompt: string;
  whyNeeded: string;
  categoryLabel: string;
  consolidatedRequestId: string;
  materialItemCount: number;
  approvedAt: string;
  approvedByDisplayName: string;
};

export type FileRoomExceptionPromotionPanel = {
  showApprovalPanel: boolean;
  showReadOnlyDetails: boolean;
  showPromotedSummary: boolean;
  canApprove: boolean;
  canDecline: boolean;
  canHold: boolean;
  promotionDeclined: boolean;
  internalContext: string | null;
  holdStateLabel: string | null;
  defaultWording: DefaultClientWording;
  slotPreview: PromotionSlotPreview | null;
  promotedSummary: FileRoomExceptionPromotionSummary | null;
};

const CATEGORY_HINTS: readonly { pattern: RegExp; category: MaterialCategory }[] = [
  { pattern: /\blogo\b/i, category: "logo-brand" },
  { pattern: /\bphoto|video|image\b/i, category: "photo-video" },
  { pattern: /\burl|link|website\b/i, category: "url-link" },
  { pattern: /\baccess|login|admin\b/i, category: "access-instructions" },
  { pattern: /\bdocument|pdf|guide\b/i, category: "document-reference" },
];

function inferCategory(record: CampaignExceptionRecord): MaterialCategory {
  const draft = record.clientRequestDraft;
  const haystack = [
    draft?.exactClientOnlyItem,
    draft?.whyBlocksWork,
    record.title,
  ]
    .filter(Boolean)
    .join(" ");

  for (const hint of CATEGORY_HINTS) {
    if (hint.pattern.test(haystack)) return hint.category;
  }

  if (record.kind === "missing_client_fact") return "factual-confirmation";
  return "document-reference";
}

function configLabel(category: MaterialCategory, contentKind: MaterialContentKind): string {
  const key = `${category}:${contentKind}` as keyof typeof materialsConfig.clientRequestLabels;
  return materialsConfig.clientRequestLabels[key] ?? materialsConfig.categoryLabels[category];
}

function configPrompt(category: MaterialCategory, contentKind: MaterialContentKind): string {
  const key = `${category}:${contentKind}` as keyof typeof materialsConfig.clientRequestPrompts;
  const label = configLabel(category, contentKind);
  return materialsConfig.clientRequestPrompts[key] ?? `Please send your ${label.toLowerCase()}`;
}

function configWhyNeeded(category: MaterialCategory, contentKind: MaterialContentKind): string {
  const key = `${category}:${contentKind}` as keyof typeof materialsConfig.clientRequestWhyNeeded;
  return (
    materialsConfig.clientRequestWhyNeeded[key] ??
    "We need this material to continue work on your project."
  );
}

function relatedServiceIdsFromTask(
  record: CampaignExceptionRecord,
  tasks: readonly CampaignTaskItem[],
): readonly ServiceId[] {
  if (!record.taskId) return [];
  const task = tasks.find((entry) => entry.id === record.taskId);
  return task?.relatedServiceIds ?? [];
}

function relatedServiceIdsFromMaterials(
  record: CampaignExceptionRecord,
  materials: readonly CampaignMaterialItem[],
  tasks: readonly CampaignTaskItem[],
): readonly ServiceId[] {
  if (!record.taskId) return [];
  const fromSlots = materials
    .filter((item) => item.relatedServiceIds.length > 0)
    .flatMap((item) => [...item.relatedServiceIds]);
  if (fromSlots.length > 0) return [...new Set(fromSlots)];
  return relatedServiceIdsFromTask(record, tasks);
}

function formatWhyNeeded(
  record: CampaignExceptionRecord,
  tasks: readonly CampaignTaskItem[],
  materials: readonly CampaignMaterialItem[],
): string {
  const draft = record.clientRequestDraft;
  const category = inferCategory(record);
  const contentKind = contentKindForCategory(category);
  const task = record.taskId ? tasks.find((entry) => entry.id === record.taskId) : undefined;
  const serviceName = task?.serviceName?.trim();
  const taskTitle = task?.title?.trim();
  const titleHaystack = [record.title, draft?.exactClientOnlyItem].filter(Boolean).join(" ");

  if (record.kind === "missing_client_fact" && /\b(hex|color|palette|brand color)/i.test(titleHaystack)) {
    if (serviceName) {
      return `This helps us create a consistent color palette for your ${serviceName.toLowerCase()}.`;
    }
    return "This helps us create a consistent color palette for your launch materials.";
  }

  if (record.kind === "client_request" && draft?.exactClientOnlyItem?.trim()) {
    const item = draft.exactClientOnlyItem.trim();
    if (serviceName) {
      return `We need ${item.toLowerCase()} to move forward on ${serviceName}.`;
    }
    if (taskTitle) {
      return `We need ${item.toLowerCase()} to continue ${taskTitle.toLowerCase()}.`;
    }
    return `We need ${item.toLowerCase()} to continue your project.`;
  }

  if (serviceName) {
    return `This is needed to continue work on ${serviceName}.`;
  }

  if (taskTitle) {
    return `This is needed to continue ${taskTitle.toLowerCase()}.`;
  }

  const slots = materials.filter((item) => item.reason?.trim());
  if (slots.length > 0) {
    const reasons = [...new Set(slots.map((item) => item.reason.trim()))];
    if (reasons.length === 1) {
      return `This is needed for ${reasons[0]}.`;
    }
  }

  return configWhyNeeded(category, contentKind);
}

export function resolveDefaultClientWording(
  record: CampaignExceptionRecord,
  tasks: readonly CampaignTaskItem[],
  materials: readonly CampaignMaterialItem[],
): DefaultClientWording {
  const draft = record.clientRequestDraft;
  const category = inferCategory(record);
  const contentKind = contentKindForCategory(category);
  const relatedServiceIds = relatedServiceIdsFromTask(record, tasks).length
    ? relatedServiceIdsFromTask(record, tasks)
    : relatedServiceIdsFromMaterials(record, materials, tasks);

  if (draft) {
    const label =
      draft.exactClientOnlyItem?.trim() ||
      configLabel(category, contentKind);
    const prompt = configPrompt(category, contentKind);
    const whyNeeded = formatWhyNeeded(record, tasks, materials);
    return {
      category,
      contentKind,
      clientFacingLabel: label,
      clientFacingPrompt: prompt,
      whyNeeded,
      requirementLevel: "required",
      relatedServiceIds,
    };
  }

  return {
    category,
    contentKind,
    clientFacingLabel: configLabel(category, contentKind),
    clientFacingPrompt: configPrompt(category, contentKind),
    whyNeeded: formatWhyNeeded(record, tasks, materials),
    requirementLevel: "required",
    relatedServiceIds,
  };
}

function internalContextFromRecord(record: CampaignExceptionRecord): string | null {
  const draft = record.clientRequestDraft;
  const parts = [
    draft?.whyTeamCannotSolveInternally?.trim(),
    draft?.exactClientOnlyItem?.trim(),
    draft?.whyBlocksWork?.trim(),
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return record.description?.trim() || null;
}

function holdStateLabel(record: CampaignExceptionRecord): string | null {
  if (record.status !== "waiting_internal") return null;
  if (record.assignedToDisplayName) {
    return `${campaignExceptionsConfig.statusLabels.waiting_internal} — ${record.assignedToDisplayName}`;
  }
  return campaignExceptionsConfig.statusLabels.waiting_internal;
}

function buildApprovePayload(
  record: CampaignExceptionRecord,
  wording: DefaultClientWording,
): ApproveClientRequestPayload {
  return {
    exceptionId: record.id,
    category: wording.category,
    contentKind: wording.contentKind,
    clientFacingLabel: wording.clientFacingLabel,
    clientFacingPrompt: wording.clientFacingPrompt,
    whyNeeded: wording.whyNeeded,
    requirementLevel: wording.requirementLevel,
    relatedServiceIds: wording.relatedServiceIds,
  };
}

function promotedSummary(
  record: CampaignExceptionRecord,
): FileRoomExceptionPromotionSummary | null {
  const promotion = record.promotion;
  if (!promotion) return null;

  return {
    clientFacingLabel: promotion.clientFacingLabel,
    clientFacingPrompt: promotion.clientFacingPrompt,
    whyNeeded: promotion.whyNeeded,
    categoryLabel: materialsConfig.categoryLabels[promotion.category],
    consolidatedRequestId: promotion.consolidatedRequestId,
    materialItemCount: promotion.materialItemIds.length,
    approvedAt: promotion.approvedAt,
    approvedByDisplayName: promotion.approvedByDisplayName,
  };
}

export function isPromotableExceptionRow(kind: CampaignExceptionKind): boolean {
  return kind === "missing_client_fact" || kind === "client_request";
}

export function resolveFileRoomExceptionPromotionPanel(
  record: CampaignExceptionRecord,
  events: readonly CampaignExceptionEvent[] | undefined,
  materials: readonly CampaignMaterialItem[],
  tasks: readonly CampaignTaskItem[],
  user: StudioUser,
  _assignments: CampaignAssignmentsFile,
): FileRoomExceptionPromotionPanel {
  const promotable = isPromotableExceptionRow(record.kind);
  const declined = exceptionPromotionDeclined(record, events);
  const promoted = Boolean(record.promotion);
  const isOwner = isOwnerUser(user);
  const open = isOpenExceptionStatus(record.status);

  const defaultWording = resolveDefaultClientWording(record, tasks, materials);
  const canApprove =
    open && isOwner && canApproveClientRequest(user, record, events) && AD_HOC_MATERIAL_CATEGORIES.includes(defaultWording.category);
  const canDecline = open && isOwner && canDeclinePromotion(user, record, events);
  const canHold = open && isOwner && canHoldPromotionReview(user, record, events);

  const slotPreview =
    canApprove && !promoted
      ? previewPromotionSlotMapping(
          {
            campaignId: record.campaignId,
            items: [...materials],
            updatedAt: record.updatedAt,
            version: 1,
            syncedAt: record.updatedAt,
          },
          buildApprovePayload(record, defaultWording),
        )
      : null;

  return {
    showApprovalPanel: promotable && open && isOwner && !promoted && !declined,
    showReadOnlyDetails: promotable && !isOwner,
    showPromotedSummary: promotable && promoted,
    canApprove,
    canDecline,
    canHold,
    promotionDeclined: declined,
    internalContext: internalContextFromRecord(record),
    holdStateLabel: holdStateLabel(record),
    defaultWording,
    slotPreview,
    promotedSummary: promotedSummary(record),
  };
}
