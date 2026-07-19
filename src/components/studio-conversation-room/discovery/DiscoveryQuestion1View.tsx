"use client";

import { useEffect, useRef } from "react";

import styles from "@/components/studio-conversation-room/discovery/discovery-question-1.module.css";
import {
  discoveryQuestion1V1,
  getDiscoveryLiveQuestion,
  type DiscoveryQuestionStorageKey,
} from "@/config/discovery-question-1-v1";
import type { DiscoveryQuestionRecord } from "@/lib/discovery-question-1";

export type DiscoveryCapturedEntry = {
  question: string;
  answer: string;
  capturedAt: string | null;
};

export type DiscoveryQuestion1ViewProps = {
  /** @deprecated One-tablet layout — always the interactive tablet. */
  surface?: "presentation" | "tablet";
  record: DiscoveryQuestionRecord;
  questionText: string;
  storageKey: DiscoveryQuestionStorageKey;
  discoveryComplete?: boolean;
  interimTranscript?: string;
  speechSupported: boolean;
  error?: string | null;
  textDraft: string;
  draftSavedPulse?: boolean;
  onTextDraftChange: (value: string) => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onSaveText: () => void;
  onChipSelect: (chip: string) => void;
};

/**
 * One-tablet Discovery conversation.
 * Chips (fastest) · mic · type — answer chrome never leaves.
 */
export default function DiscoveryQuestion1View({
  record,
  questionText,
  storageKey,
  discoveryComplete = false,
  interimTranscript = "",
  speechSupported,
  error,
  textDraft,
  draftSavedPulse = false,
  onTextDraftChange,
  onStartListening,
  onStopListening,
  onSaveText,
  onChipSelect,
}: DiscoveryQuestion1ViewProps) {
  const labels = discoveryQuestion1V1.labels;
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const listening = record.phase === "listening";
  const filing =
    record.phase === "captured" ||
    record.phase === "processing" ||
    record.phase === "acknowledging";
  const chips = getDiscoveryLiveQuestion(storageKey).exampleChips;

  useEffect(() => {
    if (textDraft) {
      textRef.current?.focus();
    }
  }, [textDraft]);

  return (
    <section
      className={styles.root}
      data-surface="tablet"
      data-phase={record.phase}
      data-draft-pulse={draftSavedPulse ? "true" : undefined}
      data-complete={discoveryComplete ? "true" : undefined}
      aria-label="Studio conversation tablet"
    >
      <div className={styles.tabletTop}>
        <p className={styles.tabletEyebrow}>{labels.discoveryEyebrow}</p>
        <p className={styles.question}>{questionText}</p>

        {discoveryComplete ? (
          <p className={styles.discoveryComplete}>{labels.discoveryComplete}</p>
        ) : null}

        {record.answer && filing ? (
          <p className={styles.transcript}>&ldquo;{record.answer}&rdquo;</p>
        ) : null}

        {record.phase === "processing" ? (
          <p className={styles.status} aria-live="polite">
            {labels.processing}
          </p>
        ) : null}

        {draftSavedPulse ? (
          <p className={styles.filedCue} aria-hidden="true">
            ✓ {labels.filed}
          </p>
        ) : null}

        {error ? <p className={styles.error}>{error}</p> : null}
      </div>

      {/* Permanent — never hide for complete / next section / free speak. */}
      <div className={styles.conversationAnswer} data-permanent="true">
        {!discoveryComplete && chips.length > 0 ? (
          <div className={styles.chipBlock}>
            <p className={styles.chipHint}>{labels.examplesHint}</p>
            <div className={styles.chipRow} role="list">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={styles.chip}
                  role="listitem"
                  disabled={filing}
                  onClick={() => onChipSelect(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className={styles.speakZone}
          data-active={listening ? "true" : "false"}
          onClick={listening ? onStopListening : onStartListening}
          disabled={(!speechSupported && !listening) || filing}
          aria-label={listening ? labels.stopSpeaking : labels.speak}
        >
          <span className={styles.micRing} aria-hidden="true">
            <svg
              className={styles.micIcon}
              viewBox="0 0 24 24"
              width="24"
              height="24"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V20H9v2h6v-2h-2v-2.08A7 7 0 0 0 19 11h-2z"
              />
            </svg>
          </span>
          <span className={styles.speakZoneTitle}>
            {listening ? labels.listening : labels.speak}
          </span>
          <span className={styles.speakZoneHint}>
            {listening
              ? interimTranscript || labels.stopSpeaking
              : labels.speakHint}
          </span>
        </button>

        <div className={styles.answerOr} aria-hidden="true">
          <span className={styles.answerOrRule} />
          <span className={styles.answerOrLabel}>{labels.or}</span>
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
                {labels.typeYourAnswer}
              </span>
            ) : null}
            <textarea
              ref={textRef}
              className={styles.typeLine}
              value={textDraft}
              onChange={(event) => onTextDraftChange(event.target.value)}
              onFocus={() => {
                if (listening) onStopListening();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && textDraft.trim()) {
                  event.preventDefault();
                  onSaveText();
                }
              }}
              placeholder=" "
              aria-label={labels.typeYourAnswer}
              rows={2}
              disabled={filing}
            />
          </span>
        </label>
      </div>
    </section>
  );
}
