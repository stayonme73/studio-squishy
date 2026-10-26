/**
 * Maps Quality judgments that already require Owner onto attention reason codes.
 * These codes name the existing exception kinds. They are not scope issues.
 */
import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";

export const QUALITY_OWNER_ATTENTION_LABELS = {
  direction_disagreement: campaignExceptionsConfig.kindLabels.direction_disagreement,
  compliance_hold: campaignExceptionsConfig.kindLabels.compliance_hold,
} as const;

export type QualityOwnerAttentionReason = keyof typeof QUALITY_OWNER_ATTENTION_LABELS;

export function qualityOwnerAttentionReason(
  category: string | null | undefined,
): QualityOwnerAttentionReason | null {
  if (category === "direction_disagreement") return "direction_disagreement";
  if (category === "compliance_concern") return "compliance_hold";
  return null;
}

export function qualityOwnerAttentionReasonForException(
  kind: CampaignExceptionKind,
): QualityOwnerAttentionReason | null {
  if (kind === "direction_disagreement" || kind === "compliance_hold") return kind;
  return null;
}

export function qualityAttentionKey(reason: QualityOwnerAttentionReason, sourceId: string): string {
  return `${reason}|${sourceId}`;
}
