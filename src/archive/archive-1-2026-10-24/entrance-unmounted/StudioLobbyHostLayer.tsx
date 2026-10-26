"use client";

import { useMemo, useState, type CSSProperties } from "react";

import {
  studioLobbyHostDisplaySize,
  studioLobbyHostLayerV1,
} from "@/config/studio-lobby-host-layer-v1";
import {
  sceneRectToCoverPercent,
  sceneRectToPercent,
  welcomeHallScene,
  type WelcomeHallFraming,
} from "@/config/welcome-hall-scene";

type HostLayoutMode = "canvas" | "cover";

type StudioLobbyHostLayerProps = {
  /**
   * `canvas` — percent of the desktop plate canvas (same space as kiosk).
   * `cover` — mapped into a viewport that uses object-fit cover framing.
   */
  layout: HostLayoutMode;
  /** Required when layout is `cover` (mobile crop box). */
  viewport?: { width: number; height: number };
  framing?: WelcomeHallFraming;
  /** Show feet pin + bbox when Lobby `?debug=1`. */
  debug?: boolean;
  /**
   * Optional Guide help — tap speaks get-started tip (not journey entry).
   * Podium remains the only control that begins the Studio journey.
   */
  onAskGuide?: () => void;
};

/**
 * Studio Lobby Host Layer — visual presence + optional Guide help tap.
 * Placement pass: static open-eye Host. No blink, breathe, or voice states.
 * Journey entry stays on the podium only.
 */
export default function StudioLobbyHostLayer({
  layout,
  viewport,
  framing,
  debug = false,
  onAskGuide,
}: StudioLobbyHostLayerProps) {
  const [loaded, setLoaded] = useState(false);
  const { feet, assets, intrinsicSize } = studioLobbyHostLayerV1;
  const display = studioLobbyHostDisplaySize();

  const hostRect = useMemo(
    () => ({
      x: feet.x - display.width / 2,
      y: feet.y - display.height,
      width: display.width,
      height: display.height,
    }),
    [display.height, display.width, feet.x, feet.y],
  );

  const style = useMemo((): CSSProperties | undefined => {
    if (layout === "canvas") {
      return sceneRectToPercent(hostRect);
    }
    if (!viewport || viewport.width <= 0 || viewport.height <= 0) {
      return undefined;
    }
    return sceneRectToCoverPercent(
      hostRect,
      viewport,
      framing,
      welcomeHallScene.nativeSize,
    );
  }, [framing, hostRect, layout, viewport]);

  if (!studioLobbyHostLayerV1.enabled || !style) {
    return null;
  }

  return (
    <div
      className={[
        "studio-lobby-host-layer",
        loaded ? "studio-lobby-host-layer--ready" : "",
        onAskGuide ? "studio-lobby-host-layer--guide-help" : "",
        debug ? "studio-lobby-host-layer--debug" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      aria-hidden={onAskGuide ? undefined : true}
    >
      <span className="studio-lobby-host-layer__contact-shadow" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="studio-lobby-host-layer__base"
        src={assets.base}
        alt=""
        width={intrinsicSize.width}
        height={intrinsicSize.height}
        draggable={false}
        onLoad={() => setLoaded(true)}
      />
      {onAskGuide ? (
        <button
          type="button"
          className="studio-lobby-host-layer__help"
          aria-label="Ask the Studio Guide how to get started"
          onClick={onAskGuide}
        />
      ) : null}
      {debug ? (
        <span className="studio-lobby-host-layer__feet-pin" title="Host feet pin" />
      ) : null}
    </div>
  );
}
