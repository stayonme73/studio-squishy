"use client";

import StudioVoicePresenceWave from "@/components/studio-presence/StudioVoicePresenceWave";
import styles from "@/components/studio-conversation-room/voice-activity-bar.module.css";
import type { StudioPresenceSnapshot } from "@/lib/studio-conversation-framework";

export type VoiceActivityBarProps = {
  presence: StudioPresenceSnapshot;
  className?: string;
};

/**
 * Narrow strip under Presentation Display — who is speaking + audio is working.
 * Shared Studio Voice presence wave.
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
      <StudioVoicePresenceWave
        activity={presence.activity}
        hideLabel={!presence.activityLabel}
      />

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
