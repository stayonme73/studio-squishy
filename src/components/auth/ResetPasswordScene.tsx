"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { safeReturnPath } from "@/lib/auth/safe-return-path";
import UtilityPasswordField from "@/components/auth/UtilityPasswordField";

type ResetState =
  | { kind: "form" }
  | { kind: "success" }
  | { kind: "error"; message: string; code?: string };

export default function ResetPasswordScene() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const returnTo = useMemo(
    () => safeReturnPath(searchParams.get("from")),
    [searchParams],
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<ResetState>(() =>
    token
      ? { kind: "form" }
      : {
          kind: "error",
          code: "missing",
          message:
            "This password reset link is incomplete. Request a new email to continue.",
        },
  );

  const signInHref =
    returnTo && returnTo !== "/studio-board"
      ? `/sign-in?from=${encodeURIComponent(returnTo)}`
      : "/sign-in";
  const forgotHref =
    returnTo && returnTo !== "/studio-board"
      ? `/forgot-password?from=${encodeURIComponent(returnTo)}`
      : "/forgot-password";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      code?: string;
    };

    if (response.ok && body.ok) {
      setState({ kind: "success" });
      setSubmitting(false);
      return;
    }

    setState({
      kind: "error",
      code: body.code,
      message:
        body.error ??
        "This password reset link is not valid. Request a new email to continue.",
    });
    setSubmitting(false);
  }

  return (
    <div className="utility-page">
      <div className="utility-shell utility-shell--narrow">
        <section className="utility-card" aria-labelledby="reset-password-title">
          <p className="utility-eyebrow">Client Access</p>

          {state.kind === "form" ? (
            <>
              <h1 id="reset-password-title" className="utility-title">
                Choose a new password
              </h1>
              <p className="utility-lead">
                Enter a new password for your Studio account. After you save it,
                you will sign in again.
              </p>
              <form className="utility-form" onSubmit={handleSubmit}>
                <UtilityPasswordField
                  label="New password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                />
                <UtilityPasswordField
                  label="Confirm new password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                />
                <button
                  className="utility-btn utility-btn--primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save new password"}
                </button>
              </form>
            </>
          ) : null}

          {state.kind === "success" ? (
            <>
              <h1 id="reset-password-title" className="utility-title">
                Password updated
              </h1>
              <p className="utility-lead" role="status">
                Your password is updated. Sign in with your new password to
                continue.
              </p>
              <p className="utility-note">
                <Link href={signInHref}>Continue to sign in</Link>
              </p>
            </>
          ) : null}

          {state.kind === "error" ? (
            <>
              <h1 id="reset-password-title" className="utility-title">
                Reset needed
              </h1>
              <p className="utility-lead" role="alert">
                {state.message}
              </p>
              <p className="utility-note">
                <Link href={forgotHref}>Request a new password reset email</Link>
              </p>
              <p className="utility-note">
                Or <Link href={signInHref}>return to sign in</Link>.
              </p>
            </>
          ) : null}

          <p className="utility-note">
            Need help? <Link href="/help-center">Visit the Help Center</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
