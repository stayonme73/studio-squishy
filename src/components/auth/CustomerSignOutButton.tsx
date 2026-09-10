"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { customerSignOutToLobby } from "@/lib/auth/customer-sign-out-client";

type Props = {
  className?: string;
};

/**
 * Customer Sign out — clears the Studio session and returns to the Lobby
 * Entry Film as a signed-out visitor (no Voice, no auto New/Returning).
 * Does not clear pre-payment working draft storage.
 *
 * The visible chip is the span (same family as Studio Board). The button is
 * an invisible overlay so phone UA button paint cannot change the color.
 */
export default function CustomerSignOutButton({ className }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const label = busy ? "Signing out..." : "Sign out";

  async function handleSignOut() {
    setBusy(true);
    try {
      await customerSignOutToLobby({
        softNavigate: (path) => {
          router.replace(path);
          router.refresh();
        },
      });
    } catch {
      setBusy(false);
    }
  }

  return (
    <span className={className}>
      <span className="sb-nav__icon" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M10 5H8a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h2" strokeLinecap="round" />
          <path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="sb-nav__label" aria-hidden>
        {label}
      </span>
      <button
        type="button"
        className="sb-sign-out__control"
        aria-label={label}
        onClick={() => void handleSignOut()}
        disabled={busy}
      />
    </span>
  );
}
