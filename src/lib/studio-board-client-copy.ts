import type { CampaignRecord } from "@/config/studio-board";
import { resolveMaterialsNextStepSupportLine } from "@/lib/studio-board-next-action";

/** Client-facing activity / studio-note text for Studio Board displays. */
export function toClientFacingActivityMessage(message: string): string {
  const trimmed = message.trim().replace(/\.$/, "");
  if (!trimmed) return message;

  const replacements: Array<[pattern: RegExp, value: string]> = [
    [/^Route Map job selected:\s*(.+)$/i, "Your project has been created: $1"],
    [/^Route Map job selected$/i, "Your project has been created"],
    [/^Payment received$/i, "We received your payment"],
    [/^Discovery received$/i, "We received your discovery answers"],
    [/^Discovery complete$/i, "Your Project Summary is ready"],
    [/^Vision Intake received$/i, "We received your Project Intake"],
    [/^Intake received$/i, "We received your Project Intake"],
    [/^Project Details received$/i, "We received your Project Intake"],
    [/^Vision Intake updated$/i, "We updated your Project Intake"],
    [/^Project Details updated$/i, "We updated your Project Intake"],
    [/^Required materials received$/i, "Everything we need has been received"],
    [/^Concept development started$/i, "We're building your concepts"],
    [/^Concepts ready for review$/i, "Your concepts are ready for review"],
    [/^Campaign concepts ready for your review$/i, "Your concepts are ready for review"],
    [/^Direction selected$/i, "You chose your campaign direction"],
    [/^Package delivered$/i, "Your deliverables are ready"],
    [/^Final package delivered$/i, "Your deliverables are ready"],
    [/^Payment is recorded\. Social Posts production is waiting for Tagia to submit the required client materials$/i, "We received your payment. We still need a few project details from you"],
  ];

  for (const [pattern, value] of replacements) {
    if (pattern.test(trimmed)) {
      return trimmed.replace(pattern, value);
    }
  }

  return trimmed;
}

export type BoardNextStepPanelInput = {
  campaign: CampaignRecord;
  blockingRequiredCount: number;
  stillNeededLabels: readonly string[];
  /** True only when production-trigger allFourMet / moved into production. Default false. */
  productionGatePassed?: boolean;
  movedToProduction?: boolean;
};

function firstStillNeededLabel(labels: readonly string[]): string | null {
  const label = labels.find((entry) => entry.trim().length > 0)?.trim();
  return label ?? null;
}

/** Materials “Still Need” empty states — never treat missing requests as “no materials needed.” */
export const MATERIALS_STILL_NEED_INCOMPLETE_INTAKE =
  "Material requests will appear here after you complete Project Intake.";

export const MATERIALS_STILL_NEED_AWAITING_REQUESTS =
  "No material requests have been posted yet. Check back here for anything the Studio needs.";

export const MATERIALS_STILL_NEED_NONE_CURRENTLY_NEEDED =
  "No additional materials are currently needed.";

export type MaterialsStillNeedEmptyKind =
  | "incomplete_intake"
  | "awaiting_requests"
  | "none_currently_needed";

export type MaterialsStillNeedEmptyInput = {
  intakeComplete: boolean;
  /** Materials client payload finished loading (success or empty). */
  materialsLoaded: boolean;
  actionCardCount: number;
  blockingRequiredCount: number;
  /**
   * True only when production has affirmatively started / moved —
   * not merely “no request rows yet.”
   */
  affirmativelyNoMaterialsNeeded: boolean;
};

/**
 * Empty copy for Materials We Still Need when there are no action cards to show.
 * Returns null when the caller should render specific material cards instead.
 */
export function resolveMaterialsStillNeedEmptyState(
  input: MaterialsStillNeedEmptyInput,
): { kind: MaterialsStillNeedEmptyKind; message: string } | null {
  if (input.actionCardCount > 0) return null;

  if (!input.intakeComplete) {
    return {
      kind: "incomplete_intake",
      message: MATERIALS_STILL_NEED_INCOMPLETE_INTAKE,
    };
  }

  if (
    input.materialsLoaded &&
    input.blockingRequiredCount === 0 &&
    input.affirmativelyNoMaterialsNeeded
  ) {
    return {
      kind: "none_currently_needed",
      message: MATERIALS_STILL_NEED_NONE_CURRENTLY_NEEDED,
    };
  }

  return {
    kind: "awaiting_requests",
    message: MATERIALS_STILL_NEED_AWAITING_REQUESTS,
  };
}

/** True when a client-facing activity line claims Project Intake was already received. */
export function isProjectIntakeReceivedActivityMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    normalized === "we received your project intake" ||
    normalized === "we received your project details" ||
    normalized === "we updated your project intake"
  );
}

/** Plain-language next step for the Materials row “What You Should Do Next” panel. */
export function resolveBoardNextStepPanelMessage(input: BoardNextStepPanelInput): string {
  const { campaign, blockingRequiredCount, stillNeededLabels, movedToProduction, productionGatePassed } =
    input;
  return resolveMaterialsNextStepSupportLine({
    campaign,
    displayFacts: {
      blockingRequiredCount,
      stillNeededLabel: firstStillNeededLabel(stillNeededLabels),
      movedToProduction,
      productionGatePassed,
    },
  });
}
