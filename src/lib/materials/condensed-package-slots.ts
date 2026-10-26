import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import {
  condensedServiceSku,
  type CondensedPackageId,
} from "@/config/studio-customer-journey-condense-v1";
import { ensureStudioExtrasMaterialSlots } from "@/lib/studio-extras/inputs";

import type {
  CampaignMaterialItem,
  CampaignMaterialsRecord,
  MaterialCategory,
  MaterialContentKind,
  MaterialRequirementLevel,
} from "./types";

type CondensedSlotDefinition = {
  id: string;
  category: MaterialCategory;
  contentKind: MaterialContentKind;
  requirementLevel: MaterialRequirementLevel;
  label: string;
  prompt: string;
};

const CLIP_SLOTS: readonly CondensedSlotDefinition[] = [
  {
    id: "condensed-clip-source",
    category: "photo-video",
    contentKind: "file-metadata",
    requirementLevel: "required",
    label: "Your recording",
    prompt:
      "Add one recording here. It should be 15–60 minutes, filmed vertically, in English, with one primary speaker. The speech and audio should be clear enough to follow.",
  },
  {
    id: "condensed-clip-cta",
    category: "factual-confirmation",
    contentKind: "text",
    requirementLevel: "optional",
    label: "Call-to-action wording, if you have one",
    prompt: "If you have call-to-action wording, add it here.",
  },
];

const SHORT_SLOTS: readonly CondensedSlotDefinition[] = [
  {
    id: "condensed-short-source-1",
    category: "photo-video",
    contentKind: "file-metadata",
    requirementLevel: "required",
    label: "Selected clip 1",
    prompt:
      "Add a selected English clip here. Each clip should be 45 seconds or less, with footage and audio that are clear enough to use.",
  },
  {
    id: "condensed-short-source-2",
    category: "photo-video",
    contentKind: "file-metadata",
    requirementLevel: "optional",
    label: "Selected clip 2",
    prompt:
      "Add another selected English clip here if you have one. It should be 45 seconds or less, with footage and audio that are clear enough to use.",
  },
  {
    id: "condensed-short-source-3",
    category: "photo-video",
    contentKind: "file-metadata",
    requirementLevel: "optional",
    label: "Selected clip 3",
    prompt:
      "Add a third selected English clip here if you have one. It should be 45 seconds or less, with footage and audio that are clear enough to use.",
  },
  {
    id: "condensed-short-cta",
    category: "factual-confirmation",
    contentKind: "text",
    requirementLevel: "optional",
    label: "Call-to-action wording, if you have one",
    prompt: "If you have call-to-action wording, add it here.",
  },
];

const SOCIAL_SLOTS: readonly CondensedSlotDefinition[] = [
  {
    id: "condensed-social-facts",
    category: "factual-confirmation",
    contentKind: "text",
    requirementLevel: "optional",
    label: "Facts the graphics need",
    prompt: "Add the facts, prices, or disclosures these graphics need to include.",
  },
  {
    id: "condensed-social-logo",
    category: "logo-brand",
    contentKind: "file-metadata",
    requirementLevel: "optional",
    label: "Your logo, if you have one",
    prompt: "If you have a logo, add it here.",
  },
  {
    id: "condensed-social-photos",
    category: "photo-video",
    contentKind: "file-metadata",
    requirementLevel: "optional",
    label: "Photos, if you have them",
    prompt: "If you have photos for these graphics, add them here.",
  },
  {
    id: "condensed-social-pricing",
    category: "factual-confirmation",
    contentKind: "text",
    requirementLevel: "optional",
    label: "Prices or disclosures, if they need to appear",
    prompt: "If a price or disclosure needs to appear, add that wording here.",
  },
  {
    id: "condensed-social-cta",
    category: "factual-confirmation",
    contentKind: "text",
    requirementLevel: "optional",
    label: "Call-to-action wording, if you have one",
    prompt: "If you have call-to-action wording, add it here.",
  },
];

const QA_SLOTS: readonly CondensedSlotDefinition[] = [
  {
    id: "condensed-qa-asset-1",
    category: "photo-video",
    contentKind: "file-metadata",
    requirementLevel: "required",
    label: "Existing static asset 1",
    prompt: "Add the first existing static asset here.",
  },
  {
    id: "condensed-qa-asset-2",
    category: "photo-video",
    contentKind: "file-metadata",
    requirementLevel: "optional",
    label: "Existing static asset 2, if you have one",
    prompt: "Add a second existing static asset here if this package covers two.",
  },
  {
    id: "condensed-qa-facts",
    category: "factual-confirmation",
    contentKind: "text",
    requirementLevel: "required",
    label: "Facts, prices, dates, or claims that must stay as written",
    prompt: "Add the facts, prices, dates, or claims that must stay exactly as written.",
  },
];

const CAMPAIGN_SLOTS: readonly CondensedSlotDefinition[] = [
  {
    id: "condensed-campaign-pieces",
    category: "factual-confirmation",
    contentKind: "text",
    requirementLevel: "optional",
    label: "Offer, price, and dates that must stay",
    prompt: "Confirm the offer, price, and dates if you want them repeated beside the campaign brief.",
  },
  {
    id: "condensed-campaign-logo",
    category: "logo-brand",
    contentKind: "file-metadata",
    requirementLevel: "optional",
    label: "Your logo, if you have one",
    prompt: "If you have a logo, add it here.",
  },
  {
    id: "condensed-campaign-photos",
    category: "photo-video",
    contentKind: "file-metadata",
    requirementLevel: "optional",
    label: "Photos, if you have them",
    prompt: "If you have photos for this campaign, add them here.",
  },
];

const SLOTS_BY_PACKAGE: Record<CondensedPackageId, readonly CondensedSlotDefinition[]> = {
  clip_repurposing: CLIP_SLOTS,
  short_form_video_editing: SHORT_SLOTS,
  social_and_promo_graphics: SOCIAL_SLOTS,
  creative_qa_finish: QA_SLOTS,
  campaign_launch_kit: CAMPAIGN_SLOTS,
};

export function condensedPackageMaterialSlots(
  packageId: CondensedPackageId,
): readonly CondensedSlotDefinition[] {
  return SLOTS_BY_PACKAGE[packageId];
}

function slotItem(
  slot: CondensedSlotDefinition,
  packageId: CondensedPackageId,
  packageName: string,
): CampaignMaterialItem {
  return {
    id: slot.id,
    category: slot.category,
    requirementLevel: slot.requirementLevel,
    reviewStatus: "missing",
    contentKind: slot.contentKind,
    label: slot.label,
    clientFacingLabel: slot.label,
    clientFacingPrompt: slot.prompt,
    reason: packageName,
    relatedServiceIds: [
      condensedServiceSku(packageId) as ServiceId,
      packageId,
    ],
    uploadStatus: "none",
    storageRef: null,
    isolatedSlot: true,
  };
}

/**
 * Add the paid condensed package's material slots when they are missing.
 * Existing slot files and submissions stay as they are.
 */
export function ensureCondensedPackageMaterialSlots(
  record: CampaignMaterialsRecord,
  campaign: CampaignRecord,
): { record: CampaignMaterialsRecord; changed: boolean } {
  const packageSlots = ensurePackageSlots(record, campaign);
  const extras = ensureStudioExtrasMaterialSlots(packageSlots.record, campaign);
  return { record: extras.record, changed: packageSlots.changed || extras.changed };
}

function ensurePackageSlots(
  record: CampaignMaterialsRecord,
  campaign: CampaignRecord,
): { record: CampaignMaterialsRecord; changed: boolean } {
  const offer = campaign.condensedOffer;
  if (!offer) return { record, changed: false };

  const definitions = condensedPackageMaterialSlots(offer.packageId);
  const present = new Set(record.items.map((item) => item.id));
  const missing = definitions.filter((slot) => !present.has(slot.id));
  const condensedIds = new Set(definitions.map((slot) => slot.id));
  const factorySku = condensedServiceSku(offer.packageId) as ServiceId;
  let retired = false;
  const kept = record.items.map((item) => {
    if (condensedIds.has(item.id)) return item;
    if (item.requirementLevel !== "required" || item.reviewStatus !== "missing") return item;
    if (!item.relatedServiceIds.includes(factorySku)) return item;
    retired = true;
    return {
      ...item,
      requirementLevel: "optional" as const,
      reviewStatus: "not_needed" as const,
    };
  });
  if (missing.length === 0 && !retired) return { record, changed: false };

  const now = new Date().toISOString();
  return {
    changed: true,
    record: {
      ...record,
      items: [
        ...kept,
        ...missing.map((slot) => slotItem(slot, offer.packageId, offer.name)),
      ],
      updatedAt: now,
    },
  };
}
