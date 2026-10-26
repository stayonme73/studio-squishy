/** Feedback Studio — section ids, session types, copy. */

import type { ReviewRoomOptionId } from "@/config/review-room";
import type { NoActiveProjectCopy } from "@/config/access-control";
import type { DeliverableSectionId } from "@/lib/deliverable-scope";

export type FeedbackConceptId = ReviewRoomOptionId;

export type FeedbackSectionId =
  | DeliverableSectionId
  | "hero"
  | "rationale"
  | `fallback:${string}`;

export type StickyNoteColorId = "yellow" | "blue" | "coral";

export type SectionReviewStatus = "neutral" | "approved" | "revision" | "skip";

export type FeedbackTool =
  | "none"
  | "sticky"
  | "draw"
  | "voice"
  | "compare"
  | "highlight"
  | "textComment";

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
  /** Optional 0–1 proof placement. Omitted notes keep the legacy corner pin. */
  anchorX?: number;
  anchorY?: number;
};

export type FeedbackVoiceNote = {
  id: string;
  sectionId: FeedbackSectionId;
  durationSec: number;
  createdAt: string;
};

/** HIGHLIGHTER-1 session mirror of JobReviewHighlight (job Review only). */
export type FeedbackHighlight = {
  id: string;
  jobId: string;
  deliverableKey: string;
  proofFileId: string;
  versionLabel: string;
  surface: "proof_markup_board_v1";
  rects: readonly { x: number; y: number; w: number; h: number }[];
  createdAt: string;
  updatedAt: string;
};

/** TEXT-COMMENT-1 session mirror of JobReviewTextComment (job Review only). */
export type FeedbackTextComment = {
  id: string;
  jobId: string;
  deliverableKey: string;
  proofFileId: string;
  versionLabel: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type FeedbackSession = {
  conceptId: FeedbackConceptId;
  campaignId: string;
  sectionStatuses: Partial<Record<FeedbackSectionId, SectionReviewStatus>>;
  stickyNotes: FeedbackStickyNote[];
  voiceNotes: FeedbackVoiceNote[];
  drawSections: FeedbackSectionId[];
  /** HIGHLIGHTER-1 — empty for concept Review. */
  highlights?: FeedbackHighlight[];
  /** TEXT-COMMENT-1 — empty for concept Review. */
  textComments?: FeedbackTextComment[];
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
  pageSubtitle: "Review your work",
  eyebrow: "REVIEW ROOM",
  backLabel: "Back to Studio Board",
  pickerTitle: "Choose a direction",
  pickerLead:
    "Your Studio team prepared three distinct directions. Open each concept, review the full preview, and leave feedback before you choose.",
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

  /** C8c — finite revision-round accounting (ledger-derived). Internal field names stay. */
  correctionAccounting: {
    label: "Revision rounds",
    included: "Included",
    used: "Used",
    remaining: "Remaining",
    extraRemaining: "Additional rounds remaining",
    includedUse: "Included revision round",
    ownerExtraUse: "Additional authorized round",
    versionFallback: "Version label not provided",
    historyItem: (ordinal: number, included: number) =>
      `Revision ${ordinal} of ${Math.max(included, ordinal)}`,
    legacyNotice:
      "Prior usage was recorded before package history was available. Remaining rounds are limited by that provisional count.",
  },

  /** C8a — presentation handoff status (mapped from 7A; not a second stage system). */
  handoffStatus: {
    label: "Submission status",
  },

  /** UPDATE-HISTORY-1 — customer-visible Update History (projection over job activity). */
  updateHistory: {
    label: "Update history",
    empty:
      "Updates appear here after The Studio records activity for this project.",
    unavailable:
      "Update history is not available for this project yet.",
    actionRequiredLabel: "Action needed",
    versionLabel: "Version",
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
    /** C8a — locked panel label (words first; icons support only). */
    title: "REVIEW TOOLS",
    hint: "Select a section in the preview, then leave feedback using the tools below.",
    toolGroups: {
      annotate: "Annotate",
      decide: "Section decision",
      log: "Your feedback",
    },
    addStickyNote: "Add Sticky Note",
    recordVoice: "Record Voice Feedback",
    drawAnnotation: "Draw Annotation",
    versionCompare: "Version Compare",
    highlighter: "Highlighter",
    textComment: "Text Comment",
    laptopWorkDesk: {
      marker: "Marker",
      highlighter: "Highlighter",
      voice: "Voice",
      message: "Message",
      messagePlaceholder: "Type a message about this work.",
      saveMessage: "Save message",
      workArea: "Work area",
      submit: "Submit",
    },
    approveSection: "Mark section as approved",
    requestRevision: "Mark section for changes",
    skipSection: "Skip Section",
    submitFeedback: "Submit Feedback",
    requestRevisionJob: "Request a revision",
    approveForDelivery: "Approve this version",
    revisionLimitNotice:
      "All included revision rounds have been used. You can still message the Studio about a problem or question. New creative changes may require additional scope.",
    revisionLimitShort: "All included revision rounds have been used.",
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
    /**
     * Phone job Review only. Desktop copy above stays locked for Room 2.
     * Opening these controls does not consume a revision round.
     */
    phoneCustomerRevision: {
      title: "Your review",
      hint: "Look at your work, then approve it, request a change, or ask The Studio.",
      looksGood: "Looks good",
      approve: "Approve",
      requestChange: "Request a Change",
      skipForNow: "Skip for now",
      askStudio: "Ask The Studio",
      changeLabel: "Tell us what you'd like changed.",
      changeHint: "Sending this uses one revision round.",
      changePlaceholder: "Type the change you want.",
      changeOpened: "Type the change you want. You can also mark the proof or leave voice feedback.",
      sendRevision: "Send Revision Request",
      sendNeedsChange: "Type a change, draw on the proof, or leave voice feedback before sending.",
      revisionRequested: "Revision requested",
      revisionWorking: "The Studio is working on your changes.",
      stickyTool: "Sticky Note",
      voiceTool: "Voice feedback",
      highlightTool: "Highlight",
      drawTool: "Draw on proof",
      optionalToolsLabel: "Optional",
      optionalToolsHint: "You can also mark the proof or leave voice feedback.",
      stickyTapHint: "Tap the proof where you want the note, then type the change.",
      voiceHint: "Record what you want changed.",
      highlightHint: "Highlight the area, then add the instruction.",
      drawHint: "Circle or underline on the proof.",
      erase: "Erase",
      addDetail: "Add detail",
      addDetailSticky: "Sticky Note",
      addDetailDraw: "Draw",
      addDetailHighlight: "Highlight",
      addDetailVoice: "Voice Feedback",
      moreTools: "More feedback tools",
      moreToolsHint: "These do not send a revision by themselves.",
      closeComposer: "Cancel",
      projectDetails: "Project details",
      projectHistory: "Project history",
      revisionGlance: (included: number, remaining: number) =>
        `${included} revision${included === 1 ? "" : "s"} included • ${remaining} remaining`,
      compareVersions: "Compare versions",
      confirmTitle: "Confirm revision request",
      confirmLead: (versionLabel: string) =>
        `You're requesting a revision of ${versionLabel}. This uses one included revision round.`,
      confirmRequestLabel: "Your request",
      confirmDrawingAttachment: "Drawing on the proof",
      confirmVoiceAttachment: "Voice feedback",
      confirmCancel: "Keep Reviewing",
      confirmSend: "Send Revision Request",
    },
  },

  stickyNoteColors: {
    yellow: { id: "yellow" as const, label: "Question", hint: "Ask the Studio team" },
    blue: { id: "blue" as const, label: "Idea", hint: "Share a new thought" },
    coral: { id: "coral" as const, label: "Revision Request", hint: "Ask for a change" },
  },

  notReady: {
    title: "Not ready for review yet",
    body: "Your work will appear here when the Studio finishes preparing it for review.",
  },

  jobReview: {
    pickerTitle: "Review your deliverables",
    pickerLead:
      "Look at the current version. You can ask a question, request a revision, or approve this version.",
    openReviewCta: "Open review",
    serviceLabel: "Service",
    deliverableReady: "Ready for review",
    submittedRevision: "Revision requested — returning to production.",
    submittedApproval:
      "Approved. The Studio is preparing your final files from the exact version you approved.",
  },

  /** VERSION-COMPARE-1 — truthful presentation over recorded proofs only. */
  versionCompare: {
    title: "Version Compare",
    lead: "Select two recorded proof versions for this deliverable. Labels and dates come from Studio records.",
    phoneLead:
      "Optional. See two saved versions side by side. This does not send a revision.",
    currentLabel: "Current version",
    priorLabel: "Prior version",
    selectCurrent: "Choose current proof version",
    selectPrior: "Choose prior proof version",
    recordedLabel: "Recorded",
    unavailable:
      "Version comparison is not available for this deliverable yet. At least two recorded proof versions are required.",
    noDiffNote: "This view shows the recorded versions side by side. It does not detect or highlight changes automatically.",
    activeHint: "Comparing recorded proof versions for the focused deliverable.",
    closeCompare: "Close version compare",
  },

  /** HIGHLIGHTER-1 — geometry on proof markup board, not Pencil and not auto-diff. */
  highlighter: {
    title: "Highlighter",
    lead:
      "Select a recorded proof version, then drag on the markup board to place transparent highlights. Highlights are saved for that deliverable and proof version only.",
    boardNote:
      "This markup board is bound to the selected proof version. It is not a pixel overlay on the file itself.",
    selectProof: "Choose proof version to mark",
    unavailable:
      "Highlighter is not available for this deliverable yet. At least one recorded proof version is required.",
    activeHint: "Highlighter is active for the focused deliverable and selected proof version.",
    close: "Close highlighter",
    clearBoard: "Clear highlights on this proof",
  },

  /** TEXT-COMMENT-1 — written comments bound to proof version; not Sticky; no geometry. */
  textComment: {
    title: "Text Comment",
    lead:
      "Select a recorded proof version, then write a comment for that deliverable and version. Comments are not sticky notes and are not anchored to pages or pixels.",
    selectProof: "Choose proof version for this comment",
    unavailable:
      "Text Comment is not available for this deliverable yet. At least one recorded proof version is required.",
    activeHint: "Text Comment is active for the focused deliverable and selected proof version.",
    close: "Close text comment",
    placeholder: "Write your comment for this proof version…",
    save: "Save comment",
    update: "Update comment",
    remove: "Remove",
    emptyList: "No comments on this proof version yet.",
    boundNote: "Bound to the selected proof version only — not a page or pixel location.",
  },

  noCampaign: {
    title: "No project yet",
    body: "Start a project in the Conversation Room to review work here.",
    cta: "Go to Studio Board",
  },

  clientAccess: {
    noActiveProject: {
      eyebrow: "Review Room",
      title: "No Active Project",
      message: "There isn't an active project ready for review.",
      messageSecondary:
        "Start a new project in the Conversation Room, or return when your project reaches the Review stage.",
      footnote: "Approved concepts will appear here when your project reaches the Review stage.",
      primaryCta: "GO TO CONVERSATION ROOM",
      secondaryCta: "Help Center",
      primaryHref: "/studio-conversation-room",
      secondaryHref: "/help-center",
    } satisfies NoActiveProjectCopy,
    notReady: {
      eyebrow: "Review Room",
      title: "Not Ready for Review Yet",
      message: "Your concepts aren't ready for review yet.",
      messageSecondary:
        "The Studio is still preparing your project. Check your Studio Board for status — Review Room opens when work is ready.",
      footnote: "Approved concepts will appear here when your project reaches the Review stage.",
      primaryCta: "GO TO STUDIO BOARD",
      secondaryCta: "Help Center",
      primaryHref: "/studio-board",
      secondaryHref: "/help-center",
    } satisfies NoActiveProjectCopy,
  },
} as const;

export function isJobReviewClosedSpine(spineStatus: string): boolean {
  return (
    spineStatus === "approved" ||
    spineStatus === "ready_for_delivery" ||
    spineStatus === "delivered"
  );
}

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
    highlights: [],
    textComments: [],
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
