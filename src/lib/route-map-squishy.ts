/**
 * Route Map Squishy — deterministic transition narration for the pre-payment Route Map journey.
 * Pure copy resolver only. No pricing, eligibility, or navigation decisions — Squishy narrates
 * Journey State that RouteMapScene already owns; he does not compute or own any of it.
 */

import type { ServiceId } from "@/catalog/types";
import type { RouteMapJourneyStep } from "@/config/studio-board";

export type RouteMapSquishyStep = "map" | RouteMapJourneyStep;

export type SquishyRouteMapSnapshot = {
  step: RouteMapSquishyStep;
  previousStep: RouteMapSquishyStep | null;
  selectedServiceIds: readonly ServiceId[];
  previousSelectedServiceIds: readonly ServiceId[] | null;
  selectedJobId: ServiceId | null;
  justRestored: boolean;
  hasGreeted: boolean;
  /** True once the current project has been paid — Studio Plan editing is protected. */
  isPaidProject: boolean;
};

export type SquishyRouteMapMessageKey =
  | "first-arrival"
  | "service-added"
  | "already-added"
  | "return-to-browsing"
  | "empty-plan"
  | "restored-journey"
  | "paid-project-protected";

export type SquishyRouteMapMessage = {
  key: SquishyRouteMapMessageKey;
  text: string;
};

export const SQUISHY_ROUTE_MAP_COPY: Record<SquishyRouteMapMessageKey, string> = {
  "first-arrival":
    "Tell me what you're trying to get done. You can browse the services, or I can help you figure out where to start.",
  "service-added": "I added that to your Studio Plan. You can keep browsing or review your selections.",
  "already-added": "That service is already in your Studio Plan.",
  "return-to-browsing": "Your Studio Plan is saved. Let's see whether you need anything else.",
  "empty-plan": "Your Studio Plan is empty right now. Let's add the first service.",
  "restored-journey": "Welcome back. Your Studio Plan is still here, so we can continue where you stopped.",
  "paid-project-protected":
    "Your current project is confirmed. Additional services will be reviewed separately so your delivery date stays protected.",
};

/** Restored-journey copy when the persisted plan has no selected services. Same trigger key. */
export const SQUISHY_ROUTE_MAP_RESTORED_EMPTY_COPY =
  "Welcome back. Your Studio Plan is empty right now, so let's add the first service.";

function squishyMessage(key: SquishyRouteMapMessageKey): SquishyRouteMapMessage {
  return { key, text: SQUISHY_ROUTE_MAP_COPY[key] };
}

/**
 * Resolves the single Squishy line (if any) for the current Route Map Journey State.
 * Returns null when Squishy should stay silent — silence is the default, not a fallback string.
 */
export function resolveSquishyRouteMapMessage(
  snapshot: SquishyRouteMapSnapshot,
): SquishyRouteMapMessage | null {
  const {
    step,
    previousStep,
    selectedServiceIds,
    previousSelectedServiceIds,
    selectedJobId,
    justRestored,
    hasGreeted,
    isPaidProject,
  } = snapshot;

  if (justRestored) {
    return selectedServiceIds.length > 0
      ? squishyMessage("restored-journey")
      : { key: "restored-journey", text: SQUISHY_ROUTE_MAP_RESTORED_EMPTY_COPY };
  }

  if (
    !hasGreeted &&
    previousStep === "map" &&
    step !== "map" &&
    selectedServiceIds.length === 0
  ) {
    return squishyMessage("first-arrival");
  }

  // Tied to the business fact (the plan gained a service), not the incidental screen change —
  // catches additions made directly from the Studio Plan menu, not only via the job-detail CTA.
  const gainedService =
    previousSelectedServiceIds !== null &&
    selectedServiceIds.some((id) => !previousSelectedServiceIds.includes(id));
  if (gainedService) {
    return squishyMessage("service-added");
  }

  // The job-detail CTA is disabled for an already-selected service, so the customer can't
  // literally attempt to add it — the trigger is opening that job's detail, not a blocked click.
  if (step === "job" && selectedJobId !== null && selectedServiceIds.includes(selectedJobId)) {
    return squishyMessage("already-added");
  }

  // Browsing a new job while the current project is already paid — the Add control is disabled,
  // so Squishy explains why before the customer wonders what happened.
  if (step === "job" && isPaidProject && selectedJobId !== null) {
    return squishyMessage("paid-project-protected");
  }

  if (step === "studio-plan" && selectedServiceIds.length === 0) {
    return squishyMessage("empty-plan");
  }

  if (
    (previousStep === "job" || previousStep === "studio-plan") &&
    (step === "panel" || step === "map") &&
    selectedServiceIds.length > 0
  ) {
    return squishyMessage("return-to-browsing");
  }

  return null;
}
