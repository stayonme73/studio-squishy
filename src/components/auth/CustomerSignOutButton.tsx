"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { clearLobbyEntryVisitState } from "@/config/studio-lobby-entry-v1";

type Props = {
  className?: string;
};

/**
 * Customer Sign out — clears the Studio session and returns to the Lobby
 * Entry Film as a signed-out visitor (no Voice, no auto New/Returning).
 */
export default function CustomerSignOutButton({ className }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Still navigate — cookie clear may have succeeded server-side.
    }
    clearLobbyEntryVisitState();
    router.replace("/studio-lobby");
    router.refresh();
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => void handleSignOut()}
      disabled={busy}
    >
      {busy ? "Signing out..." : "Sign out"}
    </button>
  );
}
