"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { welcomeHallPhase1 } from "@/config/welcome-hall-phase1";
import {
  sceneRectToCoverPercent,
  sceneRectToPercent,
  welcomeHallFraming,
  welcomeHallScene,
} from "@/config/welcome-hall-scene";

function KioskHotspot({
  style,
  label,
  href,
  disabled,
  debug,
  onActivate,
}: {
  style: CSSProperties | undefined;
  label: string;
  href: string;
  disabled: boolean;
  debug: boolean;
  onActivate: () => void;
}) {
  if (!style) return null;

  return (
    <div className="hall-kiosk-stack" style={style}>
      <Link
        href={href}
        className={[
          "hall-kiosk-hotspot",
          debug ? "hall-kiosk-hotspot--debug" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={label}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          event.preventDefault();
          console.log("[Studio Lobby] kiosk tap →", href);
          onActivate();
        }}
      />
    </div>
  );
}

/**
 * Studio Lobby — desktop: full kiosk tap target; mobile: art + single CTA dock.
 */
export default function WelcomeHallWelcomeScene() {
  const router = useRouter();
  const [showDebug, setShowDebug] = useState(false);
  const transitioningRef = useRef(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [transitioning, setTransitioning] = useState(false);
  const { cta, mobileEstablish, mobileStudioNav } = welcomeHallPhase1;

  const framing = useMemo(() => welcomeHallFraming(viewport), [viewport]);

  const toOverlayPercent = useCallback(
    (rect: typeof welcomeHallScene.kioskTapTarget) =>
      viewport.width > 0
        ? sceneRectToCoverPercent(rect, viewport, framing)
        : sceneRectToPercent(rect),
    [framing, viewport],
  );

  const kioskHitArea = toOverlayPercent(welcomeHallScene.kioskTapTarget);

  useLayoutEffect(() => {
    const syncViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    syncViewport();
    setShowDebug(new URLSearchParams(window.location.search).get("debug") === "1");
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const goToBusinessDiscoveryStudio = useCallback(() => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    setTransitioning(true);
    router.push(welcomeHallPhase1.routeToBusinessDiscoveryStudio);
  }, [router]);

  const plateClassName = [
    "welcome-hall-plate",
    transitioning ? " welcome-hall-plate--transitioning" : "",
  ]
    .filter(Boolean)
    .join("");

  const rootClassName = "welcome-hall-static welcome-hall-phase1";

  const kioskRoute = welcomeHallPhase1.routeToBusinessDiscoveryStudio;

  const plateArt = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={welcomeHallScene.src}
      alt={welcomeHallScene.alt}
      className="welcome-hall-plate-art"
      draggable={false}
    />
  );

  const mobileDock = (
    <div className="hall-mobile-dock" role="region" aria-labelledby="hall-mobile-heading">
      <div className="hall-mobile-dock-panel">
        <h1 id="hall-mobile-heading" className="hall-mobile-dock-panel__heading">
          {mobileEstablish.heading}
        </h1>
        <p className="hall-mobile-dock-panel__tagline">{mobileEstablish.tagline}</p>
        <button
          type="button"
          className="hall-mobile-dock-panel__cta"
          disabled={transitioning}
          onClick={goToBusinessDiscoveryStudio}
        >
          {mobileEstablish.ctaLabel}
        </button>
      </div>

      <nav className="hall-mobile-studio-nav" aria-label={mobileStudioNav.ariaLabel}>
        <h2 className="hall-mobile-studio-nav__heading">{mobileStudioNav.heading}</h2>
        <ul className="hall-mobile-studio-nav__list">
          {mobileStudioNav.items.map((item) => (
            <li key={item.label} className="hall-mobile-studio-nav__item">
              <Link
                href={item.href}
                className="hall-mobile-studio-nav__link"
                title={"title" in item ? item.title : undefined}
                aria-label={
                  "title" in item && item.title
                    ? `${item.label}. ${item.title}`
                    : undefined
                }
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

  const transitionGlow = (
    <div className="hall-view-ahead-transition" aria-hidden>
      <div className="hall-view-ahead-transition-glow" />
    </div>
  );

  return (
    <div className={rootClassName} aria-label="Studio Lobby">
      <div className={plateClassName}>
        <div className="welcome-hall-plate-crop welcome-hall-plate-crop--mobile">
          {plateArt}

          <KioskHotspot
            style={kioskHitArea}
            label={cta.kioskLabel}
            href={kioskRoute}
            disabled={transitioning}
            debug={showDebug}
            onActivate={goToBusinessDiscoveryStudio}
          />
        </div>

        {!transitioning ? mobileDock : null}
        {transitioning ? transitionGlow : null}
      </div>
    </div>
  );
}
