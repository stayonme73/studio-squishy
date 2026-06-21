"use client";

import { useEffect, useState, type CSSProperties } from "react";

import ChalkDoodle from "@/components/deliverables/ChalkDoodle";
import { deliverables } from "@/config/deliverables";

const { marginNotes: copy } = deliverables;

const LINE_PAUSE_MS = 2000;
const LINE_APPEAR_MS = 650;

function useWritingWall(lineCount: number) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (lineCount === 0) return undefined;
    if (reducedMotion) {
      setVisibleCount(lineCount);
      return undefined;
    }

    setVisibleCount(0);

    let timeout: number | undefined;
    let cancelled = false;

    const schedule = (delay: number, fn: () => void) => {
      timeout = window.setTimeout(() => {
        if (!cancelled) fn();
      }, delay);
    };

    const writeNext = (count: number) => {
      if (count >= lineCount) return;
      setVisibleCount(count + 1);
      if (count + 1 < lineCount) {
        schedule(LINE_PAUSE_MS, () => writeNext(count + 1));
      }
    };

    schedule(LINE_PAUSE_MS, () => writeNext(0));

    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [lineCount, reducedMotion]);

  return { visibleCount };
}

/** Left = animated encouragement wall. Right = static Studio thank-you letter. */
export default function FinalDeliveryAtmosphere() {
  const { visibleCount } = useWritingWall(copy.encouragement.length);

  return (
    <div className="fd-atmosphere" aria-hidden>
      <div className="fd-atmosphere__chalk">
        <div
          className="fd-chalk-wall"
          style={{ "--fd-line-appear-ms": `${LINE_APPEAR_MS}ms` } as CSSProperties}
        >
          {copy.encouragement.map((line, index) => (
            <div key={line.id} className="fd-chalk-slot">
              {index < visibleCount ? (
                <p className={`fd-chalk-line${line.inset ? " fd-chalk-line--inset" : ""}`}>
                  <ChalkDoodle kind={line.doodle} />
                  <span className="fd-chalk-line__text">{line.text}</span>
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="fd-atmosphere__script">
        <div className="fd-studio-letter">
          {copy.studioLetter.paragraphs.map((line) => (
            <p
              key={line.id}
              className={`fd-letter-line fd-letter-line--${line.ink}`}
            >
              {line.text}
            </p>
          ))}
          <p className="fd-letter-line fd-letter-line--signoff">
            {copy.studioLetter.signoff}
          </p>
        </div>
      </div>
    </div>
  );
}
