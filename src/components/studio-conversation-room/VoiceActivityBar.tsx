"use client";

import styles from "@/components/studio-conversation-room/voice-activity-bar.module.css";
import type { StudioPresenceSnapshot } from "@/lib/studio-conversation-framework";

const SEGMENT_COUNT = 16;

export type VoiceActivityBarProps = {
  presence: StudioPresenceSnapshot;
  className?: string;
};

/**
 * Narrow strip under Presentation Display — who is speaking + audio is working.
 * Labels are runtime Presence copy (not Communication Light hardware captions).
 */
export default function VoiceActivityBar({
  presence,
  className,
}: VoiceActivityBarProps) {
  const showTranscript =
    Boolean(presence.capturedTranscript) &&
    (presence.activity === "customer-speaking" ||
      presence.activity === "customer-answering" ||
      presence.activity === "captured");

  return (
    <div
      className={[styles.bar, className ?? ""].filter(Boolean).join(" ")}
      data-activity={presence.activity}
      role="status"
      aria-live="polite"
      aria-label={presence.activityLabel ?? "Studio quiet"}
    >
      <div className={styles.row}>
        <div className={styles.wave} aria-hidden>
          {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
            <span key={index} className={styles.seg} />
          ))}
        </div>
        {presence.activityLabel ? (
          <p className={styles.label}>{presence.activityLabel}</p>
        ) : null}
      </div>

      {showTranscript ? (
        <p className={styles.transcript}>
          &ldquo;{presence.capturedTranscript}&rdquo;
        </p>
      ) : null}

      {presence.capturedConfirmed ? (
        <p className={styles.capturedMark}>✓ Captured</p>
      ) : null}
    </div>
  );
}
