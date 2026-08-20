/**
 * Apply constrained timing revision to a Shotstack work packet.
 * Lengthens price/date scene holds and shifts later scenes. No CapCut.
 */

import {
  SHORT_VIDEO_TIMING_HOLD_EXTENSION_SECONDS,
  type MachineShortVideoRevisionEmphasis,
} from "@/config/studio-review-revision-full-loop-v1";
import type {
  ShotstackWorkPacket,
  ShotstackWorkPacketScene,
} from "@/lib/studio-kitchen-production/video-integration/types";

const PRICE_DATE_SCENE_RE =
  /price|\$\d|offer|date|september|october|january|february|march|april|june|july|august|november|december|beat-0[23]|\/dates?|\/offer|\/price/i;

export function isPriceOrDateScene(
  scene: ShotstackWorkPacketScene,
  packet: ShotstackWorkPacket,
): boolean {
  const map = packet.sceneToScriptMap?.find(
    (entry) => entry.sceneNumber === scene.sceneNumber,
  );
  const hay = [
    scene.caption,
    scene.relativePath,
    scene.assetId,
    map?.designedText,
    map?.narrationBeat,
    map?.visual,
  ]
    .filter(Boolean)
    .join(" ");
  return PRICE_DATE_SCENE_RE.test(hay);
}

/**
 * Lengthen price/date scene endSeconds (default +1.5s) and cascade later starts/ends.
 * Slightly slower narration pacing via longer holds — does not rewrite captions or facts.
 */
export function applyShortVideoTimingRevision(
  packet: ShotstackWorkPacket,
  emphasis?: MachineShortVideoRevisionEmphasis | null,
): ShotstackWorkPacket {
  const extension =
    emphasis?.holdExtensionSeconds ?? SHORT_VIDEO_TIMING_HOLD_EXTENSION_SECONDS;
  if (emphasis && !emphasis.lengthenPriceDateSceneHolds) {
    return packet;
  }

  const sorted = [...packet.scenes].sort(
    (a, b) => a.sceneNumber - b.sceneNumber || a.startSeconds - b.startSeconds,
  );
  let cascade = 0;
  const nextScenes: ShotstackWorkPacketScene[] = [];

  for (const scene of sorted) {
    const startSeconds = Number((scene.startSeconds + cascade).toFixed(3));
    let endSeconds = Number((scene.endSeconds + cascade).toFixed(3));
    if (isPriceOrDateScene(scene, packet)) {
      endSeconds = Number((endSeconds + extension).toFixed(3));
      cascade = Number((cascade + extension).toFixed(3));
    }
    nextScenes.push({
      ...scene,
      startSeconds,
      endSeconds,
    });
  }

  const lastEnd = nextScenes.reduce(
    (max, scene) => Math.max(max, scene.endSeconds),
    0,
  );
  const durationTargetSeconds = Number(lastEnd.toFixed(3));
  const durationMaxSeconds = Math.max(
    packet.durationMaxSeconds,
    Math.ceil(durationTargetSeconds),
  );

  const nextMap = packet.sceneToScriptMap?.map((entry) => {
    const scene = nextScenes.find((s) => s.sceneNumber === entry.sceneNumber);
    if (!scene) return entry;
    return {
      ...entry,
      timeRange: `${scene.startSeconds}-${scene.endSeconds}s`,
    };
  });

  return {
    ...packet,
    scenes: nextScenes,
    durationTargetSeconds,
    durationMaxSeconds,
    sceneToScriptMap: nextMap ?? packet.sceneToScriptMap,
    correctionReason:
      packet.correctionReason ??
      "Customer revision: lengthen price/date scene holds for calmer pacing.",
    workPacketVersion: packet.workPacketVersion.includes("rev-timing")
      ? packet.workPacketVersion
      : `${packet.workPacketVersion}-rev-timing`,
  };
}
