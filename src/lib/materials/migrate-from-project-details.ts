import type {
  ProjectDetailsFileCategory,
  ProjectDetailsRecord,
} from "@/config/project-details";
import type { CampaignRecord } from "@/config/studio-board";

import { resolveMaterialSlotsFromCampaign } from "./requirements";
import type {
  CampaignMaterialItem,
  CampaignMaterialsRecord,
  MaterialCategory,
  MaterialContentKind,
  MaterialSubmittedBy,
} from "./types";

const PROJECT_DETAILS_CLIENT: MaterialSubmittedBy = {
  role: "client",
  userId: "project-details",
  displayName: "Client (Project Details)",
};

function contentKindForCategory(category: MaterialCategory): MaterialContentKind {
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

function itemId(category: MaterialCategory, serviceId: string, suffix = "slot"): string {
  return `${category}-${serviceId}-${suffix}`;
}

function fileCategoryToMaterialCategory(category: ProjectDetailsFileCategory): MaterialCategory {
  switch (category) {
    case "logo":
    case "graphics":
    case "brand-materials":
      return "logo-brand";
    case "photos":
      return "photo-video";
    case "script":
      return "document-reference";
    default:
      return "other";
  }
}

function markSubmitted(
  item: CampaignMaterialItem,
  patch: Partial<CampaignMaterialItem>,
): CampaignMaterialItem {
  return {
    ...item,
    ...patch,
    reviewStatus: "submitted",
    submittedBy: patch.submittedBy ?? PROJECT_DETAILS_CLIENT,
    submittedAt: patch.submittedAt ?? new Date().toISOString(),
  };
}

function applyFileBackfill(
  items: CampaignMaterialItem[],
  files: ProjectDetailsRecord["files"],
): void {
  for (const file of files) {
    const category = fileCategoryToMaterialCategory(file.category);
    const existing = items.find(
      (item) => item.category === category && item.reviewStatus === "missing",
    );

    if (existing) {
      Object.assign(
        existing,
        markSubmitted(existing, {
          fileName: file.fileName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          uploadStatus: "metadata_only",
          contentKind: "file-metadata",
        }),
      );
      continue;
    }

    items.push({
      id: itemId(category, "backfill", file.id),
      category,
      requirementLevel: "optional",
      reviewStatus: "submitted",
      contentKind: "file-metadata",
      label: file.fileName,
      reason: "Project Details upload",
      relatedServiceIds: [],
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      uploadStatus: "metadata_only",
      submittedBy: PROJECT_DETAILS_CLIENT,
      submittedAt: file.uploadedAt,
    });
  }
}

function applyUrlBackfill(items: CampaignMaterialItem[], record: ProjectDetailsRecord): void {
  const { form } = record;
  const urlEntries: { label: string; url: string }[] = [];

  if (form.destinationLink?.trim()) {
    urlEntries.push({ label: "Destination link", url: form.destinationLink.trim() });
  }
  if (form.inspirationLinks?.trim()) {
    urlEntries.push({ label: "Inspiration links", url: form.inspirationLinks.trim() });
  }
  if (form.socialAccountLinks?.trim()) {
    urlEntries.push({ label: "Social account links", url: form.socialAccountLinks.trim() });
  }

  for (const entry of urlEntries) {
    const existing = items.find(
      (item) => item.category === "url-link" && item.reviewStatus === "missing",
    );
    if (existing) {
      Object.assign(
        existing,
        markSubmitted(existing, {
          url: entry.url,
          label: entry.label,
          uploadStatus: "none",
          contentKind: "url",
        }),
      );
      continue;
    }

    items.push({
      id: itemId("url-link", "backfill", entry.label.replace(/\s+/g, "-").toLowerCase()),
      category: "url-link",
      requirementLevel: "optional",
      reviewStatus: "submitted",
      contentKind: "url",
      label: entry.label,
      reason: "Project Details",
      relatedServiceIds: [],
      url: entry.url,
      uploadStatus: "none",
      submittedBy: PROJECT_DETAILS_CLIENT,
      submittedAt: record.submittedAt,
    });
  }
}

function applyAccessBackfill(items: CampaignMaterialItem[], record: ProjectDetailsRecord): void {
  const { form } = record;
  const parts: string[] = [];

  if (form.socialPlatforms?.trim()) parts.push(`Platforms: ${form.socialPlatforms.trim()}`);
  if (form.socialAccountLinks?.trim()) {
    parts.push(`Account links: ${form.socialAccountLinks.trim()}`);
  }
  if (form.emailPlatform?.trim()) parts.push(`Email platform: ${form.emailPlatform.trim()}`);
  if (form.emailSender?.trim()) parts.push(`Sender: ${form.emailSender.trim()}`);

  const text = parts.join("\n");
  if (!text) return;

  const existing = items.find(
    (item) => item.category === "access-instructions" && item.reviewStatus === "missing",
  );
  if (existing) {
    Object.assign(
      existing,
      markSubmitted(existing, {
        text,
        uploadStatus: "none",
        contentKind: "text",
      }),
    );
    return;
  }

  items.push({
    id: itemId("access-instructions", "backfill"),
    category: "access-instructions",
    requirementLevel: "optional",
    reviewStatus: "submitted",
    contentKind: "text",
    label: "Access instructions",
    reason: "Project Details",
    relatedServiceIds: [],
    text,
    uploadStatus: "none",
    submittedBy: PROJECT_DETAILS_CLIENT,
    submittedAt: record.submittedAt,
  });
}

function applyFactualBackfill(items: CampaignMaterialItem[], record: ProjectDetailsRecord): void {
  const { form } = record;
  const facts: { label: string; text: string }[] = [];

  if (form.workingOn?.trim()) facts.push({ label: "Working on", text: form.workingOn.trim() });
  if (form.mainOffer?.trim()) facts.push({ label: "Main offer", text: form.mainOffer.trim() });
  if (form.mustIncludeExactly?.trim()) {
    facts.push({ label: "Must include exactly", text: form.mustIncludeExactly.trim() });
  }
  if (form.adPronunciation?.trim()) {
    facts.push({ label: "Pronunciation", text: form.adPronunciation.trim() });
  }

  for (const fact of facts) {
    const existing = items.find(
      (item) =>
        item.category === "factual-confirmation" &&
        item.reviewStatus === "missing" &&
        !item.text,
    );
    if (existing) {
      Object.assign(
        existing,
        markSubmitted(existing, {
          text: fact.text,
          label: fact.label,
          uploadStatus: "none",
          contentKind: "confirmation",
          confirmedAt: record.submittedAt,
        }),
      );
      continue;
    }

    items.push({
      id: itemId("factual-confirmation", "backfill", fact.label.replace(/\s+/g, "-").toLowerCase()),
      category: "factual-confirmation",
      requirementLevel: "optional",
      reviewStatus: "submitted",
      contentKind: "confirmation",
      label: fact.label,
      reason: "Project Details",
      relatedServiceIds: [],
      text: fact.text,
      confirmedAt: record.submittedAt,
      uploadStatus: "none",
      submittedBy: PROJECT_DETAILS_CLIENT,
      submittedAt: record.submittedAt,
    });
  }
}

function applyDocumentBackfill(items: CampaignMaterialItem[], record: ProjectDetailsRecord): void {
  const { form } = record;
  const docs: { label: string; text: string }[] = [];

  if (form.adScript?.trim()) docs.push({ label: "Ad script", text: form.adScript.trim() });
  if (form.conceptRequiredWording?.trim()) {
    docs.push({ label: "Required wording", text: form.conceptRequiredWording.trim() });
  }
  if (form.brandColorsFonts?.trim()) {
    docs.push({ label: "Brand colors & fonts", text: form.brandColorsFonts.trim() });
  }

  for (const doc of docs) {
    const existing = items.find(
      (item) => item.category === "document-reference" && item.reviewStatus === "missing" && !item.text,
    );
    if (existing) {
      Object.assign(
        existing,
        markSubmitted(existing, {
          text: doc.text,
          label: doc.label,
          uploadStatus: "none",
          contentKind: "text",
        }),
      );
      continue;
    }

    items.push({
      id: itemId("document-reference", "backfill", doc.label.replace(/\s+/g, "-").toLowerCase()),
      category: "document-reference",
      requirementLevel: "optional",
      reviewStatus: "submitted",
      contentKind: "text",
      label: doc.label,
      reason: "Project Details",
      relatedServiceIds: [],
      text: doc.text,
      uploadStatus: "none",
      submittedBy: PROJECT_DETAILS_CLIENT,
      submittedAt: record.submittedAt,
    });
  }
}

export function buildMaterialsRecordFromCampaign(campaign: CampaignRecord): CampaignMaterialsRecord {
  const now = new Date().toISOString();
  const slots = resolveMaterialSlotsFromCampaign(campaign);

  const items: CampaignMaterialItem[] = slots.map((slot) => ({
    id: itemId(slot.category, slot.relatedServiceIds[0] ?? "plan"),
    category: slot.category,
    requirementLevel: slot.requirementLevel,
    reviewStatus: "missing",
    contentKind: contentKindForCategory(slot.category),
    label: slot.label,
    reason: slot.reason,
    relatedServiceIds: slot.relatedServiceIds,
    uploadStatus: "none",
    storageRef: null,
  }));

  const projectDetails = campaign.projectDetails;
  if (projectDetails) {
    applyFileBackfill(items, projectDetails.files);
    applyUrlBackfill(items, projectDetails);
    applyAccessBackfill(items, projectDetails);
    applyFactualBackfill(items, projectDetails);
    applyDocumentBackfill(items, projectDetails);
  }

  return {
    campaignId: campaign.campaignId,
    items,
    updatedAt: now,
    version: 1,
  };
}

export function migrateFromProjectDetails(campaign: CampaignRecord): CampaignMaterialsRecord {
  return buildMaterialsRecordFromCampaign(campaign);
}
