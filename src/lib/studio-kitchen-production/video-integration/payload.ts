/**
 * Deterministic Shotstack Edit payload from Studio work packet.
 * No creative improvisation — packet is authoritative.
 */

import { createHash } from "crypto";

import type {
  AssetUrlMap,
  ShotstackEditPayload,
  ShotstackWorkPacket,
} from "./types";

export const SHOTSTACK_OUTPUT_FPS = 25 as const;

export function validateShotstackWorkPacket(packet: ShotstackWorkPacket): {
  ok: boolean;
  findings: string[];
} {
  const findings: string[] = [];
  if (packet.skuId !== "v2-rtu-short-video") {
    findings.push("sku_must_be_v2_rtu_short_video");
  }
  if (packet.productionMethod !== "shotstack") {
    findings.push("production_method_must_be_shotstack");
  }
  if (packet.exportFormat !== "mp4") findings.push("export_must_be_mp4");
  if (
    packet.aspectRatio !== "vertical" ||
    packet.width !== 1080 ||
    packet.height !== 1920
  ) {
    findings.push("must_be_vertical_1080x1920");
  }
  if (packet.musicAllowed !== false) findings.push("music_not_allowed");
  if (packet.stockAllowed !== false) findings.push("stock_not_allowed");
  if (
    packet.durationMinSeconds < 15 ||
    packet.durationMaxSeconds > 30 ||
    packet.durationTargetSeconds < packet.durationMinSeconds ||
    packet.durationTargetSeconds > packet.durationMaxSeconds
  ) {
    findings.push("duration_band_invalid");
  }
  if (!packet.scenes?.length) findings.push("scenes_required");
  if (!packet.voiceArtifact?.relativePath || !packet.voiceArtifact.contentSha256) {
    findings.push("certified_voice_required_for_fixture");
  }
  let prevEnd = -1;
  for (const scene of packet.scenes ?? []) {
    if (scene.endSeconds <= scene.startSeconds) {
      findings.push(`invalid_scene_timing_${scene.sceneNumber}`);
    }
    if (prevEnd >= 0 && scene.startSeconds < prevEnd - 0.001) {
      findings.push(`scene_order_overlap_${scene.sceneNumber}`);
    }
    prevEnd = scene.endSeconds;
  }
  const ordered = [...(packet.scenes ?? [])].sort(
    (a, b) => a.sceneNumber - b.sceneNumber,
  );
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i]?.sceneNumber !== i + 1) {
      findings.push("scene_numbers_must_be_contiguous_from_1");
      break;
    }
  }
  return { ok: findings.length === 0, findings };
}

/**
 * Build Edit API JSON. assetUrls keys = relativePath from packet.
 * Rejects missing media URLs — never invents stock/music.
 */
export function buildShotstackEditPayload(
  packet: ShotstackWorkPacket,
  assetUrls: AssetUrlMap,
): { ok: true; payload: ShotstackEditPayload } | { ok: false; findings: string[] } {
  const validation = validateShotstackWorkPacket(packet);
  if (!validation.ok) {
    return { ok: false, findings: validation.findings };
  }

  const findings: string[] = [];
  const voiceUrl = assetUrls.get(packet.voiceArtifact.relativePath);
  if (!voiceUrl) findings.push("missing_voice_url");

  const scenes = [...packet.scenes].sort((a, b) => a.startSeconds - b.startSeconds);
  for (const scene of scenes) {
    if (!assetUrls.get(scene.relativePath)) {
      findings.push(`missing_asset_url_${scene.assetId}`);
    }
  }
  if (findings.length) return { ok: false, findings };

  if (packet.primaryCtaText) {
    const ctaScene = scenes.find(
      (s) => s.sceneNumber === packet.ctaCaptionSceneNumber,
    );
    if (!ctaScene) findings.push("cta_scene_missing");
    else if (ctaScene.caption !== packet.primaryCtaText) {
      findings.push("cta_caption_mismatch_primaryCtaText");
    }
  }
  if (findings.length) return { ok: false, findings };

  const imageClips = scenes.map((scene) => ({
    asset: {
      type: "image",
      src: assetUrls.get(scene.relativePath)!,
    },
    start: scene.startSeconds,
    length: Number((scene.endSeconds - scene.startSeconds).toFixed(3)),
    fit: "cover",
    scale: 1,
    ...(scene.motionEffect ? { effect: scene.motionEffect } : {}),
  }));

  /**
   * Overlay only when captionPresentation is "overlay" (default for legacy packets).
   * V3 plates embed scene captions; CTA uses overlay with high-contrast color.
   */
  const textClips = scenes
    .filter((scene) => (scene.captionPresentation ?? "overlay") === "overlay")
    .map((scene) => {
      const isCta = scene.sceneNumber === packet.ctaCaptionSceneNumber;
      const color = scene.overlayTextColor ?? (isCta ? "#1F4A44" : "#ffffff");
      const size = scene.overlayFontSize ?? (isCta ? 52 : 42);
      const bg = scene.overlayBackgroundColor;
      const clip: Record<string, unknown> = {
        asset: {
          type: "text",
          text: scene.caption,
          font: {
            family: isCta ? "Clear Sans" : "Clear Sans",
            color,
            size,
            weight: 700,
          },
          alignment: {
            horizontal: "center",
            vertical: "center",
          },
          width: 960,
          height: isCta ? 160 : 220,
          ...(bg
            ? {
                background: {
                  color: bg,
                  opacity: 1,
                },
              }
            : {}),
        },
        start: scene.startSeconds,
        length: Number((scene.endSeconds - scene.startSeconds).toFixed(3)),
        offset: { x: 0, y: scene.overlayOffsetY ?? (isCta ? 0.08 : -0.28) },
        transition: { in: "fade", out: "fade" },
      };
      return clip;
    });

  // Reject accidental duplicate overlay of identical strings across clips
  const overlayTexts = textClips.map(
    (c) => (c.asset as { text?: string }).text ?? "",
  );
  if (packet.primaryCtaText) {
    const ctaHits = overlayTexts.filter((t) => t === packet.primaryCtaText);
    if (ctaHits.length !== 1) {
      return {
        ok: false,
        findings: [`cta_overlay_count_${ctaHits.length}_expected_1`],
      };
    }
    if (overlayTexts.some((t) => t === "Book a visit")) {
      return { ok: false, findings: ["obsolete_cta_book_a_visit_still_overlaid"] };
    }
  }

  const tracks =
    textClips.length > 0
      ? [{ clips: textClips }, { clips: imageClips }]
      : [{ clips: imageClips }];

  const payload: ShotstackEditPayload = {
    timeline: {
      soundtrack: {
        src: voiceUrl!,
        volume: 1,
      },
      background: "#000000",
      tracks,
    },
    output: {
      format: "mp4",
      size: { width: packet.width, height: packet.height },
      fps: SHOTSTACK_OUTPUT_FPS,
    },
  };

  return { ok: true, payload };
}

export function hashShotstackRequest(payload: ShotstackEditPayload): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

export function mapProviderStatus(raw: string | undefined): import("./types").ShotstackRenderStatus {
  const s = (raw ?? "").toLowerCase();
  if (s === "queued" || s === "waiting") return "queued";
  if (s === "fetching") return "fetching";
  if (s === "rendering") return "rendering";
  if (s === "saving") return "saving";
  if (s === "done") return "done";
  if (s === "failed") return "failed";
  return "unknown";
}
