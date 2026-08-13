/**
 * Pre-execution plannedPostCount selection for sm-001.
 * Studio chooses N from campaign truth / material availability — never from QA.
 */

import { createHash } from "crypto";

import {
  SM_001_PLANNED_POST_COUNTS,
  type Sm001PlannedPostCount,
  type Sm001PlannedPostCountSelection,
  type Sm001ProjectTruth,
} from "./sm-001-types";

export type Sm001NSelectInput = {
  hasLogo: boolean;
  hasOfferFacts: boolean;
  hasDateWindow: boolean;
  hasExtendedCopy: boolean;
  hasSecondaryProofPoint: boolean;
};

export function collectSm001NSelectSignals(
  truth: Pick<
    Sm001ProjectTruth,
    | "materials"
    | "offerName"
    | "priceDisplay"
    | "cta"
    | "dateWindow"
    | "body"
    | "headline"
    | "wasPriceDisplay"
  >,
): Sm001NSelectInput {
  const hasLogo = truth.materials.some((m) => m.role === "logo");
  const hasOfferFacts = Boolean(
    truth.offerName?.trim() &&
      truth.priceDisplay?.trim() &&
      truth.cta?.trim(),
  );
  const hasDateWindow = Boolean(truth.dateWindow?.trim());
  const hasExtendedCopy = Boolean(
    truth.body?.trim() && truth.headline?.trim(),
  );
  const hasSecondaryProofPoint = Boolean(truth.wasPriceDisplay?.trim());
  return {
    hasLogo,
    hasOfferFacts,
    hasDateWindow,
    hasExtendedCopy,
    hasSecondaryProofPoint,
  };
}

/**
 * Deterministic, auditable Studio production decision.
 * Floor 4 / ceiling 6. Does not invent posts — richer truthful material → higher N.
 */
export function selectSm001PlannedPostCount(
  signals: Sm001NSelectInput,
): Sm001PlannedPostCountSelection {
  if (!signals.hasLogo || !signals.hasOfferFacts) {
    throw new Error(
      "INVALID_PLANNED_POST_COUNT: Launch Set requires logo + offer/price/CTA facts before N can be selected",
    );
  }
  if (!signals.hasDateWindow) {
    throw new Error(
      "INVALID_PLANNED_POST_COUNT: Launch Set requires a campaign date window (or explicit timing) before N can be selected",
    );
  }

  let plannedPostCount: Sm001PlannedPostCount;
  let rationale: string;

  if (signals.hasExtendedCopy && signals.hasSecondaryProofPoint) {
    plannedPostCount = 6;
    rationale =
      "Full Launch Set: logo, offer facts, date window, extended copy, and secondary proof point support six coordinated posts without inventing content.";
  } else if (signals.hasExtendedCopy) {
    plannedPostCount = 5;
    rationale =
      "Extended Launch Set: logo, offer facts, date window, and extended copy support five posts; no secondary proof point for a sixth.";
  } else {
    plannedPostCount = 4;
    rationale =
      "Core Launch Set: logo, offer facts, and date window support four posts; extended copy / secondary proof point not available — do not pad to six.";
  }

  if (
    !(SM_001_PLANNED_POST_COUNTS as readonly number[]).includes(
      plannedPostCount,
    )
  ) {
    throw new Error(
      `INVALID_PLANNED_POST_COUNT: ${plannedPostCount} is outside {4,5,6}`,
    );
  }

  const selectionFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        plannedPostCount,
        signals,
        rationale,
        selectedBeforeExecution: true,
      }),
    )
    .digest("hex");

  return {
    plannedPostCount,
    selectedBeforeExecution: true,
    rationale,
    signals,
    selectionFingerprint,
  };
}

export function assertPlannedPostCountLocked(
  truth: Pick<Sm001ProjectTruth, "plannedPostCount" | "plannedPostCountSelection">,
): void {
  if (truth.plannedPostCount !== truth.plannedPostCountSelection.plannedPostCount) {
    throw new Error(
      `COUNT_MISMATCH: truth.plannedPostCount (${truth.plannedPostCount}) != selection (${truth.plannedPostCountSelection.plannedPostCount})`,
    );
  }
  if (!truth.plannedPostCountSelection.selectedBeforeExecution) {
    throw new Error(
      "INVALID_PLANNED_POST_COUNT: plannedPostCount must be selected before execution",
    );
  }
}
