"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { localCedarLaneReviewCopy } from "@/lib/auth/local-cedar-lane-review-copy";
import {
  LOCAL_CUSTOMER_ONE_FIXTURE_ID,
  localCustomerOneAuthFixtureCopy,
} from "@/lib/auth/local-customer-one-fixture-copy";
import { resolveSignInDestinationTitle } from "@/lib/auth/sign-in-destination-copy";
import { promoteStudioVoiceBoardHandoffToWelcome } from "@/lib/studio-voice-board-handoff";
import { claimPaidProjectAfterAuth } from "@/lib/studio-project-claim/after-auth-client";
import { useSamsungActivate } from "@/lib/studio-samsung-activate";
import ClientAccessGlass from "@/components/auth/ClientAccessGlass";
import UtilityPasswordField from "@/components/auth/UtilityPasswordField";

const SESSION_PROBE_TIMEOUT_MS = 2500;

const SIGN_IN_LEAD =
  "Use the account connected to your Studio work to open your Board, Review Room, and Final Delivery.";

/** Full navigation — soft router.replace can leave phone/desktop stuck on /sign-in. */
function goToReturnPath(path: string) {
  window.location.assign(path);
}

type Props = {
  /** Server-allowlisted return path — never read from useSearchParams during render. */
  returnTo: string;
  /** True only when the requested allowlisted `from` was explicitly `/studio-board`. */
  showProjectCreatedLead: boolean;
  /** Server-gated local/test Customer-One fixture. Never true in production. */
  showLocalAuthFixture?: boolean;
};

export default function SignInScene({
  returnTo,
  showProjectCreatedLead,
  showLocalAuthFixture = false,
}: Props) {
  const lead = showProjectCreatedLead
    ? conversationRoomGuideV1.boardHandoffSignInLead
    : SIGN_IN_LEAD;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

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
        if (
          body.user?.id &&
          !(
            showLocalAuthFixture &&
            body.user.id !== LOCAL_CUSTOMER_ONE_FIXTURE_ID
          )
        ) {
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
  }, [returnTo, showLocalAuthFixture]);

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (submittingRef.current) return;
    const form = formRef.current;
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = form ? new FormData(form) : null;
    const nextEmail = String(data?.get("email") ?? "").trim() || email.trim();
    const nextPassword = String(data?.get("password") ?? "") || password;
    if (!nextEmail || !nextPassword) {
      form?.reportValidity();
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Sign-in failed.");
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }

      await claimPaidProjectAfterAuth();
      promoteStudioVoiceBoardHandoffToWelcome();
      goToReturnPath(returnTo);
    } catch {
      setError("Sign-in failed.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const submitActivate = useSamsungActivate<HTMLButtonElement>(() => {
    void handleSubmit();
  });

  async function handleLocalCustomerOneFixture() {
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/local-customer-one", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      setError("Local test sign-in is unavailable.");
      setSubmitting(false);
      return;
    }

    promoteStudioVoiceBoardHandoffToWelcome();
    goToReturnPath(returnTo);
  }

  async function handleLocalCedarLaneFixture() {
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/local-cedar-lane-review", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      setError("Local test sign-in is unavailable.");
      setSubmitting(false);
      return;
    }

    promoteStudioVoiceBoardHandoffToWelcome();
    goToReturnPath(returnTo);
  }

  return (
    <div className="utility-page utility-page--client-access">
      <ClientAccessGlass />
      <div className="utility-shell utility-shell--narrow">
        <section className="utility-card" aria-labelledby="sign-in-title">
          <p className="utility-eyebrow">Client Access</p>
          <h1 id="sign-in-title" className="utility-title">
            {resolveSignInDestinationTitle(returnTo)}
          </h1>
          <p className="utility-lead">{lead}</p>

          <form ref={formRef} className="utility-form" onSubmit={handleSubmit}>
            <label className="utility-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <UtilityPasswordField
              label="Password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <p className="utility-note">
              <Link href={`/forgot-password?from=${encodeURIComponent(returnTo)}`}>
                Forgot password?
              </Link>
            </p>
            {error ? <p className="utility-error" role="alert">{error}</p> : null}
            <button
              ref={submitActivate.ref}
              className="utility-btn utility-btn--primary"
              type="submit"
              disabled={submitting}
              onClick={submitActivate.onClick}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {showLocalAuthFixture ? (
            <div className="utility-local-fixture" data-local-auth-fixture="customer-one">
              <p className="utility-eyebrow">
                {localCustomerOneAuthFixtureCopy.eyebrow}
              </p>
              <p className="utility-note">{localCustomerOneAuthFixtureCopy.note}</p>
              <button
                className="utility-btn utility-btn--secondary"
                type="button"
                onClick={() => void handleLocalCustomerOneFixture()}
                disabled={submitting}
              >
                {localCustomerOneAuthFixtureCopy.button}
              </button>
              <p className="utility-note">{localCedarLaneReviewCopy.note}</p>
              <button
                className="utility-btn utility-btn--secondary"
                type="button"
                onClick={() => void handleLocalCedarLaneFixture()}
                disabled={submitting}
              >
                {localCedarLaneReviewCopy.button}
              </button>
            </div>
          ) : null}

          <p className="utility-note">
            New here?{" "}
            <Link href={`/sign-up?from=${encodeURIComponent(returnTo)}`}>
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
