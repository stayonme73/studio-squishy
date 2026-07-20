/**
 * Pure helpers for Client Session Timeout — testable without DOM.
 */

export function shouldShowInactivityWarning(options: {
  lastActivityAt: number;
  now: number;
  timeoutMs: number;
  warningLeadMs: number;
}): boolean {
  const idle = options.now - options.lastActivityAt;
  if (idle < 0) return false;
  const warnAt = options.timeoutMs - options.warningLeadMs;
  return idle >= warnAt && idle < options.timeoutMs;
}

export function shouldInactivityTimeout(options: {
  lastActivityAt: number;
  now: number;
  timeoutMs: number;
}): boolean {
  const idle = options.now - options.lastActivityAt;
  return idle >= options.timeoutMs;
}

/** Whole seconds remaining until inactivity sign-out (ceil, never negative). */
export function remainingSecondsUntilTimeout(options: {
  lastActivityAt: number;
  now: number;
  timeoutMs: number;
}): number {
  const endsAt = options.lastActivityAt + options.timeoutMs;
  return Math.max(0, Math.ceil((endsAt - options.now) / 1000));
}

export function readLastActivityAt(
  storage: Pick<Storage, "getItem"> | null | undefined,
  key: string,
): number | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLastActivityAt(
  storage: Pick<Storage, "setItem"> | null | undefined,
  key: string,
  at: number,
): void {
  if (!storage) return;
  try {
    storage.setItem(key, String(at));
  } catch {
    // Private mode / quota — timer still works in-memory for this tab.
  }
}
