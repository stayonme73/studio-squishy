/**
 * Studio Voice — Board handoff passport between Conversation Room, Sign-in, and Board.
 * One session flag so Voice can own the auth transition without redesigning auth.
 */

export const STUDIO_VOICE_BOARD_HANDOFF_KEY =
  "studio-squishy:voice-board-handoff:v1" as const;

export type StudioVoiceBoardHandoffPhase = "awaiting-signin" | "awaiting-board-welcome";

export type StudioVoiceBoardHandoff = {
  version: 1;
  phase: StudioVoiceBoardHandoffPhase;
  setAt: string;
};

function getSessionStorage(): Storage | null {
  try {
    if (typeof globalThis === "undefined") return null;
    const storage = (globalThis as typeof globalThis & { sessionStorage?: Storage })
      .sessionStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

function readRaw(): StudioVoiceBoardHandoff | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STUDIO_VOICE_BOARD_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudioVoiceBoardHandoff>;
    if (
      parsed.version !== 1 ||
      (parsed.phase !== "awaiting-signin" &&
        parsed.phase !== "awaiting-board-welcome")
    ) {
      return null;
    }
    return {
      version: 1,
      phase: parsed.phase,
      setAt:
        typeof parsed.setAt === "string"
          ? parsed.setAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function write(handoff: StudioVoiceBoardHandoff): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(STUDIO_VOICE_BOARD_HANDOFF_KEY, JSON.stringify(handoff));
  } catch {
    /* ignore quota */
  }
}

export function clearStudioVoiceBoardHandoff(): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(STUDIO_VOICE_BOARD_HANDOFF_KEY);
  } catch {
    /* ignore */
  }
}

/** Call when Intake submit succeeds — before navigating to Board (auth may intervene). */
export function markStudioVoiceBoardHandoffAwaitingSignIn(): void {
  write({
    version: 1,
    phase: "awaiting-signin",
    setAt: new Date().toISOString(),
  });
}

/** Sign-in page: show handoff banner when Voice just sent the customer here. */
export function peekStudioVoiceBoardHandoffAwaitingSignIn(): boolean {
  return readRaw()?.phase === "awaiting-signin";
}

/** After successful login, promote to Board welcome (or clear if no handoff). */
export function promoteStudioVoiceBoardHandoffToWelcome(): void {
  const current = readRaw();
  if (!current || current.phase !== "awaiting-signin") return;
  write({
    version: 1,
    phase: "awaiting-board-welcome",
    setAt: new Date().toISOString(),
  });
}

/**
 * Board arrival: true once, then clears.
 * Returns false if this was not a Voice handoff arrival.
 */
export function consumeStudioVoiceBoardWelcome(): boolean {
  const current = readRaw();
  if (!current || current.phase !== "awaiting-board-welcome") return false;
  clearStudioVoiceBoardHandoff();
  return true;
}
