/**
 * Studio Lobby Entry Film v1 — runtime chrome over the locked Lobby.
 * @see docs/studio-lobby-entry-split-v1-locked.md
 * Design reference: docs/illustration/references/studio-lobby-entry-film-v1.png
 */

/** Cookie mirrors visit choice so New works when phone JS/hydration fails. */
export const LOBBY_ENTRY_CHOICE_COOKIE = "studio_lobby_entry_choice";

export const studioLobbyEntryV1 = {
  version: 1 as const,
  /** Visit-level choice only — not a permanent preference. */
  sessionChoiceKey: "studioLobbyEntryChoice",
  /** Film visually dismissed via X without choosing a path (journey still gated). */
  sessionFilmDismissedKey: "studioLobbyEntryFilmDismissed",

  copy: {
    welcomeScript: "Welcome to",
    brand: "THE STUDIO",
    supportingLine: "Choose where you’d like to begin.",
    orLabel: "OR",
    newToStudio: {
      title: "NEW TO THE STUDIO",
      description: "Begin with a guided conversation.",
      cta: "LET’S GET STARTED",
    },
    returningSignedOut: {
      title: "RETURNING CLIENT",
      description: "Sign in to access your Studio Board.",
      cta: "SIGN IN",
    },
    returningSignedIn: {
      title: "RETURNING CLIENT",
      description: "Return to your Studio Board.",
      cta: "OPEN MY STUDIO BOARD",
    },
    /** Shown only while session probe is unresolved — never claims Sign In or Board. */
    returningChecking: {
      title: "RETURNING CLIENT",
      description: "Confirming whether you are already signed in.",
      cta: "ONE MOMENT…",
    },
    help: {
      prompt: "Need help deciding? Visit the Help Center for answers to common questions.",
      cta: "OPEN HELP CENTER",
    },
    /** Soft ambient line — no security guarantees. */
    footer: "Your projects. Your information. We’re here when you’re ready.",
    reopenFilm: "Choose how to begin",
    closeFilmAria: "Close entry panel. Journey choices stay available when you are ready.",
  },

  routes: {
    signInFromBoard: "/sign-in?from=/studio-board",
    studioBoard: "/studio-board",
    helpCenter: "/help-center?from=studio-lobby",
    /** Full navigation fallback when Lobby client handlers do not attach. */
    beginNew: "/lobby-entry/begin-new",
  },
} as const;

export type LobbyEntryChoice = "new-to-studio";

/** Session only — a leftover cookie must not unlock the Lobby by itself. */
export function readLobbyEntryChoice(): LobbyEntryChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(studioLobbyEntryV1.sessionChoiceKey);
    return value === "new-to-studio" ? "new-to-studio" : null;
  } catch {
    return null;
  }
}

/** Cookie set by begin-new for no-JS phones — not enough alone to unlock on desktop. */
export function readLobbyEntryChoiceCookie(): LobbyEntryChoice | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${LOBBY_ENTRY_CHOICE_COOKIE}=`));
    if (!match) return null;
    const value = decodeURIComponent(
      match.slice(LOBBY_ENTRY_CHOICE_COOKIE.length + 1),
    );
    return value === "new-to-studio" ? "new-to-studio" : null;
  } catch {
    return null;
  }
}

export function clearLobbyEntryChoiceCookie(): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${LOBBY_ENTRY_CHOICE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function writeLobbyEntryChoice(choice: LobbyEntryChoice): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(studioLobbyEntryV1.sessionChoiceKey, choice);
  } catch {
    /* ignore */
  }
  try {
    if (choice === "new-to-studio") {
      document.cookie = `${LOBBY_ENTRY_CHOICE_COOKIE}=new-to-studio; Path=/; Max-Age=${60 * 60 * 12}; SameSite=Lax`;
    }
  } catch {
    /* ignore */
  }
}

export function readLobbyEntryFilmDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(studioLobbyEntryV1.sessionFilmDismissedKey) === "1";
  } catch {
    return false;
  }
}

export function writeLobbyEntryFilmDismissed(dismissed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (dismissed) {
      sessionStorage.setItem(studioLobbyEntryV1.sessionFilmDismissedKey, "1");
    } else {
      sessionStorage.removeItem(studioLobbyEntryV1.sessionFilmDismissedKey);
    }
  } catch {
    /* ignore */
  }
}

/** Clears visit-level film gate — used by `?lobbyEntry=reset` for phone cert. */
export function clearLobbyEntryVisitState(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(studioLobbyEntryV1.sessionChoiceKey);
    sessionStorage.removeItem(studioLobbyEntryV1.sessionFilmDismissedKey);
  } catch {
    /* ignore */
  }
  clearLobbyEntryChoiceCookie();
}
