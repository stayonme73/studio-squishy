"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { customerSignOutToLobby } from "@/lib/auth/customer-sign-out-client";

/** Account page sign-out. Same lobby handoff as the Studio Board control. */
export default function AccountSignOutButton() {
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
    <button
      type="button"
      className="utility-btn utility-btn--secondary"
      onClick={() => void handleSignOut()}
      disabled={busy}
    >
      {label}
    </button>
  );
}
