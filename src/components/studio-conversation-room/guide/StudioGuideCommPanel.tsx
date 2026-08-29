"use client";

import { memo, useEffect, useRef } from "react";

import styles from "@/components/studio-conversation-room/guide/studio-guide-comm.module.css";
import {
  STUDIO_GUIDE_TYPE_FIELD_ID,
  composerSubmitLabel,
  conversationRoomGuideV1,
} from "@/config/conversation-room-guide-v1";
import { resolveComposerSendAction } from "@/lib/studio-guide-answer-resolve";
import { useSamsungActivate } from "@/lib/studio-samsung-activate";

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
  /**
   * When true, the customer is answering a guide question.
   * Dock Send submits the same authoritative answer path as tablet Continue.
   */
  isAnsweringQuestion: boolean;
  /** Preferred name / business name and other emphasized answers. */
  answerRequired?: boolean;
  /** True once a bubble or typed value is already accepted for this question. */
  hasAcceptedAnswer?: boolean;
  /** Show required validation only after a failed Continue, not on load. */
  showValidationError?: boolean;
  /** Live typing — must only update a ref, never React state. */
  onTextDraftLive: (value: string) => void;
  /** Commit typed text before Send / Continue. */
  onTextDraftFlush: (value: string) => void;
  onStartListening: () => void;
  onStopListening: () => void;
  /** Same submit path as tablet Continue (guide questions only). */
  onSubmitGuideAnswer: () => void;
  /** Free-ask note after guide questions. */
  onSendMessage: () => void;
  /** Latest truthful Voice reply from the Machine record. */
  studioVoiceReply?: string | null;
  /** When false, leftover gate taps cannot start the microphone. */
  allowMicrophone?: boolean;
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
  hasAcceptedAnswer = false,
  showValidationError = false,
  onTextDraftLive,
  onTextDraftFlush,
  onStartListening,
  onStopListening,
  onSubmitGuideAnswer,
  onSendMessage,
  studioVoiceReply = null,
  allowMicrophone = true,
}: StudioGuideCommPanelProps) {
  const v = conversationRoomGuideV1;
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sendRef = useRef<HTMLButtonElement | null>(null);
  const resetKeyRef = useRef(fieldResetKey);
  const emptyRef = useRef(!textDraft.trim());

  const placeholder = isAnsweringQuestion
    ? typePlaceholder
    : v.askAnythingPlaceholder;

  function syncSendDisabled(typed: string) {
    if (!sendRef.current) return;
    const action = resolveComposerSendAction({
      isAnsweringQuestion,
      typedText: typed,
    });
    sendRef.current.disabled = action === "disabled";
    sendRef.current.textContent = composerSubmitLabel(isAnsweringQuestion);
    sendRef.current.dataset.sendAction = action;
  }

  function runSend() {
    const next = textRef.current?.value ?? "";
    onTextDraftFlush(next);
    const action = resolveComposerSendAction({
      isAnsweringQuestion,
      typedText: next,
    });
    if (action === "disabled") return;
    if (action === "submit_guide_answer") {
      onSubmitGuideAnswer();
      return;
    }
    onSendMessage();
  }

  const sendActivate = useSamsungActivate(runSend, { consumeGesture: true });

  useEffect(() => {
    const node = textRef.current;
    if (!node) return;
    if (resetKeyRef.current !== fieldResetKey) {
      resetKeyRef.current = fieldResetKey;
      node.value = textDraft;
      emptyRef.current = !textDraft.trim();
    }
    syncSendDisabled(node.value);
    if (wrapRef.current) {
      wrapRef.current.dataset.required =
        showValidationError && emptyRef.current ? "true" : "false";
      wrapRef.current.dataset.answering = isAnsweringQuestion
        ? "true"
        : "false";
    }
  }, [
    fieldResetKey,
    textDraft,
    showValidationError,
    isAnsweringQuestion,
    v.sendMessageLabel,
    v.continueLabel,
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
        onClick={
          listening
            ? onStopListening
            : allowMicrophone
              ? onStartListening
              : undefined
        }
        disabled={(!speechSupported && !listening) || (!allowMicrophone && !listening)}
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
        {listening ? (
          <span className={styles.speakHint}>
            {interimTranscript || "Tap to finish"}
          </span>
        ) : null}
      </button>

      <div className={styles.typeBlock}>
        {showValidationError && answerRequired && !hasAcceptedAnswer ? (
          <p className={styles.requiredHint} role="alert">
            {v.typeRequiredEmptyHint}
          </p>
        ) : null}
        <div
          ref={wrapRef}
          className={styles.typeField}
          data-required={
            showValidationError && !hasAcceptedAnswer ? "true" : "false"
          }
          data-answering={isAnsweringQuestion ? "true" : "false"}
        >
          <textarea
            id={STUDIO_GUIDE_TYPE_FIELD_ID}
            ref={textRef}
            className={styles.typeLine}
            rows={2}
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
                syncSendDisabled(next);
                if (wrapRef.current && showValidationError) {
                  wrapRef.current.dataset.required = empty ? "true" : "false";
                }
              } else {
                syncSendDisabled(next);
              }
              onTextDraftLive(next);
            }}
            onFocus={() => {
              if (listening) onStopListening();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              const next = textRef.current?.value ?? "";
              const action = resolveComposerSendAction({
                isAnsweringQuestion,
                typedText: next,
              });
              if (action === "disabled") return;
              event.preventDefault();
              runSend();
            }}
            aria-required={answerRequired && isAnsweringQuestion ? true : undefined}
            aria-label={placeholder}
          ></textarea>
        </div>
      </div>

      {savedPulse ? (
        <p className={styles.savedCue} aria-live="polite">
          ✓ {v.savedCue}
        </p>
      ) : null}

      {studioVoiceReply ? (
        <p className={styles.voiceReply} aria-live="polite">
          <span className={styles.voiceReplyLabel}>{v.studioVoiceSaysLabel}</span>
          {studioVoiceReply}
        </p>
      ) : null}

      <button
        ref={(node) => {
          sendRef.current = node;
          sendActivate.ref(node);
        }}
        type="button"
        className={styles.sendBtn}
        data-send-action={resolveComposerSendAction({
          isAnsweringQuestion,
          typedText: textDraft,
        })}
        onClick={sendActivate.onClick}
      >
        {composerSubmitLabel(isAnsweringQuestion)}
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
    prev.answerRequired === next.answerRequired &&
    prev.hasAcceptedAnswer === next.hasAcceptedAnswer &&
    prev.showValidationError === next.showValidationError &&
    prev.studioVoiceReply === next.studioVoiceReply &&
    prev.allowMicrophone === next.allowMicrophone
  );
});
