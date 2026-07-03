/** Feedback Studio — section ids, session types, copy. */

import type { ReviewRoomOptionId } from "@/config/review-room";
import type { DeliverableSectionId } from "@/lib/deliverable-scope";

export type FeedbackConceptId = ReviewRoomOptionId;

export type FeedbackSectionId =
  | DeliverableSectionId
  | "hero"
  | "rationale"
  | `fallback:${string}`;

export type StickyNoteColorId = "yellow" | "blue" | "coral";

export type SectionReviewStatus = "neutral" | "approved" | "revision" | "skip";

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
  social?: {
    platform: string;
    body: string;
    cta: string;
  };
  email?: {
    subject: string;
    preheader: string;
    body: string;
  };
  sms?: {
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
  sectionStatuses: Partial<Record<FeedbackSectionId, SectionReviewStatus>>;
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

export const FEEDBACK_REVIEW_ONLY_SECTION_IDS = ["hero", "rationale"] as const satisfies readonly FeedbackSectionId[];

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
    "brand-direction-assets": "Brand Direction & Assets",
    "brand-messaging": "Brand Messaging",
    "campaign-strategy-launch": "Campaign Strategy & Launch Plan",
    "campaign-strategy-monthly": "Campaign Strategy & Monthly Support",
    "marketing-copy": "Marketing Copy",
    "written-content": "Written Content",
    video: "Video",
    audio: "Audio / Voice-Over",
    "landing-page": "Landing Page Content & Creative Direction",
    optimization: "Optimization Review",
    "marketing-assets": "Marketing Assets",
    calendar: "Marketing Calendar",
  } satisfies Partial<Record<FeedbackSectionId, string>>,

  sectionStatus: {
    approved: "Approved",
    revision: "Revision requested",
    skip: "Skipped",
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
    skipSection: "Skip Section",
    submitFeedback: "Submit Feedback",
    requestRevisionJob: "Request Revision",
    approveForDelivery: "Approve for Delivery",
    revisionLimitNotice:
      "Revision allowance reached — your request has been sent to the Owner Desk for a decision.",
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
      skip: (section: string) => `${section} skipped`,
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
    body: "Your deliverables will appear here when the Studio finishes preparing them for review.",
  },

  jobReview: {
    pickerTitle: "Review your deliverables",
    pickerLead: "Your Studio team prepared deliverables for your review. Open the review workspace to leave feedback.",
    openReviewCta: "Open review",
    serviceLabel: "Service",
    deliverableReady: "Ready for review",
    submittedRevision: "Revision requested — returning to production.",
    submittedApproval: "Approved for delivery — awaiting Owner final approval.",
  },

  noCampaign: {
    title: "No campaign yet",
    body: "Start a campaign in Project Discovery to review concepts here.",
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
  visibleSectionIds?: readonly FeedbackSectionId[],
): FeedbackSession {
  const sections = visibleSectionIds ?? FEEDBACK_SECTION_IDS;
  const sectionStatuses = Object.fromEntries(
    sections.map((sectionId) => [sectionId, "neutral" as SectionReviewStatus]),
  ) as Partial<Record<FeedbackSectionId, SectionReviewStatus>>;

  return {
    conceptId,
    campaignId,
    sectionStatuses,
    stickyNotes: [],
    voiceNotes: [],
    drawSections: [],
    submittedAt: null,
  };
}

export function resolveFeedbackSectionLabel(
  sectionId: FeedbackSectionId,
  labels?: Record<string, string>,
): string {
  if (labels?.[sectionId]) return labels[sectionId];
  const known = feedbackStudio.previewSections[sectionId as keyof typeof feedbackStudio.previewSections];
  if (known) return known;
  if (sectionId.startsWith("fallback:")) {
    return sectionId.slice("fallback:".length);
  }
  return sectionId;
}
