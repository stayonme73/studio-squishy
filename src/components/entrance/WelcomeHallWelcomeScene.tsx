"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import StudioLobbyEntryFilm, {
  type LobbyEntrySessionState,
} from "@/components/entrance/StudioLobbyEntryFilm";
import StudioLobbyHostLayer from "@/components/entrance/StudioLobbyHostLayer";
import StudioLobbyInvisibleFriendLayer from "@/components/entrance/StudioLobbyInvisibleFriendLayer";
import PresenceAnchor from "@/components/studio-presence/PresenceAnchor";
import { isStudioGuideConversationEnabled } from "@/config/studio-guide-conversation-v1";
import {
  clearLobbyEntryVisitState,
  readLobbyEntryChoice,
  readLobbyEntryFilmDismissed,
  studioLobbyEntryV1,
  writeLobbyEntryFilmDismissed,
} from "@/config/studio-lobby-entry-v1";
import { PRESENCE_ANCHOR_LOBBY_PODIUM } from "@/config/studio-presence-v1";
import { welcomeHallPhase1 } from "@/config/welcome-hall-phase1";
import {
  sceneRectToCoverPercent,
  sceneRectToPercent,
  welcomeHallFraming,
  welcomeHallPlateCoverLayout,
  welcomeHallScene,
} from "@/config/welcome-hall-scene";
import { loadGuideDraft } from "@/lib/studio-guide-hard-nav";
import { setStudioVoiceInvite } from "@/lib/studio-voice-invite";
import { useLobbyPodiumGuidance } from "@/lib/use-lobby-podium-guidance";

const MOBILE_PLATE_FRAMING = { x: 0.48, y: 0.5, fit: "cover" as const };

const DESKTOP_KIOSK_MIN_WIDTH = 1025;

const SESSION_PROBE_TIMEOUT_MS = 2500;

/** Truthful Lobby session probe — fail closed to signed-out when unknown. */
async function probeLobbySession(): Promise<LobbyEntrySessionState> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SESSION_PROBE_TIMEOUT_MS);
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
      signal: controller.signal,
    });
    if (!response.ok) return "signed-out";
    const body = (await response.json().catch(() => ({}))) as {
      user?: { id?: string } | null;
    };
    return body.user?.id ? "signed-in" : "signed-out";
  } catch {
    return "signed-out";
  } finally {
    window.clearTimeout(timer);
  }
}
function KioskHotspot({
  style,
  label,
  href,
  disabled,
  debug,
  guideMode,
  onActivate,
}: {
  style: CSSProperties | undefined;
  label: string;
  href: string;
  disabled: boolean;
  debug: boolean;
  guideMode: boolean;
  onActivate: () => void;
}) {
  if (!style) return null;

  const className = [
    "hall-kiosk-hotspot",
    debug ? "hall-kiosk-hotspot--debug" : "",
  ]
    .filter(Boolean)
    .join(" ");

  /* Guide mode must be a <button>, not a Link — on Samsung, Link href can
     navigate to Route Map even when preventDefault runs on the click handler. */
  if (guideMode) {
    return (
      <div className="hall-kiosk-stack" style={style}>
        <button
          type="button"
          className={className}
          aria-label={label}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            onActivate();
          }}
        />
      </div>
    );
  }

  return (
    <div className="hall-kiosk-stack" style={style}>
      <Link
        href={href}
        className={className}
        aria-label={label}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          event.preventDefault();
          onActivate();
        }}
      />
    </div>
  );
}

/**
 * Studio Lobby — transparent podium hit zone on desktop and mobile; cream dock
 * remains a mobile backup CTA. Entry film gates New vs Returning before Voice
 * or podium start (@see docs/studio-lobby-entry-split-v1-locked.md).
 *
 * When NEXT_PUBLIC_STUDIO_GUIDE_CONVERSATION=1, start control opens the
 * Studio Conversation Room (old Lobby Guide overlay is retired).
 * Flag OFF preserves Route Map navigation.
 */
export default function WelcomeHallWelcomeScene({
  initialChoseNew = false,
}: {
  /** From visit cookie — unlocks Lobby in HTML when phone JS never attaches. */
  initialChoseNew?: boolean;
}) {
  const router = useRouter();
  const plateRef = useRef<HTMLDivElement>(null);
  const mobileCropRef = useRef<HTMLDivElement>(null);
  const [showDebug, setShowDebug] = useState(false);
  const transitioningRef = useRef(false);
  const [plateSize, setPlateSize] = useState({ width: 0, height: 0 });
  const [mobileCropSize, setMobileCropSize] = useState({ width: 0, height: 0 });
  const [transitioning, setTransitioning] = useState(false);
  /**
   * Film defaults ON for SSR + first paint so phones receive the Entry Film in
   * HTML even before client effects run. Visit storage / cookie may hide it.
   */
  const [choseNew, setChoseNew] = useState(initialChoseNew);
  const [filmOpen, setFilmOpen] = useState(!initialChoseNew);
  /**
   * Fail closed to SIGN IN in HTML/first paint. "checking" only while a live
   * probe is in flight after mount/tap — never the default stuck label on phone.
   */
  const [sessionState, setSessionState] =
    useState<LobbyEntrySessionState>("signed-out");
  const guideConversationEnabled = isStudioGuideConversationEnabled();

  /** Journey controls + Voice stay gated until New to the Studio. */
  const journeyUnlocked = choseNew;
  const showEntryFilm = !choseNew && filmOpen;
  const showReopenFilm = !choseNew && !filmOpen;

  const {
    noteProgress,
    askGuide,
    promptVisible,
    promptCopy,
    onPromptActivate,
  } = useLobbyPodiumGuidance({
    enabled: journeyUnlocked,
  });
  const { cta, mobileEstablish, mobileStudioNav, squishyGreeting } =
    welcomeHallPhase1;

  const isDesktopKiosk = plateSize.width >= DESKTOP_KIOSK_MIN_WIDTH;

  const framing = useMemo(() => welcomeHallFraming(plateSize), [plateSize]);

  const coverLayout = useMemo(
    () => welcomeHallPlateCoverLayout(plateSize, framing),
    [framing, plateSize],
  );

  const kioskHitArea = useMemo(
    () =>
      isDesktopKiosk && coverLayout.width > 0
        ? sceneRectToPercent(welcomeHallScene.kioskTapTarget)
        : undefined,
    [coverLayout.width, isDesktopKiosk],
  );

  const mobileKioskHitArea = useMemo(() => {
    if (isDesktopKiosk || mobileCropSize.width <= 0 || mobileCropSize.height <= 0) {
      return undefined;
    }
    return sceneRectToCoverPercent(
      welcomeHallScene.kioskTapTarget,
      mobileCropSize,
      MOBILE_PLATE_FRAMING,
    );
  }, [isDesktopKiosk, mobileCropSize]);

  const squishyBalloonArea = useMemo(
    () =>
      welcomeHallScene.squishyGreetingOverlayEnabled &&
      isDesktopKiosk &&
      coverLayout.width > 0
        ? sceneRectToPercent(welcomeHallScene.squishyGreetingBalloon)
        : undefined,
    [coverLayout.width, isDesktopKiosk],
  );

  const canvasStyle = useMemo((): CSSProperties | undefined => {
    if (!isDesktopKiosk || coverLayout.width <= 0 || coverLayout.height <= 0) {
      return undefined;
    }
    return {
      width: `${coverLayout.width}px`,
      height: `${coverLayout.height}px`,
      left: `${coverLayout.offsetX}px`,
      top: `${coverLayout.offsetY}px`,
    };
  }, [coverLayout, isDesktopKiosk]);

  /** Look-at / dock target — right edge of podium (native plate %). */
  const presencePodiumAnchor = useMemo(() => {
    const k = welcomeHallScene.kioskTapTarget;
    return {
      x: k.x + k.width - 24,
      y: k.y + Math.round(k.height * 0.2),
      width: 20,
      height: 20,
    };
  }, []);

  const presencePodiumAnchorCanvas = useMemo(
    () => sceneRectToPercent(presencePodiumAnchor),
    [presencePodiumAnchor],
  );

  const presencePodiumAnchorMobile = useMemo(() => {
    if (mobileCropSize.width <= 0 || mobileCropSize.height <= 0) {
      return undefined;
    }
    return sceneRectToCoverPercent(
      presencePodiumAnchor,
      mobileCropSize,
      MOBILE_PLATE_FRAMING,
    );
  }, [mobileCropSize, presencePodiumAnchor]);

  /* Conversation Room — replaces the retired Lobby Guide overlay (`?guide=1`). */
  const mobileGuideHref = "/studio-conversation-room";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lobbyEntry") === "reset") {
      clearLobbyEntryVisitState();
      params.delete("lobbyEntry");
      const next = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${next ? `?${next}` : ""}`,
      );
      setChoseNew(false);
      setFilmOpen(true);
    } else {
      const choice = readLobbyEntryChoice();
      const dismissed = readLobbyEntryFilmDismissed();
      if (choice === "new-to-studio") {
        setChoseNew(true);
        setFilmOpen(false);
      } else {
        setChoseNew(false);
        setFilmOpen(!dismissed);
      }
    }

    let cancelled = false;
    setSessionState("checking");
    void probeLobbySession().then((next) => {
      if (!cancelled) setSessionState(next);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const plate = plateRef.current;
    if (!plate) return;

    const syncPlateSize = () => {
      const { width, height } = plate.getBoundingClientRect();
      setPlateSize({ width, height });
      const crop = mobileCropRef.current;
      if (crop) {
        const cropRect = crop.getBoundingClientRect();
        setMobileCropSize({ width: cropRect.width, height: cropRect.height });
      }
    };

    syncPlateSize();
    setShowDebug(new URLSearchParams(window.location.search).get("debug") === "1");

    const observer = new ResizeObserver(syncPlateSize);
    observer.observe(plate);
    const crop = mobileCropRef.current;
    if (crop) observer.observe(crop);
    window.addEventListener("resize", syncPlateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncPlateSize);
    };
  }, [isDesktopKiosk]);

  const goToBusinessDiscoveryStudio = useCallback(() => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    setTransitioning(true);
    router.push(welcomeHallPhase1.routeToRouteMap);
  }, [router]);

  const openGuideOrRouteMap = useCallback(() => {
    if (!journeyUnlocked) return;
    noteProgress();
    if (guideConversationEnabled) {
      const draft = loadGuideDraft();
      const hasProgress = Boolean(draft?.projectNeed?.trim() || draft?.confirmedAt);
      setStudioVoiceInvite(hasProgress ? "resume" : "start");
      window.location.assign("/studio-conversation-room");
      return;
    }
    goToBusinessDiscoveryStudio();
  }, [
    guideConversationEnabled,
    goToBusinessDiscoveryStudio,
    journeyUnlocked,
    noteProgress,
  ]);

  const handleCloseFilm = useCallback(() => {
    writeLobbyEntryFilmDismissed(true);
    setFilmOpen(false);
  }, []);

  const handleReopenFilm = useCallback(() => {
    writeLobbyEntryFilmDismissed(false);
    setFilmOpen(true);
  }, []);

  const hostAskGuide = journeyUnlocked ? askGuide : undefined;
  const journeyControlsDisabled = transitioning || !journeyUnlocked;

  const plateClassName = [
    "welcome-hall-plate",
    transitioning ? " welcome-hall-plate--transitioning" : "",
  ]
    .filter(Boolean)
    .join("");

  const rootClassName = ["welcome-hall-static", "welcome-hall-phase1"].join(" ");

  const kioskRoute = welcomeHallPhase1.routeToRouteMap;

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
        <p className="hall-mobile-dock-panel__tagline">
          {mobileEstablish.taglineLines.map((line) => (
            <span key={line} className="hall-mobile-dock-panel__tagline-line">
              {line}
            </span>
          ))}
        </p>
        {guideConversationEnabled ? (
          <a
            href={mobileGuideHref}
            className="hall-mobile-dock-panel__cta"
            data-studio-guide-cta="mobile"
            aria-disabled={journeyControlsDisabled || undefined}
            tabIndex={journeyControlsDisabled ? -1 : undefined}
            onClick={(event) => {
              event.preventDefault();
              if (!journeyUnlocked || transitioningRef.current) return;
              noteProgress();
              const draft = loadGuideDraft();
              const hasProgress = Boolean(
                draft?.projectNeed?.trim() || draft?.confirmedAt,
              );
              setStudioVoiceInvite(hasProgress ? "resume" : "start");
              window.location.assign(mobileGuideHref);
            }}
          >
            {mobileEstablish.ctaLabel}
          </a>
        ) : (
          <Link
            href={welcomeHallPhase1.routeToRouteMap}
            className="hall-mobile-dock-panel__cta"
            aria-disabled={journeyControlsDisabled || undefined}
            tabIndex={journeyControlsDisabled ? -1 : undefined}
            onClick={(event) => {
              if (!journeyUnlocked || transitioningRef.current) {
                event.preventDefault();
                return;
              }
              noteProgress();
              transitioningRef.current = true;
              setTransitioning(true);
            }}
          >
            {mobileEstablish.ctaLabel}
          </Link>
        )}
      </div>

      <nav className="hall-mobile-studio-nav" aria-label={mobileStudioNav.ariaLabel}>
        <h2 className="hall-mobile-studio-nav__heading">{mobileStudioNav.heading}</h2>
        <ul className="hall-mobile-studio-nav__list">
          {mobileStudioNav.items.map((item) => (
            <li key={item.label} className="hall-mobile-studio-nav__item">
              <Link href={item.href} className="hall-mobile-studio-nav__link">
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
      <h1 className="sr-only">The Studio Lobby</h1>
      <div ref={plateRef} className={plateClassName}>
        {isDesktopKiosk ? (
          <div className="welcome-hall-plate-crop">
            <div className="welcome-hall-plate-backdrop" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={welcomeHallScene.src}
                alt=""
                className="welcome-hall-plate-backdrop-art"
                draggable={false}
              />
            </div>
            <div className="welcome-hall-plate-canvas" style={canvasStyle}>
              {plateArt}
              <StudioLobbyHostLayer
                layout="canvas"
                debug={showDebug}
                onAskGuide={hostAskGuide}
              />
              <StudioLobbyInvisibleFriendLayer
                layout="canvas"
                debug={showDebug}
              />
              <PresenceAnchor
                id={PRESENCE_ANCHOR_LOBBY_PODIUM}
                activatePresence
                style={presencePodiumAnchorCanvas}
              />
              {squishyBalloonArea ? (
                <div
                  className="hall-squishy-speech"
                  style={squishyBalloonArea}
                  role="note"
                  aria-label={squishyGreeting}
                >
                  <p className="hall-squishy-balloon">
                    {mobileEstablish.taglineLines.map((line) => (
                      <span key={line} className="hall-squishy-balloon__line">
                        {line}
                      </span>
                    ))}
                  </p>
                  <span className="hall-squishy-trail hall-squishy-trail--1" aria-hidden />
                  <span className="hall-squishy-trail hall-squishy-trail--2" aria-hidden />
                  <span className="hall-squishy-trail hall-squishy-trail--3" aria-hidden />
                  <span className="hall-squishy-trail hall-squishy-trail--4" aria-hidden />
                </div>
              ) : null}
              <KioskHotspot
                style={kioskHitArea}
                label={cta.kioskLabel}
                href={kioskRoute}
                disabled={journeyControlsDisabled}
                debug={showDebug}
                guideMode={guideConversationEnabled}
                onActivate={openGuideOrRouteMap}
              />
            </div>
          </div>
        ) : (
          <div
            ref={mobileCropRef}
            className="welcome-hall-plate-crop welcome-hall-plate-crop--mobile"
          >
            {plateArt}
            <StudioLobbyHostLayer
              layout="cover"
              viewport={mobileCropSize}
              framing={MOBILE_PLATE_FRAMING}
              debug={showDebug}
              onAskGuide={hostAskGuide}
            />
            <StudioLobbyInvisibleFriendLayer
              layout="cover"
              viewport={mobileCropSize}
              framing={MOBILE_PLATE_FRAMING}
              debug={showDebug}
            />
            {presencePodiumAnchorMobile ? (
              <PresenceAnchor
                id={PRESENCE_ANCHOR_LOBBY_PODIUM}
                activatePresence
                style={presencePodiumAnchorMobile}
              />
            ) : null}
            <KioskHotspot
              style={mobileKioskHitArea}
              label={cta.kioskLabel}
              href={kioskRoute}
              disabled={journeyControlsDisabled}
              debug={showDebug}
              guideMode={guideConversationEnabled}
              onActivate={openGuideOrRouteMap}
            />
          </div>
        )}

        {mobileDock}
        {journeyUnlocked && promptVisible ? (
          <button
            type="button"
            className="hall-hesitation-prompt"
            onClick={onPromptActivate}
            aria-label={`${promptCopy.title} ${promptCopy.body}`}
          >
            <span className="hall-hesitation-prompt__chrome" aria-hidden />
            <span className="hall-hesitation-prompt__content">
              <span className="hall-hesitation-prompt__title">{promptCopy.title}</span>
              <span className="hall-hesitation-prompt__body">{promptCopy.body}</span>
            </span>
          </button>
        ) : null}
        {showEntryFilm ? (
          <StudioLobbyEntryFilm
            sessionState={sessionState}
            onClose={handleCloseFilm}
          />
        ) : null}
        {showReopenFilm ? (
          <button
            type="button"
            className="lobby-entry-reopen"
            onClick={handleReopenFilm}
          >
            {studioLobbyEntryV1.copy.reopenFilm}
          </button>
        ) : null}
        {transitioning ? transitionGlow : null}
      </div>
    </div>
  );
}
