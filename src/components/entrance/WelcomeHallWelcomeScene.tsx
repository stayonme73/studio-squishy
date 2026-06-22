"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";

import { welcomeHallInteraction } from "@/config/welcome-hall-interaction";
import { welcomeHallPhase1 } from "@/config/welcome-hall-phase1";
import {
  sceneRectToCoverPercent,
  sceneRectToPercent,
  welcomeHallFraming,
  welcomeHallScene,
  type WelcomeHallFraming,
} from "@/config/welcome-hall-scene";

type MobileWelcomePhase = "establish" | "kiosk";

function mobileWelcomeFraming(
  viewport: { width: number; height: number },
  phase: MobileWelcomePhase,
): WelcomeHallFraming {
  return phase === "establish"
    ? welcomeHallScene.framing.mobileEstablish
    : welcomeHallScene.framing.mobileKiosk;
}

/**
 * Welcome Hall V2 — full kiosk is the tap target; routes to Studio Guide prototype.
 * Mobile portrait: establishing shot → Step Inside → kiosk focus.
 */
export default function WelcomeHallWelcomeScene() {
  const router = useRouter();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [transitioning, setTransitioning] = useState(false);
  const [mobilePhase, setMobilePhase] = useState<MobileWelcomePhase>("establish");
  const [enteringKiosk, setEnteringKiosk] = useState(false);
  const { cta, mobileEstablish } = welcomeHallPhase1;

  const isMobileViewport = viewport.width > 0 && viewport.width <= 1024;
  const isMobileEstablish = isMobileViewport && mobilePhase === "establish";
  const isMobileKiosk = isMobileViewport && mobilePhase === "kiosk";

  const framing = useMemo(() => {
    if (isMobileViewport) {
      return mobileWelcomeFraming(viewport, mobilePhase);
    }
    return welcomeHallFraming(viewport);
  }, [isMobileViewport, mobilePhase, viewport]);

  const toOverlayPercent = useCallback(
    (rect: typeof welcomeHallScene.kioskTapTarget) =>
      viewport.width > 0
        ? sceneRectToCoverPercent(rect, viewport, framing)
        : sceneRectToPercent(rect),
    [framing, viewport],
  );

  const kioskHitArea = toOverlayPercent(welcomeHallScene.kioskTapTarget);

  const mobileKioskHitArea = useMemo((): CSSProperties | undefined => {
    if (!isMobileKiosk || viewport.width === 0) return undefined;
    const cropHeight = Math.max(Math.round(viewport.height * 0.78), viewport.height - 152);
    return sceneRectToCoverPercent(
      welcomeHallScene.kioskTapTarget,
      { width: viewport.width, height: cropHeight },
      welcomeHallScene.framing.mobileKiosk,
    );
  }, [isMobileKiosk, viewport]);

  const returningCustomerStyle = useMemo((): CSSProperties | undefined => {
    if (viewport.width === 0 || isMobileViewport) return undefined;
    const kiosk = welcomeHallScene.kioskTapTarget;
    return sceneRectToCoverPercent(
      {
        x: kiosk.x,
        y: kiosk.y + kiosk.height + 10,
        width: kiosk.width,
        height: 72,
      },
      viewport,
      framing,
    );
  }, [framing, isMobileViewport, viewport]);

  useLayoutEffect(() => {
    const syncViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useLayoutEffect(() => {
    if (!isMobileViewport) {
      setMobilePhase("establish");
      setEnteringKiosk(false);
    }
  }, [isMobileViewport]);

  const handleStepInside = useCallback(() => {
    setEnteringKiosk(true);
    window.setTimeout(() => {
      setMobilePhase("kiosk");
      setEnteringKiosk(false);
    }, 720);
  }, []);

  const goToStudioGuide = useCallback(() => {
    setTransitioning(true);
    window.setTimeout(() => {
      router.push(welcomeHallPhase1.routeToStudioGuidePrototype);
    }, welcomeHallInteraction.transitionMs);
  }, [router]);

  const plateClassName = [
    "welcome-hall-plate",
    transitioning ? " welcome-hall-plate--transitioning" : "",
    enteringKiosk ? " welcome-hall-plate--enter-kiosk" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const rootClassName = [
    "welcome-hall-static",
    "welcome-hall-phase1",
    isMobileViewport ? "welcome-hall-phase1--mobile" : "",
    isMobileEstablish ? "welcome-hall-phase1--establish" : "",
    isMobileKiosk ? "welcome-hall-phase1--kiosk" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const plateArt = (
    /* eslint-disable-next-line @next/next/no-img-element */
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
  );

  const establishPanel = (
    <div className="hall-establish-panel" role="region" aria-labelledby="hall-establish-title">
      <p className="hall-establish-panel__eyebrow">{mobileEstablish.eyebrow}</p>
      <h1 id="hall-establish-title" className="hall-establish-panel__title">
        {mobileEstablish.title}
      </h1>
      <p className="hall-establish-panel__lead">{mobileEstablish.lead}</p>
      <div className="hall-establish-panel__journey">
        <p className="hall-establish-panel__journey-heading">{mobileEstablish.journeyHeading}</p>
        <ol className="hall-establish-panel__steps">
          {mobileEstablish.journeySteps.map((step, index) => (
            <li key={step} className="hall-establish-panel__step">
              <span className="hall-establish-panel__step-num" aria-hidden="true">
                {index + 1}
              </span>
              <span className="hall-establish-panel__step-text">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <button type="button" className="hall-establish-panel__continue" onClick={handleStepInside}>
        {mobileEstablish.continueLabel}
      </button>
      <p className="hall-establish-panel__continue-hint">{mobileEstablish.continueHint}</p>
    </div>
  );

  const returningStrip = (
    <div className="hall-returning-strip">
      <p className="hall-returning-strip__prompt">{mobileEstablish.returningPrompt}</p>
      <Link
        href={cta.returningHref}
        className="hall-returning-strip__link"
        tabIndex={transitioning || enteringKiosk ? -1 : 0}
        aria-hidden={transitioning || enteringKiosk}
      >
        {mobileEstablish.returningLink}
      </Link>
    </div>
  );

  const kioskHintBar = (
    <div className="hall-kiosk-hint-bar" role="status" aria-live="polite">
      <p className="hall-kiosk-hint-bar__headline">{mobileEstablish.kioskHint}</p>
      <p className="hall-kiosk-hint-bar__detail">{mobileEstablish.kioskHintDetail}</p>
    </div>
  );

  return (
    <div className={rootClassName} aria-label="Welcome Hall">
      <div className={plateClassName}>
        {isMobileEstablish ? (
          <>
            <div className="welcome-hall-plate-crop welcome-hall-plate-crop--establish">{plateArt}</div>
            {!enteringKiosk ? (
              <div className="hall-establish-dock">
                {establishPanel}
                {returningStrip}
              </div>
            ) : null}
          </>
        ) : isMobileKiosk ? (
          <>
            <div className="welcome-hall-plate-crop welcome-hall-plate-crop--kiosk">
              {plateArt}
              {!transitioning ? (
                <div className="hall-kiosk-stack hall-kiosk-stack--mobile" style={mobileKioskHitArea}>
                  <button
                    type="button"
                    className="hall-kiosk-hotspot"
                    aria-label={cta.kioskLabel}
                    onClick={goToStudioGuide}
                    disabled={transitioning}
                  />
                </div>
              ) : null}
            </div>
            {!transitioning ? (
              <div className="hall-kiosk-dock">
                {kioskHintBar}
                {returningStrip}
              </div>
            ) : null}
            {transitioning ? (
              <div className="hall-view-ahead-transition" aria-hidden>
                <div className="hall-view-ahead-transition-glow" />
              </div>
            ) : null}
          </>
        ) : (
          <div className="welcome-hall-plate-crop">
            {plateArt}

            <div className="welcome-hall-plate-ui">
              {!isMobileViewport && (
                <div className="hall-kiosk-stack" style={kioskHitArea}>
                  <button
                    type="button"
                    className="hall-kiosk-hotspot"
                    aria-label={cta.kioskLabel}
                    onClick={goToStudioGuide}
                    disabled={transitioning || enteringKiosk}
                  />
                </div>
              )}

              {!isMobileViewport ? (
                <p className="hall-kiosk-secondary" style={returningCustomerStyle}>
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
              ) : null}

              {transitioning && (
                <div className="hall-view-ahead-transition" aria-hidden>
                  <div className="hall-view-ahead-transition-glow" />
                </div>
              )}
            </div>
          </div>
        )}

        {transitioning && isMobileEstablish && (
          <div className="hall-view-ahead-transition" aria-hidden>
            <div className="hall-view-ahead-transition-glow" />
          </div>
        )}
      </div>
    </div>
  );
}
