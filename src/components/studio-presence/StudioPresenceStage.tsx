"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { studioPresenceV1 } from "@/config/studio-presence-v1";
import StudioPresence from "@/components/studio-presence/StudioPresence";
import { useStudioPresence } from "@/components/studio-presence/StudioPresenceProvider";
import { usePresenceGaze } from "@/components/studio-presence/hooks/usePresenceGaze";
import { useReducedMotion } from "@/components/studio-presence/hooks/useReducedMotion";
import styles from "@/components/studio-presence/studio-presence.module.css";

/**
 * Fixed portal stage — Lobby package positions Presence beside the active anchor.
 * pointer-events: none everywhere.
 */
export default function StudioPresenceStage() {
  const { enabled, visible, state, setState, activeAnchorId, anchors } =
    useStudioPresence();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* Speak pulse remains optional; off while Presence is working quietly. */
  useEffect(() => {
    if (
      !visible ||
      studioPresenceV1.stillVisualCert ||
      !studioPresenceV1.motion.prototypeSpeakPulse ||
      reducedMotion
    ) {
      return;
    }
    const { speakPulseEveryMs, speakPulseDurationMs } = studioPresenceV1.motion;
    let speakTimer = 0;
    const cycle = window.setInterval(() => {
      setState("speaking");
      speakTimer = window.setTimeout(() => setState("idle"), speakPulseDurationMs);
    }, speakPulseEveryMs);
    return () => {
      window.clearInterval(cycle);
      window.clearTimeout(speakTimer);
    };
  }, [visible, reducedMotion, setState]);

  const anchor = activeAnchorId ? anchors[activeAnchorId] : null;

  const position = useMemo(() => {
    if (!anchor) return null;
    const { sizePx, dockOffsetPx, identityFocus } = studioPresenceV1;
    void identityFocus;
    const aspect = 160 / 240;
    const heightPx = sizePx * aspect;
    return {
      left: anchor.centerX + dockOffsetPx.x - sizePx / 2,
      top: anchor.centerY + dockOffsetPx.y - heightPx / 2,
      width: sizePx,
      height: heightPx,
    };
  }, [anchor]);

  const attentionTarget = useMemo(() => {
    if (!anchor || !position) return null;
    const presenceCx = position.left + position.width / 2;
    const presenceCy = position.top + position.height / 2;
    const dx = anchor.centerX - presenceCx;
    const dy = anchor.centerY - presenceCy;
    const len = Math.hypot(dx, dy) || 1;
    return {
      x: Math.max(-1, Math.min(1, (dx / len) * 0.85)),
      y: Math.max(-1, Math.min(1, (dy / len) * 0.85)),
    };
  }, [anchor, position]);

  const faceState =
    state === "speaking" ||
    state === "listening" ||
    state === "thinking" ||
    state === "guiding"
      ? state
      : "idle";

  const look = usePresenceGaze(
    Boolean(visible && position),
    faceState,
    reducedMotion,
    attentionTarget,
  );

  if (!mounted || !enabled || !visible || !position) {
    return null;
  }

  return createPortal(
    <div
      className={styles.stage}
      style={{
        zIndex: studioPresenceV1.stageZIndex,
        left: position.left,
        top: position.top,
        width: position.width,
        height: position.height,
      }}
      aria-hidden
    >
      <StudioPresence
        state={faceState}
        look={look}
        floating={faceState === "idle" || faceState === "speaking"}
      />
    </div>,
    document.documentElement,
  );
}
