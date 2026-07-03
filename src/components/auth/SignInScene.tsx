"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const SAFE_RETURN_PATHS = new Set([
  "/studio-board",
  "/feedback-studio",
  "/review-room",
  "/deliverables",
  "/help-center",
]);

function safeReturnPath(value: string | null): string {
  if (!value) return "/studio-board";
  const [pathname] = value.split("?");
  if (SAFE_RETURN_PATHS.has(pathname)) return value;
  return "/studio-board";
}

export default function SignInScene() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = useMemo(
    () => safeReturnPath(searchParams.get("from")),
    [searchParams],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    router.replace(returnTo);
    router.refresh();
  }

  return (
    <div className="utility-page">
      <div className="utility-shell utility-shell--narrow">
        <section className="utility-card" aria-labelledby="sign-in-title">
          <p className="utility-eyebrow">Client Access</p>
          <h1 id="sign-in-title" className="utility-title">
            Sign in to The Studio
          </h1>
          <p className="utility-lead">
            Use the account connected to your Studio work to open your Board,
            Review Room, Project Record, and Final Delivery.
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
            <label className="utility-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error ? <p className="utility-error" role="alert">{error}</p> : null}
            <button className="utility-btn utility-btn--primary" type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="utility-note">
            Need help? <Link href="/help-center">Visit the Help Center</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
