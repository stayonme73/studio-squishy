import type { MaterialCategory } from "@/lib/materials/types";
import { isBlockingMaterialItem } from "@/lib/materials/materials-view";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import type { CampaignTaskItem, ProductionTaskFamilyId, TaskPhase } from "./types";

/** Material categories a task phase may depend on — scoped by relatedServiceIds. */
function materialCategoriesForTask(
  task: CampaignTaskItem,
): readonly MaterialCategory[] {
  const { phase, familyId } = task;

  switch (phase) {
    case "strategy":
    case "strategy_content_direction":
    case "review_strategy":
      if (familyId === "brand_identity_messaging") {
        return ["logo-brand", "document-reference"];
      }
      return [];

    case "copy":
      if (familyId === "copy_channels" || familyId === "landing_page") {
        return ["factual-confirmation", "url-link"];
      }
      if (familyId === "social") {
        return ["factual-confirmation"];
      }
      return [];

    case "creative_copy":
      return ["logo-brand", "document-reference"];

    case "creative":
      if (familyId === "social") {
        return ["photo-video", "logo-brand"];
      }
      if (familyId === "marketing_assets") {
        return ["logo-brand", "photo-video"];
      }
      return ["logo-brand"];

    case "creative_production":
      return ["photo-video", "logo-brand", "document-reference"];

    default:
      return [];
  }
}

function sharesServiceScope(
  task: CampaignTaskItem,
  material: CampaignMaterialItem,
): boolean {
  return material.relatedServiceIds.some((serviceId) =>
    task.relatedServiceIds.includes(serviceId),
  );
}

export function resolveBlockingMaterialsForTask(
  task: CampaignTaskItem,
  materials: readonly CampaignMaterialItem[],
): CampaignMaterialItem[] {
  const categories = materialCategoriesForTask(task);
  if (categories.length === 0) return [];

  return materials.filter(
    (item) =>
      isBlockingMaterialItem(item) &&
      sharesServiceScope(task, item) &&
      categories.includes(item.category),
  );
}

export function resolveBlockedReason(
  task: CampaignTaskItem,
  materials: readonly CampaignMaterialItem[],
): string | undefined {
  const blocking = resolveBlockingMaterialsForTask(task, materials);
  if (blocking.length === 0) return undefined;

  const labels = [...new Set(blocking.map((item) => item.label))];
  const scope = task.serviceName;
  return `Waiting on ${labels.join(", ")} for ${scope} — required before ${phaseLabel(task.phase)} can start.`;
}

function phaseLabel(phase: TaskPhase): string {
  switch (phase) {
    case "strategy":
      return "strategy";
    case "strategy_content_direction":
      return "content direction";
    case "review_strategy":
      return "review";
    case "copy":
      return "copy";
    case "creative":
    case "creative_copy":
    case "creative_production":
      return "creative work";
    case "qa":
      return "QA";
    case "delivery_prep":
      return "delivery prep";
    default:
      return "this step";
  }
}

export function taskMayBeMaterialBlocked(task: CampaignTaskItem): boolean {
  return materialCategoriesForTask(task).length > 0;
}

export function isBrandCreativeTask(task: CampaignTaskItem): boolean {
  return (
    task.familyId === "brand_identity_messaging" &&
    (task.phase === "creative_copy" || task.phase === "strategy")
  );
}

export function isEmailCopyTask(task: CampaignTaskItem): boolean {
  return task.familyId === "copy_channels" && task.phase === "copy";
}

/** Exported for tests — categories checked for a given family/phase pair. */
export function materialCategoriesForPhase(
  familyId: ProductionTaskFamilyId,
  phase: TaskPhase,
): readonly MaterialCategory[] {
  return materialCategoriesForTask({
    id: "probe",
    title: "",
    phase,
    status: "not_ready",
    relatedServiceIds: [],
    familyId,
    catalogFamilyId: "brand_identity",
    serviceName: "",
    dependsOn: [],
  });
}
