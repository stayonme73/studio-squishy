"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  inactivityWarningCopy,
  resolveClientInactivityTimeoutMs,
  resolveClientInactivityWarningLeadMs,
  studioClientSessionTimeoutV1,
} from "@/config/studio-client-session-timeout-v1";
import {
  readLastActivityAt,
  remainingSecondsUntilTimeout,
  shouldInactivityTimeout,
  shouldShowInactivityWarning,
  writeLastActivityAt,
} from "@/lib/auth/client-session-timeout";
import { customerSignOutToLobby } from "@/lib/auth/customer-sign-out-client";

type SessionProbeUser = {
  id?: string;
  roles?: readonly string[];
};

type ChannelMessage =
  | { type: "activity"; at: number }
  | { type: "signed-out" };

const ACTIVITY_THROTTLE_MS = 1000;

function isCustomerSession(user: SessionProbeUser | null | undefined): boolean {
  return Boolean(user?.id && user.roles?.includes("client"));
}

/**
 * Arms only for authenticated customers (`client` role).
 * Background tabs do not reset the timer; visible activity and navigation do.
 * Timeout clears the session and returns to Lobby — working draft untouched.
 */
export default function ClientSessionTimeoutGuard() {
  const pathname = usePathname();
  const [armed, setArmed] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const lastActivityRef = useRef<number>(Date.now());
  const signingOutRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const timeoutMs = resolveClientInactivityTimeoutMs();
  const warningLeadMs = resolveClientInactivityWarningLeadMs();
  const storageKey = studioClientSessionTimeoutV1.storageKey;

  const persistActivity = useCallback(
    (at: number, broadcast: boolean) => {
      lastActivityRef.current = at;
      writeLastActivityAt(
        typeof window !== "undefined" ? window.localStorage : null,
        storageKey,
        at,
      );
      setWarningOpen(false);
      setRemainingSeconds(0);
      if (broadcast && channelRef.current) {
        const message: ChannelMessage = { type: "activity", at };
        channelRef.current.postMessage(message);
      }
    },
    [storageKey],
  );

  const noteActivity = useCallback(() => {
    if (!armed || signingOutRef.current) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }
    const now = Date.now();
    if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return;
    persistActivity(now, true);
  }, [armed, persistActivity]);

  const signOutForTimeout = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setWarningOpen(false);
    setRemainingSeconds(0);
    if (channelRef.current) {
      const message: ChannelMessage = { type: "signed-out" };
      channelRef.current.postMessage(message);
    }
    await customerSignOutToLobby({ hardNavigate: true });
  }, []);

  // Probe session once on mount + when route changes into customer surfaces.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    void fetch("/api/auth/session", {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setArmed(false);
          return;
        }
        const body = (await response.json().catch(() => ({}))) as {
          user?: SessionProbeUser | null;
        };
        if (!isCustomerSession(body.user)) {
          setArmed(false);
          return;
        }
        const stored = readLastActivityAt(
          typeof window !== "undefined" ? window.localStorage : null,
          storageKey,
        );
        const now = Date.now();
        const seed = stored && stored <= now ? stored : now;
        lastActivityRef.current = seed;
        writeLastActivityAt(
          typeof window !== "undefined" ? window.localStorage : null,
          storageKey,
          seed,
        );
        setArmed(true);
      })
      .catch(() => {
        if (!cancelled) setArmed(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname, storageKey]);

  // Cross-tab sync
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(studioClientSessionTimeoutV1.channelName);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "activity" && typeof data.at === "number") {
        lastActivityRef.current = data.at;
        writeLastActivityAt(
          typeof window !== "undefined" ? window.localStorage : null,
          storageKey,
          data.at,
        );
        setWarningOpen(false);
        setRemainingSeconds(0);
        return;
      }
      if (data.type === "signed-out") {
        signingOutRef.current = true;
        window.location.assign(studioClientSessionTimeoutV1.timeoutDestination);
      }
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [storageKey]);

  // Activity listeners — visible tab only (noteActivity gates on visibility).
  useEffect(() => {
    if (!armed) return;

    const onActivity = () => noteActivity();
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener("pointerdown", onActivity, opts);
    window.addEventListener("keydown", onActivity, opts);
    window.addEventListener("touchstart", onActivity, opts);
    window.addEventListener("click", onActivity, opts);
    window.addEventListener("input", onActivity, opts);
    window.addEventListener("scroll", onActivity, opts);

    return () => {
      window.removeEventListener("pointerdown", onActivity, opts);
      window.removeEventListener("keydown", onActivity, opts);
      window.removeEventListener("touchstart", onActivity, opts);
      window.removeEventListener("click", onActivity, opts);
      window.removeEventListener("input", onActivity, opts);
      window.removeEventListener("scroll", onActivity, opts);
    };
  }, [armed, noteActivity]);

  // Navigation counts as activity when the document is visible.
  useEffect(() => {
    if (!armed) return;
    noteActivity();
  }, [armed, pathname, noteActivity]);

  // Tick every second — live countdown while warning is open; timeout still fires.
  useEffect(() => {
    if (!armed) return;

    const evaluate = () => {
      if (signingOutRef.current) return;
      const stored = readLastActivityAt(window.localStorage, storageKey);
      if (stored && stored > lastActivityRef.current) {
        lastActivityRef.current = stored;
      }
      const now = Date.now();
      const last = lastActivityRef.current;
      if (shouldInactivityTimeout({ lastActivityAt: last, now, timeoutMs })) {
        void signOutForTimeout();
        return;
      }
      const showWarning = shouldShowInactivityWarning({
        lastActivityAt: last,
        now,
        timeoutMs,
        warningLeadMs,
      });
      setWarningOpen(showWarning);
      setRemainingSeconds(
        showWarning
          ? remainingSecondsUntilTimeout({
              lastActivityAt: last,
              now,
              timeoutMs,
            })
          : 0,
      );
    };

    evaluate();
    const id = window.setInterval(evaluate, 1000);
    return () => window.clearInterval(id);
  }, [armed, timeoutMs, warningLeadMs, storageKey, signOutForTimeout]);

  if (!armed || !warningOpen) return null;

  return (
    <div
      className="utility-session-timeout"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-body"
    >
      <div className="utility-session-timeout__scrim" />
      <div className="utility-session-timeout__panel">
        <h2 id="session-timeout-title" className="utility-session-timeout__title">
          {studioClientSessionTimeoutV1.warningTitle}
        </h2>
        <p id="session-timeout-body" className="utility-session-timeout__body">
          {inactivityWarningCopy(warningLeadMs)}
        </p>
        <p
          className="utility-session-timeout__countdown"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="utility-session-timeout__countdown-value">
            {remainingSeconds}
          </span>
          <span className="utility-session-timeout__countdown-unit">
            {remainingSeconds === 1 ? "second" : "seconds"}
          </span>
        </p>
        <div className="utility-session-timeout__actions">
          <button
            type="button"
            className="utility-btn utility-btn--primary"
            onClick={() => persistActivity(Date.now(), true)}
          >
            {studioClientSessionTimeoutV1.staySignedInLabel}
          </button>
          <button
            type="button"
            className="utility-btn"
            onClick={() => void signOutForTimeout()}
          >
            {studioClientSessionTimeoutV1.signOutNowLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
