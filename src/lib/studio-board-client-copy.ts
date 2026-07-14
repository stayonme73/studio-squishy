import type { CampaignRecord, CampaignStatus } from "@/config/studio-board";
import {
  PROJECT_INTAKE_RECEIVED_LEAD,
  resolvePostSubmitCustomerMode,
  resolveProductionGatePassedForCampaign,
  type PostSubmitSignalFacts,
} from "@/lib/post-submit-customer-signals";
import { isIntakeComplete } from "@/lib/studio-board-campaign";

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

function materialPromptFromLabel(label: string): string {
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

const incompleteIntakeNextStep =
  "Finish Project Intake first. Material requests will appear here afterward.";

const statusFallback: Record<CampaignStatus, string> = {
  DISCOVERY_COMPLETE: "Review your Project Summary when you're ready to continue.",
  DRAFT_RECEIVED: "Choose your Studio Plan and complete payment to continue.",
  PAYMENT_RECEIVED: incompleteIntakeNextStep,
  BUILDING_CONCEPTS: "We're building your concepts.",
  READY_FOR_REVIEW: "Your concepts are ready. Open Review Room to choose your direction.",
  DELIVERED: "Your deliverables are ready in Final Delivery.",
};

function resolveBoardPostSubmitFacts(input: BoardNextStepPanelInput): PostSubmitSignalFacts {
  const movedToProduction = input.movedToProduction ?? false;
  const productionGatePassed =
    input.productionGatePassed ??
    resolveProductionGatePassedForCampaign(input.campaign, {
      blockingRequiredCount: input.blockingRequiredCount,
      movedToProduction,
    });
  return {
    productionGatePassed,
    blockingRequiredCount: input.blockingRequiredCount,
    stillNeededLabel: firstStillNeededLabel(input.stillNeededLabels),
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
  const { campaign, blockingRequiredCount, stillNeededLabels } = input;
  const status = campaign.campaignStatus;
  const stillNeeded = firstStillNeededLabel(stillNeededLabels);
  const facts = resolveBoardPostSubmitFacts(input);
  const mode = resolvePostSubmitCustomerMode(campaign, facts);

  if (status === "READY_FOR_REVIEW") {
    return statusFallback.READY_FOR_REVIEW;
  }

  if (status === "DELIVERED") {
    return statusFallback.DELIVERED;
  }

  // Incomplete Project Intake owns next-step copy until Intake is submitted.
  if (status === "PAYMENT_RECEIVED" && !isIntakeComplete(campaign)) {
    return incompleteIntakeNextStep;
  }

  if (stillNeeded && blockingRequiredCount > 0) {
    return materialPromptFromLabel(stillNeeded);
  }

  if (blockingRequiredCount === 0 && isIntakeComplete(campaign)) {
    if (mode === "building_concepts_allowed" && status === "BUILDING_CONCEPTS") {
      return "We have everything we need. We're building your concepts now.";
    }
    if (mode === "intake_received" || status === "BUILDING_CONCEPTS" || status === "PAYMENT_RECEIVED") {
      return PROJECT_INTAKE_RECEIVED_LEAD;
    }
  }

  if (mode === "intake_received") {
    return PROJECT_INTAKE_RECEIVED_LEAD;
  }

  if (status === "BUILDING_CONCEPTS") {
    return statusFallback.BUILDING_CONCEPTS;
  }

  return statusFallback[status];
}
