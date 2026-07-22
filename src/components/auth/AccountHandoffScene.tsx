"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { safeReturnPath } from "@/lib/auth/safe-return-path";
import { promoteStudioVoiceBoardHandoffToWelcome } from "@/lib/studio-voice-board-handoff";

const SESSION_PROBE_TIMEOUT_MS = 2500;

function goToReturnPath(path: string) {
  window.location.assign(path);
}

function withFrom(path: string, returnTo: string) {
  return `${path}?from=${encodeURIComponent(returnTo)}`;
}

/**
 * Compact utility after Intake — Create Account primary, Sign In secondary.
 * Does not assume new vs returning. Both paths keep allowlisted Board return.
 */
export default function AccountHandoffScene() {
  const searchParams = useSearchParams();
  const returnTo = useMemo(
    () => safeReturnPath(searchParams.get("from")),
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => controller.abort(),
      SESSION_PROBE_TIMEOUT_MS,
    );

    void fetch("/api/auth/session", {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) return;
        const body = (await response.json().catch(() => ({}))) as {
          user?: { id?: string } | null;
        };
        if (body.user?.id) {
          promoteStudioVoiceBoardHandoffToWelcome();
          goToReturnPath(returnTo);
        }
      })
      .catch(() => {
        /* fail closed — keep choice visible */
      })
      .finally(() => {
        window.clearTimeout(timer);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [returnTo]);

  const createAccountHref = withFrom("/sign-up", returnTo);
  const signInHref = withFrom("/sign-in", returnTo);

  return (
    <div className="utility-page">
      <div className="utility-shell utility-shell--narrow">
        <section className="utility-card" aria-labelledby="account-handoff-title">
          <p className="utility-eyebrow">Client Access</p>
          <h1 id="account-handoff-title" className="utility-title">
            Open your Studio Board
          </h1>
          <p className="utility-lead">
            {conversationRoomGuideV1.boardHandoffAccountChoiceLead}
          </p>

          <div className="utility-form" style={{ width: "100%" }}>
            <Link
              className="utility-btn utility-btn--primary"
              href={createAccountHref}
              style={{ width: "100%" }}
            >
              Create Account
            </Link>
            <Link
              className="utility-btn utility-btn--secondary"
              href={signInHref}
              style={{ width: "100%" }}
            >
              Sign In
            </Link>
          </div>

          <p className="utility-note">
            Need help? <Link href="/help-center">Visit the Help Center</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
