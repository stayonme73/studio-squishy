/**
 * Phase 1A Guide capture draft — dedicated localStorage key only.
 * Does not read or write studio-squishy:current-campaign or campaign APIs.
 */

import {
  STUDIO_GUIDE_CAPTURE_STORAGE_KEY,
  studioGuideConversationV1,
} from "@/config/studio-guide-conversation-v1";

export type GuideDeadlineStatus = "unconfirmed" | "not_requested";

export type GuideCaptureDraftV1 = {
  schemaVersion: 1;
  /** Preferred name for Voice address — not legal/business name. */
  preferredName: string;
  projectNeed: string;
  businessName: string;
  requestedDeadline: string;
  deadlineStatus: GuideDeadlineStatus;
  existingMaterialsNote: string;
  confirmedAt: string | null;
  source: "lobby-guide-conversation";
};

export function createEmptyGuideCaptureDraft(): GuideCaptureDraftV1 {
  return {
    schemaVersion: 1,
    preferredName: "",
    projectNeed: "",
    businessName: "",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    confirmedAt: null,
    source: "lobby-guide-conversation",
  };
}

export function normalizeGuideCaptureDraft(
  input: Partial<GuideCaptureDraftV1> | null | undefined,
): GuideCaptureDraftV1 {
  const empty = createEmptyGuideCaptureDraft();
  if (!input || input.schemaVersion !== 1) return empty;

  const requestedDeadline =
    typeof input.requestedDeadline === "string" ? input.requestedDeadline.trim() : "";
  const hasDeadline = requestedDeadline.length > 0;

  return {
    schemaVersion: 1,
    preferredName:
      typeof input.preferredName === "string" ? input.preferredName.trim() : "",
    projectNeed: typeof input.projectNeed === "string" ? input.projectNeed.trim() : "",
    businessName: typeof input.businessName === "string" ? input.businessName.trim() : "",
    requestedDeadline,
    deadlineStatus: hasDeadline ? "unconfirmed" : "not_requested",
    existingMaterialsNote:
      typeof input.existingMaterialsNote === "string"
        ? input.existingMaterialsNote.trim()
        : "",
    confirmedAt: typeof input.confirmedAt === "string" ? input.confirmedAt : null,
    source: "lobby-guide-conversation",
  };
}

export function canConfirmGuideCaptureDraft(draft: GuideCaptureDraftV1): boolean {
  return draft.projectNeed.trim().length > 0;
}

export function confirmGuideCaptureDraft(draft: GuideCaptureDraftV1): GuideCaptureDraftV1 {
  const normalized = normalizeGuideCaptureDraft(draft);
  if (!canConfirmGuideCaptureDraft(normalized)) {
    return normalized;
  }
  return {
    ...normalized,
    confirmedAt: new Date().toISOString(),
  };
}

export function readGuideCaptureDraft(): GuideCaptureDraftV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STUDIO_GUIDE_CAPTURE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuideCaptureDraftV1>;
    const draft = normalizeGuideCaptureDraft(parsed);
    return draft.preferredName || draft.projectNeed || draft.confirmedAt
      ? draft
      : null;
  } catch {
    return null;
  }
}

export function writeGuideCaptureDraft(draft: GuideCaptureDraftV1): boolean {
  if (typeof window === "undefined") return false;
  try {
    const normalized = normalizeGuideCaptureDraft(draft);
    window.localStorage.setItem(
      STUDIO_GUIDE_CAPTURE_STORAGE_KEY,
      JSON.stringify(normalized),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearGuideCaptureDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STUDIO_GUIDE_CAPTURE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Intentional reset after a completed capture.
 * Clears only studio-guide:capture-draft:v1 — never campaign or other Studio keys.
 */
export function startNewGuideCaptureConversation(): GuideCaptureDraftV1 {
  clearGuideCaptureDraft();
  return createEmptyGuideCaptureDraft();
}

/** True when Review Answers / Change an answer have something to show. */
export function guideHasReviewableAnswers(
  draft: GuideCaptureDraftV1 | null | undefined,
): draft is GuideCaptureDraftV1 {
  if (!draft) return false;
  return Boolean(
    draft.confirmedAt ||
      draft.projectNeed.trim() ||
      draft.preferredName.trim() ||
      draft.businessName.trim(),
  );
}

/** Resume step when the Guide panel opens against stored draft state. */
export function getGuideConversationResumeStep(
  draft: GuideCaptureDraftV1 | null,
): "ask_preferred_name" | "ask_project_need" | "summary" | "confirmed" {
  if (draft?.confirmedAt) return "confirmed";
  if (draft?.projectNeed.trim()) return "summary";
  if (draft?.preferredName.trim()) return "ask_project_need";
  return "ask_preferred_name";
}

export function deadlineStatusLabel(status: GuideDeadlineStatus): string {
  return status === "unconfirmed"
    ? studioGuideConversationV1.unconfirmedDisplay
    : studioGuideConversationV1.notRequestedDisplay;
}

const MONTH_NAME =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\b/i;

/**
 * Basic deadline clarity check — rejects ambiguous compact numerics (e.g. 081526).
 * Empty input is allowed (skip). Does not confirm Studio availability.
 */
export function isAcceptableGuideDeadlineInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;

  // Relative requested timing (Conversation Room bubbles) — not a promised date.
  if (
    /^(as soon as possible|within 1 week|within 2 weeks|within 1 month|more than 1 month|no deadline yet)$/i.test(
      trimmed,
    )
  ) {
    return true;
  }

  // Digit-only / space-separated digits are ambiguous (081526, 08 15 26).
  if (/^[\d\s]+$/.test(trimmed)) return false;

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map(Number);
    return isRealCalendarDay(y, m, d);
  }

  // Numeric with separators — require a 4-digit year (09/15/2026 or 15-09-2026).
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[/-]/).map(Number);
    const [a, b, year] = parts;
    // Accept either M/D/YYYY or D/M/YYYY structurally; calendar check uses M/D when a<=12.
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      return isRealCalendarDay(year, a, b);
    }
    if (b >= 1 && b <= 12 && a >= 1 && a <= 31) {
      return isRealCalendarDay(year, b, a);
    }
    return false;
  }

  // Month-name forms: "September 15", "September 15, 2026", "15 September 2026"
  if (MONTH_NAME.test(trimmed) && /\d{1,2}/.test(trimmed)) {
    return true;
  }

  return false;
}

function isRealCalendarDay(year: number, month: number, day: number): boolean {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export { STUDIO_GUIDE_CAPTURE_STORAGE_KEY };
