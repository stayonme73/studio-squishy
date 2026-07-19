"use client";

import { useEffect, useRef, useState } from "react";

import { studioPresenceV1 } from "@/config/studio-presence-v1";

type Look = { x: number; y: number };

/**
 * Idle: soft look-around the Studio (working, not posing).
 * Listening / guiding: attention toward the customer / podium.
 */
export function usePresenceGaze(
  enabled: boolean,
  state: "idle" | "listening" | "thinking" | "speaking" | "guiding",
  reducedMotion: boolean,
  attentionTarget: Look | null,
): Look {
  const [look, setLook] = useState<Look>({ x: 0.15, y: -0.08 });
  const lookRef = useRef(look);
  lookRef.current = look;
  const targetRef = useRef<Look>(look);

  useEffect(() => {
    if (!enabled) {
      setLook({ x: 0, y: 0 });
      return;
    }

    if (reducedMotion) {
      const t = attentionTarget ?? { x: 0, y: 0 };
      setLook(t);
      return;
    }

    let raf = 0;
    let pauseTimer = 0;
    let alive = true;
    const lerp = studioPresenceV1.motion.lookLerp;

    const setTarget = (t: Look) => {
      targetRef.current = {
        x: Math.max(-1, Math.min(1, t.x)),
        y: Math.max(-1, Math.min(1, t.y)),
      };
    };

    const tick = () => {
      if (!alive) return;
      const prev = lookRef.current;
      const target = targetRef.current;
      const nx = prev.x + (target.x - prev.x) * lerp;
      const ny = prev.y + (target.y - prev.y) * lerp;
      const next = { x: nx, y: ny };
      lookRef.current = next;
      setLook(next);
      raf = requestAnimationFrame(tick);
    };

    const scheduleIdleWander = () => {
      /* Soft glances around the room — not locked on the customer. */
      const next = {
        x: (Math.random() - 0.5) * 1.1,
        y: (Math.random() - 0.55) * 0.55,
      };
      setTarget(next);
      const hold = 2200 + Math.floor(Math.random() * 3800);
      pauseTimer = window.setTimeout(scheduleIdleWander, hold);
    };

    if (state === "idle" || state === "thinking") {
      scheduleIdleWander();
    } else if (attentionTarget) {
      setTarget(attentionTarget);
    } else {
      setTarget({ x: -0.35, y: 0.1 });
    }

    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(pauseTimer);
    };
  }, [enabled, state, reducedMotion, attentionTarget?.x, attentionTarget?.y]);

  return look;
}
