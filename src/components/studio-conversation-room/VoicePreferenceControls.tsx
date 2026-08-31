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
   * Selected side uses the accepted Welcome / Voice Choice CTA
   * (`lobby-entry-film__cta`).
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
            role="button"
            tabIndex={0}
            className={
              preference === "on"
                ? `lobby-entry-film__cta ${styles.cta}`
                : styles.filmIdle
            }
            aria-pressed={preference === "on"}
            data-voice-pref="on"
            onClick={activateOn.onClick}
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
            role="button"
            tabIndex={0}
            className={
              preference === "off"
                ? `lobby-entry-film__cta ${styles.cta}`
                : styles.filmIdle
            }
            aria-pressed={preference === "off"}
            data-voice-pref="off"
            onClick={activateOff.onClick}
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
