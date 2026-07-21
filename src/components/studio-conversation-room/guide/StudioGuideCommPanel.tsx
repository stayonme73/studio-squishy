"use client";

import { memo, useEffect, useRef } from "react";

import styles from "@/components/studio-conversation-room/guide/studio-guide-comm.module.css";
import {
  STUDIO_GUIDE_TYPE_FIELD_ID,
  conversationRoomGuideV1,
} from "@/config/conversation-room-guide-v1";

export type StudioGuideCommPanelProps = {
  textDraft: string;
  /** Changes when the guide question changes — resets the type field. */
  fieldResetKey: string;
  /** Placeholder for the current question (e.g. Type your business name). */
  typePlaceholder: string;
  listening: boolean;
  speechSupported: boolean;
  interimTranscript: string;
  savedPulse: boolean;
  /** When true, Enter / Send advances the guide question. */
  isAnsweringQuestion: boolean;
  /** Preferred name / business name and other emphasized answers. */
  answerRequired?: boolean;
  /** Live typing — must only update a ref, never React state. */
  onTextDraftLive: (value: string) => void;
  /** Commit before Continue / Send. */
  onTextDraftFlush: (value: string) => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onContinue: () => void;
  onSendMessage: () => void;
};

/**
 * Permanent speak / type panel.
 * Keep typing side-effect free: no speech cancel, no sibling DOM rewrites per key.
 */
function StudioGuideCommPanel({
  textDraft,
  fieldResetKey,
  typePlaceholder,
  listening,
  speechSupported,
  interimTranscript,
  savedPulse,
  isAnsweringQuestion,
  answerRequired = false,
  onTextDraftLive,
  onTextDraftFlush,
  onStartListening,
  onStopListening,
  onContinue,
  onSendMessage,
}: StudioGuideCommPanelProps) {
  const v = conversationRoomGuideV1;
  const textRef = useRef<HTMLInputElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sendRef = useRef<HTMLButtonElement | null>(null);
  const resetKeyRef = useRef(fieldResetKey);
  const emptyRef = useRef(!textDraft.trim());

  const showRequired = Boolean(answerRequired && isAnsweringQuestion);
  const placeholder = isAnsweringQuestion
    ? typePlaceholder
    : v.askAnythingPlaceholder;

  useEffect(() => {
    const node = textRef.current;
    if (!node) return;
    if (resetKeyRef.current !== fieldResetKey) {
      resetKeyRef.current = fieldResetKey;
      node.value = textDraft;
      emptyRef.current = !textDraft.trim();
    }
    if (sendRef.current) {
      sendRef.current.disabled = emptyRef.current;
      sendRef.current.textContent = isAnsweringQuestion
        ? v.continueLabel
        : v.sendMessageLabel;
    }
    if (wrapRef.current) {
      wrapRef.current.dataset.required =
        showRequired && emptyRef.current ? "true" : "false";
      wrapRef.current.dataset.answering = isAnsweringQuestion
        ? "true"
        : "false";
    }
  }, [
    fieldResetKey,
    textDraft,
    showRequired,
    isAnsweringQuestion,
    v.continueLabel,
    v.sendMessageLabel,
  ]);

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
        tabIndex={-1}
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

      <div className={styles.typeBlock}>
        {showRequired ? (
          <div className={styles.requiredRow}>
            <span className={styles.requiredBadge}>{v.answerRequiredLabel}</span>
            <span className={styles.requiredHint}>{v.typeRequiredEmptyHint}</span>
          </div>
        ) : null}
        <div
          ref={wrapRef}
          className={styles.typeField}
          data-required={showRequired ? "true" : "false"}
          data-answering={isAnsweringQuestion ? "true" : "false"}
        >
          <input
            id={STUDIO_GUIDE_TYPE_FIELD_ID}
            ref={textRef}
            className={styles.typeLine}
            type="text"
            defaultValue={textDraft}
            placeholder={placeholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(event) => {
              const node = event.currentTarget;
              const next = node.value;
              const empty = !next.trim();
              /* Only touch siblings when emptiness flips — rewriting DOM every key stole focus. */
              if (empty !== emptyRef.current) {
                emptyRef.current = empty;
                if (sendRef.current) sendRef.current.disabled = empty;
                if (wrapRef.current && showRequired) {
                  wrapRef.current.dataset.required = empty ? "true" : "false";
                }
              }
              onTextDraftLive(next);
            }}
            onFocus={() => {
              if (listening) onStopListening();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              const next = textRef.current?.value ?? "";
              if (!next.trim()) return;
              event.preventDefault();
              onTextDraftFlush(next);
              if (isAnsweringQuestion) onContinue();
              else onSendMessage();
            }}
            aria-required={showRequired ? true : undefined}
            aria-label={placeholder}
          />
        </div>
      </div>

      {savedPulse ? (
        <p className={styles.savedCue} aria-live="polite">
          ✓ {v.savedCue}
        </p>
      ) : null}

      <button
        ref={sendRef}
        type="button"
        className={styles.sendBtn}
        onClick={() => {
          const next = textRef.current?.value ?? "";
          onTextDraftFlush(next);
          if (!next.trim()) return;
          if (isAnsweringQuestion) onContinue();
          else onSendMessage();
        }}
      >
        {isAnsweringQuestion ? v.continueLabel : v.sendMessageLabel}
      </button>
    </aside>
  );
}

export default memo(StudioGuideCommPanel, (prev, next) => {
  return (
    prev.fieldResetKey === next.fieldResetKey &&
    prev.typePlaceholder === next.typePlaceholder &&
    prev.listening === next.listening &&
    prev.speechSupported === next.speechSupported &&
    prev.interimTranscript === next.interimTranscript &&
    prev.savedPulse === next.savedPulse &&
    prev.isAnsweringQuestion === next.isAnsweringQuestion &&
    prev.answerRequired === next.answerRequired
  );
});
