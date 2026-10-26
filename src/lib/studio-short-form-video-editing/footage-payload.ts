import { SHOTSTACK_OUTPUT_FPS } from "@/lib/studio-kitchen-production/video-integration/payload";

import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import type {
  EditDecisionFailure,
  EditDecisionList,
  FootageShotstackPayload,
} from "./types";

const OFFER = studioShortFormVideoEditingBuildV1.offer;
const CAPTIONS = studioShortFormVideoEditingBuildV1.captions;

/**
 * Stage collapses ordinary U+0020. Production v1 treated U+2002 as no-width
 * and wrapped mid-word, which jammed "MyfavoritewordinEnglishis" and
 * corrupted the CTA. Shared gap is the proven en-space plus a real space.
 */
export const FOOTAGE_CAPTION_WORD_GAP =
  studioShortFormVideoEditingBuildV1.finishing.captionWordGap;

export function formatFootageCaptionText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .join(FOOTAGE_CAPTION_WORD_GAP);
}

export function readableCaptionText(text: string): string {
  return text.replace(/[\u2000-\u200b\u00a0\s]+/g, " ").trim();
}

export function buildFootageCaptionAsset(input: {
  text: string;
  role: "hook" | "speech" | "cta";
}): Record<string, unknown> {
  const isCta = input.role === "cta";
  const text = formatFootageCaptionText(input.text);
  return {
    type: "rich-text",
    text,
    font: {
      family: CAPTIONS.family,
      color: CAPTIONS.color,
      size: isCta ? 44 : input.role === "hook" ? 40 : 36,
      weight: 700,
    },
    style: {
      letterSpacing: 0,
      lineHeight: CAPTIONS.lineHeight,
    },
    align: {
      horizontal: "center",
      vertical: "middle",
    },
    padding: CAPTIONS.scrimPadding,
    stroke: {
      width: CAPTIONS.strokeWidth,
      color: CAPTIONS.stroke,
      opacity: 1,
    },
    background: {
      color: isCta ? CAPTIONS.ctaBackground : CAPTIONS.scrimColor,
      opacity: isCta ? CAPTIONS.ctaOpacity : CAPTIONS.scrimOpacity,
      borderRadius: CAPTIONS.scrimRadius,
      // EDL already wraps on whole words. Shotstack wrap jammed mid-word.
      wrap: false,
    },
  };
}

function assertNoPrompt(value: unknown, path = "payload"): string[] {
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, child]) => {
        if (key === "prompt") {
          return [`${path}.${key}`];
        }
        return assertNoPrompt(child, `${path}.${key}`);
      },
    );
  }
  return [];
}

export function buildFootageShotstackPayload(input: {
  sourceUrl: string;
  edl: EditDecisionList;
  textAlreadyBurned?: boolean;
}):
  | { ok: true; payload: FootageShotstackPayload }
  | { ok: false; findings: string[]; failure?: EditDecisionFailure } {
  if (!input.edl.ok) {
    return { ok: false, findings: ["edl_not_ok"] };
  }
  if (!input.sourceUrl.trim()) {
    return { ok: false, findings: ["missing_source_url"] };
  }
  if (
    input.edl.outputDurationSeconds < OFFER.outputMinSeconds ||
    input.edl.outputDurationSeconds >
    OFFER.outputMaxSeconds +
      studioShortFormVideoEditingBuildV1.finishing.ctaHoldSeconds +
      0.25
  ) {
    return { ok: false, findings: ["output_duration_out_of_band"] };
  }

  const burned =
    input.textAlreadyBurned === true ||
    studioShortFormVideoEditingBuildV1.factory.shotstackTypesetForbidden === true;

  const videoClips = burned
    ? [
        {
          asset: {
            type: "video" as const,
            src: input.sourceUrl,
            volume: 1,
          },
          start: 0,
          length: input.edl.outputDurationSeconds,
          fit: "cover" as const,
          position: "center" as const,
        },
      ]
    : input.edl.clips
        .filter((clip) => clip.role !== "cta_hold")
        .map((clip) => {
          return {
            asset: {
              type: "video" as const,
              src: input.sourceUrl,
              trim: clip.sourceTrim,
              volume: 1,
            },
            start: clip.timelineStart,
            length: clip.timelineLength,
            fit: "cover" as const,
            position: "center" as const,
          };
        });

  const textClips = burned
    ? []
    : input.edl.captions.map((caption) => {
        const isCta = caption.role === "cta";
        const isHook = caption.role === "hook";
        return {
          asset: buildFootageCaptionAsset({
            text: caption.text,
            role: caption.role,
          }),
          start: caption.start,
          length: Number(Math.max(0.2, caption.end - caption.start).toFixed(3)),
          width: isCta ? CAPTIONS.ctaWidth : CAPTIONS.speechWidth,
          height: isCta ? CAPTIONS.ctaHeight : CAPTIONS.speechHeight,
          offset: { x: 0, y: isCta ? 0 : isHook ? -0.22 : -0.28 },
        };
      });

  const payload: FootageShotstackPayload = {
    timeline: {
      background: "#000000",
      tracks: textClips.length
        ? [{ clips: textClips }, { clips: videoClips }]
        : [{ clips: videoClips }],
    },
    output: {
      format: "mp4",
      size: { width: OFFER.width, height: OFFER.height },
      fps: SHOTSTACK_OUTPUT_FPS,
    },
  };

  const promptHits = assertNoPrompt(payload);
  if (promptHits.length) {
    return {
      ok: false,
      findings: promptHits,
      failure: {
        ok: false,
        code: "SHOTSTACK_PROMPT_FORBIDDEN",
        message: "Shotstack prompt generation is forbidden on this lane.",
      },
    };
  }

  const serialized = JSON.stringify(payload);
  if (serialized.includes('"prompt"')) {
    return {
      ok: false,
      findings: ["prompt_serialized"],
      failure: {
        ok: false,
        code: "SHOTSTACK_PROMPT_FORBIDDEN",
        message: "Shotstack prompt generation is forbidden on this lane.",
      },
    };
  }
  if (serialized.includes('"type":"image"') || serialized.includes('"type": "image"')) {
    return { ok: false, findings: ["stills_image_asset_not_allowed"] };
  }

  return { ok: true, payload };
}
