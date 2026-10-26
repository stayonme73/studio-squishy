"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";

import ClientAccessGlass from "@/components/auth/ClientAccessGlass";
import { promoteStudioVoiceBoardHandoffToWelcome } from "@/lib/studio-voice-board-handoff";
import { claimPaidProjectAfterAuth } from "@/lib/studio-project-claim/after-auth-client";
import { useSamsungActivate } from "@/lib/studio-samsung-activate";
import UtilityPasswordField from "@/components/auth/UtilityPasswordField";

/** Full navigation — soft router can leave customers stuck off the Board return. */
function goToReturnPath(path: string) {
  window.location.assign(path);
}

function withFrom(path: string, returnTo: string) {
  return `${path}?from=${encodeURIComponent(returnTo)}`;
}

type Props = {
  /** Server-allowlisted return path — never read from useSearchParams during render. */
  returnTo: string;
};

export default function SignUpScene({ returnTo }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (submittingRef.current) return;
    const form = formRef.current;
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = form ? new FormData(form) : null;
    const nextDisplayName =
      String(data?.get("displayName") ?? "").trim() || displayName.trim();
    const nextEmail = String(data?.get("email") ?? "").trim() || email.trim();
    const nextPassword = String(data?.get("password") ?? "") || password;
    if (!nextDisplayName || !nextEmail || !nextPassword) {
      form?.reportValidity();
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: nextEmail,
          password: nextPassword,
          displayName: nextDisplayName,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        user?: { id?: string };
      };

      if (!response.ok) {
        setError(body.error ?? "We could not create your account. Please try again.");
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }

      /* Session cookie is set. Claim the paid campaign this device just completed. */
      await claimPaidProjectAfterAuth();

      /* Signup already set the session cookie — continue to Board without a second password. */
      promoteStudioVoiceBoardHandoffToWelcome();
      goToReturnPath(returnTo);
    } catch {
      setError("We could not create your account. Please try again.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const submitActivate = useSamsungActivate<HTMLButtonElement>(() => {
    void handleSubmit();
  });

  const signInHref = withFrom("/sign-in", returnTo);

  return (
    <div className="utility-page utility-page--client-access">
      <ClientAccessGlass />
      <div className="utility-shell utility-shell--narrow">
        <section className="utility-card" aria-labelledby="sign-up-title">
          <p className="utility-eyebrow">Client Access</p>
          <h1 id="sign-up-title" className="utility-title">
            Create your Studio account
          </h1>
          <p className="utility-lead">
            Create an account to follow your Studio work and receive updates.
            We will also send a verification email — you can open your Studio
            Board now while that stays soft in the background.
          </p>

          <form
            ref={formRef}
            id="studio-sign-up-form"
            className="utility-form"
            onSubmit={handleSubmit}
          >
            <label className="utility-field">
              <span>Your name</span>
              <input
                type="text"
                name="displayName"
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                maxLength={80}
              />
            </label>
            <label className="utility-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <UtilityPasswordField
              label="Password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onFocus={() => {
                formRef.current
                  ?.querySelector<HTMLButtonElement>("[data-signup-submit]")
                  ?.scrollIntoView({ block: "center", behavior: "smooth" });
              }}
              required
              minLength={8}
              maxLength={128}
            />
            {error ? (
              <p className="utility-error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              ref={submitActivate.ref}
              className="utility-btn utility-btn--primary"
              type="submit"
              data-signup-submit=""
              disabled={submitting}
              onClick={submitActivate.onClick}
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="utility-note">
            Already have an account? <Link href={signInHref}>Sign in</Link>.
          </p>
          <p className="utility-note">
            Need help? <Link href="/help-center">Visit the Help Center</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
