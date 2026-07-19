"use client";

import {
  studioConversationDriverV1,
  type VoiceModeAssistControl,
} from "@/config/studio-conversation-driver-v1";
import styles from "@/components/studio-conversation-room/voice-assist-controls.module.css";

const CONTROL_LABELS: Record<VoiceModeAssistControl, string> = {
  pause: "Pause",
  repeat: "Repeat",
  "slow-down": "Slow down",
  "go-back": "Go back",
  "take-over": "Answer Myself",
  "ask-question": "Ask a question",
};

export type VoiceAssistControlsProps = {
  onAssist: (control: VoiceModeAssistControl) => void;
  /** Controls that are wired now (others remain visible but show scaffold note). */
  enabled?: Partial<Record<VoiceModeAssistControl, boolean>>;
};

/**
 * Studio Voice mode — customer may assist without driving answer entry.
 * Answer choices stay inactive until they take over.
 */
export default function VoiceAssistControls({
  onAssist,
  enabled = {
    "go-back": true,
    "take-over": true,
  },
}: VoiceAssistControlsProps) {
  return (
    <div
      className={styles.root}
      role="toolbar"
      aria-label="Voice assist controls"
    >
      <p className={styles.hint}>
        Optional: pause, repeat, or slow Voice down while you listen.
      </p>
      <div className={styles.row}>
        {studioConversationDriverV1.voiceModeAssistControls.map((control) => {
          /* Explicit false = hidden (primary answer entry lives elsewhere). */
          if (enabled[control] === false) return null;
          const isWired = enabled[control] === true;
          return (
            <button
              key={control}
              type="button"
              className={styles.btn}
              data-primary={control === "take-over" ? "true" : "false"}
              data-scaffold={isWired ? "false" : "true"}
              onClick={() => onAssist(control)}
            >
              {CONTROL_LABELS[control]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
