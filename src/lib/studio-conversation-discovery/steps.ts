/**
 * Discovery tablet step order — all Discovery Room form fields + deadline.
 * Reuses locked tile copy/options from business-discovery-studio.
 */

import {
  DISCOVERY_FORM_TILE_IDS,
  DISCOVERY_REQUIRED_TILE_IDS,
  discoveryTileConfig,
  type DiscoveryTileId,
} from "@/config/business-discovery-studio";
import {
  formatBusinessTileAnswerForDisplay,
  isDiscoveryTileAnswerComplete,
} from "@/lib/business-discovery-completion";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";
import type {
  DiscoveryDeadlineInformation,
  DiscoveryFormTileId,
  DiscoveryTabletStepId,
} from "@/lib/studio-conversation-discovery/types";

/** Voice-needed order: situation → goal → challenge → business → channels → deadline → outcomes → blockers → notes. */
export const DISCOVERY_TABLET_STEP_ORDER: readonly DiscoveryTabletStepId[] = [
  "your-situation",
  "your-focus",
  "your-challenge",
  "your-business",
  "your-current-tools",
  "project-deadline",
  "success-looks-like",
  "whats-slowing-you-down",
  "anything-else",
] as const;

/** Deadline options — purposeful for feasibility / route; not plate-tile inventory. */
export const DISCOVERY_DEADLINE_OPTIONS = [
  "As soon as possible",
  "Within 2 weeks",
  "Within a month",
  "I have a specific date",
  "Flexible / no hard deadline",
] as const;

export type DiscoveryDeadlineOption = (typeof DISCOVERY_DEADLINE_OPTIONS)[number];

export type DiscoveryTabletStepConfig = {
  id: DiscoveryTabletStepId;
  title: string;
  question: string;
  required: boolean;
  kind: "tile" | "deadline";
  tileId?: DiscoveryFormTileId;
  fieldType?: "text" | "textarea" | "select" | "multiselect";
  options?: readonly string[];
  placeholder?: string;
  secondaryQuestion?: string;
  secondaryPlaceholder?: string;
};

function tileStep(tileId: DiscoveryFormTileId): DiscoveryTabletStepConfig {
  const config = discoveryTileConfig[tileId];
  return {
    id: tileId,
    title: config.title,
    question: config.question,
    required: config.required !== false,
    kind: "tile",
    tileId,
    fieldType: config.fieldType as DiscoveryTabletStepConfig["fieldType"],
    options: config.options,
    placeholder: config.placeholder,
    secondaryQuestion: config.secondaryQuestion,
    secondaryPlaceholder: config.secondaryPlaceholder,
  };
}

export const discoveryTabletStepConfig: Record<
  DiscoveryTabletStepId,
  DiscoveryTabletStepConfig
> = {
  "your-situation": tileStep("your-situation"),
  "your-focus": tileStep("your-focus"),
  "your-challenge": tileStep("your-challenge"),
  "your-business": tileStep("your-business"),
  "your-current-tools": tileStep("your-current-tools"),
  "project-deadline": {
    id: "project-deadline",
    title: "Your Deadline",
    question: "When do you need this completed?",
    required: true,
    kind: "deadline",
    fieldType: "select",
    options: DISCOVERY_DEADLINE_OPTIONS,
  },
  "success-looks-like": tileStep("success-looks-like"),
  "whats-slowing-you-down": tileStep("whats-slowing-you-down"),
  "anything-else": tileStep("anything-else"),
};

/** Every Discovery Room form tile must appear in the tablet order. */
export function discoveryTabletCoversAllFormTiles(): boolean {
  return DISCOVERY_FORM_TILE_IDS.every((id) =>
    DISCOVERY_TABLET_STEP_ORDER.includes(id),
  );
}

export function isDiscoveryTabletStepId(
  stepId: string,
): stepId is DiscoveryTabletStepId {
  return (DISCOVERY_TABLET_STEP_ORDER as readonly string[]).includes(stepId);
}

export function isDiscoveryFormTileId(
  stepId: DiscoveryTabletStepId,
): stepId is DiscoveryFormTileId {
  return stepId !== "project-deadline";
}

export function isDeadlineAnswerComplete(
  deadline: DiscoveryDeadlineInformation | null | undefined,
): boolean {
  const answer = deadline?.answer?.trim() ?? "";
  if (!answer) return false;
  return (DISCOVERY_DEADLINE_OPTIONS as readonly string[]).includes(answer);
}

export function formatDiscoveryStepSummary(
  stepId: DiscoveryTabletStepId,
  answers: DiscoveryAnswers,
  deadline?: DiscoveryDeadlineInformation | null,
): string {
  if (stepId === "project-deadline") {
    return deadline?.answer?.trim() ?? "";
  }
  const raw = answers[stepId];
  if (!raw) return "";
  if (stepId === "your-business") {
    return formatBusinessTileAnswerForDisplay(raw);
  }
  return raw.trim();
}

export function isDiscoveryTabletStepComplete(
  stepId: DiscoveryTabletStepId,
  answers: DiscoveryAnswers,
  deadline?: DiscoveryDeadlineInformation | null,
): boolean {
  if (stepId === "project-deadline") {
    return isDeadlineAnswerComplete(deadline);
  }
  const tileId = stepId as DiscoveryTileId;
  if (discoveryTileConfig[tileId].required === false) {
    const value = answers[tileId];
    if (value === undefined || value.trim() === "") return true;
    return isDiscoveryTileAnswerComplete(tileId, value);
  }
  return isDiscoveryTileAnswerComplete(tileId, answers[tileId]);
}

export function isDiscoveryTabletComplete(
  answers: DiscoveryAnswers,
  deadline?: DiscoveryDeadlineInformation | null,
): boolean {
  for (const stepId of DISCOVERY_TABLET_STEP_ORDER) {
    const config = discoveryTabletStepConfig[stepId];
    if (!config.required) continue;
    if (!isDiscoveryTabletStepComplete(stepId, answers, deadline)) {
      return false;
    }
  }
  /* Mirror plate rule: every required Discovery Room tile must be complete. */
  for (const tileId of DISCOVERY_REQUIRED_TILE_IDS) {
    if (!isDiscoveryTileAnswerComplete(tileId, answers[tileId])) {
      return false;
    }
  }
  return isDeadlineAnswerComplete(deadline);
}

/** Resume at first incomplete required step, else last step. */
export function resolveDiscoveryResumeStepIndex(
  answers: DiscoveryAnswers,
  deadline?: DiscoveryDeadlineInformation | null,
): number {
  const index = DISCOVERY_TABLET_STEP_ORDER.findIndex(
    (stepId) =>
      discoveryTabletStepConfig[stepId].required &&
      !isDiscoveryTabletStepComplete(stepId, answers, deadline),
  );
  if (index >= 0) return index;
  return Math.max(0, DISCOVERY_TABLET_STEP_ORDER.length - 1);
}
