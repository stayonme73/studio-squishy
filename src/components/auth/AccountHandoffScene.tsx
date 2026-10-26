"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";

import ClientAccessGlass from "@/components/auth/ClientAccessGlass";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { safeReturnPath } from "@/lib/auth/safe-return-path";
import { promoteStudioVoiceBoardHandoffToWelcome } from "@/lib/studio-voice-board-handoff";
import { useSamsungActivate } from "@/lib/studio-samsung-activate";

const SESSION_PROBE_TIMEOUT_MS = 2500;

function goToReturnPath(path: string) {
  window.location.assign(path);
}

function withFrom(path: string, returnTo: string) {
  return `${path}?from=${encodeURIComponent(returnTo)}`;
}

type Props = {
  /** Server-passed `from` query — keeps SSR and first client markup identical. */
  fromParam: string | null;
};

/**
 * Compact utility after Intake — Create Account primary, Sign In secondary.
 * Does not assume new vs returning. Both paths keep allowlisted Board return.
 *
 * Initial markup must not read window, storage, passport, or useSearchParams.
 * Session probe runs only after mount.
 */
export default function AccountHandoffScene({ fromParam }: Props) {
  const returnTo = useMemo(() => safeReturnPath(fromParam), [fromParam]);

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
  const createActivate = useSamsungActivate<HTMLAnchorElement>(() => {
    goToReturnPath(createAccountHref);
  });
  const signInActivate = useSamsungActivate<HTMLAnchorElement>(() => {
    goToReturnPath(signInHref);
  });

  return (
    <div className="utility-page utility-page--client-access">
      <ClientAccessGlass />
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
            <a
              ref={createActivate.ref}
              className="utility-btn utility-btn--primary"
              href={createAccountHref}
              style={{ width: "100%" }}
              data-account-handoff="create-account"
              onClick={createActivate.onClick}
            >
              Create Account
            </a>
            <a
              ref={signInActivate.ref}
              className="utility-btn utility-btn--secondary"
              href={signInHref}
              style={{ width: "100%" }}
              data-account-handoff="sign-in"
              onClick={signInActivate.onClick}
            >
              Sign In
            </a>
          </div>

          <p className="utility-note">
            Need help? <Link href="/help-center">Visit the Help Center</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
