import type {
  FeedbackSectionId,
  FeedbackSession,
  FeedbackStickyNote,
} from "@/config/feedback-studio";

/**
 * Phone Review helper — writing a change is not a sticky-note ritual.
 * Flushing this draft still does not consume a revision round; only
 * `request_revision` does that.
 */
export function applyRevisionChangeDraft(input: {
  session: FeedbackSession;
  focusedSection: FeedbackSectionId;
  draft: string;
  noteId: string;
  createdAt: string;
  anchorX?: number;
  anchorY?: number;
}): FeedbackSession {
  const text = input.draft.trim();
  const sectionStatuses = {
    ...input.session.sectionStatuses,
    [input.focusedSection]: "revision" as const,
  };
  if (!text) {
    return { ...input.session, sectionStatuses };
  }
  const alreadyCaptured = input.session.stickyNotes.some(
    (note) =>
      note.sectionId === input.focusedSection &&
      note.color === "yellow" &&
      note.text === text,
  );
  if (alreadyCaptured) {
    return { ...input.session, sectionStatuses };
  }
  return {
    ...input.session,
    sectionStatuses,
    stickyNotes: [
      ...input.session.stickyNotes,
      {
        id: input.noteId,
        sectionId: input.focusedSection,
        color: "yellow",
        text,
        createdAt: input.createdAt,
        ...(typeof input.anchorX === "number" && typeof input.anchorY === "number"
          ? { anchorX: input.anchorX, anchorY: input.anchorY }
          : {}),
      },
    ],
  };
}

/** Phone Erase clears the note and drawing on this proof. It does not send. */
export function erasePhoneProofMarks(
  session: FeedbackSession,
  focusedSection: FeedbackSectionId,
): FeedbackSession {
  return {
    ...session,
    stickyNotes: session.stickyNotes.filter((note) => note.sectionId !== focusedSection),
    drawSections: session.drawSections.filter((sectionId) => sectionId !== focusedSection),
  };
}

/** Phone Send needs an actual requested change, not a section mark alone. */
export function hasPhoneRevisionSendContent(
  session: FeedbackSession,
  draft: string,
): boolean {
  if (draft.trim()) return true;
  if (session.stickyNotes.some((note) => note.text.trim())) return true;
  if (session.voiceNotes.length > 0) return true;
  if (session.drawSections.length > 0) return true;
  if ((session.highlights ?? []).some((entry) => entry.rects.length > 0)) {
    return true;
  }
  if ((session.textComments ?? []).some((comment) => comment.text.trim())) {
    return true;
  }
  return false;
}

export function resolveLaptopReviewDeskState(input: {
  hasReviewAsset: boolean;
  submitted: boolean;
  reviewClosed: boolean;
  canRequestRevision: boolean;
  hasValidReviewInput: boolean;
}): { toolsUsable: boolean; submitActive: boolean; approveActive: boolean } {
  const toolsUsable = input.hasReviewAsset && !input.submitted && !input.reviewClosed;
  return {
    toolsUsable,
    submitActive: toolsUsable && input.canRequestRevision && input.hasValidReviewInput,
    /** Same as the phone Approve: one press approves every visible section, then confirms. */
    approveActive: toolsUsable,
  };
}

export type ApprovalConfirmScope = {
  packageName: string;
  items: readonly string[];
};

/** Approval confirmation names the package and every item currently marked approved. */
export function summarizeApprovalConfirmScope(input: {
  packageName: string;
  visibleSectionIds: readonly string[];
  sectionLabels: Readonly<Record<string, string>>;
  sectionStatuses: Readonly<Partial<Record<string, string>>>;
}): ApprovalConfirmScope {
  return {
    packageName: input.packageName,
    items: input.visibleSectionIds
      .filter((id) => input.sectionStatuses[id] === "approved")
      .map((id) => input.sectionLabels[id])
      .filter((label): label is string => Boolean(label?.trim())),
  };
}

export type PhoneRevisionConfirmSummary = {
  requestText: string | null;
  hasDrawing: boolean;
  hasVoice: boolean;
};

/**
 * Phone Send package — only this Request a Change session.
 * Typed text, optional drawing, optional voice. Drops leftover sticky /
 * voice / highlight / comment / section-decision inventory from earlier
 * drafts so it cannot reach the Machine.
 */
export function buildPhoneRevisionSubmitSession(input: {
  session: FeedbackSession;
  focusedSection: FeedbackSectionId;
  draft: string;
  changeOpenedAt: string;
  noteId: string;
  createdAt: string;
  includeDrawing: boolean;
}): FeedbackSession {
  const typed = input.draft.trim();
  const sessionNote = input.session.stickyNotes.find(
    (note) =>
      note.sectionId === input.focusedSection &&
      note.createdAt >= input.changeOpenedAt &&
      note.text.trim(),
  );
  const requestText = typed || sessionNote?.text.trim() || "";
  const stickyNotes: FeedbackStickyNote[] = requestText
    ? [
        {
          id: input.noteId,
          sectionId: input.focusedSection,
          color: "yellow",
          text: requestText,
          createdAt: input.createdAt,
        },
      ]
    : [];
  const voiceNotes = input.session.voiceNotes.filter(
    (note) => note.sectionId === input.focusedSection && note.createdAt >= input.changeOpenedAt,
  );
  const drewThisSection = input.session.drawSections.includes(input.focusedSection);
  const sectionStatuses = Object.fromEntries(
    Object.keys(input.session.sectionStatuses).map((key) => [key, "neutral" as const]),
  ) as FeedbackSession["sectionStatuses"];
  if (requestText || (input.includeDrawing && drewThisSection) || voiceNotes.length > 0) {
    sectionStatuses[input.focusedSection] = "revision";
  }

  return {
    ...input.session,
    sectionStatuses,
    stickyNotes,
    voiceNotes,
    drawSections: input.includeDrawing && drewThisSection ? [input.focusedSection] : [],
    highlights: [],
    textComments: [],
  };
}

export function summarizePhoneRevisionConfirm(
  session: FeedbackSession,
): PhoneRevisionConfirmSummary {
  const requestText =
    session.stickyNotes.map((note) => note.text.trim()).find(Boolean) ?? null;
  return {
    requestText,
    hasDrawing: session.drawSections.length > 0,
    hasVoice: session.voiceNotes.length > 0,
  };
}
