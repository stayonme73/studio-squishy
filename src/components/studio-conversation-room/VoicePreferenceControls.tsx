"use client";

import {
  studioVoicePreferenceV1,
  type StudioVoiceNarrationPreference,
} from "@/config/studio-voice-preference-v1";

import styles from "./voice-preference-controls.module.css";

export type VoicePreferenceControlsProps = {
  preference: StudioVoiceNarrationPreference | null;
  onChoose: (value: StudioVoiceNarrationPreference) => void;
};

/**
 * Conversation Room only — first-entry choice + persistent Voice On/Off.
 * Does not touch Lobby Voice.
 */
export default function VoicePreferenceControls({
  preference,
  onChoose,
}: VoicePreferenceControlsProps) {
  const { copy } = studioVoicePreferenceV1;

  if (preference === null) {
    return (
      <div className={styles.root}>
        <div
          className={styles.choice}
          role="group"
          aria-label={copy.howToContinue}
        >
          <p className={styles.choicePrompt}>{copy.howToContinue}</p>
          <div className={styles.choiceActions}>
            <button
              type="button"
              className={styles.choiceOption}
              onClick={() => onChoose("on")}
            >
              {copy.useVoiceGuidance}
            </button>
            <button
              type="button"
              className={styles.choiceOption}
              onClick={() => onChoose("off")}
            >
              {copy.fillItOutMyself}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div
        className={styles.toggle}
        role="group"
        aria-label={copy.persistentGroupAria}
      >
        <button
          type="button"
          className={styles.toggleOn}
          data-active={preference === "on" ? "true" : "false"}
          aria-pressed={preference === "on"}
          onClick={() => onChoose("on")}
        >
          {copy.voiceOn}
        </button>
        <button
          type="button"
          className={styles.toggleOff}
          data-active={preference === "off" ? "true" : "false"}
          aria-pressed={preference === "off"}
          onClick={() => onChoose("off")}
        >
          {copy.voiceOff}
        </button>
      </div>
    </div>
  );
}
