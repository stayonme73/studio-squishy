import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import {
  formatFootageCaptionText,
  readableCaptionText,
} from "./footage-payload";
import type { EditDecisionList } from "./types";

const FROZEN = studioShortFormVideoEditingBuildV1.frozenCherriesEditorial;

export type FinishingPreflight =
  | {
      ok: true;
      openingSourceSeconds: number;
      holdExitSourceSeconds: number;
      holdDurationSeconds: number;
      captionTexts: string[];
      ctaText: string;
      ctaStart: number;
      performanceEnd: number;
      leftoverStartsSourceSeconds: number;
    }
  | { ok: false; findings: string[] };

export function evaluateFinishingPreflight(input: {
  edl: EditDecisionList;
  approvedCta: string;
}): FinishingPreflight {
  const findings: string[] = [];
  if (!input.edl.ok) {
    return { ok: false, findings: ["edl_not_ok"] };
  }

  const opening = input.edl.clips[0]?.sourceTrim ?? 0;
  const lastClip = input.edl.clips[input.edl.clips.length - 1];
  const performanceEnd = lastClip
    ? lastClip.timelineStart + lastClip.timelineLength
    : 0;
  const holdExit = opening + performanceEnd;
  const cta = input.edl.captions.find((caption) => caption.role === "cta");
  const speech = input.edl.captions.filter((caption) => caption.role !== "cta");

  if (Math.abs(opening - FROZEN.openingSourceSeconds) > 0.05) {
    findings.push("opening_changed");
  }
  if (holdExit < FROZEN.spokenExitSourceSeconds + 0.6) {
    findings.push("landing_hold_missing");
  }
  if (holdExit >= FROZEN.leftoverStartsSourceSeconds) {
    findings.push("leftover_goodbye_reintroduced");
  }
  if (!cta) {
    findings.push("cta_missing");
  } else {
    if (cta.text.trim() !== input.approvedCta.trim()) {
      findings.push("cta_text_changed");
    }
    if (readableCaptionText(formatFootageCaptionText(cta.text)) !== input.approvedCta.trim()) {
      findings.push("cta_format_corrupts_words");
    }
    if (cta.start < performanceEnd - 0.01) {
      findings.push("cta_covers_performance");
    }
    const cherriesPeakEnd = FROZEN.openingSourceSeconds + 8.3 - opening;
    if (cta.start < cherriesPeakEnd) {
      findings.push("cta_covers_cherries_peak");
    }
  }

  for (const caption of speech) {
    const formatted = formatFootageCaptionText(caption.text);
    if (
      caption.text.trim().split(/\s+/).length > 1 &&
      (!formatted.includes("\u2002") || !formatted.includes(" "))
    ) {
      findings.push("caption_gap_missing");
    }
    if (readableCaptionText(formatted).replace(/ /g, "") !== caption.text.replace(/\s+/g, "")) {
      findings.push("caption_words_rewritten");
    }
    if (cta && caption.end > cta.start) {
      findings.push("speech_overlaps_cta");
    }
  }

  if (findings.length) {
    return { ok: false, findings };
  }

  return {
    ok: true,
    openingSourceSeconds: opening,
    holdExitSourceSeconds: Number(holdExit.toFixed(3)),
    holdDurationSeconds: Number(
      (holdExit - FROZEN.spokenExitSourceSeconds).toFixed(3),
    ),
    captionTexts: input.edl.captions.map((caption) =>
      formatFootageCaptionText(caption.text),
    ),
    ctaText: input.approvedCta.trim(),
    ctaStart: cta!.start,
    performanceEnd: Number(performanceEnd.toFixed(3)),
    leftoverStartsSourceSeconds: FROZEN.leftoverStartsSourceSeconds,
  };
}
