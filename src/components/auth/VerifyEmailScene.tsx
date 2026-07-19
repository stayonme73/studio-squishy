"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { safeReturnPath } from "@/lib/auth/safe-return-path";

type VerifyState =
  | { kind: "loading" }
  | { kind: "success"; email: string }
  | { kind: "error"; message: string; code?: string };

export default function VerifyEmailScene() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const returnTo = useMemo(
    () => safeReturnPath(searchParams.get("from")),
    [searchParams],
  );
  const [state, setState] = useState<VerifyState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        if (!cancelled) {
          setState({
            kind: "error",
            code: "missing",
            message:
              "This verification link is incomplete. Request a new email to continue.",
          });
        }
        return;
      }

      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        code?: string;
        user?: { email?: string };
      };

      if (cancelled) return;
      if (response.ok && body.ok && body.user?.email) {
        setState({ kind: "success", email: body.user.email });
        return;
      }
      setState({
        kind: "error",
        code: body.code,
        message:
          body.error ??
          "This verification link is not valid. Request a new email to continue.",
      });
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const pendingHref =
    returnTo && returnTo !== "/studio-board"
      ? `/verify-email/pending?from=${encodeURIComponent(returnTo)}`
      : "/verify-email/pending";
  const signInHref =
    returnTo && returnTo !== "/studio-board"
      ? `/sign-in?from=${encodeURIComponent(returnTo)}`
      : "/sign-in";

  return (
    <div className="utility-page">
      <div className="utility-shell utility-shell--narrow">
        <section className="utility-card" aria-labelledby="verify-email-title">
          <p className="utility-eyebrow">Client Access</p>
          {state.kind === "loading" ? (
            <>
              <h1 id="verify-email-title" className="utility-title">
                Verifying your email
              </h1>
              <p className="utility-lead" aria-busy="true">
                Please wait while we confirm your verification link.
              </p>
            </>
          ) : null}

          {state.kind === "success" ? (
            <>
              <h1 id="verify-email-title" className="utility-title">
                Email verified
              </h1>
              <p className="utility-lead">
                Your email is verified. You can continue with The Studio when
                you are ready.
              </p>
              <p className="utility-note" role="status">
                Verified as {state.email}.
              </p>
              <p className="utility-note">
                <Link href={signInHref}>Continue to sign in</Link>
              </p>
            </>
          ) : null}

          {state.kind === "error" ? (
            <>
              <h1 id="verify-email-title" className="utility-title">
                Verification needed
              </h1>
              <p className="utility-lead" role="alert">
                {state.message}
              </p>
              <p className="utility-note">
                <Link href={pendingHref}>Request a new verification email</Link>
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
