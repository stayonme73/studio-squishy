import { useLayoutEffect, useState, type RefObject } from "react";

const MAX_SCALE = 1.1;
const SCALE_PRECISION = 100;

/** Scale letter content to fit the panel — no scrollbars. */
export function useStudioNoteFitScale(
  panelRef: RefObject<HTMLElement | null>,
  measureRef: RefObject<HTMLElement | null>,
  contentKey: string,
) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const measure = measureRef.current;
    if (!panel || !measure) return undefined;

    const fit = () => {
      const styles = getComputedStyle(panel);
      const padY =
        Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
      const available = Math.max(0, panel.clientHeight - padY);
      const needed = measure.scrollHeight;

      if (available <= 0 || needed <= 0) {
        setScale(1);
        return;
      }

      const raw = available / needed;
      const capped = raw > 1 ? Math.min(MAX_SCALE, raw) : raw;
      const next = Math.round(capped * SCALE_PRECISION) / SCALE_PRECISION;
      setScale(next);
    };

    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(panel);
    observer.observe(measure);

    return () => observer.disconnect();
  }, [contentKey, panelRef, measureRef]);

  return scale;
}
