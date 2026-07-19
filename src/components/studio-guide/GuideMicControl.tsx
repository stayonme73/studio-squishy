"use client";

import { studioGuideConversationV1 } from "@/config/studio-guide-conversation-v1";
import type { GuideSpeechState } from "@/lib/studio-guide-speech-state";

import styles from "./GuideConversationPanel.module.css";

type SharedProps = {
  state: GuideSpeechState;
  onMicTap: () => void;
};

type FeedbackProps = {
  state: GuideSpeechState;
  interimText: string;
  errorMessage: string | null;
  onRetry: () => void;
};

function statusForState(
  state: GuideSpeechState,
  errorMessage: string | null,
): string | null {
  const v = studioGuideConversationV1.voice;
  switch (state) {
    case "requesting_permission":
      return v.statusRequestingPermission;
    case "listening":
      return v.statusListening;
    case "processing":
      return v.statusProcessing;
    case "transcript_ready":
      return v.statusTranscriptReady;
    case "error":
      return errorMessage ?? v.statusProviderError;
    case "unsupported":
      return errorMessage ?? v.statusUnsupported;
    default:
      return null;
  }
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={styles.micIcon}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d={
          active
            ? "M12 14a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 14zm5.2-3.5a5.2 5.2 0 0 1-10.4 0H5a7 7 0 0 0 6 6.9V20H9v2h6v-2h-2v-2.6a7 7 0 0 0 6-6.9h-1.8z"
            : "M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V20H9v2h6v-2h-2v-2.08A7 7 0 0 0 19 11h-2z"
        }
      />
    </svg>
  );
}

/** Icon mic control — sits inside the answer field (right side). */
export function GuideMicFieldButton({ state, onMicTap }: SharedProps) {
  const v = studioGuideConversationV1.voice;
  if (state === "unsupported") return null;

  const listening = state === "listening" || state === "processing";
  const busy = state === "requesting_permission" || state === "processing";

  return (
    <button
      type="button"
      className={styles.micFieldButton}
      data-listening={listening ? "true" : "false"}
      data-busy={busy ? "true" : "false"}
      aria-pressed={listening}
      aria-label={listening ? v.micStopLabel : v.micStartLabel}
      title={listening ? v.micStopLabel : v.micStartLabel}
      onClick={onMicTap}
    >
      <MicIcon active={listening} />
    </button>
  );
}

/** Privacy, status, interim preview, and retry — below the answer field. */
export default function GuideMicControl({
  state,
  interimText,
  errorMessage,
  onRetry,
}: FeedbackProps) {
  const v = studioGuideConversationV1.voice;
  const status = statusForState(state, errorMessage);
  const showRetry = state === "error";
  const showStatus =
    status &&
    (state === "requesting_permission" ||
      state === "listening" ||
      state === "processing" ||
      state === "error" ||
      state === "unsupported" ||
      state === "transcript_ready");

  return (
    <div className={styles.voiceBlock}>
      <p className={styles.voicePrivacy}>{v.privacyNote}</p>
      {showStatus ? (
        <p
          className={styles.voiceStatus}
          data-voice-state={state}
          role={state === "error" || state === "unsupported" ? "alert" : undefined}
          aria-live="polite"
        >
          {state === "processing" ? (
            <span className={styles.voiceSpinner} aria-hidden="true" />
          ) : null}
          {status}
        </p>
      ) : null}
      {state === "listening" && interimText ? (
        <p className={styles.voiceInterim} aria-live="polite">
          <span className={styles.voiceInterimLabel}>{v.interimPreviewLabel}: </span>
          {interimText}
        </p>
      ) : null}
      {showRetry ? (
        <button type="button" className={styles.secondary} onClick={onRetry}>
          {v.micRetryLabel}
        </button>
      ) : null}
    </div>
  );
}
