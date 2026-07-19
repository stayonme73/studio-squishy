"use client";

import { useMemo, useState, type CSSProperties } from "react";

import {
  studioLobbyInvisibleFriendDisplaySize,
  studioLobbyInvisibleFriendV1,
} from "@/config/studio-lobby-invisible-friend-v1";
import {
  sceneRectToCoverPercent,
  sceneRectToPercent,
  welcomeHallScene,
  type WelcomeHallFraming,
} from "@/config/welcome-hall-scene";

type FriendLayoutMode = "canvas" | "cover";

type StudioLobbyInvisibleFriendLayerProps = {
  layout: FriendLayoutMode;
  viewport?: { width: number; height: number };
  framing?: WelcomeHallFraming;
  debug?: boolean;
};

/**
 * Lobby invisible friend — transparent outfit only.
 * pointer-events: none — podium remains the sole entry control.
 */
export default function StudioLobbyInvisibleFriendLayer({
  layout,
  viewport,
  framing,
  debug = false,
}: StudioLobbyInvisibleFriendLayerProps) {
  const [loaded, setLoaded] = useState(false);
  const { feet, assets, intrinsicSize } = studioLobbyInvisibleFriendV1;
  const display = studioLobbyInvisibleFriendDisplaySize();

  const friendRect = useMemo(
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
      return sceneRectToPercent(friendRect);
    }
    if (!viewport || viewport.width <= 0 || viewport.height <= 0) {
      return undefined;
    }
    return sceneRectToCoverPercent(
      friendRect,
      viewport,
      framing,
      welcomeHallScene.nativeSize,
    );
  }, [framing, friendRect, layout, viewport]);

  if (!studioLobbyInvisibleFriendV1.enabled || !style) {
    return null;
  }

  return (
    <div
      className={[
        "studio-lobby-invisible-friend",
        loaded ? "studio-lobby-invisible-friend--ready" : "",
        debug ? "studio-lobby-invisible-friend--debug" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      aria-hidden
    >
      <span className="studio-lobby-invisible-friend__contact-shadow" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="studio-lobby-invisible-friend__outfit"
        src={assets.outfit}
        alt=""
        width={intrinsicSize.width}
        height={intrinsicSize.height}
        draggable={false}
        onLoad={() => setLoaded(true)}
      />
      {debug ? (
        <span
          className="studio-lobby-invisible-friend__feet-pin"
          title="Invisible friend feet pin"
        />
      ) : null}
    </div>
  );
}
