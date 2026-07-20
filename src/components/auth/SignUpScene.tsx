"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { safeReturnPath } from "@/lib/auth/safe-return-path";
import UtilityPasswordField from "@/components/auth/UtilityPasswordField";

export default function SignUpScene() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = useMemo(
    () => safeReturnPath(searchParams.get("from")),
    [searchParams],
  );
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      verification?: { emailSent?: boolean };
    };

    if (!response.ok) {
      setError(body.error ?? "We could not create your account. Please try again.");
      setSubmitting(false);
      return;
    }

    const pending = new URL("/verify-email/pending", window.location.origin);
    if (returnTo && returnTo !== "/studio-board") {
      pending.searchParams.set("from", returnTo);
    }
    if (body.verification && body.verification.emailSent === false) {
      pending.searchParams.set("delivery", "failed");
    }
    router.replace(`${pending.pathname}${pending.search}`);
    router.refresh();
  }

  const signInHref =
    returnTo && returnTo !== "/studio-board"
      ? `/sign-in?from=${encodeURIComponent(returnTo)}`
      : "/sign-in";

  return (
    <div className="utility-page">
      <div className="utility-shell utility-shell--narrow">
        <section className="utility-card" aria-labelledby="sign-up-title">
          <p className="utility-eyebrow">Client Access</p>
          <h1 id="sign-up-title" className="utility-title">
            Create your Studio account
          </h1>
          <p className="utility-lead">
            Create an account to follow your Studio work and receive updates.
            After you create an account, we will ask you to verify your email.
          </p>

          <form className="utility-form" onSubmit={handleSubmit}>
            <label className="utility-field">
              <span>Your name</span>
              <input
                type="text"
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
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <UtilityPasswordField
              label="Password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
              className="utility-btn utility-btn--primary"
              type="submit"
              disabled={submitting}
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
