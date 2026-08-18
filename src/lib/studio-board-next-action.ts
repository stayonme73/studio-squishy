/**
 * Studio Board Next-Action Completion — presentation coordinator only.
 *
 * Consumes Package 1b Intake completion, Package 4 post-submit modes,
 * campaign status, and materials blocking facts. Does not redefine those rules.
 */

import { studioBoard, type CampaignRecord, type CampaignStatus } from "@/config/studio-board";
import { resolveIntakeEditHref } from "@/lib/intake-edit";
import { isIntakeComplete } from "@/lib/studio-board-campaign";
import {
  PROJECT_INTAKE_RECEIVED_LEAD,
  PROJECT_INTAKE_RECEIVED_STATUS,
  materialPromptFromStillNeededLabel,
  resolvePostSubmitCustomerMode,
  resolvePostSubmitNextActionCopy,
  resolveProductionGatePassedForCampaign,
  type PostSubmitSignalFacts,
} from "@/lib/post-submit-customer-signals";
import {
  resolveBoardCampaignActions,
  resolveWhatHappensNextSentence,
  type StudioBoardDisplayFacts,
} from "@/lib/studio-board-view";
import { resolvePaidOperatingRecoveryCustomerCopy } from "@/lib/studio-paid-activation-recovery/customer-copy";
import { resolveCustomerCurrentStatusOverlay } from "@/lib/studio-customer-current-status";

const { nextAction: nextCopy, campaignActions: actionCopy } = studioBoard;

/** Existing Materials control that can open the campaign-goal slide-out. */
export const BOARD_ACTIONABLE_CAMPAIGN_MESSAGE_KEY = "campaign-message";

/** Cross-panel bus — Materials publishes keys; Next Action may request open. */
export const BOARD_MATERIALS_ACTIONABLE_EVENT = "studio-squishy:board-materials-actionable";
export const BOARD_OPEN_MATERIAL_EVENT = "studio-squishy:open-board-material";

export const DISCOVERY_COMPLETE_STATUS = "Discovery Complete";
export const DISCOVERY_COMPLETE_LEAD =
  "The Studio has your initial project direction and is preparing the next step.";
export const DISCOVERY_COMPLETE_HINT =
  "There is nothing you need to do right now. Your Studio Board will update when the next step is ready.";

/** Incomplete-Intake materials support — agrees with Package 1b primary without duplicating the CTA label. */
export const MATERIALS_SUPPORT_INCOMPLETE_INTAKE =
  "Finish Project Intake first. Material requests will appear here afterward.";

export type BoardNextActionNavigate = {
  type: "navigate";
  label: string;
  href: string;
};

export type BoardNextActionOpenMaterial = {
  type: "open-material";
  label: string;
  materialKey: typeof BOARD_ACTIONABLE_CAMPAIGN_MESSAGE_KEY;
};

export type BoardNextActionSemantic =
  | BoardNextActionNavigate
  | BoardNextActionOpenMaterial;

export type BoardNextActionPresentation = {
  statusLabel: string | null;
  lead: string;
  hint: string | null;
  action: BoardNextActionSemantic | null;
  materialsSupportLine: string;
  /** Waiting chrome (materials / post-submit honesty) vs review emphasis. */
  tone: "default" | "review" | "waiting";
};

export type BoardNextActionInput = {
  campaign: CampaignRecord;
  displayFacts?: StudioBoardDisplayFacts;
  /**
   * Material keys that currently expose a real customer control.
   * Option A: only `campaign-message` may be listed when that card is clickable.
   */
  actionableMaterialKeys?: readonly string[];
  nextUpdateLabel?: string | null;
};

export function isCampaignMessageStillNeededLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  const normalized = label.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("campaign goal") || normalized.includes("campaign message")) return true;
  if (normalized.includes("goal") && normalized.includes("message")) return true;
  return false;
}

function resolveSignalFacts(
  campaign: CampaignRecord,
  displayFacts?: StudioBoardDisplayFacts,
): PostSubmitSignalFacts {
  const blockingRequiredCount =
    displayFacts?.blockingRequiredCount ?? campaign.materialsSummary?.blockingRequiredCount ?? 0;
  const movedToProduction = displayFacts?.movedToProduction ?? false;
  const productionGatePassed =
    displayFacts?.productionGatePassed ??
    resolveProductionGatePassedForCampaign(campaign, {
      blockingRequiredCount,
      movedToProduction,
    });
  return {
    productionGatePassed,
    blockingRequiredCount,
    stillNeededLabel: displayFacts?.stillNeededLabel ?? null,
  };
}

function canOpenCampaignMessage(
  facts: PostSubmitSignalFacts,
  actionableMaterialKeys: readonly string[] | undefined,
): boolean {
  if (!actionableMaterialKeys?.includes(BOARD_ACTIONABLE_CAMPAIGN_MESSAGE_KEY)) return false;
  return isCampaignMessageStillNeededLabel(facts.stillNeededLabel);
}

function presentation(
  partial: Omit<BoardNextActionPresentation, "materialsSupportLine"> & {
    materialsSupportLine?: string;
  },
): BoardNextActionPresentation {
  return {
    ...partial,
    materialsSupportLine: partial.materialsSupportLine ?? partial.lead,
  };
}

/**
 * Single source of truth for Current Campaign next-action + Materials support line.
 * Always returns guidance for an active campaign record.
 */
export function resolveBoardNextActionPresentation(
  input: BoardNextActionInput,
): BoardNextActionPresentation {
  const { campaign, displayFacts, actionableMaterialKeys, nextUpdateLabel } = input;
  const status = campaign.campaignStatus;
  const signalFacts = resolveSignalFacts(campaign, displayFacts);
  const actions = resolveBoardCampaignActions(status, true);
  const primary = actions.find((entry) => entry.isPrimary);

  if (status === "DISCOVERY_COMPLETE") {
    return presentation({
      statusLabel: DISCOVERY_COMPLETE_STATUS,
      lead: DISCOVERY_COMPLETE_LEAD,
      hint: DISCOVERY_COMPLETE_HINT,
      action: null,
      tone: "waiting",
      materialsSupportLine: DISCOVERY_COMPLETE_HINT,
    });
  }

  const overlay = resolveCustomerCurrentStatusOverlay(campaign, signalFacts, displayFacts?.jobs);
  if (
    overlay?.kind === "revision_underway" ||
    overlay?.kind === "approved_preparing" ||
    overlay?.kind === "delivery_ready" ||
    overlay?.kind === "waiting_on_you"
  ) {
    return presentation({
      statusLabel: overlay.statusLabel,
      lead: overlay.lead,
      hint: overlay.hint,
      action: overlay.preferDeliveryCta
        ? {
            type: "navigate",
            label: nextCopy.openFinalDelivery,
            href: studioBoard.routes.deliverables,
          }
        : null,
      tone: overlay.kind === "delivery_ready" ? "default" : "waiting",
      materialsSupportLine: overlay.lead,
    });
  }

  if (overlay?.kind === "review_ready") {
    return presentation({
      statusLabel: overlay.statusLabel,
      lead: overlay.lead,
      hint: nextCopy.reviewConceptsHint,
      action: {
        type: "navigate",
        label: nextCopy.reviewMyConcepts,
        href: studioBoard.routes.feedbackStudio,
      },
      tone: "review",
      materialsSupportLine: overlay.lead,
    });
  }

  if (status === "READY_FOR_REVIEW" && primary) {
    const lead = resolveWhatHappensNextSentence(campaign, displayFacts);
    return presentation({
      statusLabel: nextCopy.conceptsReadyLabel,
      lead,
      hint: nextCopy.reviewConceptsHint,
      action: {
        type: "navigate",
        label: nextCopy.reviewMyConcepts,
        href: primary.href,
      },
      tone: "review",
      materialsSupportLine: "Open the Review Room to see what is ready and what happens next.",
    });
  }

  if (status === "DELIVERED" && primary) {
    const lead = resolveWhatHappensNextSentence(campaign, displayFacts);
    return presentation({
      statusLabel: nextCopy.packageReadyLabel,
      lead,
      hint: null,
      action: {
        type: "navigate",
        label: nextCopy.openFinalDelivery,
        href: primary.href,
      },
      tone: "default",
      materialsSupportLine: "Your deliverables are ready in Final Delivery.",
    });
  }

  if (status === "DRAFT_RECEIVED" && primary) {
    const lead = resolveWhatHappensNextSentence(campaign, displayFacts);
    return presentation({
      statusLabel: null,
      lead,
      hint: null,
      action: {
        type: "navigate",
        label: nextCopy.choosePackage,
        href: primary.href,
      },
      tone: "default",
      materialsSupportLine: "Choose your Studio Plan in the Conversation Room to continue.",
    });
  }

  // Package 1b — paid incomplete Project Intake (product behavior unchanged).
  if (status === "PAYMENT_RECEIVED" && !isIntakeComplete(campaign)) {
    return presentation({
      statusLabel: nextCopy.waitingOnProjectIntakeLabel,
      lead: nextCopy.completeProjectDetailsHint,
      hint: null,
      action: {
        type: "navigate",
        label: nextCopy.completeProjectDetails,
        href: resolveIntakeEditHref(campaign, campaign.packageId),
      },
      tone: "default",
      materialsSupportLine: MATERIALS_SUPPORT_INCOMPLETE_INTAKE,
    });
  }

  const recovering = resolvePaidOperatingRecoveryCustomerCopy(campaign);
  if (recovering && (status === "PAYMENT_RECEIVED" || status === "BUILDING_CONCEPTS")) {
    return presentation({
      statusLabel: recovering.statusLabel,
      lead: recovering.lead,
      hint: recovering.hint,
      action: null,
      tone: "waiting",
      materialsSupportLine: recovering.lead,
    });
  }

  if (status === "PAYMENT_RECEIVED" || status === "BUILDING_CONCEPTS") {
    const mode = resolvePostSubmitCustomerMode(campaign, signalFacts);
    const honest = resolvePostSubmitNextActionCopy(mode, signalFacts);

    if (mode === "materials_blocking" && honest) {
      const openMessage = canOpenCampaignMessage(signalFacts, actionableMaterialKeys);
      return presentation({
        statusLabel: honest.statusLabel,
        lead: honest.lead,
        hint: openMessage
          ? "Open the Campaign goal request in Materials We Still Need."
          : honest.hint,
        action: openMessage
          ? {
              type: "open-material",
              label: "Provide Campaign Goal",
              materialKey: BOARD_ACTIONABLE_CAMPAIGN_MESSAGE_KEY,
            }
          : null,
        tone: "waiting",
        materialsSupportLine: honest.statusLabel,
      });
    }

    if (honest) {
      return presentation({
        statusLabel: honest.statusLabel,
        lead: honest.lead,
        hint: honest.hint,
        action: null,
        tone: "waiting",
        materialsSupportLine: honest.lead,
      });
    }

    const building = status === "BUILDING_CONCEPTS";
    const statusLabel = building ? nextCopy.buildingConceptsLabel : nextCopy.paymentReceivedLabel;
    const hint = building ? nextCopy.buildingConceptsHint : nextCopy.paymentReceivedHint;
    const lead = resolveWhatHappensNextSentence(campaign, displayFacts);
    const eta =
      nextUpdateLabel && nextUpdateLabel.trim()
        ? `${actionCopy.nextUpdatePrefix} ${nextUpdateLabel.trim()}`
        : null;

    return presentation({
      statusLabel,
      lead,
      hint: eta ? `${hint} ${eta}` : hint,
      action: null,
      tone: "waiting",
      materialsSupportLine: building
        ? "We have everything we need. We're building your concepts now."
        : lead,
    });
  }

  // Exhaustiveness guard — should not hit with CAMPAIGN_STATUSES, but never return null guidance.
  return presentation({
    statusLabel: studioBoard.statusContent[status as CampaignStatus]?.statusLabel ?? "Project update",
    lead: resolveWhatHappensNextSentence(campaign, displayFacts),
    hint: "Your Studio Board will update when the next step is ready.",
    action: null,
    tone: "waiting",
  });
}

/** Materials panel support line — same decision as primary next-action. */
export function resolveMaterialsNextStepSupportLine(input: BoardNextActionInput): string {
  return resolveBoardNextActionPresentation(input).materialsSupportLine;
}
