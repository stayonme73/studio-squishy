"use client";

import { useRef, useState } from "react";

import {
  getConversationSpeechAvailability,
  startConversationDictation,
  stopConversationDictation,
} from "@/lib/studio-conversation-speech";
import { cancelKaylaPlayback, playKaylaReply } from "@/lib/studio-kayla-playback";

type Turn = { role: "owner" | "squishy"; text: string };

type OwnerDeskSquishyAskProps = {
  campaignName: string;
  title: string;
  squishySays: string;
  whyReached: string;
};

export function OwnerDeskSquishyAsk({
  campaignName,
  title,
  squishySays,
  whyReached,
}: OwnerDeskSquishyAskProps) {
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [reply, setReply] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const requestRef = useRef(0);
  const canListen = getConversationSpeechAvailability().canListen;

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    requestRef.current += 1;
    const token = requestRef.current;
    cancelKaylaPlayback();
    stopConversationDictation();
    setListening(false);
    setDraft("");
    setNote(null);
    try {
      const response = await fetch("/api/studio-owner-desk/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          turns,
          folder: { campaignName, title, squishySays, whyReached },
        }),
      });
      const payload = (await response.json()) as {
        say?: string;
        speech?: { provider?: string; audioBase64?: string; reason?: string };
        error?: string;
      };
      if (requestRef.current !== token) return;
      if (!response.ok || !payload.say) {
        setNote(payload.error ?? "Squishy could not answer from this folder.");
        return;
      }
      const say = payload.say;
      setReply(say);
      setTurns((current) =>
        [...current, { role: "owner" as const, text: trimmed }, { role: "squishy" as const, text: say }].slice(-6),
      );
      if (payload.speech?.provider === "elevenlabs" && payload.speech.audioBase64) {
        await playKaylaReply({ audioBase64: payload.speech.audioBase64 });
        return;
      }
      setNote("Kayla could not speak. The written answer is still here.");
    } catch {
      if (requestRef.current === token) setNote("Squishy could not answer from this folder.");
    }
  }

  function listen() {
    cancelKaylaPlayback();
    setNote(null);
    startConversationDictation({
      onListeningStarted: () => setListening(true),
      onInterim: (text) => setDraft(text),
      onFinal: (text) => {
        setListening(false);
        const trimmed = text.trim();
        if (!trimmed) {
          setNote("I did not catch that. You can type the question.");
          return;
        }
        void ask(trimmed);
      },
      onPermissionDenied: () => {
        setListening(false);
        setNote("Microphone permission is needed. You can type the question.");
      },
      onError: () => {
        setListening(false);
        setNote("I did not catch that. You can type the question.");
      },
      onEnded: () => setListening(false),
    });
  }

  return (
    <form
      className="fr-owner-sequential__squishy-ask"
      onSubmit={(event) => {
        event.preventDefault();
        void ask(draft);
      }}
    >
      <label className="fr-owner-sequential__squishy-ask-label" htmlFor="owner-desk-squishy-question">
        Ask Squishy about this folder
      </label>
      <div className="fr-owner-sequential__squishy-ask-row">
        <input
          id="owner-desk-squishy-question"
          className="fr-owner-sequential__squishy-ask-input"
          value={draft}
          placeholder="Ask about this folder"
          onChange={(event) => setDraft(event.target.value)}
        />
        {canListen ? (
          <button type="button" className="utility-btn" onClick={listening ? stopConversationDictation : listen}>
            {listening ? "Stop" : "Speak"}
          </button>
        ) : null}
        <button type="submit" className="utility-btn utility-btn--primary">
          Ask
        </button>
      </div>
      {reply ? (
        <p className="fr-owner-sequential__squishy-says">
          <span className="fr-owner-sequential__squishy-says-label">Squishy: </span>
          {reply}
        </p>
      ) : null}
      {note ? <p className="fr-owner-sequential__squishy-ask-note">{note}</p> : null}
    </form>
  );
}
