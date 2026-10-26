"use client";

import { useEffect, useState } from "react";

const STATUS_MESSAGES = [
  "Reviewing your goals...",
  "Organizing your priorities...",
  "Matching Studio Services...",
  "Preparing your Studio Plan...",
] as const;

const MESSAGE_CYCLE_MS = 1750;

export default function DiscoveryReviewingPanel() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, MESSAGE_CYCLE_MS);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <aside
      className="bds-reviewing-panel"
      aria-labelledby="bds-reviewing-title"
      aria-describedby="bds-reviewing-message bds-reviewing-status"
    >
      <div className="bds-reviewing-panel__inner">
        <div className="bds-reviewing-panel__canvas" aria-hidden="true">
          <svg
            className="bds-reviewing-panel__svg"
            viewBox="0 0 280 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="bds-reviewing-sketch bds-reviewing-sketch--1"
              d="M24 148 C52 118, 88 132, 112 108"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              className="bds-reviewing-sketch bds-reviewing-sketch--2"
              d="M112 108 C138 88, 168 96, 196 72"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              className="bds-reviewing-connect bds-reviewing-connect--1"
              d="M196 72 L228 52"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <path
              className="bds-reviewing-connect bds-reviewing-connect--2"
              d="M112 108 L148 138"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <circle className="bds-reviewing-dot bds-reviewing-dot--1" cx="112" cy="108" r="3.5" />
            <circle className="bds-reviewing-dot bds-reviewing-dot--2" cx="196" cy="72" r="3.5" />
            <circle className="bds-reviewing-dot bds-reviewing-dot--3" cx="228" cy="52" r="3.5" />

            <g className="bds-reviewing-note bds-reviewing-note--1">
              <rect x="36" y="36" width="44" height="36" rx="2" />
              <line x1="42" y1="48" x2="72" y2="48" />
              <line x1="42" y1="56" x2="68" y2="56" />
            </g>
            <g className="bds-reviewing-note bds-reviewing-note--2">
              <rect x="168" y="118" width="40" height="32" rx="2" />
              <line x1="174" y1="128" x2="200" y2="128" />
              <line x1="174" y1="136" x2="196" y2="136" />
            </g>

            <g className="bds-reviewing-bulb bds-reviewing-bulb--1">
              <path d="M228 24 C218 24, 210 32, 210 42 C210 50, 214 56, 220 60 V68 H236 V60 C242 56, 246 50, 246 42 C246 32, 238 24, 228 24Z" />
              <line x1="224" y1="68" x2="232" y2="68" />
              <line x1="222" y1="72" x2="234" y2="72" />
            </g>
            <g className="bds-reviewing-bulb bds-reviewing-bulb--2">
              <path d="M52 88 C44 88, 38 94, 38 102 C38 108, 41 113, 46 116 V122 H58 V116 C63 113, 66 108, 66 102 C66 94, 60 88, 52 88Z" />
              <line x1="48" y1="122" x2="56" y2="122" />
            </g>
          </svg>
        </div>

        <h2 id="bds-reviewing-title" className="bds-reviewing-panel__title">
          Reviewing Your Project
        </h2>
        <p id="bds-reviewing-message" className="bds-reviewing-panel__message">
          Thanks for your submission. We&apos;re reviewing your project and preparing your Studio
          Plan.
        </p>
        <p
          id="bds-reviewing-status"
          key={messageIndex}
          className="bds-reviewing-panel__status"
          aria-live="polite"
          aria-atomic="true"
        >
          {STATUS_MESSAGES[messageIndex]}
        </p>
      </div>
    </aside>
  );
}
