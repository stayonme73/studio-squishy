"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useLayoutEffect, useRef } from "react";

import styles from "@/components/studio-conversation-room/conversation-nav-panel.module.css";
import {
  STUDIO_GUIDE_TYPE_FIELD_ID,
  conversationRoomGuideV1,
} from "@/config/conversation-room-guide-v1";
import { CONVERSATION_ROOM_TABLET_HREF } from "@/lib/studio-conversation-tablet-anchor";

export type ConversationNavPanelProps = {
  canChangeAnswer: boolean;
  summaryOpen: boolean;
  onAskQuestion: () => void;
  onReturnToLobby: () => void;
  onCloseConversation: () => void;
  onChangeAnswer: () => void;
  onStartNew: () => void;
  onSaveForNow: () => void;
  onOpenHelp: () => void;
  onToggleSummary: () => void;
};

/**
 * Studio control strip — Conversation · Session · Studio.
 * Speak and type live only on the permanent communication dock above this strip.
 */
export default function ConversationNavPanel({
  canChangeAnswer,
  summaryOpen,
  onAskQuestion,
  onReturnToLobby,
  onCloseConversation,
  onChangeAnswer,
  onStartNew,
  onSaveForNow,
  onOpenHelp,
  onToggleSummary,
}: ConversationNavPanelProps) {
  const v = conversationRoomGuideV1;
  const reviewActivate = useSamsungActivate(onToggleSummary);
  const changeActivate = useSamsungActivate(onChangeAnswer);

  function handleAsk() {
    onAskQuestion();
    window.setTimeout(() => {
      document.getElementById(STUDIO_GUIDE_TYPE_FIELD_ID)?.focus();
    }, 0);
  }

  return (
    <nav className={styles.panel} aria-label="Studio control strip">
      <p className={styles.eyebrow}>Studio controls</p>

      <section className={styles.section} aria-label="Conversation">
        <p className={styles.sectionLabel}>Conversation</p>
        <div className={styles.group}>
          <button type="button" className={styles.navBtn} onClick={handleAsk}>
            <span className={styles.icon} aria-hidden="true">
              ❓
            </span>
            Ask a question
            <span className={styles.btnHint}>
              Use the mic and type field above to speak or type.
            </span>
          </button>
        </div>
      </section>

      <div className={styles.divider} aria-hidden="true" />

      <section className={styles.section} aria-label="Session">
        <p className={styles.sectionLabel}>Session</p>
        <div className={styles.group}>
          <button type="button" className={styles.navBtn} onClick={onSaveForNow}>
            <span className={styles.icon} aria-hidden="true">
              💾
            </span>
            Save for now
          </button>
          {canChangeAnswer ? (
            <a
              ref={changeActivate.ref}
              href={CONVERSATION_ROOM_TABLET_HREF}
              className={styles.navBtn}
              data-session-action="change-answer"
              onClick={changeActivate.onClick}
            >
              <span className={styles.icon} aria-hidden="true">
                ✏️
              </span>
              {v.changeAnswerLabel}
            </a>
          ) : (
            <button type="button" className={styles.navBtn} disabled>
              <span className={styles.icon} aria-hidden="true">
                ✏️
              </span>
              {v.changeAnswerLabel}
            </button>
          )}
          <button type="button" className={styles.navBtn} onClick={onStartNew}>
            <span className={styles.icon} aria-hidden="true">
              ➕
            </span>
            {v.startNewLabel}
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={onCloseConversation}
          >
            <span className={styles.icon} aria-hidden="true">
              🚪
            </span>
            {v.closeLabel}
          </button>
          <a
            ref={reviewActivate.ref}
            href={CONVERSATION_ROOM_TABLET_HREF}
            id="studio-control-review-answers"
            className={styles.navBtn}
            data-session-action="review-answers"
            data-active={summaryOpen ? "true" : "false"}
            aria-current={summaryOpen ? "true" : undefined}
            onClick={reviewActivate.onClick}
          >
            <span className={styles.icon} aria-hidden="true">
              📋
            </span>
            {v.reviewAnswersLabel}
          </a>
        </div>
      </section>

      <div className={styles.divider} aria-hidden="true" />

      <section className={styles.section} aria-label="Studio">
        <p className={styles.sectionLabel}>Studio</p>
        <div className={styles.group}>
          <button type="button" className={styles.navBtn} onClick={onReturnToLobby}>
            <span className={styles.icon} aria-hidden="true">
              🏠
            </span>
            Return to Lobby
          </button>
          <button
            type="button"
            id="studio-control-help"
            className={styles.navBtn}
            onClick={onOpenHelp}
          >
            <span className={styles.icon} aria-hidden="true">
              📚
            </span>
            Help Center
            <span className={styles.btnHint}>Policies &amp; FAQ</span>
          </button>
          <StudioReviewControl />
        </div>
      </section>
    </nav>
  );
}

/**
 * Samsung often skips React synthetic click on Session controls. Bind native
 * pointerup on the real node; the hash href still scrolls the tablet if JS is late.
 */
function useSamsungActivate(handler: () => void) {
  const ref = useRef<HTMLAnchorElement>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const lastTouchAt = useRef(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      lastTouchAt.current = Date.now();
      handlerRef.current();
    };

    node.addEventListener("pointerup", onPointerUp);
    return () => node.removeEventListener("pointerup", onPointerUp);
  });

  return {
    ref,
    onClick() {
      if (Date.now() - lastTouchAt.current < 450) return;
      handlerRef.current();
    },
  };
}

/**
 * Dev-only. Lives in Studio Controls so it scrolls with the page and never
 * covers Voice, Session, or customer content.
 */
function StudioReviewControl() {
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <Suspense fallback={null}>
      <StudioReviewControlLink />
    </Suspense>
  );
}

function StudioReviewControlLink() {
  const pathname = usePathname() || "/studio-conversation-room";
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const open = params.get("studioReview") === "1";
  params.set("studioReview", "1");
  const href = `${pathname}?${params.toString()}`;

  return (
    <Link
      href={href}
      scroll={false}
      id="studio-control-studio-review"
      className={styles.navBtn}
      data-studio-review-placement="studio-controls"
      data-active={open ? "true" : "false"}
      aria-expanded={open}
    >
      <span className={styles.icon} aria-hidden="true">
        🔧
      </span>
      Studio Review
      <span className={styles.btnHint}>
        Owner tools. Scrolls with Studio Controls and does not cover the room.
      </span>
    </Link>
  );
}
