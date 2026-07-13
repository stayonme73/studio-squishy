"use client";

import { useEffect, useRef } from "react";

import ProjectBuilderSquishyGuide from "@/components/project-builder/ProjectBuilderSquishyGuide";
import {
  PROJECT_BUILDER_V1,
  type ProjectBuilderConversationTurn,
} from "@/config/project-builder-v1";

type Props = {
  turns: readonly ProjectBuilderConversationTurn[];
};

/** Studio Conversation rail — scrollable thread above, Squishy grounded below. */
export default function ProjectBuilderSquishyCompanion({ turns }: Props) {
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;

    function syncThreadOverflow() {
      const overflows = thread.scrollHeight > thread.clientHeight + 1;
      thread.classList.toggle("pb-studio-conversation__thread--overflow", overflows);
      if (overflows) {
        thread.scrollTop = thread.scrollHeight;
      }
    }

    syncThreadOverflow();
    const observer = new ResizeObserver(syncThreadOverflow);
    observer.observe(thread);
    window.addEventListener("resize", syncThreadOverflow);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncThreadOverflow);
    };
  }, [turns]);

  return (
    <aside
      className="pb-studio-conversation"
      aria-label={PROJECT_BUILDER_V1.studioConversationLabel}
    >
      <div
        ref={threadRef}
        className="pb-studio-conversation__thread"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {turns.map((turn, index) => {
          const isCustomer = turn.speaker === "customer";
          return (
            <article
              className={`pb-studio-conversation__message${
                isCustomer
                  ? " pb-studio-conversation__message--customer"
                  : " pb-studio-conversation__message--squishy"
              }`}
              key={`${index}-${turn.speaker}-${turn.text.slice(0, 24)}`}
            >
              <p className="pb-studio-conversation__speaker">
                {isCustomer ? PROJECT_BUILDER_V1.customerLabel : PROJECT_BUILDER_V1.squishyLabel}
              </p>
              <p className="pb-studio-conversation__text">{turn.text}</p>
            </article>
          );
        })}
      </div>
      <div className="pb-studio-conversation__figure">
        <ProjectBuilderSquishyGuide />
      </div>
    </aside>
  );
}
