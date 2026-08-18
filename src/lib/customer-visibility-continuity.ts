/**
 * CUSTOMER-VISIBILITY-CONTINUITY-CERT-1 — shared customer project-status facts.
 *
 * Composes existing Board next-action, intake, materials, header, and job
 * authorities into one coherent view. Does not invent dates, risks, materials,
 * or progress. Does not create a second persistence ledger.
 */

import { customerVisibilityContinuityV1 as copy } from "@/config/customer-visibility-continuity-v1";
import type { CampaignRecord } from "@/config/studio-board";
import { isIntakeComplete } from "@/lib/studio-board-campaign";
import {
  resolveBoardNextActionPresentation,
  type BoardNextActionPresentation,
} from "@/lib/studio-board-next-action";
import { resolveCustomerCurrentStatusOverlay } from "@/lib/studio-customer-current-status";
import type { CustomerJobStatusSummary } from "@/lib/project-record-status";
import type {
  BoardHeaderSnapshot,
  StudioBoardDisplayFacts,
} from "@/lib/studio-board-view";

export type CustomerVisibilityActor = "customer" | "studio" | "none";

export type CustomerVisibilityMaterialsFacts = {
  blockingRequiredCount: number;
  stillNeededLabels: readonly string[];
  receivedLabels?: readonly string[];
};

export type CustomerVisibilityContinuityInput = {
  campaign: CampaignRecord | null;
  displayFacts?: StudioBoardDisplayFacts;
  materialsFacts?: CustomerVisibilityMaterialsFacts | null;
  headerSnapshot?: BoardHeaderSnapshot | null;
  jobs?: readonly CustomerJobStatusSummary[];
  /** When omitted, derived from campaign + displayFacts. */
  nextAction?: BoardNextActionPresentation | null;
};

export type CustomerVisibilityContinuityView = {
  hasCampaign: boolean;
  whatWeNeedFromYou: string;
  whatStudioIsDoing: string;
  nextStep: string;
  whoActsNext: CustomerVisibilityActor;
  whoActsNextLabel: string;
  targetOrCheckpoint: string;
  riskOrBlocker: string;
  neededItems: readonly string[];
  receivedOrCompleteNotes: readonly string[];
  /** True when target comes from campaign.targetCompletionDate. */
  hasAuthoritativeTargetDate: boolean;
};

function formatTargetDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.trim() || null;
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function resolveWhoActsNext(
  nextAction: BoardNextActionPresentation,
  materialsBlocking: boolean,
  waitingOnClient: boolean,
  intakeIncomplete: boolean,
): CustomerVisibilityActor {
  if (nextAction.action != null || materialsBlocking || waitingOnClient || intakeIncomplete) {
    return "customer";
  }
  if (nextAction.tone === "waiting" || nextAction.tone === "review") {
    // Review primary CTA is customer; already handled via action != null.
    // Waiting without customer action → Studio owns the next move.
    return nextAction.action != null ? "customer" : "studio";
  }
  return "studio";
}

function resolveNeededItems(input: {
  campaign: CampaignRecord;
  materialsFacts?: CustomerVisibilityMaterialsFacts | null;
  displayFacts?: StudioBoardDisplayFacts;
  waitingJobLabels: readonly string[];
}): string[] {
  const items: string[] = [];
  if (!isIntakeComplete(input.campaign) && input.campaign.paymentReceivedAt) {
    items.push("Finish Project Intake");
  }
  const labels =
    input.materialsFacts?.stillNeededLabels ??
    (input.displayFacts?.stillNeededLabel ? [input.displayFacts.stillNeededLabel] : []);
  for (const label of labels) {
    const trimmed = label.trim();
    if (trimmed && !items.includes(trimmed)) items.push(trimmed);
  }
  for (const label of input.waitingJobLabels) {
    if (!items.includes(label)) items.push(label);
  }
  return items;
}

function resolveRiskOrBlocker(input: {
  neededItems: readonly string[];
  materialsBlocking: boolean;
  waitingOnClient: boolean;
  intakeIncomplete: boolean;
  stillNeededLabel: string | null;
}): string {
  if (input.intakeIncomplete) {
    return "Project Intake is incomplete — production details are waiting on you.";
  }
  if (input.materialsBlocking) {
    const focus = input.stillNeededLabel?.trim();
    return focus
      ? `Required material still needed: ${focus}.`
      : "Required materials are still needed before work can continue.";
  }
  if (input.waitingOnClient) {
    return "At least one service is waiting on you.";
  }
  if (input.neededItems.length > 0) {
    return `Customer action still needed: ${input.neededItems[0]}.`;
  }
  return copy.empty.noRisk;
}

/**
 * Shared customer project-status story for Studio Board (and future consumers).
 */
export function resolveCustomerVisibilityContinuityView(
  input: CustomerVisibilityContinuityInput,
): CustomerVisibilityContinuityView {
  const { campaign } = input;
  if (!campaign) {
    return {
      hasCampaign: false,
      whatWeNeedFromYou: copy.empty.noCampaign,
      whatStudioIsDoing: copy.empty.noCampaign,
      nextStep: copy.empty.noCampaign,
      whoActsNext: "none",
      whoActsNextLabel: copy.actors.none,
      targetOrCheckpoint: copy.empty.targetNotSet,
      riskOrBlocker: copy.empty.noRisk,
      neededItems: [],
      receivedOrCompleteNotes: [],
      hasAuthoritativeTargetDate: false,
    };
  }

  const displayFacts: StudioBoardDisplayFacts = {
    ...input.displayFacts,
    blockingRequiredCount:
      input.displayFacts?.blockingRequiredCount ??
      input.materialsFacts?.blockingRequiredCount ??
      campaign.materialsSummary?.blockingRequiredCount ??
      0,
    stillNeededLabel:
      input.displayFacts?.stillNeededLabel ??
      input.materialsFacts?.stillNeededLabels[0] ??
      null,
    jobs: input.displayFacts?.jobs ?? input.jobs,
  };

  const overlay = resolveCustomerCurrentStatusOverlay(
    campaign,
    {
      productionGatePassed: displayFacts.productionGatePassed ?? false,
      blockingRequiredCount: displayFacts.blockingRequiredCount ?? 0,
    },
    displayFacts.jobs,
  );
  if (overlay?.kind === "cancelled") {
    return {
      hasCampaign: true,
      whatWeNeedFromYou: copy.empty.nothingNeeded,
      whatStudioIsDoing: overlay.lead,
      nextStep: overlay.lead,
      whoActsNext: "none",
      whoActsNextLabel: copy.actors.none,
      targetOrCheckpoint: copy.empty.targetNotSet,
      riskOrBlocker: overlay.hint ?? copy.empty.noRisk,
      neededItems: [],
      receivedOrCompleteNotes: [],
      hasAuthoritativeTargetDate: Boolean(campaign.targetCompletionDate),
    };
  }

  if (overlay?.kind === "waiting_on_you") {
    const waitingLabels = (displayFacts.jobs ?? input.jobs ?? [])
      .filter((job) => job.isWaitingOnClient)
      .map((job) => `${job.serviceName} — waiting on you`);
    const neededItems = resolveNeededItems({
      campaign,
      materialsFacts: input.materialsFacts,
      displayFacts,
      waitingJobLabels: waitingLabels,
    });
    return {
      hasCampaign: true,
      whatWeNeedFromYou:
        neededItems.length > 0 ? neededItems.join("; ") : overlay.hint ?? overlay.lead,
      whatStudioIsDoing: overlay.lead,
      nextStep: overlay.hint ?? overlay.lead,
      whoActsNext: "customer",
      whoActsNextLabel: copy.actors.customer,
      targetOrCheckpoint: copy.empty.targetNotSet,
      riskOrBlocker: resolveRiskOrBlocker({
        neededItems,
        materialsBlocking: (displayFacts.blockingRequiredCount ?? 0) > 0,
        waitingOnClient: true,
        intakeIncomplete: false,
        stillNeededLabel: displayFacts.stillNeededLabel ?? null,
      }),
      neededItems,
      receivedOrCompleteNotes: [],
      hasAuthoritativeTargetDate: Boolean(campaign.targetCompletionDate),
    };
  }

  const nextAction =
    input.nextAction ??
    resolveBoardNextActionPresentation({
      campaign,
      displayFacts,
    });

  const waitingJobs = (input.jobs ?? []).filter((job) => job.isWaitingOnClient);
  const waitingJobLabels = waitingJobs.map(
    (job) => `${job.serviceName} — waiting on you`,
  );

  const intakeIncomplete =
    Boolean(campaign.paymentReceivedAt) && !isIntakeComplete(campaign);
  const materialsBlocking = (displayFacts.blockingRequiredCount ?? 0) > 0;

  const neededItems = resolveNeededItems({
    campaign,
    materialsFacts: input.materialsFacts,
    displayFacts,
    waitingJobLabels,
  });

  const receivedOrCompleteNotes: string[] = (input.materialsFacts?.receivedLabels ?? [])
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label) => `${copy.receivedPrefix} ${label}`);

  if (isIntakeComplete(campaign) && campaign.paymentReceivedAt) {
    const intakeNote = `${copy.receivedPrefix} Project Intake submitted`;
    if (!receivedOrCompleteNotes.includes(intakeNote)) {
      receivedOrCompleteNotes.push(intakeNote);
    }
  }

  const whoActsNext = resolveWhoActsNext(
    nextAction,
    materialsBlocking,
    waitingJobs.length > 0,
    intakeIncomplete,
  );

  const authoritativeTarget = formatTargetDate(campaign.targetCompletionDate);
  const checkpoint =
    input.headerSnapshot?.nextUpdate?.trim() &&
    input.headerSnapshot.nextUpdate.trim().toLowerCase() !== "pending"
      ? input.headerSnapshot.nextUpdate.trim()
      : null;

  const targetOrCheckpoint = authoritativeTarget
    ? authoritativeTarget
    : checkpoint
      ? `Checkpoint: ${checkpoint}`
      : copy.empty.targetNotSet;

  const whatWeNeedFromYou =
    neededItems.length > 0 ? neededItems.join("; ") : copy.empty.nothingNeeded;

  const whatStudioIsDoing =
    whoActsNext === "studio"
      ? nextAction.lead
      : nextAction.statusLabel?.trim() || nextAction.lead;

  const nextStep = nextAction.action?.label
    ? `${nextAction.lead} (${nextAction.action.label})`
    : nextAction.hint
      ? `${nextAction.lead} ${nextAction.hint}`
      : nextAction.lead;

  return {
    hasCampaign: true,
    whatWeNeedFromYou,
    whatStudioIsDoing,
    nextStep,
    whoActsNext,
    whoActsNextLabel: copy.actors[whoActsNext],
    targetOrCheckpoint,
    riskOrBlocker: resolveRiskOrBlocker({
      neededItems,
      materialsBlocking,
      waitingOnClient: waitingJobs.length > 0,
      intakeIncomplete,
      stillNeededLabel: displayFacts.stillNeededLabel ?? null,
    }),
    neededItems,
    receivedOrCompleteNotes,
    hasAuthoritativeTargetDate: Boolean(authoritativeTarget),
  };
}
