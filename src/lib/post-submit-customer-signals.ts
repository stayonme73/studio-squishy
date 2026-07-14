/**
 * Package 4 — Post-Submit Signal Honesty (presentation only).
 *
 * Leaves internal `campaignStatus` alone (including BUILDING_CONCEPTS).
 * Customer wording follows production-gate facts — not a second production evaluator.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { DecisionOutcome } from "@/decision-core/types";
import { isIntakeComplete } from "@/lib/studio-board-campaign";

/** Locked customer primary status after Intake submit, before production gate. */
export const PROJECT_INTAKE_RECEIVED_STATUS = "Project Intake Received";

/** Locked supporting message — Package 4 decision B. */
export const PROJECT_INTAKE_RECEIVED_LEAD =
  "We've received your Project Intake and are preparing your project for the next stage.";

/** Metrics stage while waiting on production gate (not "Campaign in Progress" creative work). */
export const PROJECT_INTAKE_RECEIVED_STAGE = "Preparing Next Stage";

export type PostSubmitSignalFacts = {
  /**
   * True only when Help Center production-trigger allFourMet / evaluateProductionTrigger allow.
   * When unknown, pass false — never claim creative work started without proof.
   */
  productionGatePassed: boolean;
  /** Live or denormalized blocking required materials count. */
  blockingRequiredCount: number;
  /** Optional label for materials-primary Next Action (from materials still-needed). */
  stillNeededLabel?: string | null;
};

export type PostSubmitCustomerMode =
  | "pass_through"
  | "materials_blocking"
  | "intake_received"
  | "building_concepts_allowed";

type ProductionGatePayload = {
  allFourMet?: boolean;
};

/** Read allow from the existing Decision Core production_trigger outcome. */
export function productionGatePassedFromOutcome(outcome: DecisionOutcome | null | undefined): boolean {
  if (!outcome || outcome.domain !== "production_trigger") return false;
  if (outcome.determination === "allow") return true;
  const payload = outcome.payload as ProductionGatePayload | undefined;
  return Boolean(payload?.allFourMet);
}

/**
 * Same conjunction as `evaluateProductionTrigger` `allFourMet`.
 * Use only when composing already-known Help Center gate facts for display —
 * do not invent alternate production rules here.
 */
export function productionGatePassedFromKnownFacts(facts: {
  paymentReceived: boolean;
  projectDetailsComplete: boolean;
  materialsAccepted: boolean;
  movedToProduction: boolean;
}): boolean {
  return (
    facts.paymentReceived &&
    facts.projectDetailsComplete &&
    facts.materialsAccepted &&
    facts.movedToProduction
  );
}

/** Build display gate from campaign + known moved-to-production / materials facts. */
export function resolveProductionGatePassedForCampaign(
  campaign: CampaignRecord,
  options: {
    blockingRequiredCount: number;
    /** True when any purchased job has productionStartedAt / tasks say started. */
    movedToProduction: boolean;
  },
): boolean {
  return productionGatePassedFromKnownFacts({
    paymentReceived: Boolean(campaign.paymentReceivedAt),
    projectDetailsComplete: isIntakeComplete(campaign),
    materialsAccepted: options.blockingRequiredCount === 0,
    movedToProduction: options.movedToProduction,
  });
}

function appliesPostSubmitOverlay(campaign: CampaignRecord): boolean {
  if (!isIntakeComplete(campaign)) return false;
  return (
    campaign.campaignStatus === "BUILDING_CONCEPTS" ||
    campaign.campaignStatus === "PAYMENT_RECEIVED"
  );
}

export function resolvePostSubmitCustomerMode(
  campaign: CampaignRecord | null,
  facts: PostSubmitSignalFacts,
): PostSubmitCustomerMode {
  if (!campaign || !appliesPostSubmitOverlay(campaign)) return "pass_through";

  if (facts.blockingRequiredCount > 0) return "materials_blocking";
  if (!facts.productionGatePassed) return "intake_received";
  return "building_concepts_allowed";
}

export function materialPromptFromStillNeededLabel(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized.includes("destination") || normalized.includes("link / cta")) {
    return "We still need your destination link.";
  }
  if (normalized.includes("brand")) {
    return "We still need your brand materials.";
  }
  if (normalized.includes("platform") || normalized.includes("format")) {
    return "We still need your platform and format details.";
  }
  if (normalized.includes("wording") || normalized.includes("disclosure")) {
    return "We still need your required wording or disclosures.";
  }
  if (normalized.includes("goal") || normalized.includes("message")) {
    return "We still need your campaign goal.";
  }
  if (normalized.includes("avoid")) {
    return "Tell us anything we should avoid.";
  }
  return `We still need your ${label.toLowerCase()}.`;
}

export type PostSubmitNextActionCopy = {
  statusLabel: string;
  lead: string;
  hint: string | null;
};

export function resolvePostSubmitNextActionCopy(
  mode: PostSubmitCustomerMode,
  facts: PostSubmitSignalFacts,
): PostSubmitNextActionCopy | null {
  if (mode === "pass_through" || mode === "building_concepts_allowed") return null;

  if (mode === "materials_blocking") {
    const stillNeeded = facts.stillNeededLabel?.trim();
    const materialsLead = stillNeeded
      ? materialPromptFromStillNeededLabel(stillNeeded)
      : "We still need materials from you before the next stage.";
    return {
      statusLabel: materialsLead,
      lead: PROJECT_INTAKE_RECEIVED_LEAD,
      hint: "Share the requested materials in the Materials section below.",
    };
  }

  return {
    statusLabel: PROJECT_INTAKE_RECEIVED_STATUS,
    lead: PROJECT_INTAKE_RECEIVED_LEAD,
    hint: null,
  };
}

/** Whether customer-facing Building Concepts / creative-work-started copy is allowed. */
export function mayShowBuildingConceptsCustomerCopy(
  campaign: CampaignRecord | null,
  facts: PostSubmitSignalFacts,
): boolean {
  const mode = resolvePostSubmitCustomerMode(campaign, facts);
  return mode === "pass_through" || mode === "building_concepts_allowed";
}
