import type { EditDecisionList, TimedCaption } from "./types";

/** One controlled revision: shift caption times. Never rewrite speech or CTA. */
export function applyCaptionTimingRevision(
  edl: EditDecisionList,
  shiftSeconds: number,
): EditDecisionList {
  if (!edl.ok) return edl;
  const captions: TimedCaption[] = edl.captions.map((caption) => ({
    ...caption,
    start: Number(Math.max(0, caption.start + shiftSeconds).toFixed(3)),
    end: Number(Math.max(0.2, caption.end + shiftSeconds).toFixed(3)),
    text: caption.text,
  }));
  return { ...edl, captions };
}

/**
 * Real customer revision: hold the end-card longer so the CTA can be read.
 * Does not rewrite speech or CTA wording. Does not reopen the editorial cut.
 */
export function applyCustomerEndCardHoldRevision(
  edl: EditDecisionList,
  holdSeconds = 4,
): EditDecisionList {
  if (!edl.ok) return edl;
  const cta = edl.captions.find((caption) => caption.role === "cta");
  if (!cta) return edl;
  const captions: TimedCaption[] = edl.captions.map((caption) => {
    if (caption.role !== "cta") return caption;
    return {
      ...caption,
      end: Number((caption.start + holdSeconds).toFixed(3)),
      text: caption.text,
    };
  });
  const nextCta = captions.find((caption) => caption.role === "cta")!;
  return {
    ...edl,
    captions,
    outputDurationSeconds: nextCta.end,
  };
}
