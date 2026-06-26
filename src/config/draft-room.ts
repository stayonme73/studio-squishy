/** Draft Room — intake copy and routes (LOCKED V1). */

import { customerJourneyStepName } from "@/config/customer-journey-v1";
import type { StudioGuidePackageId } from "@/config/studio-guide";

export const draftRoom = {
  eyebrow: "Draft Room",
  title: "What's the idea?",
  headerLine: "Share your spark — we'll shape it into something real.",

  /** Dedicated intake space after the table invite — clipboard wizard only */
  intakeRoom: {
    eyebrow: "Figure It Out",
    title: "Let's bring your idea to life",
    headerLine: "Answer a few questions on the board — we'll shape the rest together.",
  },

  assets: {
    /** Chat plate — intro copy + Continue baked in (1024×621) */
    intakePlate: "/draft-room/draft-room-intake-plate.png?v=6",
    /** @deprecated blank room — use intakePlate for public intro */
    officeBg: "/draft-room/draft-room-office-bg.png?v=20",
    intakeOpen: "/draft-room/draft-room-intake-plate.png?v=6",
    /** @deprecated — do not use vertical intake scene */
    intakeScene: "/draft-room/draft-room-intake-scene.png",
    /** @deprecated — floating clipboard PNG removed from intake flow */
    draftBoardPaper: "/draft-room/draft-board-paper.png",
    /** Blank grid canvas — questions overlay the cream paper (1024×682) */
    intakePaper: "/draft-room/draft-room-intake-paper.png?v=3",
    /** Closed sticky note invite is baked into officeBg — use tableBeginHotspot to tap */
    coverBakedPhotoUi: true,
  },

  /** Questions on blank paper baked into the room plate — no brown overlay PNG */
  tableIntegratedBoard: true,

  /**
   * Photo-mode framing — JS sets --scene-scale-closed to cover-fill viewport.
   * Wizard multipliers are relative zoom from closed cover baseline.
   */
  sceneCrop: {
    /** Full-scene anchor — centers the plate in viewport */
    closedAnchor: { x: 512, y: 296 },
    origin: { x: 440, y: 260 },
    mobileOrigin: { x: 440, y: 260 },
    /** Closed cover multiplier — 1 = edge-to-edge (cover scale applied in JS) */
    scaleClosed: 1,
    /** Gentle zoom toward clipboard when wizard opens */
    scaleWizard: 1.1,
    scaleMobilePortrait: 1,
    scaleMobilePortraitWizard: 1.08,
  },

  /** Scene layout — normalized rects (0–1) and native pixel rects on scene plates */
  layout: {
    /** Chat intake plate (1024×623) */
    intakePlateNativeSize: { width: 1024, height: 623 },
    /** Cream paper on clipboard — native px on intake plate (portrait-tall, not wide) */
    intakeClipboardPaperRect: { x: 251, y: 148, width: 529, height: 455 },
    /** Writable copy block above baked Continue art */
    intakeClipboardContentRect: { x: 287, y: 217, width: 457, height: 240 },
    /** Baked Continue button — transparent link target only */
    intakeContinueHotspot: { x: 312, y: 468, width: 400, height: 48 },
    /** Cream clipboard room plate (1024×592) */
    closedSceneNativeSize: { width: 1024, height: 592 },
    stickyNoteHotspot: { x: 601, y: 430, width: 150, height: 69 },
    tableBeginHotspot: { x: 280, y: 40, width: 320, height: 460 },
    openSceneNativeSize: { width: 1024, height: 592 },
    openTableClipboardPaperRect: { x: 241, y: 63, width: 416, height: 419 },
    openTableClipboardContentInset: { top: 68, right: 28, bottom: 20, left: 32 },
    openTableClipboardIntroInset: { top: 0, right: 0, bottom: 0, left: 0 },
    /** Full drafting table surface — CSS fallback scene (normalized 0–1) */
    draftingTablePrompt: { x: 0.30, y: 0.48, width: 0.40, height: 0.30 },
    /** @deprecated — use closed/open scene sizes */
    draftingTableCanvas: {
      rect: { x: 128, y: 272, width: 396, height: 218 },
      contentInset: { top: 28, right: 36, bottom: 24, left: 32 },
    },
    /** @deprecated — use stickyNoteHotspot */
    draftingTableHotspot: { x: 128, y: 272, width: 396, height: 218 },
    /** @deprecated — use closedSceneNativeSize / openSceneNativeSize */
    sceneNativeSize: { width: 1024, height: 570 },
    /** @deprecated — use openTableClipboardPaperRect */
    tableClipboardPaperRect: { x: 176, y: 232, width: 228, height: 216 },
    /** tableClipboardPaperRect as % of draftingTableCanvas.rect — cream wash alignment */
    clipboardPaperInTable: {
      left: ((220 - 128) / 396) * 100,
      top: ((318 - 272) / 218) * 100,
      width: (192 / 396) * 100,
      height: (132 / 218) * 100,
    },
    /** Photo-mode closed CTA — hand-lettered "LET'S FIGURE IT OUT" on back-wall mural */
    muralHeadlineHotspot: {
      x: 495,
      y: 100,
      width: 275,
      height: 115,
    },
    muralHeadlineHotspotNorm: {
      x: 495 / 1024,
      y: 100 / 593,
      width: 275 / 1024,
      height: 115 / 593,
    },
    /** @deprecated — closed-state CTA moved to mural headline hotspot */
    tableClipboardHotspot: {
      x: 213 / 1024,
      y: 402 / 593,
      width: 192 / 1024,
      height: 36 / 593,
    },
    /** @deprecated alias */
    draftingTablePromptPhoto: {
      x: 213 / 1024,
      y: 402 / 593,
      width: 192 / 1024,
      height: 36 / 593,
    },
    /** Legacy floating board — fallback CSS scene only */
    draftBoardNativeSize: { width: 477, height: 974 },
    draftBoardPaperRect: { x: 76, y: 146, width: 325, height: 604 },
    /** Illustrated intake scene — native px on draft-room-intake-scene.png */
    intakeSceneNativeSize: { width: 720, height: 1024 },
    /** Writable cream paper on clipboard — HTML wizard overlay */
    intakePaperRect: { x: 135, y: 173, width: 395, height: 486 },
  },

  /** Intake scene framing — cover-fill viewport on /draft-room/begin */
  intakeSceneCrop: {
    anchor: { x: 388, y: 228 },
    scale: 1,
  },

  closedBoard: {
    /** @deprecated — closed state uses tableInvite only */
    title: "Ready to Start Drafting?",
    /** @deprecated — no wall of text on closed table; intro is step 0 after tap */
    body: "We'll guide you through a few questions to help us understand your vision.",
    cta: "Begin Drafting",
    /** Handwritten invite on the table — curiosity first, explanation after tap */
    tableInvite: {
      line1: "Ready to begin?",
      line2: "Let's figure it out. ↗",
    },
    /** @deprecated — mural tap optional; primary CTA is drafting table */
    muralCtaAriaLabel: "Let's figure it out — begin drafting",
    draftingTableAriaLabel: "Begin drafting on the table",
  },

  intakeForm: {
    /** Intro + 8 question sections; confirmation after submit */
    totalSteps: 8,
    submitLabel: "Submit your direction",

    introduction: {
      eyebrow: "THE STUDIO",
      title: "Tell us what's on your mind.",
      leads: [
        "Big idea.",
        "Small idea.",
        "Half-finished idea.",
        "It all works.",
      ] as const,
      paragraphs: [
        "Share what you're building and we'll help shape the direction.",
        "No marketing experience required. No perfect answers expected.",
        "Just tell us what you're trying to create.",
      ] as const,
      ideaStartersLabel: "For example…",
      ideaStarters: [
        "Launching a summer sale",
        "Opening a new location",
        "Promoting my services",
        "Growing my audience",
      ] as const,
      closingNote: "Start where you are. We'll figure out the rest together.",
      progressLabel: "Getting started",
      continueLabel: "Continue",
    },

    sections: {
      project: {
        number: 1,
        eyebrow: "YOUR PROJECT",
        prompt: "What are we helping you create?",
        support: "Pick the closest match — add a quick detail if you like.",
        chipHint: "Choose one:",
        detailPlaceholder: "Summer Sale, Grand Opening, etc.",
        otherPlaceholder: "Describe your project in plain language…",
        starterChips: [
          { id: "promotion", label: "Promotion" },
          { id: "event", label: "Event" },
          { id: "product-launch", label: "Product Launch" },
          { id: "service", label: "Service" },
          { id: "brand-awareness", label: "Brand Awareness" },
          { id: "social-media-campaign", label: "Social Media Campaign" },
          { id: "seasonal-offer", label: "Seasonal Offer" },
          { id: "other", label: "Other" },
        ] as const,
      },

      business: {
        number: 2,
        eyebrow: "YOUR BUSINESS",
        prompt: "Tell us about your business.",
        support:
          "What you do, where you operate, and what makes you distinctive. Plain language is perfect.",
        placeholder: "Your business in your own words…",
      },

      audience: {
        number: 3,
        eyebrow: "YOUR AUDIENCE",
        prompt: "Who are you trying to reach?",
        support: "Choose the audience that best matches your customers. Add additional details if needed.",
        chipHint: "Choose the closest fit:",
        followUp: "Anything else we should know about your audience?",
        placeholder: "Extra context about who you want to reach…",
        options: [
          { id: "local-community", label: "Local Community" },
          { id: "young-professionals", label: "Young Professionals" },
          { id: "families", label: "Families" },
          { id: "small-business", label: "Small Business Owners" },
          { id: "luxury-clients", label: "Luxury Clients" },
          { id: "event-attendees", label: "Event Attendees" },
          { id: "social-followers", label: "Social Media Followers" },
          { id: "other", label: "Other" },
        ] as const,
      },

      goal: {
        number: 4,
        eyebrow: "YOUR GOAL",
        prompt: "What are you hoping to achieve?",
        support: "Choose all that apply — we'll shape the campaign around your direction.",
        chipHint: "Choose all that apply:",
        otherFollowUp: "Tell us more about your goal",
        otherPlaceholder: "Brief detail about what you're aiming for…",
        options: [
          { id: "more-customers", label: "More Customers" },
          { id: "more-sales", label: "More Sales" },
          { id: "promote-event", label: "Promote an Event" },
          { id: "launch-new", label: "Launch Something New" },
          { id: "build-awareness", label: "Build Awareness" },
          { id: "grow-social", label: "Grow Social Media" },
          { id: "other", label: "Other" },
        ] as const,
      },

      brandPersonality: {
        number: 5,
        eyebrow: "BRAND PERSONALITY",
        prompt: "How should your brand feel?",
        support: "Choose words that fit — add a note if helpful.",
        chipHint: "Choose words that fit your brand:",
        followUp: "Anything else we should know about your brand personality?",
        placeholder: "Tone, personality, and how you want people to describe you…",
        options: [
          { id: "professional", label: "Professional" },
          { id: "friendly", label: "Friendly" },
          { id: "luxury", label: "Luxury" },
          { id: "modern", label: "Modern" },
          { id: "creative", label: "Creative" },
          { id: "bold", label: "Bold" },
          { id: "playful", label: "Playful" },
          { id: "trustworthy", label: "Trustworthy" },
          { id: "elegant", label: "Elegant" },
          { id: "minimalist", label: "Minimalist" },
          { id: "energetic", label: "Energetic" },
          { id: "community-focused", label: "Community Focused" },
        ] as const,
      },

      brandColors: {
        number: 6,
        eyebrow: "BRAND COLORS",
        prompt: "What colors represent your brand?",
        support: "Tell us if you already have brand colors, or pick a direction we can explore.",
        hasColorsPrompt: "Do you already have brand colors?",
        hasColorsOptions: [
          { id: "yes", label: "Yes" },
          { id: "no", label: "No" },
        ] as const,
        colorListLabel: "List your colors, color names, or hex codes.",
        colorListPlaceholder: "Navy Blue, #1A365D, Gold, Black and White…",
        colorListExamples: "Examples:\nNavy Blue\nGold\n#1A365D",
        directionChipHint: "Pick a color direction:",
        directionOptions: [
          { id: "warm-earth", label: "Warm Earth Tones" },
          { id: "bold-bright", label: "Bold & Bright" },
          { id: "black-white", label: "Black & White" },
          { id: "pastels", label: "Pastels" },
          { id: "deep-rich", label: "Deep & Rich" },
          { id: "natural-greens", label: "Natural Greens" },
          { id: "cool-blues", label: "Blues & Cool Tones" },
          { id: "other", label: "Other" },
        ] as const,
      },

      vision: {
        number: 7,
        eyebrow: "FINAL NOTES",
        prompt: "Any final notes before we begin?",
        optional: true,
        support: "Share anything that helps us get started on the right foot.",
        placeholder:
          "Preferences, things to avoid, special requests, timing considerations, must-haves, or anything else you'd like us to know.",
      },

      inspiration: {
        number: 8,
        eyebrow: "INSPIRATION",
        eyebrowOptional: true,
        prompt: "Any references we should see?",
        support: "Links, brands, campaigns, or styles — including anything you'd like us to avoid.",
        placeholder:
          "Share links, brands, campaigns, websites, social media accounts, inspiration, or anything you'd like us to reference. You can also tell us what styles to avoid.",
      },
    },

    review: {
      eyebrow: "REVIEW",
      prompt: "Here's what you shared.",
      support: "Read through your answers below. Tap Edit on any section to change it.",
      emptyAnswer: "Not answered",
      editLabel: "Edit",
      backToReviewLabel: "Back to review",
      editingBanner: "Editing one section — use Back to review when you're done.",
    },
  },

  cta: "Explore Studio Experiences →",
  backLabel: `Back to ${customerJourneyStepName("studio-lobby")}`,
    submitHint: "When you're ready, submit from the review screen.",

  confirmation: {
    eyebrow: "VISION INTAKE RECEIVED",
    titleThanks: "Thanks — we've got your direction.",
    titleLine: "Your Vision Intake is complete.",
    body: "What you shared helps us understand your goals, brand, and vision — so we can recommend the right package and shape accurate campaign concepts when you're ready.",
    policyLine:
      "The Studio does not begin creative production until your package is selected and payment is received. No concepts, deliverables, revisions, or production work starts before then.",
    packagePrompt: "Next step:\nchoose the package that best fits your project.",
    welcomeHall: `Return to ${customerJourneyStepName("studio-lobby")}`,
    studioGuide: `Continue to ${customerJourneyStepName("studio-guide")}`,
    studioBoard: "Continue to Studio Board",
    reviewAnswers: "Review your answers",
    viewCampaignBrief: "View Campaign Brief",
    editCampaignBrief: "Edit Campaign Brief",
    acknowledgment:
      "I have reviewed my responses and understand campaign concepts will be based on the information I provided.",
    resubmitLabel: "Update & continue",
    reviewBanner: "Reviewing your answers — read everything below, edit anything, then update when ready.",
    studioGuideHint: "Spark, Momentum, or Growth — select your package to continue.",
    studioBoardHint: "Track your campaign progress from your Studio Board.",
  },

  routes: {
    welcomeHall: "/studio-lobby",
    draftRoom: "/draft-room",
    begin: "/draft-room/begin",
    studioGuide: "/studio-guide-prototype",
    studioBoard: "/studio-board",
  },
} as const;

/** Wizard step index — full answer summary before submit. */
export const DRAFT_INTAKE_REVIEW_STEP = 9;

export function draftRoomIntakeReviewSteps() {
  const { sections } = draftRoom.intakeForm;
  return [
    { step: 1, label: sections.project.eyebrow },
    { step: 2, label: sections.business.eyebrow },
    { step: 3, label: sections.audience.eyebrow },
    { step: 4, label: sections.goal.eyebrow },
    { step: 5, label: sections.brandPersonality.eyebrow },
    { step: 6, label: sections.brandColors.eyebrow },
    { step: 7, label: sections.vision.eyebrow },
    { step: 8, label: sections.inspiration.eyebrow },
  ] as const;
}

export function draftRoomBeginHref(packageId?: StudioGuidePackageId): string {
  if (!packageId) return `${draftRoom.routes.draftRoom}?begin=1`;
  return `${draftRoom.routes.draftRoom}?begin=1&package=${packageId}`;
}

export type DraftRoomSceneRect = { x: number; y: number; width: number; height: number };

/** Cover-fill framing — same approach as Welcome Hall plate art. */
export const draftRoomPlateFraming = {
  x: 0.5,
  y: 0.5,
  fit: "cover" as const,
};

export function draftRoomRectToPercent(
  rect: DraftRoomSceneRect,
  native: { width: number; height: number },
) {
  return {
    left: `${(rect.x / native.width) * 100}%`,
    top: `${(rect.y / native.height) * 100}%`,
    width: `${(rect.width / native.width) * 100}%`,
    height: `${(rect.height / native.height) * 100}%`,
  };
}

export function draftRoomRectToParentPercent(
  rect: DraftRoomSceneRect,
  parent: { width: number; height: number },
) {
  return {
    left: `${(rect.x / parent.width) * 100}%`,
    top: `${(rect.y / parent.height) * 100}%`,
    width: `${(rect.width / parent.width) * 100}%`,
    height: `${(rect.height / parent.height) * 100}%`,
  };
}

/** Map native-scene rect to overlay % for object-fit cover (Welcome Hall pattern). */
export function draftRoomRectToCoverPercent(
  rect: DraftRoomSceneRect,
  viewport: { width: number; height: number },
  native: { width: number; height: number },
  framing = draftRoomPlateFraming,
) {
  const { width: iw, height: ih } = native;
  const { width: vw, height: vh } = viewport;
  if (vw <= 0 || vh <= 0) {
    return draftRoomRectToPercent(rect, native);
  }

  const scale = Math.max(vw / iw, vh / ih);
  const renderedW = iw * scale;
  const renderedH = ih * scale;
  const marginX = (vw - renderedW) * framing.x;
  const marginY = (vh - renderedH) * framing.y;
  const topLeft = {
    x: rect.x * scale + marginX,
    y: rect.y * scale + marginY,
  };

  return {
    left: `${(topLeft.x / vw) * 100}%`,
    top: `${(topLeft.y / vh) * 100}%`,
    width: `${((rect.width * scale) / vw) * 100}%`,
    height: `${((rect.height * scale) / vh) * 100}%`,
  };
}

export type DraftRoomPanelStyle = {
  left: string;
  top: string;
  width: string;
  height: string;
};

/** Keep wizard panel on-screen so Back / Continue are never clipped by the viewport. */
export function draftRoomClampPanelToViewport(
  style: DraftRoomPanelStyle,
  viewport: { width: number; height: number },
  inset = { top: 10, bottom: 24 },
): DraftRoomPanelStyle {
  if (viewport.width <= 0 || viewport.height <= 0) return style;

  const top = (parseFloat(style.top) / 100) * viewport.height;
  let height = (parseFloat(style.height) / 100) * viewport.height;

  const maxTop = inset.top;
  const maxBottom = viewport.height - inset.bottom;
  const maxHeight = maxBottom - maxTop;

  if (height > maxHeight) {
    height = maxHeight;
  }

  let newTop = top;
  if (newTop + height > maxBottom) {
    newTop = maxBottom - height;
  }
  if (newTop < maxTop) {
    newTop = maxTop;
    height = Math.min(height, maxBottom - newTop);
  }

  return {
    left: style.left,
    width: style.width,
    top: `${(newTop / viewport.height) * 100}%`,
    height: `${(height / viewport.height) * 100}%`,
  };
}

export type DraftIntakeAudienceId =
  (typeof draftRoom.intakeForm.sections.audience.options)[number]["id"];

export type DraftIntakeGoalId =
  (typeof draftRoom.intakeForm.sections.goal.options)[number]["id"];

export type DraftIntakeBrandPersonalityId =
  (typeof draftRoom.intakeForm.sections.brandPersonality.options)[number]["id"];

export type DraftIntakeBrandColorId =
  (typeof draftRoom.intakeForm.sections.brandColors.directionOptions)[number]["id"];

export type DraftIntakeBrandHasColors =
  (typeof draftRoom.intakeForm.sections.brandColors.hasColorsOptions)[number]["id"];

export type DraftIntakeProjectStarterId =
  (typeof draftRoom.intakeForm.sections.project.starterChips)[number]["id"];

export type DraftIntakeFormValues = {
  project: string;
  projectStarter: DraftIntakeProjectStarterId | "";
  projectDetail: string;
  business: string;
  audienceFit: DraftIntakeAudienceId | "";
  audienceNotes: string;
  message: string;
  goalSelections: DraftIntakeGoalId[];
  goalNotes: string;
  brandPersonalitySelections: DraftIntakeBrandPersonalityId[];
  brandPersonalityNotes: string;
  brandHasColors: DraftIntakeBrandHasColors | "";
  brandColorList: string;
  brandColorSelections: DraftIntakeBrandColorId[];
  brandColorNotes: string;
  visionFeel: string;
  visionRemember: string;
  visionDesired: string;
  visionSuccess: string;
  visionAvoid: string;
  inspirationLike: string;
  inspirationDislike: string;
  anythingElse: string;
};

export const EMPTY_DRAFT_INTAKE_FORM: DraftIntakeFormValues = {
  project: "",
  projectStarter: "",
  projectDetail: "",
  business: "",
  audienceFit: "",
  audienceNotes: "",
  message: "",
  goalSelections: [],
  goalNotes: "",
  brandPersonalitySelections: [],
  brandPersonalityNotes: "",
  brandHasColors: "",
  brandColorList: "",
  brandColorSelections: [],
  brandColorNotes: "",
  visionFeel: "",
  visionRemember: "",
  visionDesired: "",
  visionSuccess: "",
  visionAvoid: "",
  inspirationLike: "",
  inspirationDislike: "",
  anythingElse: "",
};

export type DraftIntakePayload = DraftIntakeFormValues & {
  /** Legacy snapshot fields — derived on submit for Studio Board compatibility */
  idea: string;
  audience: string;
  action: string;
  deadline: string;
  packageId: StudioGuidePackageId;
  packageLabel: string;
  submittedAt: string;
};

function joinParts(parts: readonly string[]) {
  return parts.map((part) => part.trim()).filter(Boolean).join(" · ");
}

function labelFor<T extends { id: string; label: string }>(options: readonly T[], id: string) {
  return options.find((option) => option.id === id)?.label ?? id;
}

function joinLabels<T extends { id: string; label: string }>(
  options: readonly T[],
  ids: readonly string[],
) {
  return ids.map((id) => labelFor(options, id)).join(", ");
}

/** Compose stored project label from starter chip + optional detail. */
export function formatProjectValue(
  starterId: DraftIntakeProjectStarterId,
  detail: string,
): string {
  const { starterChips } = draftRoom.intakeForm.sections.project;
  const label = labelFor(starterChips, starterId);
  const trimmed = detail.trim();
  if (starterId === "other") return trimmed;
  if (!trimmed) return label;
  return `${label}: ${trimmed}`;
}

/** Derive legacy intake snapshot fields from Draft Room form. */
export function deriveDraftIntakeLegacyFields(values: DraftIntakeFormValues) {
  const { sections } = draftRoom.intakeForm;

  const audience = joinParts([
    values.audienceFit ? labelFor(sections.audience.options, values.audienceFit) : "",
    values.audienceNotes.trim(),
    values.business.trim(),
  ]);

  const action = joinParts([
    joinLabels(sections.goal.options, values.goalSelections)
      ? `Goals: ${joinLabels(sections.goal.options, values.goalSelections)}`
      : "",
    values.goalNotes.trim(),
  ]);

  const deadline =
    joinParts([values.anythingElse.trim(), values.visionAvoid.trim()]) || "Flexible";

  return {
    idea:
      (values.projectStarter
        ? formatProjectValue(values.projectStarter, values.projectDetail)
        : values.project
      ).trim() || "Draft Room intake",
    audience: audience || "Not specified",
    action: action || "Not specified",
    deadline,
  };
}

export function isDraftIntakeStepValid(step: number, values: DraftIntakeFormValues) {
  if (step === 0) return true;
  if (step === 1) {
    if (values.projectStarter) {
      if (values.projectStarter === "other") return values.projectDetail.trim().length > 0;
      return true;
    }
    return values.project.trim().length > 0;
  }
  return true;
}

export function isDraftIntakeFormValid(values: DraftIntakeFormValues) {
  return isDraftIntakeStepValid(1, values);
}

export type DraftIntakeSummaryEntry = {
  label?: string;
  value: string;
};

export type DraftIntakeSummarySection = {
  step: number;
  eyebrow: string;
  entries: DraftIntakeSummaryEntry[];
};

function summaryText(value: string, emptyLabel: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : emptyLabel;
}

/** Readable answer summary for the review step — shows what the client actually entered. */
export function draftRoomIntakeAnswerSummary(values: DraftIntakeFormValues): DraftIntakeSummarySection[] {
  const { sections, review } = draftRoom.intakeForm;
  const empty = review.emptyAnswer;

  const audienceEntries: DraftIntakeSummaryEntry[] = [];
  if (values.audienceFit) {
    audienceEntries.push({
      label: sections.audience.chipHint.replace(/:$/, ""),
      value: labelFor(sections.audience.options, values.audienceFit),
    });
  }
  if (values.audienceNotes.trim()) {
    audienceEntries.push({
      label: sections.audience.followUp.replace(/\.$/, ""),
      value: values.audienceNotes.trim(),
    });
  }
  if (audienceEntries.length === 0) {
    audienceEntries.push({ value: empty });
  }

  const goalEntries: DraftIntakeSummaryEntry[] = [];
  if (values.goalSelections.length > 0) {
    goalEntries.push({
      label: sections.goal.chipHint.replace(/:$/, ""),
      value: joinLabels(sections.goal.options, values.goalSelections),
    });
  }
  if (values.goalNotes.trim()) {
    goalEntries.push({
      label: sections.goal.otherFollowUp,
      value: values.goalNotes.trim(),
    });
  }
  if (goalEntries.length === 0) {
    goalEntries.push({ value: empty });
  }

  const personalityEntries: DraftIntakeSummaryEntry[] = [];
  if (values.brandPersonalitySelections.length > 0) {
    personalityEntries.push({
      label: sections.brandPersonality.chipHint.replace(/:$/, ""),
      value: joinLabels(sections.brandPersonality.options, values.brandPersonalitySelections),
    });
  }
  if (values.brandPersonalityNotes.trim()) {
    personalityEntries.push({
      label: sections.brandPersonality.followUp.replace(/\.$/, ""),
      value: values.brandPersonalityNotes.trim(),
    });
  }
  if (personalityEntries.length === 0) {
    personalityEntries.push({ value: empty });
  }

  const colorEntries: DraftIntakeSummaryEntry[] = [];
  if (values.brandHasColors) {
    colorEntries.push({
      label: sections.brandColors.hasColorsPrompt.replace(/\?$/, ""),
      value: values.brandHasColors === "yes" ? "Yes" : "No",
    });
  }
  if (values.brandHasColors === "yes" && values.brandColorList.trim()) {
    colorEntries.push({
      label: sections.brandColors.colorListLabel.replace(/\.$/, ""),
      value: values.brandColorList.trim(),
    });
  }
  if (values.brandHasColors === "no" && values.brandColorSelections.length > 0) {
    colorEntries.push({
      label: sections.brandColors.directionChipHint.replace(/:$/, ""),
      value: joinLabels(sections.brandColors.directionOptions, values.brandColorSelections),
    });
  }
  if (colorEntries.length === 0) {
    colorEntries.push({ value: empty });
  }

  const visionEntries: DraftIntakeSummaryEntry[] = [
    {
      value: summaryText(
        joinParts([values.anythingElse.trim(), values.visionAvoid.trim()]),
        empty,
      ),
    },
  ];

  const inspirationEntries: DraftIntakeSummaryEntry[] = [
    {
      value: summaryText(
        joinParts([
          values.inspirationLike.trim(),
          values.inspirationDislike.trim()
            ? `Avoid: ${values.inspirationDislike.trim()}`
            : "",
        ]),
        empty,
      ),
    },
  ];

  return [
    { step: 1, eyebrow: sections.project.eyebrow, entries: [{ value: summaryText(
      values.project.trim() ||
        (values.projectStarter ? formatProjectValue(values.projectStarter, values.projectDetail) : ""),
      empty,
    ) }] },
    { step: 2, eyebrow: sections.business.eyebrow, entries: [{ value: summaryText(values.business, empty) }] },
    { step: 3, eyebrow: sections.audience.eyebrow, entries: audienceEntries },
    { step: 4, eyebrow: sections.goal.eyebrow, entries: goalEntries },
    { step: 5, eyebrow: sections.brandPersonality.eyebrow, entries: personalityEntries },
    { step: 6, eyebrow: sections.brandColors.eyebrow, entries: colorEntries },
    { step: 7, eyebrow: sections.vision.eyebrow, entries: visionEntries },
    { step: 8, eyebrow: sections.inspiration.eyebrow, entries: inspirationEntries },
  ];
}
