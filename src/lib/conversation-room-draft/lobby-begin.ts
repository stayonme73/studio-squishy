/**
 * Lobby → Conversation Room begin: resume unfinished work, or start fresh
 * after a finished purchase + Intake handoff.
 *
 * Incomplete journey: preserve and resume (working-draft contract).
 * Completed journey: do not resurrect an empty “complete” tablet.
 */

import { clearGuideCaptureDraft } from "@/lib/studio-guide-capture";
import { readCurrentCampaign } from "@/lib/studio-board-campaign";
import {
  clearGuideMemoryDraft,
  clearGuideUiStep,
  loadGuideDraft,
} from "@/lib/studio-guide-hard-nav";
import {
  clearWorkingDraft,
  readWorkingDraft,
} from "@/lib/studio-working-draft";

import { readConversationStage } from "./slices";

export type LobbyConversationBeginInvite = "start" | "resume";

/** True when this browser’s conversation project already finished Intake. */
export function isConversationJourneyComplete(): boolean {
  const draft = readWorkingDraft();
  if (draft && readConversationStage(draft) === "complete") {
    return true;
  }
  const campaign = readCurrentCampaign();
  return Boolean(
    campaign?.paymentReceivedAt && campaign?.routeMapIntakeSubmittedAt,
  );
}

/**
 * Clear Guide UI / memory only — keep the working draft (including attribution).
 * Use after Intake handoff so attributed history survives Board navigation.
 */
export function clearConversationGuideLocals(): void {
  clearGuideUiStep();
  clearGuideMemoryDraft();
  clearGuideCaptureDraft();
}

/**
 * Clear local Conversation Room capture for a deliberate fresh start.
 * Does not delete the campaign record. Prefer clearConversationGuideLocals
 * on Intake → Board handoff so attribution is not erased.
 */
export function clearCompletedConversationLocalState(): void {
  clearConversationGuideLocals();
  clearWorkingDraft();
}

function hasUnfinishedConversationProgress(): boolean {
  const guide = loadGuideDraft();
  if (guide?.projectNeed?.trim() || guide?.confirmedAt) return true;

  const draft = readWorkingDraft();
  if (!draft) return false;
  const stage = readConversationStage(draft);
  return stage !== "opening" && stage !== "complete";
}

/**
 * Lobby / mobile Let’s Get Started.
 * Completes → clear leftover local state and invite a fresh start.
 * Mid-journey → resume invite (CR restores stage + tablet).
 */
export function resolveLobbyConversationBeginInvite(): LobbyConversationBeginInvite {
  if (isConversationJourneyComplete()) {
    clearCompletedConversationLocalState();
    return "start";
  }
  return hasUnfinishedConversationProgress() ? "resume" : "start";
}
