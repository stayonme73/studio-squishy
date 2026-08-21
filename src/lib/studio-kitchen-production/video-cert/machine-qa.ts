/**
 * Deterministic machine QA for cert candidates.
 * Never grants QA PASS / CUSTOMER READY / CERTIFIED.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { execFileSync } from "child_process";

import { probeMp4WithFfprobe } from "../video-operational/bind-export";
import { buildShotstackEditPayload } from "../video-integration/payload";
import type { ShotstackWorkPacket } from "../video-integration/types";
import { sha256Bytes } from "../video-integration/bind";

function probeMediaDurationSeconds(absolutePath: string): number | null {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        absolutePath,
      ],
      { encoding: "utf8" },
    ).trim();
    const n = Number(out);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function findSceneForNeedle(
  packet: ShotstackWorkPacket,
  needle: string | RegExp,
) {
  return packet.scenes.find((s) => {
    const map = packet.sceneToScriptMap?.find((m) => m.sceneNumber === s.sceneNumber);
    const hay = `${s.caption} ${map?.designedText ?? ""} ${map?.narrationBeat ?? ""}`;
    return typeof needle === "string" ? hay.includes(needle) : needle.test(hay);
  });
}

export type MachineQaCheck = {
  id: string;
  ok: boolean;
  detail: string;
};

export function runCertVideoMachineQa(input: {
  repoRoot: string;
  packet: ShotstackWorkPacket;
  artifactRelativePath: string;
  expectedEnv: "v1";
  renderEnvUsed: "stage" | "v1" | "unknown";
  obsoleteCtaForbidden: "Book a visit";
  primaryCta: "Book your visit today";
}): {
  ok: boolean;
  qaPass: false;
  customerReady: false;
  certified: false;
  checks: MachineQaCheck[];
} {
  const checks: MachineQaCheck[] = [];
  const push = (id: string, ok: boolean, detail: string) => {
    checks.push({ id, ok, detail });
  };

  push(
    "production_env",
    input.renderEnvUsed === "v1",
    `renderEnvUsed=${input.renderEnvUsed} (required v1 / Production — no sandbox watermark)`,
  );

  push(
    "packet_requires_v1",
    input.packet.requiredShotstackEnv === "v1",
    `packet.requiredShotstackEnv=${input.packet.requiredShotstackEnv}`,
  );

  // Payload-level duplicate / CTA proofs (no creative improvisation)
  const dummyUrls = new Map<string, string>();
  for (const scene of input.packet.scenes) {
    dummyUrls.set(scene.relativePath, `https://example.test/${scene.assetId}`);
    if (scene.overlayRelativePath) {
      dummyUrls.set(
        scene.overlayRelativePath,
        `https://example.test/overlay-${scene.assetId}`,
      );
    }
  }
  dummyUrls.set(
    input.packet.voiceArtifact.relativePath,
    "https://example.test/voice.mp3",
  );
  const built = buildShotstackEditPayload(input.packet, dummyUrls);
  push("payload_builds", built.ok, built.ok ? "ok" : built.findings.join("; "));

  if (built.ok) {
    const textClips =
      built.payload.timeline.tracks[0]?.clips?.filter(
        (c) => (c as { asset?: { type?: string } }).asset?.type === "text",
      ) ?? [];
    // When overlays exist they are on track 0; if only images, track 0 is images
    const overlayTexts: string[] = [];
    for (const track of built.payload.timeline.tracks) {
      for (const clip of track.clips) {
        const asset = (clip as { asset?: { type?: string; text?: string } }).asset;
        if (asset?.type === "text" && asset.text) overlayTexts.push(asset.text);
      }
    }

    for (const scene of input.packet.scenes) {
      if (scene.captionPresentation === "embedded_in_plate") {
        const dup = overlayTexts.includes(scene.caption);
        push(
          `no_duplicate_overlay_scene_${scene.sceneNumber}`,
          !dup,
          dup
            ? `overlay repeats embedded caption: ${scene.caption}`
            : `embedded only: ${scene.caption}`,
        );
      }
    }

    const ctaCount = overlayTexts.filter((t) => t === input.primaryCta).length;
    push(
      "single_primary_cta_overlay",
      ctaCount === 1,
      `primary CTA overlay count=${ctaCount}`,
    );
    push(
      "obsolete_cta_absent",
      !overlayTexts.includes(input.obsoleteCtaForbidden),
      overlayTexts.includes(input.obsoleteCtaForbidden)
        ? "obsolete CTA still overlaid"
        : "obsolete CTA absent from overlays",
    );

    const ctaScene = input.packet.scenes.find(
      (s) => s.sceneNumber === input.packet.ctaCaptionSceneNumber,
    );
    const contrastOk =
      Boolean(ctaScene?.overlayTextColor) &&
      ctaScene!.overlayTextColor!.toLowerCase() !== "#ffffff" &&
      ctaScene!.overlayTextColor!.toLowerCase() !== "#fff";
    push(
      "cta_contrast_config",
      contrastOk,
      `overlayTextColor=${ctaScene?.overlayTextColor ?? "missing"} (must not be white on cream)`,
    );
  }

  const v1 = input.packet.preserveV1RelativePath;
  const v2 = input.packet.preserveV2RelativePath;
  push(
    "v1_preserved",
    Boolean(v1 && existsSync(path.join(input.repoRoot, v1))),
    v1 ?? "missing preserve path",
  );
  push(
    "v2_preserved",
    Boolean(v2 && existsSync(path.join(input.repoRoot, v2))),
    v2 ?? "missing preserve path",
  );

  const v3 = input.packet.preserveV3RelativePath;
  if (v3) {
    push(
      "v3_preserved",
      existsSync(path.join(input.repoRoot, v3)),
      v3,
    );
  }

  const v4 = input.packet.preserveV4RelativePath;
  if (v4) {
    push(
      "v4_preserved",
      existsSync(path.join(input.repoRoot, v4)),
      v4,
    );
  }

  // V4+ message-to-visual sync: find beats by content (scene numbers may differ by version)
  if (input.packet.workPacketVersion === "wp-v4" || input.packet.sceneToScriptMap) {
    const mustInclude: Array<{ id: string; needle: string | RegExp }> = [
      { id: "brand_beat_cedar_lane", needle: /Cedar Lane Studio/i },
      { id: "offer_beat_has_$99", needle: "$99" },
      { id: "deadline_beat_has_may_3_2026", needle: "May 3rd, 2026" },
      { id: "session_beat_has_1030", needle: "10:30" },
      { id: "contact_beat_has_phone", needle: "555" },
      { id: "cta_beat_primary", needle: "Book your visit today" },
    ];
    for (const row of mustInclude) {
      const scene = findSceneForNeedle(input.packet, row.needle);
      const ok = Boolean(scene);
      push(
        row.id,
        ok,
        ok
          ? `scene ${scene!.sceneNumber} contains ${String(row.needle)} @ ${scene!.startSeconds}-${scene!.endSeconds}s`
          : `missing beat for ${String(row.needle)}`,
      );
    }

    // V4 required Mira Chen identity; V5 SKU narration omits person name on purpose.
    if (input.packet.workPacketVersion === "wp-v4") {
      const identity = findSceneForNeedle(input.packet, /Mira Chen/i);
      push(
        "identity_beat_mira_cedar",
        Boolean(
          identity &&
            /Mira Chen/i.test(identity.caption) &&
            /Cedar Lane/i.test(identity.caption),
        ),
        identity
          ? `scene ${identity.sceneNumber} caption=${identity.caption}`
          : "identity scene missing",
      );
    }

    const mapOk =
      Array.isArray(input.packet.sceneToScriptMap) &&
      input.packet.sceneToScriptMap.length === input.packet.scenes.length;
    push(
      "scene_to_script_map_present",
      mapOk,
      mapOk
        ? `map rows=${input.packet.sceneToScriptMap!.length}`
        : "sceneToScriptMap missing or length mismatch",
    );

    const lengths = input.packet.scenes.map(
      (s) => s.endSeconds - s.startSeconds,
    );
    const allEqual5 = lengths.every((l) => Math.abs(l - 5) < 0.05);
    push(
      "timing_not_equal_5s_slabs",
      !allEqual5,
      `scene lengths=${lengths.map((l) => l.toFixed(2)).join(",")}`,
    );
  }

  // V5+: SKU narration must fit without truncating source VO
  if (input.packet.workPacketVersion === "wp-v5") {
    const voiceAbs = path.join(
      input.repoRoot,
      input.packet.voiceArtifact.relativePath,
    );
    const voiceDur = existsSync(voiceAbs)
      ? probeMediaDurationSeconds(voiceAbs)
      : null;
    push(
      "sku_narration_duration_band",
      Boolean(voiceDur && voiceDur >= 15 && voiceDur <= 30),
      voiceDur == null ? "voice duration unknown" : `voice=${voiceDur.toFixed(3)}s`,
    );

    const scriptHay = [
      input.packet.scriptVersionId,
      input.packet.label,
      ...(input.packet.sceneToScriptMap ?? []).map((m) => m.narrationBeat),
    ].join(" ");
    // Packet narration beats must not carry voice-cert-only language
    const certOnly =
      /certification fixture/i.test(scriptHay) ||
      /pronunciation check/i.test(scriptHay) ||
      /quinoa/i.test(scriptHay);
    push(
      "no_certification_only_narration_beats",
      !certOnly,
      certOnly ? "certification-only language still in beat map" : "sku narration beats clean",
    );

    // Source voice SHA must be the new short-video narration, not the 39s voice-cert fixture
    push(
      "not_bound_to_voice_cert_39s_fixture",
      input.packet.voiceArtifact.contentSha256 !==
        "d283144563a6fe2075be956fd144fe1c0bb4de29ec55ca308c5b8060c94647e4",
      `voiceSha=${input.packet.voiceArtifact.contentSha256.slice(0, 12)}…`,
    );

    if (voiceDur != null) {
      const last = [...input.packet.scenes].sort(
        (a, b) => b.endSeconds - a.endSeconds,
      )[0];
      const timelineEnd = last?.endSeconds ?? 0;
      // Timeline may include a short CTA hold after VO; must not end before VO.
      push(
        "timeline_covers_full_narration",
        timelineEnd + 0.05 >= voiceDur,
        `timelineEnd=${timelineEnd}s voice=${voiceDur.toFixed(3)}s`,
      );
    }
  }

  const artAbs = path.join(input.repoRoot, input.artifactRelativePath);
  const artExists = existsSync(artAbs);
  push("artifact_downloaded", artExists, input.artifactRelativePath);

  if (artExists) {
    const bytes = readFileSync(artAbs);
    const sha = sha256Bytes(bytes);
    push("sha256_calculated", sha.length === 64, sha);
    const probe = probeMp4WithFfprobe(artAbs);
    if ("error" in probe) {
      push("probe_ok", false, probe.error);
    } else {
      push(
        "dimensions",
        probe.width === 1080 && probe.height === 1920,
        `${probe.width}x${probe.height}`,
      );
      push(
        "duration_band",
        probe.durationSeconds >= 15 && probe.durationSeconds <= 30,
        `${probe.durationSeconds}s`,
      );
      push("codec_h264", probe.codec === "h264", `codec=${probe.codec}`);
      push("audio_present", probe.hasAudio, `hasAudio=${probe.hasAudio}`);

      if (input.packet.workPacketVersion === "wp-v5") {
        const voiceAbs = path.join(
          input.repoRoot,
          input.packet.voiceArtifact.relativePath,
        );
        const voiceDur = existsSync(voiceAbs)
          ? probeMediaDurationSeconds(voiceAbs)
          : null;
        // No truncation: container duration must cover the full source narration
        // (optional short endcard hold after VO is allowed).
        const noTrunc =
          voiceDur != null && probe.durationSeconds + 0.15 >= voiceDur;
        push(
          "no_voice_truncation",
          noTrunc,
          voiceDur == null
            ? "voice duration unknown"
            : `mp4=${probe.durationSeconds.toFixed(3)}s voice=${voiceDur.toFixed(3)}s`,
        );
      }
    }
  }

  const ok = checks.every((c) => c.ok);
  return {
    ok,
    qaPass: false,
    customerReady: false,
    certified: false,
    checks,
  };
}
