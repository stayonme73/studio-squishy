/** Shared tablet target so Samsung Session links can native-scroll even if React click is late. */
export const CONVERSATION_ROOM_TABLET_ID = "conversation-room-tablet" as const;
export const CONVERSATION_ROOM_TABLET_HREF = `#${CONVERSATION_ROOM_TABLET_ID}` as const;

/** Active opening-question cluster — Continue lands here, not at the old answer offset. */
export const CONVERSATION_ROOM_ACTIVE_QUESTION_ID =
  "conversation-room-active-question" as const;

const QUESTION_REVEAL_MARGIN_PX = 12;

/** Bring the Presentation tablet into view after Session controls fire. */
export function revealConversationTablet(): void {
  if (typeof document === "undefined") return;
  const node = document.getElementById(CONVERSATION_ROOM_TABLET_ID);
  window.requestAnimationFrame(() => {
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/**
 * MJ-D14: after a stage change (Review Together / Route), bring the new
 * customer surface into view without a smooth animation that fights a flick.
 * Do not use this on ordinary scrolling. Do not open overlays from here.
 */
export function revealConversationStage(): void {
  if (typeof document === "undefined") return;
  const node = document.getElementById(CONVERSATION_ROOM_TABLET_ID);
  window.requestAnimationFrame(() => {
    node?.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
  });
}

/** Keep the cluster near the top of the scrollport; never force page-top 0. */
export function questionClusterDocumentScrollTop(
  currentScrollTop: number,
  clusterTopInViewport: number,
  marginPx = QUESTION_REVEAL_MARGIN_PX,
): number {
  return Math.max(0, clusterTopInViewport + currentScrollTop - marginPx);
}

/**
 * MJ-D10: after a valid Continue, the next question paints higher on the phone
 * while the room/document stay scrolled near the previous Continue control.
 * Move only the new question cluster into view. Do not focus the type field.
 */
export function revealActiveQuestionCluster(): void {
  if (typeof document === "undefined") return;
  const node = document.getElementById(CONVERSATION_ROOM_ACTIVE_QUESTION_ID);
  if (!(node instanceof HTMLElement)) return;

  const inner = node.closest("[data-question-scroll-root]");
  if (inner instanceof HTMLElement) {
    inner.scrollTop = 0;
  }

  const doc = document.scrollingElement;
  if (doc instanceof HTMLElement) {
    doc.scrollTop = questionClusterDocumentScrollTop(
      doc.scrollTop,
      node.getBoundingClientRect().top,
    );
  }

  node.scrollIntoView({
    behavior: "auto",
    block: "start",
    inline: "nearest",
  });
}
