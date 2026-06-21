"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useState } from "react";

import { welcomeHallInteraction } from "@/config/welcome-hall-interaction";
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
  const [transitioning, setTransitioning] = useState(false);
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

  const goToStudioGuide = useCallback(() => {
    setTransitioning(true);
    window.setTimeout(() => {
      router.push(welcomeHallPhase1.routeToStudioGuidePrototype);
    }, welcomeHallInteraction.transitionMs);
  }, [router]);

  return (
    <div className="welcome-hall-static welcome-hall-phase1" aria-label="Welcome Hall">
      <div
        className={`welcome-hall-plate${transitioning ? " welcome-hall-plate--transitioning" : ""}`}
      >
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
            <div className="hall-kiosk-stack" style={kioskHitArea}>
              <button
                type="button"
                className="hall-kiosk-hotspot"
                aria-label={cta.kioskLabel}
                onClick={goToStudioGuide}
                disabled={transitioning}
              />

              <p className="hall-kiosk-secondary">
                <span className="hall-kiosk-secondary__prompt">{cta.returningPrompt}</span>
                <Link
                  href={cta.returningHref}
                  className="hall-kiosk-secondary__link"
                  tabIndex={transitioning ? -1 : 0}
                  aria-hidden={transitioning}
                >
                  {cta.returningLink}
                </Link>
              </p>
            </div>

            {transitioning && (
              <div className="hall-view-ahead-transition" aria-hidden>
                <div className="hall-view-ahead-transition-glow" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
