import {
  createEmptyFeedbackSession,
  type FeedbackConceptId,
  type FeedbackSectionId,
  type FeedbackSession,
} from "@/config/feedback-studio";

const STORAGE_PREFIX = "studio-squishy:feedback-session";

function storageKey(campaignId: string, conceptId: FeedbackConceptId) {
  return `${STORAGE_PREFIX}:${campaignId}:${conceptId}`;
}

function normalizeFeedbackSession(
  session: FeedbackSession,
  visibleSectionIds?: readonly FeedbackSectionId[],
): FeedbackSession {
  if (!visibleSectionIds?.length) return session;

  const sectionStatuses = Object.fromEntries(
    visibleSectionIds.map((sectionId) => [
      sectionId,
      session.sectionStatuses[sectionId] ?? "neutral",
    ]),
  ) as FeedbackSession["sectionStatuses"];

  return {
    ...session,
    sectionStatuses,
    stickyNotes: session.stickyNotes.filter((note) =>
      visibleSectionIds.includes(note.sectionId),
    ),
    voiceNotes: session.voiceNotes.filter((note) =>
      visibleSectionIds.includes(note.sectionId),
    ),
    drawSections: session.drawSections.filter((sectionId) =>
      visibleSectionIds.includes(sectionId),
    ),
  };
}

export function loadFeedbackSession(
  campaignId: string,
  conceptId: FeedbackConceptId,
  visibleSectionIds?: readonly FeedbackSectionId[],
): FeedbackSession {
  if (typeof window === "undefined") {
    return createEmptyFeedbackSession(campaignId, conceptId, visibleSectionIds);
  }

  try {
    const raw = localStorage.getItem(storageKey(campaignId, conceptId));
    if (!raw) return createEmptyFeedbackSession(campaignId, conceptId, visibleSectionIds);
    const parsed = JSON.parse(raw) as FeedbackSession;
    if (parsed.conceptId !== conceptId || parsed.campaignId !== campaignId) {
      return createEmptyFeedbackSession(campaignId, conceptId, visibleSectionIds);
    }
    return normalizeFeedbackSession(parsed, visibleSectionIds);
  } catch {
    return createEmptyFeedbackSession(campaignId, conceptId, visibleSectionIds);
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
