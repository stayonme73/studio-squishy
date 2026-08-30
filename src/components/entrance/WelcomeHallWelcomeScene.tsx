"use client";

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
import {
  clearLobbyEntryVisitState,
  LOBBY_ENTRY_PHONE_MAX_WIDTH_PX,
  readLobbyEntryChoice,
  readLobbyEntryFilmDismissed,
  shouldForceLobbyEntryFilmOnPhone,
  shouldShowLobbyEntryReopen,
  studioLobbyEntryV1,
  writeLobbyEntryChoice,
  writeLobbyEntryFilmDismissed,
} from "@/config/studio-lobby-entry-v1";
import {
  welcomeHallFraming,
  welcomeHallPlateCoverLayout,
  welcomeHallScene,
} from "@/config/welcome-hall-scene";
import { cancelLobbyPodiumGuidanceSpeech } from "@/lib/studio-lobby-podium-guidance";
import { loadGuideDraft } from "@/lib/studio-guide-hard-nav";
import { withStudioPaymentSandboxQuery } from "@/lib/studio-payment/sandbox-query";
import { markVoiceFirstEntryChoiceRequired } from "@/lib/studio-voice-preference";
import { setStudioVoiceInvite } from "@/lib/studio-voice-invite";

const DESKTOP_KIOSK_MIN_WIDTH = 1025;

const SESSION_PROBE_TIMEOUT_MS = 2500;

/** Truthful Lobby session probe — fail closed to signed-out when unknown. */
async function probeLobbySession(
  signal?: AbortSignal,
): Promise<LobbyEntrySessionState> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
      signal,
    });
    if (!response.ok) return "signed-out";
    const body = (await response.json().catch(() => ({}))) as {
      user?: { id?: string } | null;
    };
    return body.user?.id ? "signed-in" : "signed-out";
  } catch {
    return "signed-out";
  }
}

/**
 * Studio Lobby — lounge plate behind Entry Film (desktop + mobile).
 * No podium / kiosk. Let’s Get Started → Conversation Room.
 *
 * LOBBY VOICE (Tagia 2026-07-21): keep silent. Film welcomes visually.
 * Do not add a Lobby greeting. Speech begins only after the customer
 * selects Use Voice guidance in the Conversation Room.
 *
 * @see docs/studio-lobby-entry-split-v1-locked.md (film contract)
 */
export default function WelcomeHallWelcomeScene({
  initialChoseNew = false,
  paymentSandbox = false,
}: {
  /** From visit cookie — unlocks Lobby in HTML when phone JS never attaches. */
  initialChoseNew?: boolean;
  /** Local/cert opt-in only — keep `?studioPaymentSandbox=1` through Let’s Get Started. */
  paymentSandbox?: boolean;
}) {
  const plateRef = useRef<HTMLDivElement>(null);
  const mobileCropRef = useRef<HTMLDivElement>(null);
  const [plateSize, setPlateSize] = useState({ width: 0, height: 0 });
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
  const [viewportWidth, setViewportWidth] = useState(0);

  const phoneFrontDoor = shouldForceLobbyEntryFilmOnPhone({
    transitioning,
    viewportWidth,
  });
  const showEntryFilm = filmOpen || phoneFrontDoor || transitioning;
  /** Desktop only — phone never lands on the dismissed-film reopen pill. */
  const showReopenFilm = shouldShowLobbyEntryReopen({
    filmVisible: showEntryFilm,
    transitioning,
    viewportWidth,
  });

  const isDesktopKiosk = plateSize.width >= DESKTOP_KIOSK_MIN_WIDTH;

  const framing = useMemo(() => welcomeHallFraming(plateSize), [plateSize]);

  const coverLayout = useMemo(
    () => welcomeHallPlateCoverLayout(plateSize, framing),
    [framing, plateSize],
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const entryParam = params.get("lobbyEntry");

    const stripEntryParam = () => {
      params.delete("lobbyEntry");
      const next = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${next ? `?${next}` : ""}`,
      );
    };

    if (entryParam === "reset") {
      clearLobbyEntryVisitState();
      stripEntryParam();
      setChoseNew(false);
      setFilmOpen(true);
    } else if (entryParam === "new" || initialChoseNew) {
      writeLobbyEntryChoice("new-to-studio");
      stripEntryParam();
      setChoseNew(true);
      setFilmOpen(false);
    } else {
      const choice = readLobbyEntryChoice();
      const dismissed = readLobbyEntryFilmDismissed();
      if (choice === "new-to-studio") {
        setChoseNew(true);
        setFilmOpen(false);
      } else if (
        dismissed &&
        window.innerWidth > LOBBY_ENTRY_PHONE_MAX_WIDTH_PX
      ) {
        setFilmOpen(false);
      } else if (dismissed) {
        setFilmOpen(true);
      }
    }
  }, [initialChoseNew]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => controller.abort(),
      SESSION_PROBE_TIMEOUT_MS,
    );

    setSessionState("checking");
    void probeLobbySession(controller.signal)
      .then((next) => {
        if (!cancelled) setSessionState(next);
      })
      .catch(() => {
        if (!cancelled) setSessionState("signed-out");
      })
      .finally(() => {
        window.clearTimeout(timer);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  useLayoutEffect(() => {
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useLayoutEffect(() => {
    const plate = plateRef.current;
    if (!plate) return;

    const syncPlateSize = () => {
      const rect = plate.getBoundingClientRect();
      setPlateSize({ width: rect.width, height: rect.height });
    };

    syncPlateSize();
    const observer = new ResizeObserver(syncPlateSize);
    observer.observe(plate);
    window.addEventListener("resize", syncPlateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncPlateSize);
    };
  }, []);

  const handleCloseFilm = useCallback(() => {
    if (window.innerWidth <= LOBBY_ENTRY_PHONE_MAX_WIDTH_PX) {
      setFilmOpen(true);
      return;
    }
    writeLobbyEntryFilmDismissed(true);
    setFilmOpen(false);
  }, []);

  const handleBeginNew = useCallback(() => {
    writeLobbyEntryChoice("new-to-studio");
    writeLobbyEntryFilmDismissed(false);
    /* Lounge front door: do not speak on Let’s Get Started.
       CR stays silent until the customer picks Voice guidance.
       A leftover Voice On/Off from an earlier visit must not skip that choice. */
    cancelLobbyPodiumGuidanceSpeech();
    markVoiceFirstEntryChoiceRequired();
    const draft = loadGuideDraft();
    const hasProgress = Boolean(draft?.projectNeed?.trim() || draft?.confirmedAt);
    setStudioVoiceInvite(hasProgress ? "resume" : "start");
    setTransitioning(true);
    const sourceSearch = paymentSandbox
      ? window.location.search || "?studioPaymentSandbox=1"
      : window.location.search;
    window.location.assign(
      withStudioPaymentSandboxQuery("/studio-conversation-room", sourceSearch),
    );
  }, [paymentSandbox]);

  const handleReopenFilm = useCallback(() => {
    writeLobbyEntryFilmDismissed(false);
    setFilmOpen(true);
  }, []);

  const plateArt = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={welcomeHallScene.src}
      alt={welcomeHallScene.alt}
      className="welcome-hall-plate-art"
      draggable={false}
    />
  );

  const transitionGlow = (
    <div className="hall-view-ahead-transition" aria-hidden>
      <div className="hall-view-ahead-transition-glow" />
    </div>
  );

  const plateClassName = [
    "welcome-hall-plate",
    transitioning ? " welcome-hall-plate--transitioning" : "",
  ]
    .filter(Boolean)
    .join("");

  const rootClassName = ["welcome-hall-static", "welcome-hall-phase1"].join(" ");

  return (
    <div
      className={rootClassName}
      aria-label="Studio Lobby"
      data-mobile-customer-spine=""
    >
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
            </div>
          </div>
        ) : (
          <div
            ref={mobileCropRef}
            className="welcome-hall-plate-crop welcome-hall-plate-crop--mobile"
          >
            {plateArt}
          </div>
        )}

        {showEntryFilm ? (
          <StudioLobbyEntryFilm
            sessionState={sessionState}
            onClose={handleCloseFilm}
            allowDismiss={viewportWidth > LOBBY_ENTRY_PHONE_MAX_WIDTH_PX}
            onBeginNew={handleBeginNew}
            beginNewHref={withStudioPaymentSandboxQuery(
              studioLobbyEntryV1.routes.beginNew,
              paymentSandbox ? "?studioPaymentSandbox=1" : "",
            )}
          />
        ) : null}
        {showReopenFilm ? (
          <a
            href={studioLobbyEntryV1.routes.beginNew}
            className="lobby-entry-reopen"
            onClick={(event) => {
              event.preventDefault();
              handleReopenFilm();
            }}
          >
            {studioLobbyEntryV1.copy.reopenFilm}
          </a>
        ) : null}
        {transitioning ? transitionGlow : null}
      </div>
    </div>
  );
}
