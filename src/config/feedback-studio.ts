/** Feedback Studio — section ids, session types, copy. */

import type { ReviewRoomOptionId } from "@/config/review-room";

export type FeedbackConceptId = ReviewRoomOptionId;

export type FeedbackSectionId = "hero" | "social" | "email" | "sms" | "rationale";

export type StickyNoteColorId = "yellow" | "blue" | "coral";

export type SectionReviewStatus = "neutral" | "approved" | "revision";

export type FeedbackTool = "none" | "sticky" | "draw" | "voice";

export type FeedbackConceptPreview = {
  id: FeedbackConceptId;
  directionLabel: string;
  tagline: string;
  summary: string;
  whyChosen: string;
  hero: {
    headline: string;
    subhead: string;
    accent: "warm" | "bold" | "premium";
  };
  social: {
    platform: string;
    body: string;
    cta: string;
  };
  email: {
    subject: string;
    preheader: string;
    body: string;
  };
  sms: {
    body: string;
  };
};

export type FeedbackStickyNote = {
  id: string;
  sectionId: FeedbackSectionId;
  color: StickyNoteColorId;
  text: string;
  createdAt: string;
};

export type FeedbackVoiceNote = {
  id: string;
  sectionId: FeedbackSectionId;
  durationSec: number;
  createdAt: string;
};

export type FeedbackSession = {
  conceptId: FeedbackConceptId;
  campaignId: string;
  sectionStatuses: Record<FeedbackSectionId, SectionReviewStatus>;
  stickyNotes: FeedbackStickyNote[];
  voiceNotes: FeedbackVoiceNote[];
  drawSections: FeedbackSectionId[];
  submittedAt: string | null;
};

export const FEEDBACK_SECTION_IDS: FeedbackSectionId[] = [
  "hero",
  "social",
  "email",
  "sms",
  "rationale",
];

export const feedbackStudio = {
  pageTitle: "Review Room",
  pageSubtitle: "Feedback Studio",
  eyebrow: "REVIEW ROOM",
  backLabel: "Back to Studio Board",
  pickerTitle: "Choose a campaign direction",
  pickerLead:
    "Your Studio team prepared three distinct directions. Open each concept, review the full campaign preview, and leave feedback before you choose.",
  openConceptCta: "Review this direction",
  compareHint: "Three directions · one campaign · your decision",
  reviewBackLabel: "All directions",
  reviewConceptLabel: (id: FeedbackConceptId) => `Concept ${id}`,
  selectDirectionCta: "Choose this direction",
  selectedBadge: "Selected direction",
  focusedSectionLabel: "Reviewing section",

  reviewStatus: {
    label: "Review Status",
    finalRound: "Final Review Round",
    roundOf: (current: number, total: number) => `Review ${current} of ${total}`,
  },

  previewSections: {
    hero: "Hero",
    social: "Social post",
    email: "Email",
    sms: "SMS",
    rationale: "Why this direction",
  } satisfies Record<FeedbackSectionId, string>,

  sectionStatus: {
    approved: "Approved",
    revision: "Revision requested",
    neutral: "Not reviewed",
  },

  feedbackPanel: {
    title: "Feedback Tools",
    hint: "Select a section in the preview, then leave feedback using the tools below.",
    toolGroups: {
      annotate: "Annotate",
      decide: "Section decision",
      log: "Your feedback",
    },
    addStickyNote: "Add Sticky Note",
    recordVoice: "Record Voice Feedback",
    drawAnnotation: "Draw Annotation",
    approveSection: "Approve Section",
    requestRevision: "Request Revision",
    submitFeedback: "Submit Feedback",
    submitted: "Feedback submitted — thank you.",
    stickyPlaceholder: "Write your note…",
    saveSticky: "Place note",
    cancelSticky: "Cancel",
    recording: "Recording… tap to stop",
    startRecording: "Start recording",
    drawActive: "Draw on the highlighted section",
    drawErase: "Erase",
    drawDone: "Done drawing",
    voiceSaved: (sec: number) => `Voice note saved (${sec}s)`,
    noSection: "Select a preview section first.",
    saved: {
      sticky: "Sticky note saved",
      voice: (sec: number) => `Voice note saved (${sec}s)`,
      approve: (section: string) => `${section} approved`,
      revision: (section: string) => `Revision requested — ${section}`,
      draw: "Annotation saved",
      submit: "Feedback submitted — thank you.",
    },
  },

  stickyNoteColors: {
    yellow: { id: "yellow" as const, label: "Question", hint: "Ask the Studio team" },
    blue: { id: "blue" as const, label: "Idea", hint: "Share a new thought" },
    coral: { id: "coral" as const, label: "Revision Request", hint: "Ask for a change" },
  },

  notReady: {
    title: "Not ready for feedback yet",
    body: "Your campaign concepts will appear here when the Studio finishes building them.",
  },

  noCampaign: {
    title: "No campaign yet",
    body: "Start a campaign from the Draft Room to review concepts here.",
    cta: "Go to Studio Board",
  },
} as const;

export function getFeedbackConcept(
  id: string | null | undefined,
  concepts: readonly FeedbackConceptPreview[],
): FeedbackConceptPreview | null {
  if (!id) return null;
  return concepts.find((concept) => concept.id === id) ?? null;
}

export function isFeedbackConceptId(value: string | null | undefined): value is FeedbackConceptId {
  return value === "A" || value === "B" || value === "C";
}

export function createEmptyFeedbackSession(
  campaignId: string,
  conceptId: FeedbackConceptId,
): FeedbackSession {
  return {
    conceptId,
    campaignId,
    sectionStatuses: {
      hero: "neutral",
      social: "neutral",
      email: "neutral",
      sms: "neutral",
      rationale: "neutral",
    },
    stickyNotes: [],
    voiceNotes: [],
    drawSections: [],
    submittedAt: null,
  };
}
