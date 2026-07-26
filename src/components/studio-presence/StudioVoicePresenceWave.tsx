/**
 * Studio Voice presence wave — shared signature across Lobby + Conversation Room.
 * Presence cue only (who is speaking / audio alive). Not a mascot or character.
 *
 * @see docs/studio-presence-system-v1-locked.md
 */

import styles from "@/components/studio-presence/studio-voice-presence-wave.module.css";
import {
  presenceActivityLabel,
  type StudioPresenceActivity,
} from "@/config/studio-presence-system-v1";

const SEGMENT_COUNT = 16;

export type StudioVoicePresenceWaveProps = {
  activity: StudioPresenceActivity;
  /** Hide the runtime label (wave only). */
  hideLabel?: boolean;
  /** Slightly denser for Lobby chrome bubble. */
  compact?: boolean;
  className?: string;
};

export default function StudioVoicePresenceWave({
  activity,
  hideLabel = false,
  compact = false,
  className,
}: StudioVoicePresenceWaveProps) {
  const label = hideLabel ? null : presenceActivityLabel(activity);

  return (
    <div
      className={[
        styles.wrap,
        compact ? styles.compact : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-activity={activity}
      data-studio-voice-presence="wave"
      role="status"
      aria-live="polite"
      aria-label={label ?? "Studio Voice quiet"}
    >
      <div className={styles.wave} aria-hidden>
        {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
          <span key={index} className={styles.seg} />
        ))}
      </div>
      {label ? <p className={styles.label}>{label}</p> : null}
    </div>
  );
}
