import {
  createEmptyFeedbackSession,
  type FeedbackConceptId,
  type FeedbackSession,
} from "@/config/feedback-studio";

const STORAGE_PREFIX = "studio-squishy:feedback-session";

function storageKey(campaignId: string, conceptId: FeedbackConceptId) {
  return `${STORAGE_PREFIX}:${campaignId}:${conceptId}`;
}

export function loadFeedbackSession(
  campaignId: string,
  conceptId: FeedbackConceptId,
): FeedbackSession {
  if (typeof window === "undefined") {
    return createEmptyFeedbackSession(campaignId, conceptId);
  }

  try {
    const raw = localStorage.getItem(storageKey(campaignId, conceptId));
    if (!raw) return createEmptyFeedbackSession(campaignId, conceptId);
    const parsed = JSON.parse(raw) as FeedbackSession;
    if (parsed.conceptId !== conceptId || parsed.campaignId !== campaignId) {
      return createEmptyFeedbackSession(campaignId, conceptId);
    }
    return parsed;
  } catch {
    return createEmptyFeedbackSession(campaignId, conceptId);
  }
}

export function saveFeedbackSession(session: FeedbackSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(session.campaignId, session.conceptId), JSON.stringify(session));
}

export function submitFeedbackSession(session: FeedbackSession): FeedbackSession {
  const next = { ...session, submittedAt: new Date().toISOString() };
  saveFeedbackSession(next);
  return next;
}
