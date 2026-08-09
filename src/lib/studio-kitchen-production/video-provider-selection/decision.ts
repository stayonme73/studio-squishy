/**
 * KITCHEN-VIDEO-PROVIDER-SELECTION-1 — sealed selection decision.
 * Hard-gate PASS required. Among passers, highest score total wins.
 * CapCut is out of scope (already FAIL).
 */

import {
  CREATOMATE_EVALUATION,
  JSON2VIDEO_EVALUATION,
  PROVIDER_EVALUATIONS,
  SHOTSTACK_EVALUATION,
} from "./evaluations";
import type { SelectionDecision } from "./types";

export const PROVIDER_SELECTION_PACKAGE_ID =
  "KITCHEN-VIDEO-PROVIDER-SELECTION-1" as const;

export const PROVIDER_SELECTION_STARTING_CONTROL =
  "7377c47a4717a715cf19f233cfa09f5ed1314550" as const;

export const PROVIDER_SELECTION_BRANCH =
  "kitchen/video-provider-selection-1" as const;

export const ACTIVE_SERVICE_SKU = "v2-rtu-short-video" as const;

export const CUSTOMER_READINESS_AFTER_SELECTION =
  "BLOCKED / INTEGRATION REQUIRED / NOT CUSTOMER READY / NOT CERTIFIED" as const;

/**
 * SELECT: SHOTSTACK
 *
 * Among Creatomate / Shotstack / JSON2Video, all three PASS hard gates.
 * Shotstack earns the spot on highest score total (48) plus clearest
 * cost/trial path for owner-independent RTU certification testing.
 */
export const PROVIDER_SELECTION_DECISION: SelectionDecision = {
  decision: "SELECT",
  winner: "shotstack",
  winnerLabel: "Shotstack",
  runnerUp: "creatomate",
  runnerUpLabel: "Creatomate",
  runnerUpLostBecause:
    "Creatomate also PASSes every hard gate and is excellent for hybrid template + RenderScript brand locks, but scored lower overall (47 vs 48). The gap is cost_fit and implementation_simplicity: at Studio’s 1080×1920 target, Creatomate’s pixel-based credits burn faster than Shotstack’s per-minute credits, and Shotstack’s pure Edit API timeline maps more directly to existing work-packet scene lists without requiring a template editor step.",
};

export const WINNER_EVALUATION = SHOTSTACK_EVALUATION;
export const RUNNER_UP_EVALUATION = CREATOMATE_EVALUATION;
export const THIRD_EVALUATION = JSON2VIDEO_EVALUATION;

export function assertSelectionIntegrity(): void {
  const passers = PROVIDER_EVALUATIONS.filter(
    (p) => p.hardGateOverall === "PASS",
  );
  if (passers.length === 0) {
    throw new Error("NO_PROVIDER_PASSES");
  }
  const ranked = [...passers].sort((a, b) => b.scoreTotal - a.scoreTotal);
  if (ranked[0]?.id !== "shotstack") {
    throw new Error(
      `Selection integrity: expected shotstack winner, got ${ranked[0]?.id}`,
    );
  }
}
