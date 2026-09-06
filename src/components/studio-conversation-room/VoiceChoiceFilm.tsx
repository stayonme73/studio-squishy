"use client";

import { useState } from "react";

import { voiceChoiceButtonClass } from "@/config/studio-customer-tile-system-v1";
import {
  studioVoicePreferenceV1,
  type StudioVoiceNarrationPreference,
} from "@/config/studio-voice-preference-v1";
import { useSamsungGateActivate } from "@/lib/studio-samsung-activate";

import styles from "./voice-choice-film.module.css";

export type VoiceChoiceFilmProps = {
  onChoose: (value: StudioVoiceNarrationPreference) => void;
  onBack?: () => void;
  selected?: StudioVoiceNarrationPreference | null;
  privacyNote?: string;
};

function renderPrivacyNote(note: string) {
  const marker = "The Studio";
  const at = note.indexOf(marker);
  if (at <= 0) return note;
  return (
    <>
      {note.slice(0, at).trimEnd()}
      <br />
      {note.slice(at)}
    </>
  );
}

function SamsungChoiceButton({
  children,
  onActivate,
  onPress,
  action,
  selected,
}: {
  children: string;
  onActivate: () => void;
  onPress: () => void;
  action: "on" | "off";
  selected: boolean;
}) {
  const activate = useSamsungGateActivate<HTMLAnchorElement>(onActivate, {
    onPress,
  });
  return (
    <a
      ref={activate.ref}
      href="#studio-voice-choice"
      className={`${styles.cta} ${voiceChoiceButtonClass(selected)}`}
      data-voice-choice-action={action}
      aria-pressed={selected}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onActivate();
      }}
    >
      <span>{children}</span>
    </a>
  );
}

/**
 * First-entry Voice Choice — OWNER ACCEPTED 2026-08-29 (Samsung) for
 * Lounge glass / panel. Buttons are the same Welcome `<a>` CTA as
 * Let’s Get Started / Sign In (`lobby-entry-film__cta`). Fill it out
 * myself still commits on finger-up and must not start the microphone.
 */
export default function VoiceChoiceFilm({
  onChoose,
  onBack,
  selected = null,
  privacyNote,
}: VoiceChoiceFilmProps) {
  const { copy } = studioVoicePreferenceV1;
  const [chosen, setChosen] = useState<StudioVoiceNarrationPreference | null>(
    selected,
  );

  function choose(value: StudioVoiceNarrationPreference) {
    setChosen(value);
    onChoose(value);
  }

  return (
    <div
      className={styles.film}
      data-mobile-customer-spine=""
      data-voice-gate="true"
      data-voice-choice-film="true"
      aria-label="Studio Voice choice"
    >
      <div className={styles.panel} role="group" aria-label={copy.howToContinue}>
        {onBack ? (
          <button
            type="button"
            className={styles.deckBack}
            data-pre-checkout-deck-back=""
            onClick={onBack}
          >
            ← Back to Let’s Get Started
          </button>
        ) : null}
        <p className={styles.prompt}>{copy.howToContinue}</p>
        {privacyNote ? (
          <p className={styles.privacy}>{renderPrivacyNote(privacyNote)}</p>
        ) : null}
        <div className={styles.actions}>
          <SamsungChoiceButton
            action="on"
            selected={chosen === "on"}
            onPress={() => {
              /* Paint only. React setState here rebinds Samsung pointerup. */
            }}
            onActivate={() => {
              choose("on");
            }}
          >
            {copy.useVoiceGuidance}
          </SamsungChoiceButton>
          <SamsungChoiceButton
            action="off"
            selected={chosen === "off"}
            onPress={() => {
              /* Paint only. React setState here rebinds Samsung pointerup. */
            }}
            onActivate={() => {
              choose("off");
            }}
          >
            {copy.fillItOutMyself}
          </SamsungChoiceButton>
        </div>
      </div>
    </div>
  );
}
