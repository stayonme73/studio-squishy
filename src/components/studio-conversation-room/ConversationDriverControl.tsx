"use client";

import {
  studioConversationDriverV1,
  type ConversationDriver,
} from "@/config/studio-conversation-driver-v1";
import styles from "@/components/studio-conversation-room/conversation-driver-control.module.css";

export type ConversationDriverControlProps = {
  driver: ConversationDriver;
  onTakeControl: () => void;
  onResumeVoice: () => void;
  /** Compact strip for tablet status (read-only + optional handoff). */
  variant?: "presentation" | "tablet";
  /**
   * When false, shows Current Driver status only (handoff lives in Voice assist).
   * Default true.
   */
  showHandoffCta?: boolean;
};

/**
 * Current Driver baton — only one active driver at a time.
 */
export default function ConversationDriverControl({
  driver,
  onTakeControl,
  onResumeVoice,
  variant = "presentation",
  showHandoffCta = true,
}: ConversationDriverControlProps) {
  const { labels } = studioConversationDriverV1;
  const isVoice = driver === "studio-voice";

  return (
    <div
      className={styles.root}
      data-driver={driver}
      data-variant={variant}
      role="group"
      aria-label={labels.currentDriver}
    >
      <p className={styles.eyebrow}>{labels.currentDriver}</p>
      <div className={styles.row}>
        <span className={styles.active} data-active={isVoice ? "true" : "false"}>
          <span className={styles.dot} aria-hidden />
          {labels.studioVoice}
        </span>
        <span
          className={styles.active}
          data-active={!isVoice ? "true" : "false"}
        >
          <span className={styles.dot} aria-hidden />
          {labels.customer}
        </span>
      </div>
      {showHandoffCta ? (
        isVoice ? (
          <button type="button" className={styles.cta} onClick={onTakeControl}>
            {labels.takeControl}
          </button>
        ) : (
          <button type="button" className={styles.cta} onClick={onResumeVoice}>
            {labels.resumeVoice}
          </button>
        )
      ) : null}
    </div>
  );
}
