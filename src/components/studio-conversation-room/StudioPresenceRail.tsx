"use client";

import StudioCommunicationLight from "@/components/studio-conversation-room/StudioCommunicationLight";
import VoiceActivityBar from "@/components/studio-conversation-room/VoiceActivityBar";
import styles from "@/components/studio-conversation-room/studio-presence-rail.module.css";
import {
  presenceGlowBias,
  type StudioPresenceSnapshot,
} from "@/lib/studio-conversation-framework";

export type StudioPresenceRailProps = {
  presence: StudioPresenceSnapshot;
  className?: string;
};

/**
 * Presence hierarchy under Presentation Display:
 * Voice Activity Bar → Communication Glow (ambient light).
 */
export default function StudioPresenceRail({
  presence,
  className,
}: StudioPresenceRailProps) {
  const bias = presenceGlowBias(presence.activity);

  return (
    <div
      className={[styles.rail, className ?? ""].filter(Boolean).join(" ")}
      data-studio-surface="presence-rail"
      data-presence-activity={presence.activity}
    >
      <VoiceActivityBar presence={presence} />
      <div className={styles.glowBand} data-bias={bias} aria-hidden>
        <StudioCommunicationLight state={presence.lightState} />
      </div>
    </div>
  );
}
