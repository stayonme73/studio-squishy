import type { Clock, IdFactory } from "./types";

export function isoNow(clock: Clock): string {
  return clock.now().toISOString();
}

export function createSequenceIdFactory(prefix = "sup"): IdFactory {
  let n = 0;
  return (kind: string) => `${prefix}_${kind}_${++n}`;
}

export function createSystemClock(): Clock {
  return { now: () => new Date() };
}

export function createFrozenClock(iso: string): Clock & { advanceMs: (ms: number) => void } {
  let ms = Date.parse(iso);
  return {
    now: () => new Date(ms),
    advanceMs: (delta) => {
      ms += delta;
    },
  };
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
