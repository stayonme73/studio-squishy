"use client";

import { useEffect, useRef } from "react";

import styles from "@/components/studio-conversation-room/guide/studio-guide-comm.module.css";
import {
  STUDIO_GUIDE_TYPE_FIELD_ID,
  conversationRoomGuideV1,
} from "@/config/conversation-room-guide-v1";

export type StudioGuideCommPanelProps = {
  textDraft: string;
  listening: boolean;
  speechSupported: boolean;
  interimTranscript: string;
  savedPulse: boolean;
  /** When true, Enter / Send advances the guide question. */
  isAnsweringQuestion: boolean;
  onTextDraftChange: (value: string) => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onContinue: () => void;
  onSendMessage: () => void;
};

/**
 * Permanent modern speak / type panel — sits beside the tablet, never inside it.
 */
export default function StudioGuideCommPanel({
  textDraft,
  listening,
  speechSupported,
  interimTranscript,
  savedPulse,
  isAnsweringQuestion,
  onTextDraftChange,
  onStartListening,
  onStopListening,
  onContinue,
  onSendMessage,
}: StudioGuideCommPanelProps) {
  const v = conversationRoomGuideV1;
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (textDraft) textRef.current?.focus();
  }, [textDraft]);

  return (
    <aside
      className={styles.panel}
      data-permanent-communication="true"
      aria-label={v.speakHint}
    >
      <button
        type="button"
        className={styles.speakZone}
        data-active={listening ? "true" : "false"}
        onClick={listening ? onStopListening : onStartListening}
        disabled={!speechSupported && !listening}
        aria-label={listening ? "Stop listening" : v.speakHint}
      >
        <span className={styles.micRing} aria-hidden="true">
          <svg
            className={styles.micIcon}
            viewBox="0 0 24 24"
            width="20"
            height="20"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V20H9v2h6v-2h-2v-2.08A7 7 0 0 0 19 11h-2z"
            />
          </svg>
        </span>
        <span className={styles.speakTitle}>
          {listening ? "Listening..." : v.speakHint}
        </span>
        <span className={styles.speakHint}>
          {listening
            ? interimTranscript || "Tap to finish"
            : v.speakSubhint}
        </span>
      </button>

      <div className={styles.answerOr} aria-hidden="true">
        <span className={styles.answerOrRule} />
        <span className={styles.answerOrLabel}>OR</span>
        <span className={styles.answerOrRule} />
      </div>

      <label className={styles.typeBlock}>
        <span className={styles.typeField}>
          {!textDraft.trim() ? (
            <span className={styles.typePlaceholder} aria-hidden="true">
              <svg
                className={styles.keyboardIcon}
                viewBox="0 0 24 24"
                width="18"
                height="18"
                focusable="false"
              >
                <path
                  fill="currentColor"
                  d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v10h16V7H4zm2 2h2v2H6V9zm3 0h2v2H9V9zm3 0h2v2h-2V9zm3 0h2v2h-2V9zm3 0h2v2h-2V9zM6 12h2v2H6v-2zm3 0h2v2H9v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zM8 15h8v2H8v-2z"
                />
              </svg>
              {isAnsweringQuestion ? v.typeLabel : v.askAnythingPlaceholder}
            </span>
          ) : null}
          <textarea
            id={STUDIO_GUIDE_TYPE_FIELD_ID}
            ref={textRef}
            className={styles.typeLine}
            value={textDraft}
            onChange={(event) => onTextDraftChange(event.target.value)}
            onFocus={() => {
              if (listening) onStopListening();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              if (!textDraft.trim()) return;
              event.preventDefault();
              if (isAnsweringQuestion) onContinue();
              else onSendMessage();
            }}
            placeholder=" "
            aria-label={
              isAnsweringQuestion ? v.typeLabel : v.askAnythingPlaceholder
            }
            rows={3}
          />
        </span>
      </label>

      {savedPulse ? (
        <p className={styles.savedCue} aria-live="polite">
          ✓ {v.savedCue}
        </p>
      ) : null}

      {textDraft.trim() ? (
        <button
          type="button"
          className={styles.sendBtn}
          onClick={isAnsweringQuestion ? onContinue : onSendMessage}
        >
          {isAnsweringQuestion ? v.continueLabel : v.sendMessageLabel}
        </button>
      ) : null}
    </aside>
  );
}
