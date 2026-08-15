"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  clearStoredProjectClaimReceipt,
  writeStoredProjectClaimReceipt,
} from "@/lib/studio-project-claim/client-receipt";

type ClaimState =
  | { status: "working" }
  | { status: "need_sign_in" }
  | { status: "need_verify" }
  | { status: "success"; campaignId: string }
  | { status: "error"; message: string };

/**
 * Guest pay → claim link landing. Does not redesign Lobby/Board rooms.
 */
export default function ClaimProjectScene() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<ClaimState>({ status: "working" });

  useEffect(() => {
    const token = searchParams.get("token")?.trim() ?? "";
    const campaignId = searchParams.get("campaignId")?.trim() ?? "";
    if (!token || !campaignId) {
      setState({
        status: "error",
        message: "This claim link is missing required details.",
      });
      return;
    }

    writeStoredProjectClaimReceipt({
      campaignId,
      claimToken: token,
      checkoutSessionId: "from-claim-link",
      savedAt: new Date().toISOString(),
    });

    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/campaigns/claim", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, claimToken: token }),
      });
      if (cancelled) return;
      if (response.status === 401) {
        setState({ status: "need_sign_in" });
        return;
      }
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        campaignId?: string;
      };
      if (response.ok && body.ok) {
        clearStoredProjectClaimReceipt();
        setState({
          status: "success",
          campaignId: body.campaignId ?? campaignId,
        });
        return;
      }
      if (body.error === "email_unverified") {
        setState({ status: "need_verify" });
        return;
      }
      setState({
        status: "error",
        message:
          typeof body.message === "string"
            ? body.message
            : "This project could not be claimed.",
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (state.status === "working") {
    return (
      <div className="utility-page utility-shell" aria-busy="true">
        <p>Claiming your Studio project…</p>
      </div>
    );
  }

  if (state.status === "need_sign_in") {
    return (
      <div className="utility-page utility-shell">
        <h1>Sign in to claim your project</h1>
        <p>
          You already paid for this Studio project. Sign in or create an
          account, verify your email, then return to this claim link or open
          Studio Board. A claim receipt is saved on this device until claim
          succeeds.
        </p>
        <p>
          <Link href="/sign-in">Sign in</Link>
          {" · "}
          <Link href="/sign-up">Create account</Link>
        </p>
      </div>
    );
  }

  if (state.status === "need_verify") {
    return (
      <div className="utility-page utility-shell">
        <h1>Verify your email</h1>
        <p>
          Verify your Studio email before this paid project can be claimed.
        </p>
        <p>
          <Link href="/verify-email/pending">Continue verification</Link>
        </p>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="utility-page utility-shell">
        <h1>Project claimed</h1>
        <p>Your paid Studio project is now linked to this account.</p>
        <p>
          <button
            type="button"
            onClick={() =>
              router.push(
                `/studio-board?campaignId=${encodeURIComponent(state.campaignId)}`,
              )
            }
          >
            Open Studio Board
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="utility-page utility-shell">
      <h1>Claim unavailable</h1>
      <p>{state.message}</p>
      <p>
        <Link href="/studio-lobby">Return to Studio Lobby</Link>
      </p>
    </div>
  );
}
