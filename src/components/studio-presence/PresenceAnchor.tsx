"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";

import {
  PRESENCE_ANCHOR_LOBBY_PODIUM,
  studioPresenceV1,
} from "@/config/studio-presence-v1";
import { useStudioPresenceOptional } from "@/components/studio-presence/StudioPresenceProvider";

type PresenceAnchorProps = {
  id: string;
  /** When true, this Lobby package shows Presence and sets look-at to this anchor. */
  activatePresence?: boolean;
  style?: CSSProperties;
  className?: string;
};

/**
 * Invisible dock/look-at target. Lobby podium uses id `lobby-podium`.
 * pointer-events none — does not steal kiosk hits.
 */
export default function PresenceAnchor({
  id,
  activatePresence = false,
  style,
  className,
}: PresenceAnchorProps) {
  const presence = useStudioPresenceOptional();
  const ref = useRef<HTMLSpanElement>(null);
  const registerAnchor = presence?.registerAnchor;
  const unregisterAnchor = presence?.unregisterAnchor;
  const setVisible = presence?.setVisible;
  const setState = presence?.setState;
  const setActiveAnchor = presence?.setActiveAnchor;
  const enabled = presence?.enabled ?? false;

  useLayoutEffect(() => {
    if (!enabled || !registerAnchor || !unregisterAnchor) return;
    const el = ref.current;
    if (!el) return;

    const publish = () => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 && r.height <= 0) return;
      registerAnchor({
        id,
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        centerX: r.left + r.width / 2,
        centerY: r.top + r.height / 2,
      });
    };

    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    window.addEventListener("scroll", publish, true);
    window.addEventListener("resize", publish);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", publish, true);
      window.removeEventListener("resize", publish);
      unregisterAnchor(id);
    };
  }, [enabled, id, registerAnchor, unregisterAnchor]);

  useEffect(() => {
    if (!enabled || !activatePresence || !setVisible || !setState || !setActiveAnchor) {
      return;
    }
    if (studioPresenceV1.lobbyOnly && id !== PRESENCE_ANCHOR_LOBBY_PODIUM) {
      return;
    }
    setActiveAnchor(id);
    setVisible(true);
    setState("idle");
    return () => {
      setVisible(false);
      setActiveAnchor(null);
      setState("idle");
    };
  }, [
    activatePresence,
    enabled,
    id,
    setActiveAnchor,
    setState,
    setVisible,
  ]);

  return (
    <span
      ref={ref}
      className={className}
      style={{
        position: "absolute",
        width: 8,
        height: 8,
        margin: 0,
        padding: 0,
        pointerEvents: "none",
        ...style,
      }}
      aria-hidden
      data-presence-anchor={id}
    />
  );
}
