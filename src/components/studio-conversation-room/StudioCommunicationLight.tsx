"use client";

import {
  studioConversationRoomV1,
  type StudioCommunicationLightState,
} from "@/config/studio-conversation-room-v1";
import styles from "@/components/studio-conversation-room/studio-communication-light.module.css";

export type StudioCommunicationLightProps = {
  state?: StudioCommunicationLightState;
  className?: string;
};

/**
 * Studio Communication Light — ambient presence cue (not the whole Presence System).
 * Environmental glow partner to Voice Activity Bar.
 * No mascot, host, face, avatar, or printed status labels on the orb.
 */
export default function StudioCommunicationLight({
  state = "idle",
  className,
}: StudioCommunicationLightProps) {
  const label = studioConversationRoomV1.lightStateLabels[state];

  return (
    <div
      className={[styles.wrap, className ?? ""].filter(Boolean).join(" ")}
      role="status"
      aria-label={label}
    >
      <div className={styles.orb} data-state={state} aria-hidden />
    </div>
  );
}
