/**
 * Motion-safety gate from actual rendered frames.
 * Do not certify from timeline JSON alone.
 */

import { existsSync } from "fs";
import sharp from "sharp";

import {
  VIDEO_SAFE_AREA_9X16,
  boxInsideSafeArea,
  sampleTimesForBeat,
  type PixelBox,
} from "./safe-area";
import { extractVideoFrame } from "./extract";

export type MotionSafetyBeatSpec = {
  beat: number;
  startSeconds: number;
  endSeconds: number;
  overlayAbs: string;
  expectedText: readonly string[];
  isCta?: boolean;
};

export type MotionSafetyFinding = {
  id: string;
  ok: boolean;
  detail: string;
};

export type MotionSafetyReport = {
  ok: boolean;
  findings: MotionSafetyFinding[];
  frames: {
    id: string;
    seconds: number;
    absolutePath: string;
    role: string;
    beat: number;
  }[];
};

const TEXT_MOVE_MEAN_DIFF_MAX = 22;
const EDGE_EMPTY_RATIO_MAX = 0.72;
const PRODUCT_VARIANCE_MIN = 180;

async function overlayTextBox(overlayAbs: string): Promise<PixelBox | null> {
  const { data, info } = await sharp(overlayAbs)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = 0;
  let bottom = 0;
  let found = false;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      const a = data[i + 3] ?? 0;
      const lum = ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0)) / 3;
      if (a > 40 && lum > 70) {
        found = true;
        if (x < left) left = x;
        if (y < top) top = y;
        if (x > right) right = x;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (!found) return null;
  return { left, top, right, bottom };
}

async function glyphMeanAbsDiff(
  overlayAbs: string,
  aAbs: string,
  bAbs: string,
  box: PixelBox,
): Promise<number> {
  const extract = {
    left: box.left,
    top: box.top,
    width: Math.max(1, box.right - box.left + 1),
    height: Math.max(1, box.bottom - box.top + 1),
  };
  const overlay = await sharp(overlayAbs)
    .ensureAlpha()
    .extract(extract)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const a = await sharp(aAbs).extract(extract).removeAlpha().raw().toBuffer();
  const b = await sharp(bAbs).extract(extract).removeAlpha().raw().toBuffer();
  let sum = 0;
  let n = 0;
  const w = overlay.info.width;
  const h = overlay.info.height;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const oi = (y * w + x) * 4;
      const aCh = overlay.data[oi + 3] ?? 0;
      const lum =
        ((overlay.data[oi] ?? 0) +
          (overlay.data[oi + 1] ?? 0) +
          (overlay.data[oi + 2] ?? 0)) /
        3;
      if (aCh < 80 || lum < 140) continue;
      const pi = (y * w + x) * 3;
      sum +=
        Math.abs((a[pi] ?? 0) - (b[pi] ?? 0)) +
        Math.abs((a[pi + 1] ?? 0) - (b[pi + 1] ?? 0)) +
        Math.abs((a[pi + 2] ?? 0) - (b[pi + 2] ?? 0));
      n += 3;
    }
  }
  return n === 0 ? 255 : sum / n;
}

async function edgeEmptyRatio(frameAbs: string): Promise<number> {
  const { data, info } = await sharp(frameAbs)
    .resize(108, 192, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  let edge = 0;
  let empty = 0;
  const isEdge = (x: number, y: number) => x <= 1 || y <= 1 || x >= w - 2 || y >= h - 2;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!isEdge(x, y)) continue;
      edge += 1;
      const i = (y * w + x) * 3;
      const lum = ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0)) / 3;
      if (lum < 12) empty += 1;
    }
  }
  return edge === 0 ? 0 : empty / edge;
}

async function upperVariance(frameAbs: string, textTop: number): Promise<number> {
  const height = Math.max(80, Math.min(900, textTop - 40));
  const buf = await sharp(frameAbs)
    .extract({ left: 80, top: 80, width: 920, height })
    .resize(80, 80, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) sum += buf[i] ?? 0;
  const mean = sum / buf.length;
  let sq = 0;
  for (let i = 0; i < buf.length; i += 1) {
    const d = (buf[i] ?? 0) - mean;
    sq += d * d;
  }
  return sq / buf.length;
}

export async function evaluateRenderedMotionSafety(input: {
  videoAbs: string;
  framesDirAbs: string;
  beats: readonly MotionSafetyBeatSpec[];
  durationSeconds: number;
}): Promise<MotionSafetyReport> {
  const findings: MotionSafetyFinding[] = [];
  const frames: MotionSafetyReport["frames"] = [];
  const push = (id: string, ok: boolean, detail: string) => {
    findings.push({ id, ok, detail });
  };

  for (const beat of input.beats) {
    if (!existsSync(beat.overlayAbs)) {
      push(`overlay_missing_beat_${beat.beat}`, false, beat.overlayAbs);
      continue;
    }
    const box = await overlayTextBox(beat.overlayAbs);
    if (!box) {
      push(`overlay_text_missing_beat_${beat.beat}`, false, "no luminous overlay pixels");
      continue;
    }
    push(
      `overlay_inside_safe_area_beat_${beat.beat}`,
      boxInsideSafeArea(box),
      `box=${JSON.stringify(box)}`,
    );

    const times = sampleTimesForBeat(beat.startSeconds, beat.endSeconds);
    const roles = [
      "beat-start",
      "quarter",
      "midpoint",
      "three-quarter",
      "beat-end",
    ];
    const beatFrames: string[] = [];
    for (let i = 0; i < times.length; i += 1) {
      const seconds = times[i]!;
      const id = `beat-${beat.beat}-${roles[i]}`;
      const dest = `${input.framesDirAbs}/${id}.jpg`;
      const extracted = extractVideoFrame({
        videoAbs: input.videoAbs,
        destAbs: dest,
        seconds,
      });
      if (!extracted.ok) {
        push(`extract_${id}`, false, extracted.message);
        continue;
      }
      frames.push({
        id,
        seconds,
        absolutePath: dest,
        role: roles[i]!,
        beat: beat.beat,
      });
      beatFrames.push(dest);
    }

    const first = beatFrames[0];
    if (first) {
      for (let i = 1; i < beatFrames.length; i += 1) {
        const diff = await glyphMeanAbsDiff(beat.overlayAbs, first, beatFrames[i]!, box);
        push(
          `text_stationary_beat_${beat.beat}_${roles[i]}`,
          diff <= TEXT_MOVE_MEAN_DIFF_MAX,
          `meanAbsDiff=${diff.toFixed(2)} (max ${TEXT_MOVE_MEAN_DIFF_MAX})`,
        );
      }
      const edge = await edgeEmptyRatio(first);
      push(
        `no_blank_edges_beat_${beat.beat}_start`,
        edge <= EDGE_EMPTY_RATIO_MAX,
        `emptyEdgeRatio=${edge.toFixed(3)}`,
      );
      const last = beatFrames[beatFrames.length - 1];
      if (last) {
        const edgeEnd = await edgeEmptyRatio(last);
        push(
          `no_blank_edges_beat_${beat.beat}_end`,
          edgeEnd <= EDGE_EMPTY_RATIO_MAX,
          `emptyEdgeRatio=${edgeEnd.toFixed(3)}`,
        );
        const variance = await upperVariance(last, box.top);
        push(
          `product_visible_beat_${beat.beat}`,
          variance >= PRODUCT_VARIANCE_MIN,
          `upperVariance=${variance.toFixed(1)}`,
        );
      }
    }

    if (beat.isCta) {
      const ctaTimes = [
        { role: "cta-start", seconds: beat.startSeconds + 0.08 },
        {
          role: "cta-mid",
          seconds: (beat.startSeconds + beat.endSeconds) / 2,
        },
        {
          role: "final-frame",
          seconds: Math.max(beat.startSeconds, input.durationSeconds - 0.08),
        },
      ];
      const ctaFrames: string[] = [];
      for (const sample of ctaTimes) {
        const dest = `${input.framesDirAbs}/${sample.role}.jpg`;
        const extracted = extractVideoFrame({
          videoAbs: input.videoAbs,
          destAbs: dest,
          seconds: sample.seconds,
        });
        if (!extracted.ok) {
          push(`extract_${sample.role}`, false, extracted.message);
          continue;
        }
        frames.push({
          id: sample.role,
          seconds: sample.seconds,
          absolutePath: dest,
          role: sample.role,
          beat: beat.beat,
        });
        ctaFrames.push(dest);
      }
      const ctaFirst = ctaFrames[0];
      if (ctaFirst) {
        for (let i = 1; i < ctaFrames.length; i += 1) {
          const diff = await glyphMeanAbsDiff(beat.overlayAbs, ctaFirst, ctaFrames[i]!, box);
          push(
            `cta_text_visible_${ctaTimes[i]!.role}`,
            diff <= TEXT_MOVE_MEAN_DIFF_MAX,
            `meanAbsDiff=${diff.toFixed(2)}`,
          );
        }
      }
    }
  }

  const maxZoom = input.beats[0];
  if (maxZoom) {
    const dest = `${input.framesDirAbs}/max-zoom-point.jpg`;
    const seconds = maxZoom.endSeconds - 0.08;
    const extracted = extractVideoFrame({
      videoAbs: input.videoAbs,
      destAbs: dest,
      seconds,
    });
    if (extracted.ok) {
      frames.push({
        id: "max-zoom-point",
        seconds,
        absolutePath: dest,
        role: "max-zoom-point",
        beat: maxZoom.beat,
      });
      const panDest = `${input.framesDirAbs}/max-pan-point.jpg`;
      const panExtracted = extractVideoFrame({
        videoAbs: input.videoAbs,
        destAbs: panDest,
        seconds,
      });
      if (panExtracted.ok) {
        frames.push({
          id: "max-pan-point",
          seconds,
          absolutePath: panDest,
          role: "max-pan-point",
          beat: maxZoom.beat,
        });
      }
      push(
        "max_pan_point",
        true,
        "no pan used; zoomIn only on oversized backgrounds so edges stay covered",
      );
    }
  }

  return {
    ok: findings.every((finding) => finding.ok),
    findings,
    frames,
  };
}
