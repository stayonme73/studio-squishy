"use client";

import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useState } from "react";

import { welcomeHallPhase1 } from "@/config/welcome-hall-phase1";
import {
  sceneRectToCoverPercent,
  sceneRectToPercent,
  welcomeHallFraming,
  welcomeHallScene,
} from "@/config/welcome-hall-scene";

/**
 * Welcome Hall V2 — full kiosk is the tap target; routes to Draft Room intake.
 * CTA copy is baked into plate v31 art — no screen overlay.
 */
export default function WelcomeHallWelcomeScene() {
  const router = useRouter();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const { cta } = welcomeHallPhase1;
  const framing = welcomeHallFraming(viewport);
  const toOverlayPercent = (rect: typeof welcomeHallScene.kioskTapTarget) =>
    viewport.width > 0
      ? sceneRectToCoverPercent(rect, viewport, framing)
      : sceneRectToPercent(rect);
  const kioskHitArea = toOverlayPercent(welcomeHallScene.kioskTapTarget);

  useLayoutEffect(() => {
    const syncViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const goToDraftRoom = useCallback(() => {
    router.push(`${welcomeHallPhase1.routeToDraftRoom}?from=hall`);
  }, [router]);

  return (
    <div className="welcome-hall-static welcome-hall-phase1" aria-label="Welcome Hall">
      <div className="welcome-hall-plate">
        <div className="welcome-hall-plate-crop">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={welcomeHallScene.src}
            alt={welcomeHallScene.alt}
            className="welcome-hall-plate-art"
            draggable={false}
            style={{
              objectFit: framing.fit,
              objectPosition: `${framing.x * 100}% ${framing.y * 100}%`,
            }}
          />

          <div className="welcome-hall-plate-ui">
            <button
              type="button"
              className="hall-kiosk-hotspot"
              aria-label={cta.kioskLabel}
              onClick={goToDraftRoom}
              style={kioskHitArea}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
