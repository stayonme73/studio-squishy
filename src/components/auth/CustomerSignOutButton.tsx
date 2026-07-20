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
 */
export default function CustomerSignOutButton({ className }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

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
