import {
  STUDIO_VOICE_EXCHANGE_LIMIT,
  STUDIO_VOICE_TURN_TEXT_LIMIT,
  type StudioVoiceSessionTurn,
} from "./types";

export const STUDIO_VOICE_SESSION_KEY = "studio-voice:conversation-turns:v1";

export type StudioVoiceSessionStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

export function sanitizeStudioVoiceTurns(input: unknown): StudioVoiceSessionTurn[] {
  if (!Array.isArray(input)) return [];
  const clean: StudioVoiceSessionTurn[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object") continue;
    const role = (entry as { role?: unknown }).role;
    const text = (entry as { text?: unknown }).text;
    if ((role !== "customer" && role !== "studio") || typeof text !== "string") continue;
    const trimmed = text.replace(/\s+/g, " ").trim().slice(0, STUDIO_VOICE_TURN_TEXT_LIMIT);
    if (!trimmed) continue;
    clean.push({ role, text: trimmed });
  }
  return clean.slice(-(STUDIO_VOICE_EXCHANGE_LIMIT * 2));
}

export function readStudioVoiceTurns(
  store: StudioVoiceSessionStore | null | undefined,
): StudioVoiceSessionTurn[] {
  if (!store) return [];
  try {
    const raw = store.getItem(STUDIO_VOICE_SESSION_KEY);
    if (!raw) return [];
    return sanitizeStudioVoiceTurns(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeStudioVoiceTurns(
  turns: StudioVoiceSessionTurn[],
  store: StudioVoiceSessionStore | null | undefined,
): void {
  if (!store) return;
  try {
    store.setItem(
      STUDIO_VOICE_SESSION_KEY,
      JSON.stringify(sanitizeStudioVoiceTurns(turns)),
    );
  } catch {
    /* session storage can be blocked; the reply still speaks */
  }
}

export function clearStudioVoiceTurns(
  store: StudioVoiceSessionStore | null | undefined,
): void {
  try {
    store?.removeItem?.(STUDIO_VOICE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
