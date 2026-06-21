"use client";

import { useEffect, useState } from "react";

import { studioBoard } from "@/config/studio-board";

const { inspirationTicker: copy } = studioBoard;

const FADE_MS = 520;

/** Studio banner — one calm message at a time, subtle fade (no marquee). */
export default function InspirationTicker() {
  const quotes = copy.quotes;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (quotes.length <= 1) return;

    let fadeTimeout: number | undefined;

    const interval = window.setInterval(() => {
      setVisible(false);
      fadeTimeout = window.setTimeout(() => {
        setIndex((current) => (current + 1) % quotes.length);
        setVisible(true);
      }, FADE_MS);
    }, copy.intervalMs);

    return () => {
      window.clearInterval(interval);
      if (fadeTimeout !== undefined) window.clearTimeout(fadeTimeout);
    };
  }, [quotes.length]);

  const message = quotes[index] ?? quotes[0];

  return (
    <div className="sb-ticker" aria-live="polite" aria-atomic="true">
      <p className={`sb-ticker__message${visible ? " sb-ticker__message--visible" : ""}`}>
        <span className="sb-ticker__pin" aria-hidden>
          {copy.pin}
        </span>
        {message}
      </p>
    </div>
  );
}
