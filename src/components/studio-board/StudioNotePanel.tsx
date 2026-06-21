"use client";

import { type CSSProperties, useRef } from "react";

import { studioBoard } from "@/config/studio-board";
import type { StudioNoteView } from "@/lib/studio-board-view";

import { STUDIO_NOTE_LINE_APPEAR_MS, useWritingLetter } from "./useWritingLetter";
import { useStudioNoteFitScale } from "./useStudioNoteFitScale";

const { studioNote: copy } = studioBoard;

type Props = {
  note: StudioNoteView | null;
};

type LineMeta = {
  isGreeting: boolean;
  isBody: boolean;
  isSignoffLead: boolean;
  isSignoffSignature: boolean;
};

function lineMeta(lines: readonly string[], index: number): LineMeta {
  const isGreeting = index === 0;
  const signoffStartIndex = lines.findIndex((entry) => entry.includes("Thank you for trusting"));
  const isSignoff = signoffStartIndex >= 0 && index >= signoffStartIndex;

  return {
    isGreeting,
    isBody: !isGreeting && !isSignoff,
    isSignoffLead: index === signoffStartIndex,
    isSignoffSignature: index === signoffStartIndex + 1,
  };
}

function slotClassName(meta: LineMeta) {
  return [
    "sb-studio-note-letter__slot",
    meta.isGreeting ? "sb-studio-note-letter__slot--greeting" : "",
    meta.isBody ? "sb-studio-note-letter__slot--body" : "",
    meta.isSignoffLead ? "sb-studio-note-letter__slot--signoff" : "",
    meta.isSignoffSignature ? "sb-studio-note-letter__slot--signoff-signature" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function lineClassName(meta: LineMeta, animate: boolean) {
  return [
    "sb-studio-note-letter__line",
    animate ? "sb-studio-note-letter__ink--appear" : "",
    meta.isGreeting ? "sb-studio-note-letter__line--greeting" : "",
    meta.isBody ? "sb-studio-note-letter__line--body" : "",
    meta.isSignoffLead ? "sb-studio-note-letter__line--signoff sb-studio-note-letter__line--signoff-lead" : "",
    meta.isSignoffSignature
      ? "sb-studio-note-letter__line--signoff sb-studio-note-letter__line--signoff-signature"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

type LetterBodyProps = {
  note: StudioNoteView;
  visibleCount: number;
  animate?: boolean;
};

function StudioNoteLetterBody({ note, visibleCount, animate = false }: LetterBodyProps) {
  return (
    <>
      <div className="sb-studio-note-letter__slot sb-studio-note-letter__slot--date">
        {visibleCount > 0 ? (
          <time
            className={`sb-studio-note-letter__date${animate ? " sb-studio-note-letter__ink--appear" : ""}`}
          >
            {note.date}
          </time>
        ) : null}
      </div>

      {note.lines.map((line, index) => {
        const meta = lineMeta(note.lines, index);
        const isVisible = visibleCount > index + 1;

        return (
          <div key={`${note.date}-${index}`} className={slotClassName(meta)}>
            {isVisible || !animate ? (
              <p className={lineClassName(meta, animate && isVisible)}>{line}</p>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

/** Handwritten letter — scales to fit the card; lines appear one at a time. */
export default function StudioNotePanel({ note }: Props) {
  const contentKey = note ? `${note.date}::${note.lines.join("\n")}` : "";
  const { visibleCount, isComplete, totalSteps } = useWritingLetter(note?.lines.length ?? 0, contentKey);

  const panelRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const fitScale = useStudioNoteFitScale(panelRef, measureRef, contentKey);

  return (
    <section className="sb-studio-note-panel" aria-labelledby="sb-studio-note-title">
      <p id="sb-studio-note-title" className="sb-card__tab">
        {copy.heading}
      </p>

      {note ? (
        <article
          ref={panelRef}
          className="sb-studio-note-letter"
          aria-live="polite"
          aria-busy={!isComplete}
          style={
            {
              "--sb-note-line-appear-ms": `${STUDIO_NOTE_LINE_APPEAR_MS}ms`,
              "--sb-note-fit-scale": fitScale,
            } as CSSProperties
          }
        >
          <div className="sb-studio-note-letter__fit">
            <StudioNoteLetterBody note={note} visibleCount={visibleCount} animate />
          </div>

          <div ref={measureRef} className="sb-studio-note-letter__measure" aria-hidden="true">
            <StudioNoteLetterBody note={note} visibleCount={note.lines.length + 1} />
          </div>

          <span className="sr-only">
            {isComplete
              ? `${note.date}. ${note.lines.join(" ")}`
              : `Writing studio note, ${visibleCount} of ${totalSteps} lines shown.`}
          </span>
        </article>
      ) : (
        <p className="sb-studio-note-letter__empty">{copy.emptyHint}</p>
      )}
    </section>
  );
}
