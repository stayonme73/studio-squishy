/**
 * Samsung-safe Guide advance — native GET navigation (same reliability as Close).
 * Answer travels in the query string. Server interprets it so the next question
 * is correct on first paint (no client readiness race back to Question 1).
 */

import type { GuideConversationStep } from "@/config/studio-guide-conversation-v1";
import {
  confirmGuideCaptureDraft,
  createEmptyGuideCaptureDraft,
  isAcceptableGuideDeadlineInput,
  normalizeGuideCaptureDraft,
  readGuideCaptureDraft,
  writeGuideCaptureDraft,
  type GuideCaptureDraftV1,
} from "@/lib/studio-guide-capture";

export const GUIDE_HARD_NAV = {
  guide: "1",
  gr: "room-v8",
  actContinue: "continue",
  actSkip: "skip",
  actConfirm: "confirm",
  actCorrect: "correct",
} as const;

export const GUIDE_STEP_STORAGE_KEY = "studio-guide:ui-step:v1" as const;
const GUIDE_MEMORY_DRAFT_KEY = "studio-guide:memory-draft:v1";

const STEPS: GuideConversationStep[] = [
  "ask_preferred_name",
  "ask_project_need",
  "ask_business_name",
  "ask_deadline",
  "ask_materials",
  "summary",
  "confirmed",
];

/** In-memory fallback when Samsung blocks localStorage on http:// LAN IPs. */
let memoryDraft: GuideCaptureDraftV1 | null = null;
let memoryStep: GuideConversationStep | null = null;

export function isGuideConversationStep(
  value: string | null | undefined,
): value is GuideConversationStep {
  return !!value && (STEPS as string[]).includes(value);
}

export function nextGuideStep(step: GuideConversationStep): GuideConversationStep {
  switch (step) {
    case "ask_preferred_name":
      return "ask_project_need";
    case "ask_project_need":
      return "ask_business_name";
    case "ask_business_name":
      return "ask_deadline";
    case "ask_deadline":
      return "ask_materials";
    case "ask_materials":
      return "summary";
    default:
      return step;
  }
}

export function writeGuideUiStep(step: GuideConversationStep): void {
  memoryStep = step;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(GUIDE_STEP_STORAGE_KEY, step);
  } catch {
    /* ignore — memoryStep remains */
  }
}

export function readGuideUiStep(): GuideConversationStep | null {
  if (memoryStep) return memoryStep;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(GUIDE_STEP_STORAGE_KEY);
    return isGuideConversationStep(raw) ? raw : null;
  } catch {
    return memoryStep;
  }
}

export function clearGuideUiStep(): void {
  memoryStep = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(GUIDE_STEP_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Clear in-memory + session guide draft (Lobby fresh start after completed journey). */
export function clearGuideMemoryDraft(): void {
  memoryDraft = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(GUIDE_MEMORY_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function persistGuideDraft(draft: GuideCaptureDraftV1): void {
  const normalized = normalizeGuideCaptureDraft(draft);
  memoryDraft = normalized;
  writeGuideCaptureDraft(normalized);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(GUIDE_MEMORY_DRAFT_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore */
  }
}

export function loadGuideDraft(): GuideCaptureDraftV1 | null {
  const fromLocal = readGuideCaptureDraft();
  if (fromLocal) {
    memoryDraft = fromLocal;
    return fromLocal;
  }
  if (memoryDraft) return memoryDraft;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(GUIDE_MEMORY_DRAFT_KEY);
    if (!raw) return null;
    const parsed = normalizeGuideCaptureDraft(JSON.parse(raw) as Partial<GuideCaptureDraftV1>);
    memoryDraft =
      parsed.preferredName || parsed.projectNeed || parsed.confirmedAt
        ? parsed
        : null;
    return memoryDraft;
  } catch {
    return memoryDraft;
  }
}

export function applyGuideAnswerToDraft(
  draft: GuideCaptureDraftV1,
  fromStep: GuideConversationStep,
  answer: string,
  skipped: boolean,
): GuideCaptureDraftV1 {
  const next = { ...draft };
  const trimmed = answer.trim();
  if (fromStep === "ask_preferred_name") {
    next.preferredName = trimmed;
  } else if (fromStep === "ask_project_need") {
    next.projectNeed = trimmed;
  } else if (fromStep === "ask_business_name") {
    next.businessName = skipped ? "" : trimmed;
  } else if (fromStep === "ask_deadline") {
    const noDeadlinePhrase =
      !trimmed ||
      /^no deadline yet$/i.test(trimmed) ||
      /^skip for now$/i.test(trimmed);
    if (skipped || noDeadlinePhrase) {
      next.requestedDeadline = "";
      next.deadlineStatus = "not_requested";
    } else {
      next.requestedDeadline = trimmed;
      next.deadlineStatus = "unconfirmed";
    }
  } else if (fromStep === "ask_materials") {
    next.existingMaterialsNote = skipped ? "" : trimmed;
  }
  return normalizeGuideCaptureDraft(next);
}

/** Prior answers carried in GET hidden fields (server has no localStorage). */
export function draftFromCarryParams(params: URLSearchParams): GuideCaptureDraftV1 {
  return normalizeGuideCaptureDraft({
    schemaVersion: 1,
    preferredName: params.get("g_name") ?? "",
    projectNeed: params.get("g_need") ?? "",
    businessName: params.get("g_biz") ?? "",
    requestedDeadline: params.get("g_deadline") ?? "",
    existingMaterialsNote: params.get("g_materials") ?? "",
  });
}

export function mergeGuideDrafts(
  base: GuideCaptureDraftV1 | null,
  incoming: GuideCaptureDraftV1,
): GuideCaptureDraftV1 {
  const a = base ?? createEmptyGuideCaptureDraft();
  return normalizeGuideCaptureDraft({
    schemaVersion: 1,
    preferredName: incoming.preferredName || a.preferredName,
    projectNeed: incoming.projectNeed || a.projectNeed,
    businessName: incoming.businessName || a.businessName,
    requestedDeadline: incoming.requestedDeadline || a.requestedDeadline,
    existingMaterialsNote:
      incoming.existingMaterialsNote || a.existingMaterialsNote,
    confirmedAt: incoming.confirmedAt || a.confirmedAt,
  });
}

export type GuideHardNavResult =
  | { kind: "none" }
  | { kind: "error"; message: string; step: GuideConversationStep }
  | {
      kind: "advanced";
      draft: GuideCaptureDraftV1;
      step: GuideConversationStep;
      fromStep: GuideConversationStep;
      answer: string;
      skipped: boolean;
      cleanHref: string;
    };

/** Serializable payload from the server page into the client Guide. */
export type GuideServerHardNav =
  | { kind: "none" }
  | { kind: "error"; message: string; step: GuideConversationStep }
  | {
      kind: "advanced";
      step: GuideConversationStep;
      fromStep: GuideConversationStep;
      answer: string;
      skipped: boolean;
      draft: GuideCaptureDraftV1;
      cleanHref: string;
    };

function guideDebug(...args: unknown[]) {
  if (typeof console === "undefined") return;
  console.info("[studio-guide-hard-nav]", ...args);
}

/**
 * Pure interpretation of GET continue/skip — safe on server (no storage).
 * Pass `existing` when merging prior answers (client); server uses empty draft.
 */
export function interpretGuideHardNav(
  params: URLSearchParams,
  existing: GuideCaptureDraftV1 | null = null,
): GuideHardNavResult {
  if (params.get("guide") !== "1") {
    guideDebug("interpret:none", "guide!=1", params.toString());
    return { kind: "none" };
  }
  const act = params.get("gact");
  if (
    act !== GUIDE_HARD_NAV.actContinue &&
    act !== GUIDE_HARD_NAV.actSkip &&
    act !== GUIDE_HARD_NAV.actConfirm &&
    act !== GUIDE_HARD_NAV.actCorrect
  ) {
    guideDebug("interpret:none", "no gact", params.toString());
    return { kind: "none" };
  }

  const carried = draftFromCarryParams(params);
  const base = mergeGuideDrafts(existing, carried);

  if (act === GUIDE_HARD_NAV.actCorrect) {
    const step: GuideConversationStep = "ask_project_need";
    guideDebug("interpret:correct", { projectNeed: base.projectNeed });
    return {
      kind: "advanced",
      draft: { ...base, confirmedAt: null },
      step,
      fromStep: "summary",
      answer: "",
      skipped: false,
      cleanHref: `/?guide=1&gr=${GUIDE_HARD_NAV.gr}&gstep=${encodeURIComponent(step)}`,
    };
  }

  if (act === GUIDE_HARD_NAV.actConfirm) {
    if (!base.projectNeed.trim()) {
      return {
        kind: "error",
        message: "Please answer what you are working on before confirming.",
        step: "summary",
      };
    }
    const confirmed = confirmGuideCaptureDraft(base);
    guideDebug("interpret:confirm", { projectNeed: confirmed.projectNeed });
    return {
      kind: "advanced",
      draft: confirmed,
      step: "confirmed",
      fromStep: "summary",
      answer: "",
      skipped: false,
      cleanHref: `/?guide=1&gr=${GUIDE_HARD_NAV.gr}&gstep=confirmed`,
    };
  }

  const fromRaw = params.get("gfrom");
  if (!isGuideConversationStep(fromRaw)) {
    guideDebug("interpret:none", "bad gfrom", fromRaw);
    return { kind: "none" };
  }

  const skipped = act === GUIDE_HARD_NAV.actSkip;
  const answer = params.get("ganswer") ?? "";

  guideDebug("interpret:input", { act, fromRaw, answer, skipped });

  if (!skipped && fromRaw === "ask_preferred_name" && !answer.trim()) {
    return {
      kind: "error",
      message: "Please tell me what name you’d like me to use.",
      step: fromRaw,
    };
  }

  if (!skipped && fromRaw === "ask_project_need" && !answer.trim()) {
    return {
      kind: "error",
      message: "Please enter what you are working on today.",
      step: fromRaw,
    };
  }

  if (!skipped && fromRaw === "ask_deadline" && answer.trim()) {
    if (!isAcceptableGuideDeadlineInput(answer)) {
      return {
        kind: "error",
        message:
          "Please enter a clear date (for example September 15, 2026 or 09/15/2026). Compact numbers like 081526 are not accepted.",
        step: fromRaw,
      };
    }
  }

  const draft = applyGuideAnswerToDraft(base, fromRaw, answer, skipped);
  const step = nextGuideStep(fromRaw);

  guideDebug("interpret:advanced", { step, projectNeed: draft.projectNeed });

  return {
    kind: "advanced",
    draft,
    step,
    fromStep: fromRaw,
    answer,
    skipped,
    cleanHref: `/?guide=1&gr=${GUIDE_HARD_NAV.gr}&gstep=${encodeURIComponent(step)}`,
  };
}

/** Client: persist an interpreted advance (localStorage + memory + session). */
export function commitGuideHardNavAdvance(
  result: Extract<GuideHardNavResult, { kind: "advanced" }>,
): GuideCaptureDraftV1 {
  // Interpreted draft already merged carry + answer; persist as-is so skips clear fields.
  persistGuideDraft(result.draft);
  writeGuideUiStep(result.step);
  guideDebug("commit:ok", { step: result.step, projectNeed: result.draft.projectNeed });
  return result.draft;
}

/**
 * Process GET continue/skip on the client (storage available).
 */
export function processGuideHardNavSearchParams(
  params: URLSearchParams,
): GuideHardNavResult {
  const existing = loadGuideDraft();
  const interpreted = interpretGuideHardNav(params, existing);
  if (interpreted.kind === "advanced") {
    commitGuideHardNavAdvance(interpreted);
  }
  return interpreted;
}

export function resolveGuideOpenStep(
  params: URLSearchParams,
  draft: GuideCaptureDraftV1 | null,
): GuideConversationStep {
  const urlStep = params.get("gstep");
  if (isGuideConversationStep(urlStep)) return urlStep;

  const stored = readGuideUiStep();
  if (stored) return stored;

  if (draft?.confirmedAt) return "confirmed";
  if (draft?.projectNeed.trim()) return "summary";
  if (draft?.preferredName.trim()) return "ask_project_need";
  return "ask_preferred_name";
}

export function toServerHardNav(result: GuideHardNavResult): GuideServerHardNav {
  if (result.kind === "none") return { kind: "none" };
  if (result.kind === "error") {
    return { kind: "error", message: result.message, step: result.step };
  }
  return {
    kind: "advanced",
    step: result.step,
    fromStep: result.fromStep,
    answer: result.answer,
    skipped: result.skipped,
    draft: result.draft,
    cleanHref: result.cleanHref,
  };
}

export function searchParamsFromRecord(
  record: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  return params;
}
