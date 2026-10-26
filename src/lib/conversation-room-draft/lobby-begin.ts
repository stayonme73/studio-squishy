/**
 * Lobby → Conversation Room begin: resume unfinished work, or start fresh
 * after a finished purchase + Intake handoff.
 *
 * Incomplete journey: preserve and resume (working-draft contract).
 * Completed journey / protected Maya pointer: do not let a new customer
 * inherit another customer’s campaign, Intake, or Review state.
 * Detaches the browser current-campaign pointer only — never deletes the
 * server campaign record.
 */

import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import { studioPreAcceptanceV1 } from "@/config/studio-pre-acceptance-v1";
import { STUDIO_PAYMENT_SANDBOX_SESSION_KEY } from "@/lib/studio-payment/sandbox-query";
import { clearConversationSession } from "@/lib/studio-conversation-framework/lobby-session";
import { clearGuideCaptureDraft } from "@/lib/studio-guide-capture";
import {
  clearCampaignState,
  isIntakeComplete,
  readCurrentCampaign,
} from "@/lib/studio-board-campaign";
import { clearProjectDetailsDraft } from "@/lib/project-details-session";
import { clearStoredProjectClaimReceipt, readStoredProjectClaimReceipt } from "@/lib/studio-project-claim/client-receipt";
import { clearStudioVoiceBoardHandoff } from "@/lib/studio-voice-board-handoff";
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

function removeStorageKeysContaining(
  storage: Storage,
  needle: string,
): void {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && key.includes(needle)) keys.push(key);
  }
  for (const key of keys) {
    if (key === STUDIO_PAYMENT_SANDBOX_SESSION_KEY) continue;
    storage.removeItem(key);
  }
}

/**
 * Detach this browser from the current customer/campaign pointer.
 * Does not delete the campaign record on disk. Preserves the sandbox
 * payment opt-in so Customer-One can still Test pay.
 */
export function detachCurrentCustomerBrowserSession(): void {
  if (typeof window === "undefined") return;

  const campaign = readCurrentCampaign();
  const campaignId = campaign?.campaignId;
  const claim = readStoredProjectClaimReceipt();

  clearConversationGuideLocals();
  clearWorkingDraft();
  clearConversationSession();
  clearStudioVoiceBoardHandoff();

  try {
    window.sessionStorage.removeItem(studioPreAcceptanceV1.storageKey);
  } catch {
    /* private mode */
  }

  if (campaignId) {
    clearProjectDetailsDraft(campaignId);
    try {
      removeStorageKeysContaining(window.localStorage, campaignId);
      removeStorageKeysContaining(window.sessionStorage, campaignId);
    } catch {
      /* private mode */
    }
  }

  if (
    claim &&
    (claim.campaignId === campaignId ||
      claim.campaignId === MAYA_PROTECTED_CAMPAIGN_ID)
  ) {
    clearStoredProjectClaimReceipt();
  }

  clearCampaignState();
}

/** True when this browser’s conversation project already finished Intake. */
export function isConversationJourneyComplete(): boolean {
  const draft = readWorkingDraft();
  if (draft && readConversationStage(draft) === "complete") {
    return true;
  }
  const campaign = readCurrentCampaign();
  if (!campaign) return false;
  if (campaign.campaignId === MAYA_PROTECTED_CAMPAIGN_ID) {
    return true;
  }
  return Boolean(campaign.paymentReceivedAt && isIntakeComplete(campaign));
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
 * Detaches the current-campaign pointer. Does not delete the campaign record.
 */
export function clearCompletedConversationLocalState(): void {
  detachCurrentCustomerBrowserSession();
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
 * Mid-journey unpaid work → resume invite (CR restores stage + tablet).
 */
export function resolveLobbyConversationBeginInvite(): LobbyConversationBeginInvite {
  if (isConversationJourneyComplete()) {
    clearCompletedConversationLocalState();
    return "start";
  }
  return hasUnfinishedConversationProgress() ? "resume" : "start";
}
