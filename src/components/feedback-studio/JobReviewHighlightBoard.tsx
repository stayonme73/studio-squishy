"use client";

import { useRef, useState } from "react";

import { feedbackStudio } from "@/config/feedback-studio";
import type { VersionCompareProof } from "@/lib/job-control/version-compare";
import {
  buildHighlightRecord,
  canHighlightOnDeliverable,
  filterHighlightsForProof,
} from "@/lib/job-control/review-highlights";
import type { JobReviewHighlight } from "@/lib/job-control/review-feedback-types";

type Props = {
  jobId: string;
  deliverableKey: string;
  proofFiles: readonly VersionCompareProof[];
  selectedProofId: string | null;
  highlights: readonly JobReviewHighlight[];
  onSelectProof: (proofFileId: string) => void;
  onHighlightsChange: (next: readonly JobReviewHighlight[]) => void;
};

export default function JobReviewHighlightBoard({
  jobId,
  deliverableKey,
  proofFiles,
  selectedProofId,
  highlights,
  onSelectProof,
  onHighlightsChange,
}: Props) {
  const copy = feedbackStudio.highlighter;
  const boardRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const draftRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );

  if (!canHighlightOnDeliverable(proofFiles)) {
    return (
      <div className="fs-highlighter fs-highlighter--unavailable" role="status">
        <p className="fs-highlighter__title">{copy.title}</p>
        <p className="fs-highlighter__unavailable">{copy.unavailable}</p>
      </div>
    );
  }

  const selected =
    proofFiles.find((proof) => proof.id === selectedProofId) ?? proofFiles[0]!;
  const scoped = filterHighlightsForProof(highlights, {
    deliverableKey,
    proofFileId: selected.id,
  });
  const rects = scoped.flatMap((entry) => [...entry.rects]);

  function toNorm(clientX: number, clientY: number) {
    const board = boardRef.current;
    if (!board) return { x: 0, y: 0 };
    const rect = board.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(rect.width, 1))),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(rect.height, 1))),
    };
  }

  function beginDrag(clientX: number, clientY: number, target: HTMLDivElement, pointerId?: number) {
    if (typeof pointerId === "number") {
      try {
        target.setPointerCapture(pointerId);
      } catch {
        /* ignore unsupported capture in some automation paths */
      }
    }
    const origin = toNorm(clientX, clientY);
    dragOrigin.current = origin;
    const next = { x: origin.x, y: origin.y, w: 0, h: 0 };
    draftRef.current = next;
    setDraft(next);
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!dragOrigin.current) return;
    const point = toNorm(clientX, clientY);
    const x = Math.min(dragOrigin.current.x, point.x);
    const y = Math.min(dragOrigin.current.y, point.y);
    const w = Math.abs(point.x - dragOrigin.current.x);
    const h = Math.abs(point.y - dragOrigin.current.y);
    const next = { x, y, w, h };
    draftRef.current = next;
    setDraft(next);
  }

  function endDrag(target: HTMLDivElement, pointerId?: number) {
    if (typeof pointerId === "number") {
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    }
    const finished = draftRef.current;
    dragOrigin.current = null;
    draftRef.current = null;
    setDraft(null);
    if (!finished) return;
    const existingRects = filterHighlightsForProof(highlights, {
      deliverableKey,
      proofFileId: selected.id,
    }).flatMap((entry) => [...entry.rects]);
    const record = buildHighlightRecord({
      id: `hl:${deliverableKey}:${selected.id}:${Date.now()}`,
      jobId,
      deliverableKey,
      proofFileId: selected.id,
      versionLabel: selected.versionLabel,
      rects: [...existingRects, finished],
    });
    if (!record) return;
    const without = highlights.filter(
      (entry) =>
        !(entry.deliverableKey === deliverableKey && entry.proofFileId === selected.id),
    );
    onHighlightsChange([...without, record]);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    beginDrag(event.clientX, event.clientY, event.currentTarget, event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    moveDrag(event.clientX, event.clientY);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    endDrag(event.currentTarget, event.pointerId);
  }

  function clearBoard() {
    onHighlightsChange(
      highlights.filter(
        (entry) =>
          !(entry.deliverableKey === deliverableKey && entry.proofFileId === selected.id),
      ),
    );
  }

  return (
    <div className="fs-highlighter" aria-label={copy.title} data-hl-marks={rects.length}>
      <p className="fs-highlighter__title">{copy.title}</p>
      <p className="fs-highlighter__lead">{copy.lead}</p>
      <label className="fs-highlighter__select-label">
        <select
          className="fs-highlighter__select"
          value={selected.id}
          aria-label={copy.selectProof}
          onChange={(event) => onSelectProof(event.target.value)}
        >
          {proofFiles.map((proof) => (
            <option key={proof.id} value={proof.id}>
              {proof.versionLabel || "(no version label)"} · {proof.filename}
            </option>
          ))}
        </select>
      </label>
      <p className="fs-highlighter__bound">
        Bound to {selected.filename}
        {selected.versionLabel ? ` · ${selected.versionLabel}` : ""}
      </p>
      <div
        ref={boardRef}
        className="fs-highlighter__board"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragOrigin.current = null;
          draftRef.current = null;
          setDraft(null);
        }}
      >
        {rects.map((rect, index) => (
          <span
            key={`${selected.id}-rect-${index}`}
            className="fs-highlighter__mark"
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
            }}
          />
        ))}
        {draft && draft.w > 0.005 && draft.h > 0.005 ? (
          <span
            className="fs-highlighter__mark fs-highlighter__mark--draft"
            style={{
              left: `${draft.x * 100}%`,
              top: `${draft.y * 100}%`,
              width: `${draft.w * 100}%`,
              height: `${draft.h * 100}%`,
            }}
          />
        ) : null}
      </div>
      <p className="fs-highlighter__note">{copy.boardNote}</p>
      <button type="button" className="fs-highlighter__clear" onClick={clearBoard}>
        {copy.clearBoard}
      </button>
    </div>
  );
}
