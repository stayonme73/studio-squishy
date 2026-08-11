/**
 * Browser-safe quality-gate predicates.
 * Keep Node-only artifact QA (fs/ffprobe) out of this module.
 */

import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";

import { VOICE_PRODUCTION_SKUS } from "./voice-production/contracts";
import { VIDEO_PRODUCTION_SKUS } from "./video-production/contracts";

const VOICE_SKU_SET = new Set<string>(VOICE_PRODUCTION_SKUS);
const VIDEO_SKU_SET = new Set<string>(VIDEO_PRODUCTION_SKUS);

export function requiresCopyQualityGate(task: CampaignTaskItem): boolean {
  const phaseOk = task.phase === "copy" || task.phase === "qa";
  if (!phaseOk) return false;

  if (task.familyId === "copy_channels") return true;

  if (task.familyId === "social") {
    return task.relatedServiceIds.some((id) => id === "rm-j002" || id === "rm-j008");
  }

  if (task.familyId === "landing_page") {
    return task.phase === "copy";
  }

  return false;
}

export function requiresDesignQualityGate(task: CampaignTaskItem): boolean {
  const phaseOk =
    task.phase === "creative" ||
    task.phase === "creative_production" ||
    task.phase === "qa";
  if (!phaseOk) return false;

  if (task.familyId === "marketing_assets") return true;

  if (task.familyId === "social") {
    return task.relatedServiceIds.some(
      (id) =>
        id.startsWith("v2-rtu-") ||
        id === "ma-001" ||
        id === "rm-j002" ||
        id === "rm-j008",
    );
  }

  return false;
}

export function requiresAudioQualityGate(task: CampaignTaskItem): boolean {
  const phaseOk =
    task.phase === "creative" ||
    task.phase === "creative_production" ||
    task.phase === "qa" ||
    task.phase === "copy";
  if (!phaseOk) return false;
  if (task.familyId !== "video_audio") return false;
  return task.relatedServiceIds.some((id) => VOICE_SKU_SET.has(id));
}

export function requiresVideoQualityGate(task: CampaignTaskItem): boolean {
  const phaseOk =
    task.phase === "creative" ||
    task.phase === "creative_production" ||
    task.phase === "qa";
  if (!phaseOk) return false;
  if (task.familyId !== "video_audio") return false;
  return task.relatedServiceIds.some((id) => VIDEO_SKU_SET.has(id));
}
