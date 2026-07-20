"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { safeReturnPath } from "@/lib/auth/safe-return-path";

export default function ForgotPasswordScene() {
  const searchParams = useSearchParams();
  const returnTo = useMemo(
    () => safeReturnPath(searchParams.get("from")),
    [searchParams],
  );
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const signInHref =
    returnTo && returnTo !== "/studio-board"
      ? `/sign-in?from=${encodeURIComponent(returnTo)}`
      : "/sign-in";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    setMessage(
      body.message ??
        "If an account exists for that email, we sent a password reset link. Check your inbox and spam folder.",
    );
    setSubmitting(false);
  }

  return (
    <div className="utility-page">
      <div className="utility-shell utility-shell--narrow">
        <section className="utility-card" aria-labelledby="forgot-password-title">
          <p className="utility-eyebrow">Client Access</p>
          <h1 id="forgot-password-title" className="utility-title">
            Forgot your password?
          </h1>
          <p className="utility-lead">
            Enter the email for your Studio account. If an account exists, we
            will send a reset link.
          </p>

          {message ? (
            <p className="utility-note" role="status">
              {message}
            </p>
          ) : (
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
              <button
                className="utility-btn utility-btn--primary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <p className="utility-note">
            <Link href={signInHref}>Return to sign in</Link>
          </p>
          <p className="utility-note">
            Need help? <Link href="/help-center">Visit the Help Center</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
