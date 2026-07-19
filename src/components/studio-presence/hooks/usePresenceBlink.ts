"use client";

import { useEffect, useState } from "react";

import { studioPresenceV1 } from "@/config/studio-presence-v1";

/**
 * Natural blink — lid closes, holds briefly, then opens.
 * Returns true while lids should be closed (including close motion).
 */
export function usePresenceBlink(enabled: boolean, reducedMotion: boolean) {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!enabled || reducedMotion) {
      setClosed(false);
      return;
    }

    const { blinkMinMs, blinkMaxMs, blinkCloseMs } = studioPresenceV1.motion;
    /* Most of blinkCloseMs is the lid motion; brief hold at closed. */
    const closeAnimMs = Math.min(260, Math.max(160, Math.floor(blinkCloseMs * 0.7)));
    const holdMs = Math.max(40, blinkCloseMs - closeAnimMs);

    let cancelled = false;
    let openTimer = 0;
    let holdTimer = 0;

    const schedule = () => {
      const wait =
        blinkMinMs + Math.floor(Math.random() * (blinkMaxMs - blinkMinMs));
      openTimer = window.setTimeout(() => {
        if (cancelled) return;
        setClosed(true);
        holdTimer = window.setTimeout(() => {
          if (cancelled) return;
          setClosed(false);
          schedule();
        }, closeAnimMs + holdMs);
      }, wait);
    };

    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(openTimer);
      window.clearTimeout(holdTimer);
    };
  }, [enabled, reducedMotion]);

  return closed;
}
