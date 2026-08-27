"use client";

import {
  studioVoicePreferenceV1,
  type StudioVoiceNarrationPreference,
} from "@/config/studio-voice-preference-v1";
import { useSamsungActivate } from "@/lib/studio-samsung-activate";

import styles from "./voice-preference-controls.module.css";

export type VoicePreferenceControlsProps = {
  preference: StudioVoiceNarrationPreference | null;
  onChoose: (value: StudioVoiceNarrationPreference) => void;
  /** Shown only on the first-entry gate — not repeated under an active question. */
  privacyNote?: string;
};

function SamsungChoiceButton({
  className,
  children,
  onActivate,
}: {
  className: string;
  children: string;
  onActivate: () => void;
}) {
  const activate = useSamsungActivate<HTMLButtonElement>(onActivate, {
    consumeGesture: true,
  });
  return (
    <button
      ref={activate.ref}
      type="button"
      className={className}
      onClick={activate.onClick}
    >
      {children}
    </button>
  );
}

/**
 * Conversation Room only — first-entry choice + persistent Voice On/Off.
 * Does not touch Lobby Voice.
 */
export default function VoicePreferenceControls({
  preference,
  onChoose,
  privacyNote,
}: VoicePreferenceControlsProps) {
  const { copy } = studioVoicePreferenceV1;

  if (preference === null) {
    return (
      <div className={styles.root} data-voice-gate="true">
        <div
          className={styles.choice}
          role="group"
          aria-label={copy.howToContinue}
        >
          <p className={styles.choicePrompt}>{copy.howToContinue}</p>
          {privacyNote ? (
            <p className={styles.privacyNote}>{privacyNote}</p>
          ) : null}
          <div className={styles.choiceActions}>
            <SamsungChoiceButton
              className={styles.choiceOption}
              onActivate={() => onChoose("on")}
            >
              {copy.useVoiceGuidance}
            </SamsungChoiceButton>
            <SamsungChoiceButton
              className={styles.choiceOption}
              onActivate={() => onChoose("off")}
            >
              {copy.fillItOutMyself}
            </SamsungChoiceButton>
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
