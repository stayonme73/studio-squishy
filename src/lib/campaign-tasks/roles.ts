import { CAMPAIGN_LEVEL_TASKS } from "./templates";
import type { CampaignTaskItem, ProductionRole } from "./types";

export function resolveResponsibleRole(task: CampaignTaskItem): ProductionRole {
  if (
    task.id === CAMPAIGN_LEVEL_TASKS.producerKickoff.id ||
    task.id === CAMPAIGN_LEVEL_TASKS.finalPackageAssembly.id ||
    task.phase === "delivery_prep"
  ) {
    return "producer_dispatcher";
  }

  switch (task.phase) {
    case "strategy":
    case "strategy_content_direction":
    case "review_strategy":
      return "strategy";
    case "copy":
      return "copy";
    case "creative":
    case "creative_copy":
    case "creative_production":
      return "creative_production";
    case "qa":
      return "qa";
    default:
      return "producer_dispatcher";
  }
}
