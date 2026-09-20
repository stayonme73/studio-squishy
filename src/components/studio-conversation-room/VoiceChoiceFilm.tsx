"use client";

import { useRef, useState } from "react";

import { voiceChoiceButtonClass } from "@/config/studio-customer-tile-system-v1";
import {
  studioVoicePreferenceV1,
  type StudioVoiceNarrationPreference,
} from "@/config/studio-voice-preference-v1";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import {
  beginStudioPointerSettle,
  suppressSameGestureFollowUp,
  useSamsungActivate,
  useSamsungGateActivate,
} from "@/lib/studio-samsung-activate";
import SamsungDeckBack from "@/components/studio-conversation-room/guide/SamsungDeckBack";
import StudioPointerSettleShield from "@/components/studio-conversation-room/StudioPointerSettleShield";

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
      onClick={(event) => {
        event.preventDefault();
      }}
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
 * myself selects first. Continue commits. Do not start the microphone.
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
  const chosenRef = useRef(chosen);
  chosenRef.current = chosen;
  const continueArmedRef = useRef(selected != null);
  const [continueArmed, setContinueArmed] = useState(selected != null);
  const continueActivate = useSamsungActivate<HTMLAnchorElement>(
    () => {
      const next = chosenRef.current;
      if (!next || !continueArmedRef.current) return;
      beginStudioPointerSettle();
      onChoose(next);
    },
    { consumeGesture: true },
  );

  function select(value: StudioVoiceNarrationPreference) {
    continueArmedRef.current = false;
    setContinueArmed(false);
    setChosen(value);
    beginStudioPointerSettle();
    suppressSameGestureFollowUp(() => {
      window.setTimeout(() => {
        continueArmedRef.current = true;
        setContinueArmed(true);
      }, 400);
    });
  }

  return (
    <div
      className={styles.film}
      data-mobile-customer-spine=""
      data-voice-gate="true"
      data-voice-choice-film="true"
      aria-label="Studio Voice choice"
    >
      <StudioPointerSettleShield />
      <div className={styles.panel} role="group" aria-label={copy.howToContinue}>
        {onBack ? (
          <SamsungDeckBack className={styles.deckBack} onActivate={onBack}>
            ← Back to Let’s Get Started
          </SamsungDeckBack>
        ) : null}
        <h1 className={styles.prompt}>{copy.howToContinue}</h1>
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
              select("on");
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
              select("off");
            }}
          >
            {copy.fillItOutMyself}
          </SamsungChoiceButton>
          <a
            ref={continueActivate.ref}
            href="#studio-voice-continue"
            className={`${styles.cta} lobby-entry-film__cta`}
            data-voice-choice-continue="true"
            aria-disabled={chosen && continueArmed ? undefined : "true"}
            style={chosen && continueArmed ? undefined : { pointerEvents: "none" }}
            onClick={(event) => {
              event.preventDefault();
              continueActivate.onClick(event);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              if (!chosen) return;
              onChoose(chosen);
            }}
          >
            <span>{conversationRoomGuideV1.continueLabel}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
