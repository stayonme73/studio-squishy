"use client";

import { useCallback, useRef, type RefCallback } from "react";

import {
  studioVoicePreferenceV1,
  type StudioVoiceNarrationPreference,
} from "@/config/studio-voice-preference-v1";

import styles from "./voice-choice-film.module.css";

export type VoiceChoiceFilmProps = {
  onChoose: (value: StudioVoiceNarrationPreference) => void;
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
  action,
}: {
  children: string;
  onActivate: () => void;
  action: "on" | "off";
}) {
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;
  const lastAt = useRef(0);
  const nodeRef = useRef<HTMLAnchorElement | null>(null);
  const onEvent = useRef((event: Event) => {
    const now = Date.now();
    if (now - lastAt.current < 400) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    lastAt.current = now;
    event.preventDefault();
    event.stopPropagation();
    onActivateRef.current();
  }).current;
  const ref: RefCallback<HTMLAnchorElement> = useCallback(
    (node) => {
      const prev = nodeRef.current;
      if (prev) {
        prev.removeEventListener("pointerdown", onEvent);
        prev.removeEventListener("click", onEvent);
      }
      nodeRef.current = node;
      if (node) {
        node.addEventListener("pointerdown", onEvent);
        node.addEventListener("click", onEvent);
      }
    },
    [onEvent],
  );
  return (
    <a
      ref={ref}
      role="button"
      tabIndex={0}
      className={`lobby-entry-film__cta ${styles.cta}`}
      data-voice-choice-action={action}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onActivate();
      }}
    >
      {children}
    </a>
  );
}

/**
 * First-entry Voice Choice — OWNER ACCEPTED 2026-08-29 (Samsung).
 * Welcome-master film. Do not alter layout, glass, Lounge crop, typography,
 * colors, buttons, spacing, or Studio Review in subsequent Mobile work.
 */
export default function VoiceChoiceFilm({
  onChoose,
  privacyNote,
}: VoiceChoiceFilmProps) {
  const { copy } = studioVoicePreferenceV1;

  return (
    <div
      className={styles.film}
      data-mobile-customer-spine=""
      data-voice-gate="true"
      data-voice-choice-film="true"
      aria-label="Studio Voice choice"
    >
      <div className={styles.plate} aria-hidden />
      <div className={styles.veil} aria-hidden />
      <div className={styles.panel} role="group" aria-label={copy.howToContinue}>
        <p className={styles.prompt}>{copy.howToContinue}</p>
        {privacyNote ? (
          <p className={styles.privacy}>{renderPrivacyNote(privacyNote)}</p>
        ) : null}
        <div className={styles.actions}>
          <SamsungChoiceButton action="on" onActivate={() => onChoose("on")}>
            {copy.useVoiceGuidance}
          </SamsungChoiceButton>
          <SamsungChoiceButton action="off" onActivate={() => onChoose("off")}>
            {copy.fillItOutMyself}
          </SamsungChoiceButton>
        </div>
      </div>
    </div>
  );
}
