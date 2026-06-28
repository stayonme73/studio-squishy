import { getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import { materialCategoryLabel } from "@/config/materials";
import type { ApprovedStudioPlanLineItem, CampaignRecord } from "@/config/studio-board";

import type { MaterialCategory, MaterialRequirementLevel, MaterialSlotDefinition } from "./types";

const ALL_CATEGORIES: readonly MaterialCategory[] = [
  "logo-brand",
  "photo-video",
  "document-reference",
  "url-link",
  "access-instructions",
  "factual-confirmation",
  "other",
];

function responsibilityText(lineItem: ApprovedStudioPlanLineItem): string {
  const catalog = getServiceById(lineItem.skuId);
  const parts = [
    ...lineItem.clientResponsibilities,
    ...(catalog?.clientResponsibilities ?? []),
    ...(catalog?.minimumCustomerRequirements ?? []),
  ];
  return parts.join(" ").toLowerCase();
}

function categoryFromResponsibilityText(text: string): MaterialCategory[] {
  const categories = new Set<MaterialCategory>();

  if (/logo|brand|font|color|graphic|identity|mark/.test(text)) {
    categories.add("logo-brand");
  }
  if (/photo|video|image|b-roll|headshot|footage|visual/.test(text)) {
    categories.add("photo-video");
  }
  if (/document|script|pdf|reference|menu|spec|file|guide/.test(text)) {
    categories.add("document-reference");
  }
  if (/url|link|website|profile|handle|social|destination/.test(text)) {
    categories.add("url-link");
  }
  if (/access|account|login|admin|platform|credential|permission/.test(text)) {
    categories.add("access-instructions");
  }
  if (/confirm|fact|pricing|date|claim|pronunciation|wording|accurate|information/.test(text)) {
    categories.add("factual-confirmation");
  }

  return [...categories];
}

function defaultCategoriesForSku(skuId: ServiceId): MaterialCategory[] {
  if (skuId.startsWith("bf-")) return ["logo-brand"];
  if (skuId.startsWith("vp-")) return ["photo-video"];
  if (skuId.startsWith("cc-") || skuId.startsWith("ap-")) {
    return ["document-reference", "factual-confirmation"];
  }
  if (skuId.startsWith("ma-") || skuId.startsWith("sm-") || skuId.startsWith("em-")) {
    return ["photo-video", "url-link"];
  }
  return ["logo-brand"];
}

function resolveCategoriesForLineItem(lineItem: ApprovedStudioPlanLineItem): MaterialCategory[] {
  const catalog = getServiceById(lineItem.skuId);
  if (!catalog) return [];

  const categories = new Set<MaterialCategory>();
  const text = responsibilityText(lineItem);

  if (catalog.requiresClientMaterials) {
    for (const category of categoryFromResponsibilityText(text)) {
      categories.add(category);
    }
    if (categories.size === 0) {
      for (const category of defaultCategoriesForSku(lineItem.skuId)) {
        categories.add(category);
      }
    }
  }

  if (catalog.requiresClientAccess) {
    categories.add("access-instructions");
    if (!catalog.requiresClientMaterials) {
      categories.add("url-link");
    }
  }

  return ALL_CATEGORIES.filter((category) => categories.has(category));
}

function slotLabel(category: MaterialCategory): string {
  return materialCategoryLabel(category);
}

function requirementLevelForCategory(
  category: MaterialCategory,
  requiresMaterials: boolean,
  requiresAccess: boolean,
): MaterialRequirementLevel {
  if (category === "access-instructions" && requiresAccess) return "required";
  if (category === "url-link" && requiresAccess && !requiresMaterials) return "required";
  if (requiresMaterials && category !== "other") return "required";
  if (requiresAccess && category === "url-link") return "required";
  return "optional";
}

function slotKey(category: MaterialCategory, serviceId: ServiceId): string {
  return `${category}:${serviceId}`;
}

/**
 * Derive material slots from the frozen approved plan.
 * Catalog flags are read only at slot creation — post-approval truth is the frozen plan.
 */
export function resolveMaterialSlotsFromCampaign(
  campaign: CampaignRecord,
): MaterialSlotDefinition[] {
  const plan = campaign.approvedStudioPlan;
  if (!plan?.lineItems.length) return [];

  const slotMap = new Map<string, MaterialSlotDefinition>();

  for (const lineItem of plan.lineItems) {
    const catalog = getServiceById(lineItem.skuId);
    if (!catalog) continue;

    const categories = resolveCategoriesForLineItem(lineItem);
    for (const category of categories) {
      const key = slotKey(category, lineItem.skuId);
      if (slotMap.has(key)) continue;

      slotMap.set(key, {
        category,
        label: slotLabel(category),
        reason: lineItem.serviceName,
        requirementLevel: requirementLevelForCategory(
          category,
          catalog.requiresClientMaterials,
          catalog.requiresClientAccess,
        ),
        relatedServiceIds: [lineItem.skuId],
      });
    }
  }

  return [...slotMap.values()].sort((a, b) => {
    const categoryOrder = ALL_CATEGORIES.indexOf(a.category) - ALL_CATEGORIES.indexOf(b.category);
    if (categoryOrder !== 0) return categoryOrder;
    return a.reason.localeCompare(b.reason);
  });
}
