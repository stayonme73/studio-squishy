/**
 * Stage-entry scroll ownership.
 * A newly entered card/stage begins at its intended top.
 * The customer must never inherit the prior stage's vertical scroll.
 */

const STAGE_SCROLL_SELECTOR =
  "[data-name-question-panel], [data-question-scroll-root]" as const;

export function resetConversationStageScroll(): void {
  if (typeof document === "undefined") return;

  const run = () => {
    const doc = document.scrollingElement;
    if (doc instanceof HTMLElement) {
      doc.scrollTop = 0;
    }
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
    document.querySelectorAll(STAGE_SCROLL_SELECTOR).forEach((node) => {
      if (node instanceof HTMLElement) {
        node.scrollTop = 0;
      }
    });
  };

  run();
  if (typeof window !== "undefined") {
    window.requestAnimationFrame(run);
  }
}
