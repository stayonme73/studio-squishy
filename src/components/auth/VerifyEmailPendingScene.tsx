"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { safeReturnPath } from "@/lib/auth/safe-return-path";
import {
  hasTrustedProjectContextForVerificationPending,
  resolveVerificationPendingLead,
} from "@/lib/auth/verification-pending-context";

export default function VerifyEmailPendingScene() {
  const searchParams = useSearchParams();
  const returnTo = useMemo(
    () => safeReturnPath(searchParams.get("from")),
    [searchParams],
  );
  const deliveryFailed = searchParams.get("delivery") === "failed";
  const [status, setStatus] = useState<string | null>(
    deliveryFailed
      ? "We created your account, but the verification email did not send. Please try resending in a moment."
      : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [pendingLead, setPendingLead] = useState<string | null>(null);

  useEffect(() => {
    setPendingLead(
      resolveVerificationPendingLead(
        hasTrustedProjectContextForVerificationPending(),
      ),
    );
  }, []);

  const signInHref =
    returnTo && returnTo !== "/studio-board"
      ? `/sign-in?from=${encodeURIComponent(returnTo)}`
      : "/sign-in";

  async function handleResend(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const response = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        retryHint?: string;
      };
      setStatus(body.retryHint ?? body.message ?? "Check your inbox for a new email.");
    } catch {
      setStatus("We could not send the email just now. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="utility-page">
      <div className="utility-shell utility-shell--narrow">
        <section className="utility-card" aria-labelledby="verify-pending-title">
          <p className="utility-eyebrow">Client Access</p>
          <h1 id="verify-pending-title" className="utility-title">
            Check your email
          </h1>
          {pendingLead ? (
            <p className="utility-lead">{pendingLead}</p>
          ) : (
            <p className="utility-lead" aria-busy="true">
              Check your email to verify your account.
            </p>
          )}

          <form className="utility-form" onSubmit={handleResend}>
            {status ? (
              <p className="utility-note" role="status">
                {status}
              </p>
            ) : null}
            <button
              className="utility-btn utility-btn--primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Resend verification email"}
            </button>
          </form>

          <p className="utility-note">
            Already verified? <Link href={signInHref}>Sign in</Link>.
          </p>
          <p className="utility-note">
            Need help? <Link href="/help-center">Visit the Help Center</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
