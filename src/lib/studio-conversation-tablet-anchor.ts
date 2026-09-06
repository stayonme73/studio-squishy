import { resetConversationStageScroll } from "@/lib/studio-conversation-stage-scroll";

/** Shared tablet target so Samsung Session links can native-scroll even if React click is late. */
export const CONVERSATION_ROOM_TABLET_ID = "conversation-room-tablet" as const;
export const CONVERSATION_ROOM_TABLET_HREF = `#${CONVERSATION_ROOM_TABLET_ID}` as const;

/** Active opening-question cluster — Continue lands here, not at the old answer offset. */
export const CONVERSATION_ROOM_ACTIVE_QUESTION_ID =
  "conversation-room-active-question" as const;

/** Top of the question experience — Voice On / Off, then Required, then heading. */
export const CONVERSATION_ROOM_ACTIVE_QUESTION_TOP_ID =
  "conversation-room-active-question-top" as const;

/** Heading remains in the cluster; it is not the reveal anchor. */
export const CONVERSATION_ROOM_ACTIVE_QUESTION_HEADING_ID =
  "conversation-room-active-question-heading" as const;

/**
 * Top inset for the Conversation Room header / tablet.
 * 32px on the Voice row hid the eyebrow; 12px clipped the tablet halo.
 */
export const QUESTION_REVEAL_MARGIN_PX = 16;

/** Bring the Presentation tablet into view after Session controls fire. */
export function revealConversationTablet(): void {
  if (typeof document === "undefined") return;
  const node = document.getElementById(CONVERSATION_ROOM_TABLET_ID);
  window.requestAnimationFrame(() => {
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/**
 * After a stage change, open the new card at its intended top.
 * Do not use this on ordinary scrolling. Do not open overlays from here.
 */
export function revealConversationStage(): void {
  if (typeof document === "undefined") return;
  window.requestAnimationFrame(() => {
    resetConversationStageScroll();
  });
}

/** Keep the heading near the top of the scrollport. */
export function questionClusterDocumentScrollTop(
  currentScrollTop: number,
  clusterTopInViewport: number,
  marginPx = QUESTION_REVEAL_MARGIN_PX,
): number {
  return Math.max(0, clusterTopInViewport + currentScrollTop - marginPx);
}

export function clampDocumentScrollTop(
  nextScrollTop: number,
  maxScrollTop: number,
): number {
  return Math.min(Math.max(0, nextScrollTop), Math.max(0, maxScrollTop));
}

function blurContinueIfFocused(cluster: HTMLElement | null): void {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === document.body) return;
  if (
    active.dataset.tabletContinue === "true" ||
    active.closest("[data-permanent-communication]") ||
    (cluster instanceof HTMLElement && cluster.contains(active))
  ) {
    active.blur();
  }
}

function applyActiveQuestionReveal(): void {
  const cluster = document.getElementById(CONVERSATION_ROOM_ACTIVE_QUESTION_ID);
  blurContinueIfFocused(cluster instanceof HTMLElement ? cluster : null);
  resetConversationStageScroll();
}

let revealFrame = 0;

/**
 * MJ-D10: after Continue, land on the Conversation Room tablet / header so
 * eyebrow, Voice, Required, and the question share the first screen.
 * Do not target the Voice row alone. Do not focus the type field.
 * Stage-entry ownership now opens every card at scrollTop 0.
 */
export function revealActiveQuestionCluster(): void {
  if (typeof document === "undefined") return;
  applyActiveQuestionReveal();
  if (typeof window === "undefined") return;
  window.cancelAnimationFrame(revealFrame);
  revealFrame = window.requestAnimationFrame(() => {
    applyActiveQuestionReveal();
  });
}
