import type { CampaignRecord, CampaignStatus } from "@/config/studio-board";
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
    [/^Vision Intake received$/i, "We received your project details"],
    [/^Intake received$/i, "We received your project details"],
    [/^Project Details received$/i, "We received your project details"],
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

const statusFallback: Record<CampaignStatus, string> = {
  DISCOVERY_COMPLETE: "Review your Project Summary when you're ready to continue.",
  DRAFT_RECEIVED: "Choose your Studio Plan and complete payment to continue.",
  PAYMENT_RECEIVED: "Complete your project details so we can begin production.",
  BUILDING_CONCEPTS: "We're building your concepts.",
  READY_FOR_REVIEW: "Your concepts are ready. Open Review Room to choose your direction.",
  DELIVERED: "Your deliverables are ready in Final Delivery.",
};

/** Plain-language next step for the Materials row “What You Should Do Next” panel. */
export function resolveBoardNextStepPanelMessage(input: BoardNextStepPanelInput): string {
  const { campaign, blockingRequiredCount, stillNeededLabels } = input;
  const status = campaign.campaignStatus;
  const stillNeeded = firstStillNeededLabel(stillNeededLabels);

  if (status === "READY_FOR_REVIEW") {
    return statusFallback.READY_FOR_REVIEW;
  }

  if (status === "DELIVERED") {
    return statusFallback.DELIVERED;
  }

  if (blockingRequiredCount === 0 && isIntakeComplete(campaign)) {
    if (status === "BUILDING_CONCEPTS") {
      return "We have everything we need. We're building your concepts now.";
    }
    if (status === "PAYMENT_RECEIVED") {
      return "Everything has been received. We'll begin production soon.";
    }
  }

  if (stillNeeded && blockingRequiredCount > 0) {
    return materialPromptFromLabel(stillNeeded);
  }

  if (status === "BUILDING_CONCEPTS") {
    return statusFallback.BUILDING_CONCEPTS;
  }

  if (status === "PAYMENT_RECEIVED" && !isIntakeComplete(campaign)) {
    return statusFallback.PAYMENT_RECEIVED;
  }

  return statusFallback[status];
}
