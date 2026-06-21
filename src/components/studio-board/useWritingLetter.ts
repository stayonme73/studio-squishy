import { useEffect, useState } from "react";

const INITIAL_PAUSE_MS = 700;
const LINE_PAUSE_MS = 1350;
export const STUDIO_NOTE_LINE_APPEAR_MS = 720;

/** Reveal letter lines one at a time — restarts when contentKey changes. */
export function useWritingLetter(lineCount: number, contentKey: string) {
  const totalSteps = lineCount + 1;
  const [visibleCount, setVisibleCount] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (lineCount === 0) {
      setVisibleCount(0);
      setIsComplete(true);
      return undefined;
    }

    if (reducedMotion) {
      setVisibleCount(totalSteps);
      setIsComplete(true);
      return undefined;
    }

    setVisibleCount(0);
    setIsComplete(false);

    let timeout: number | undefined;
    let cancelled = false;

    const schedule = (delay: number, fn: () => void) => {
      timeout = window.setTimeout(() => {
        if (!cancelled) fn();
      }, delay);
    };

    const revealNext = (count: number) => {
      const next = count + 1;
      setVisibleCount(next);
      if (next >= totalSteps) {
        setIsComplete(true);
        return;
      }
      schedule(LINE_PAUSE_MS, () => revealNext(next));
    };

    schedule(INITIAL_PAUSE_MS, () => revealNext(0));

    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [contentKey, lineCount, reducedMotion, totalSteps]);

  return { visibleCount, isComplete, totalSteps };
}
