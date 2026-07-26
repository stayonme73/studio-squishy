"use client";

import styles from "@/components/studio-conversation-room/conversation-nav-panel.module.css";
import {
  STUDIO_GUIDE_TYPE_FIELD_ID,
  conversationRoomGuideV1,
} from "@/config/conversation-room-guide-v1";

export type ConversationNavPanelProps = {
  canChangeAnswer: boolean;
  summaryOpen: boolean;
  listening: boolean;
  onSpeak: () => void;
  onType: () => void;
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
 * Customer-facing only (no internal Studio Review).
 */
export default function ConversationNavPanel({
  canChangeAnswer,
  summaryOpen,
  listening,
  onSpeak,
  onType,
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

  function handleType() {
    onType();
    window.setTimeout(() => {
      document.getElementById(STUDIO_GUIDE_TYPE_FIELD_ID)?.focus();
    }, 0);
  }

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
          <button
            type="button"
            className={styles.navBtn}
            data-active={listening ? "true" : "false"}
            aria-pressed={listening}
            onClick={onSpeak}
          >
            <span className={styles.icon} aria-hidden="true">
              🎤
            </span>
            Speak
          </button>
          <button type="button" className={styles.navBtn} onClick={handleType}>
            <span className={styles.icon} aria-hidden="true">
              ⌨️
            </span>
            Type
          </button>
          <button type="button" className={styles.navBtn} onClick={handleAsk}>
            <span className={styles.icon} aria-hidden="true">
              ❓
            </span>
            Ask a question
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
          <button
            type="button"
            className={styles.navBtn}
            onClick={onChangeAnswer}
            disabled={!canChangeAnswer}
          >
            <span className={styles.icon} aria-hidden="true">
              ✏️
            </span>
            {v.changeAnswerLabel}
          </button>
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
          <button
            type="button"
            id="studio-control-review-answers"
            className={styles.navBtn}
            data-active={summaryOpen ? "true" : "false"}
            aria-pressed={summaryOpen}
            onClick={onToggleSummary}
          >
            <span className={styles.icon} aria-hidden="true">
              📋
            </span>
            {v.reviewAnswersLabel}
          </button>
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
        </div>
      </section>
    </nav>
  );
}
