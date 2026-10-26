"use client";

import { useSamsungActivate } from "@/lib/studio-samsung-activate";
import {
  studioVoicePreferenceV1,
  type StudioVoiceNarrationPreference,
} from "@/config/studio-voice-preference-v1";

import styles from "./voice-preference-controls.module.css";

export type VoicePreferenceControlsProps = {
  preference: StudioVoiceNarrationPreference;
  onChoose: (value: StudioVoiceNarrationPreference) => void;
  /**
   * Opening-question film family, Choose Your Route, and Your project so far.
   * Voice On/Off are selection controls, not primary-action buttons.
   */
  filmFamily?: boolean;
};

/**
 * Persistent Voice On/Off after the first-entry film.
 * First-entry presentation lives in VoiceChoiceFilm — not this toggle.
 */
export default function VoicePreferenceControls({
  preference,
  onChoose,
  filmFamily = false,
}: VoicePreferenceControlsProps) {
  const { copy } = studioVoicePreferenceV1;
  const activateOn = useSamsungActivate(() => onChoose("on"), {
    consumeGesture: true,
  });
  const activateOff = useSamsungActivate(() => onChoose("off"), {
    consumeGesture: true,
  });

  if (filmFamily) {
    return (
      <div className={styles.root} data-film-family="true">
        <div
          className={styles.filmToggle}
          role="group"
          aria-label={copy.persistentGroupAria}
        >
          <a
            ref={activateOn.ref}
            href="#studio-voice-pref"
            role="button"
            tabIndex={0}
            className={
              preference === "on" ? styles.cta : styles.filmIdle
            }
            aria-pressed={preference === "on"}
            data-voice-pref="on"
            onClick={(event) => {
              event.preventDefault();
              activateOn.onClick(event);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onChoose("on");
            }}
          >
            {copy.voiceOn}
          </a>
          <a
            ref={activateOff.ref}
            href="#studio-voice-pref"
            role="button"
            tabIndex={0}
            className={
              preference === "off" ? styles.cta : styles.filmIdle
            }
            aria-pressed={preference === "off"}
            data-voice-pref="off"
            onClick={(event) => {
              event.preventDefault();
              activateOff.onClick(event);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onChoose("off");
            }}
          >
            {copy.voiceOff}
          </a>
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
          ref={activateOn.ref}
          className={styles.toggleOn}
          data-voice-pref="on"
          data-active={preference === "on" ? "true" : "false"}
          aria-pressed={preference === "on"}
          onClick={activateOn.onClick}
        >
          {copy.voiceOn}
        </button>
        <button
          type="button"
          ref={activateOff.ref}
          className={styles.toggleOff}
          data-voice-pref="off"
          data-active={preference === "off" ? "true" : "false"}
          aria-pressed={preference === "off"}
          onClick={activateOff.onClick}
        >
          {copy.voiceOff}
        </button>
      </div>
    </div>
  );
}
