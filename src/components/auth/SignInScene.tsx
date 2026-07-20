"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { safeReturnPath } from "@/lib/auth/safe-return-path";
import {
  peekStudioVoiceBoardHandoffAwaitingSignIn,
  promoteStudioVoiceBoardHandoffToWelcome,
} from "@/lib/studio-voice-board-handoff";
import UtilityPasswordField from "@/components/auth/UtilityPasswordField";

const SESSION_PROBE_TIMEOUT_MS = 2500;

/** Full navigation — soft router.replace can leave phone/desktop stuck on /sign-in. */
function goToReturnPath(path: string) {
  window.location.assign(path);
}

export default function SignInScene() {
  const searchParams = useSearchParams();
  const returnTo = useMemo(
    () => safeReturnPath(searchParams.get("from")),
    [searchParams],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const showBoardHandoff = useMemo(
    () => peekStudioVoiceBoardHandoffAwaitingSignIn(),
    [],
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
        // No session / probe failure → keep the form visible (fail closed).
      })
      .catch(() => {
        // Aborted or network error → form stays; do not grant access.
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Sign-in failed.");
      setSubmitting(false);
      return;
    }

    promoteStudioVoiceBoardHandoffToWelcome();
    goToReturnPath(returnTo);
  }

  return (
    <div className="utility-page">
      <div className="utility-shell utility-shell--narrow">
        <section className="utility-card" aria-labelledby="sign-in-title">
          <p className="utility-eyebrow">
            {showBoardHandoff ? "Studio Voice" : "Client Access"}
          </p>
          <h1 id="sign-in-title" className="utility-title">
            Sign in to The Studio
          </h1>
          <p className="utility-lead">
            {showBoardHandoff
              ? conversationRoomGuideV1.boardHandoffSignInLead
              : "Use the account connected to your Studio work to open your Board, Review Room, Project Record, and Final Delivery."}
          </p>

          <form className="utility-form" onSubmit={handleSubmit}>
            <label className="utility-field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <UtilityPasswordField
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <p className="utility-note">
              <Link
                href={
                  returnTo && returnTo !== "/studio-board"
                    ? `/forgot-password?from=${encodeURIComponent(returnTo)}`
                    : "/forgot-password"
                }
              >
                Forgot password?
              </Link>
            </p>
            {error ? <p className="utility-error" role="alert">{error}</p> : null}
            <button
              className="utility-btn utility-btn--primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="utility-note">
            New here?{" "}
            <Link
              href={
                returnTo && returnTo !== "/studio-board"
                  ? `/sign-up?from=${encodeURIComponent(returnTo)}`
                  : "/sign-up"
              }
            >
              Create an account
            </Link>
            .
          </p>
          <p className="utility-note">
            Need help? <Link href="/help-center">Visit the Help Center</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
