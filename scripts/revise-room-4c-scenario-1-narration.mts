/**
 * Room 4C Scenario 1 — one controlled narration-quality revision.
 * Reuses approved stills/plates. Does not rerender handout, social, or caption.
 * Does not start Scenario 2. Owner labor remains zero.
 */
import { createHash, randomUUID } from "crypto";
import { execFileSync, spawnSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import path from "path";

import {
  studioRoom4cScenario1CedarLaneV1 as brief,
} from "../src/config/studio-room-4c-scenario-1-cedar-lane-v1.ts";
import { CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1 } from "../src/lib/studio-campaign-creative/visual-system/cedar-lane-home-organizing-v1.ts";
import { generateVoiceArtifact } from "../src/lib/studio-kitchen-production/voice-production/generate.ts";
import { CERT_VOICE_PROVIDER } from "../src/lib/studio-kitchen-production/cert-voice/fixtures.ts";
import {
  runShotstackWorkPacketPipeline,
  type ShotstackWorkPacket,
} from "../src/lib/studio-kitchen-production/video-integration/index.ts";
import { probeMp4WithFfprobe } from "../src/lib/studio-kitchen-production/video-operational/bind-export.ts";
import {
  assertExactCanonicalContactFacts,
  assertScenario1CustomerFactSourceGate,
  assertScenario1ProductionRoutingAllowed,
  buildScenario1Caption,
  buildScenario1DeliveryManifest,
  buildScenario1NarrationScript,
  buildScenario1Provenance,
  hashScenario1Brief,
  SCENARIO_1_APPROVED_NARRATION,
  scenario1VideoCtaPlateCopy,
  scenario1VideoPlateCopy,
  staleScenario1FactHits,
} from "../src/lib/studio-room-4c-scenario-1/index.ts";

const repoRoot = process.cwd();
const EVIDENCE_REL =
  "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-1-cedar-lane";
const MATERIALS_REL = `${EVIDENCE_REL}/materials`;
const DELIVERABLES_REL = `${EVIDENCE_REL}/deliverables`;
const VIDEO_REL = `${EVIDENCE_REL}/video`;
const REVIEW_REL = `${EVIDENCE_REL}/owner-review`;

function loadEnvLocal() {
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function sha256File(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function ensureDir(abs: string) {
  mkdirSync(abs, { recursive: true });
}

function write(rel: string, contents: string) {
  const abs = path.join(repoRoot, rel);
  ensureDir(path.dirname(abs));
  writeFileSync(abs, contents, "utf8");
}

function copyOver(srcAbs: string, destAbs: string) {
  ensureDir(path.dirname(destAbs));
  const buf = readFileSync(srcAbs);
  writeFileSync(destAbs, buf);
}

function probeDurationSeconds(absPath: string): number | null {
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
        absPath,
      ],
      { encoding: "utf8" },
    ).trim();
    const n = Number(out);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function measureAudioLevels(absPath: string): {
  peakDb: number | null;
  meanDb: number | null;
  clipped: boolean;
} {
  const result = spawnSync(
    "ffmpeg",
    ["-i", absPath, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const combined = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
  const max = combined.match(/max_volume:\s*(-?[0-9.]+)\s*dB/);
  const mean = combined.match(/mean_volume:\s*(-?[0-9.]+)\s*dB/);
  const peakDb = max ? Number(max[1]) : null;
  const meanDb = mean ? Number(mean[1]) : null;
  return {
    peakDb: Number.isFinite(peakDb) ? peakDb : null,
    meanDb: Number.isFinite(meanDb) ? meanDb : null,
    clipped: peakDb != null && Number.isFinite(peakDb) && peakDb >= -0.1,
  };
}

loadEnvLocal();
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    "AppData",
    "Local",
    "ms-playwright",
  );
}

async function main() {
  const generatedAt = new Date().toISOString();
  const ownerLabor = [
    "None. Scout regenerated one continuous narration track and one revised MP4. Tagia did not design, edit, format, or repair deliverables. Approved stills were reused.",
  ];

  assertScenario1ProductionRoutingAllowed();
  assertScenario1CustomerFactSourceGate();
  const caption = buildScenario1Caption();
  assertExactCanonicalContactFacts("caption", caption);
  const narration = buildScenario1NarrationScript();
  if (narration !== SCENARIO_1_APPROVED_NARRATION) {
    throw new Error("NARRATION_NOT_OWNER_APPROVED_SCRIPT");
  }
  if (
    narration.includes(brief.cta.phoneDisplay) ||
    narration.includes(brief.cta.bookingUrl) ||
    narration.includes(brief.cta.phoneSpoken) ||
    narration.includes(brief.cta.bookingUrlSpoken)
  ) {
    throw new Error("NARRATION_MUST_NOT_SPEAK_CONTACT");
  }
  if (staleScenario1FactHits(narration).length > 0) {
    throw new Error(`STALE_FACTS:narration:${staleScenario1FactHits(narration).join(",")}`);
  }

  const ctaPlate = scenario1VideoCtaPlateCopy();
  assertExactCanonicalContactFacts(
    "video-cta-plate",
    `${ctaPlate.line1}\n${ctaPlate.line2 ?? ""}`,
  );

  const plates = scenario1VideoPlateCopy();
  for (const plate of plates) {
    const abs = path.join(repoRoot, VIDEO_REL, "plates", plate.file);
    if (!existsSync(abs)) throw new Error(`MISSING_APPROVED_PLATE:${plate.file}`);
  }

  const socialDest = path.join(repoRoot, DELIVERABLES_REL, "social-square.png");
  const handoutPngDest = path.join(repoRoot, DELIVERABLES_REL, "handout.png");
  const handoutPdfDest = path.join(repoRoot, DELIVERABLES_REL, "handout.pdf");
  const captionAbs = path.join(repoRoot, DELIVERABLES_REL, "caption.txt");
  const priorSocialSha = sha256File(socialDest);
  const priorHandoutPngSha = sha256File(handoutPngDest);
  const priorHandoutPdfSha = sha256File(handoutPdfDest);
  const priorCaptionSha = sha256File(captionAbs);

  const stamp = Date.now();
  const voiceConfiguration = {
    provider: "elevenlabs" as const,
    voiceId: process.env.ELEVENLABS_VOICE_ID?.trim() || CERT_VOICE_PROVIDER.voiceId,
    modelId: process.env.ELEVENLABS_MODEL_ID?.trim() || CERT_VOICE_PROVIDER.modelId,
    source: process.env.ELEVENLABS_VOICE_ID?.trim()
      ? ("env" as const)
      : ("default_candidate" as const),
  };

  const voiceResult = await generateVoiceArtifact({
    campaignId: brief.campaignId,
    skuId: "ap-001",
    approvedScript: narration,
    scriptVersionId: `cedar-lane-s1-narration-continuous-${stamp}`,
    outputFormat: "mp3",
    repoRoot,
    internalTest: false,
    artifactRoot: `${VIDEO_REL}/voice`,
    voiceConfiguration,
  });
  if (!voiceResult.ok) {
    throw new Error(`VOICE_BLOCKED:${voiceResult.code}`);
  }

  const audioDuration =
    probeDurationSeconds(voiceResult.artifact.absolutePath) ?? 22;
  const audioLevels = measureAudioLevels(voiceResult.artifact.absolutePath);
  const timeline = Number(
    Math.min(30, Math.max(20, audioDuration + 0.45)).toFixed(3),
  );
  const ctaHold = Math.min(Math.max(6.8, timeline * 0.36), timeline - 12);
  const preCta = timeline - ctaHold;
  const beatLens = [0.22, 0.42, 0.36];
  let t = 0;
  const scenes = plates.map((plate, idx) => {
    const start = Number(t.toFixed(3));
    t = idx < 3 ? t + preCta * beatLens[idx]! : timeline;
    return {
      sceneNumber: idx + 1,
      assetId: `cedar-lane-beat-${idx + 1}`,
      relativePath: `${VIDEO_REL}/plates/${plate.file}`,
      startSeconds: start,
      endSeconds: Number(Math.min(timeline, t).toFixed(3)),
      caption: idx === plates.length - 1 ? brief.cta.label : plate.line1,
      captionPresentation:
        idx === plates.length - 1
          ? ("overlay" as const)
          : ("embedded_in_plate" as const),
    };
  });
  scenes[scenes.length - 1]!.endSeconds = timeline;

  const packet: ShotstackWorkPacket = {
    workPacketId: `room-4c-s1-narration-${stamp}`,
    workPacketVersion: "wp-s1-v2-continuous-narration",
    storyboardVersion: "sb-s1-v1",
    scriptVersionId: `cedar-lane-s1-narration-continuous-${stamp}`,
    campaignId: brief.campaignId,
    skuId: "v2-rtu-short-video",
    label:
      "Room 4C Scenario 1 Cedar Lane — continuous narration quality revision",
    durationMinSeconds: 20,
    durationMaxSeconds: 30,
    durationTargetSeconds: Number(timeline.toFixed(2)),
    aspectRatio: "vertical",
    width: 1080,
    height: 1920,
    exportFormat: "mp4",
    musicAllowed: false,
    stockAllowed: false,
    productionMethod: "shotstack",
    productionRoleOwner: "creative_production",
    voiceArtifact: {
      relativePath: voiceResult.artifact.relativePath,
      contentSha256: voiceResult.artifact.contentSha256,
    },
    exportRelativePath: `${VIDEO_REL}/cedar-lane-fall-closet-reset-${stamp}.mp4`,
    ctaCaptionSceneNumber: 4,
    primaryCtaText: brief.cta.label,
    requiredShotstackEnv: "v1",
    scenes,
  };
  const packetRel = `${VIDEO_REL}/work-packet-s1-narration-${stamp}.json`;
  write(packetRel, `${JSON.stringify(packet, null, 2)}\n`);

  const render = await runShotstackWorkPacketPipeline({
    repoRoot,
    packet,
    envName: "v1",
    pollMaxAttempts: 90,
    pollDelayMs: 3000,
  });
  if (!render.ok) {
    throw new Error(`VIDEO_BLOCKED:${render.verdict}`);
  }

  const videoSrc = path.join(repoRoot, render.artifact.relativePath);
  const videoDest = path.join(repoRoot, DELIVERABLES_REL, "video.mp4");
  copyOver(videoSrc, videoDest);

  const probe = probeMp4WithFfprobe(videoDest);
  if ("error" in probe) throw new Error(`PROBE_FAIL:${probe.error}`);
  if (!probe.hasAudio) throw new Error("VIDEO_MISSING_AUDIO");
  if (probe.width !== 1080 || probe.height !== 1920) {
    throw new Error(`VIDEO_DIMS:${probe.width}x${probe.height}`);
  }
  if (probe.durationSeconds < 20 || probe.durationSeconds > 30) {
    throw new Error(`VIDEO_DURATION_OUT_OF_BAND:${probe.durationSeconds}`);
  }
  const videoLevels = measureAudioLevels(videoDest);
  if (sha256File(socialDest) !== priorSocialSha) {
    throw new Error("SOCIAL_GRAPHIC_MUTATED");
  }
  if (sha256File(handoutPngDest) !== priorHandoutPngSha) {
    throw new Error("HANDOUT_PNG_MUTATED");
  }
  if (sha256File(handoutPdfDest) !== priorHandoutPdfSha) {
    throw new Error("HANDOUT_PDF_MUTATED");
  }
  if (sha256File(captionAbs) !== priorCaptionSha) {
    throw new Error("CAPTION_MUTATED");
  }

  const briefSha256 = hashScenario1Brief();
  const heroAbs = path.join(repoRoot, MATERIALS_REL, "cedar-lane-hero-closet.png");
  const provenance = buildScenario1Provenance({
    packageId: brief.packageId,
    scenarioId: brief.scenarioId,
    campaignId: brief.campaignId,
    briefSha256,
    visualSystemId: CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1.systemId,
    generatedAt,
    assets: [
      {
        id: "campaign-brief",
        role: "brief",
        relativePath: `${EVIDENCE_REL}/campaign-brief.json`,
        contentSha256: briefSha256,
        source: "authoritative_brief",
        derivedFromBriefSha256: briefSha256,
      },
      {
        id: "logo",
        role: "logo",
        relativePath: `${MATERIALS_REL}/cedar-lane-logo.svg`,
        contentSha256: sha256File(
          path.join(repoRoot, MATERIALS_REL, "cedar-lane-logo.svg"),
        ),
        source: "studio_generated",
        derivedFromBriefSha256: briefSha256,
      },
      {
        id: "hero",
        role: "hero_photo",
        relativePath: `${MATERIALS_REL}/cedar-lane-hero-closet.png`,
        contentSha256: sha256File(heroAbs),
        source: "studio_generated",
        derivedFromBriefSha256: briefSha256,
      },
      {
        id: "social-square",
        role: "social_square",
        relativePath: `${DELIVERABLES_REL}/social-square.png`,
        contentSha256: priorSocialSha,
        source: "derived_from_brief",
        derivedFromBriefSha256: briefSha256,
      },
      {
        id: "handout-png",
        role: "print_handout_png",
        relativePath: `${DELIVERABLES_REL}/handout.png`,
        contentSha256: priorHandoutPngSha,
        source: "derived_from_brief",
        derivedFromBriefSha256: briefSha256,
      },
      {
        id: "handout-pdf",
        role: "print_handout_pdf",
        relativePath: `${DELIVERABLES_REL}/handout.pdf`,
        contentSha256: priorHandoutPdfSha,
        source: "derived_from_brief",
        derivedFromBriefSha256: briefSha256,
      },
      {
        id: "caption",
        role: "caption",
        relativePath: `${DELIVERABLES_REL}/caption.txt`,
        contentSha256: priorCaptionSha,
        source: "derived_from_brief",
        derivedFromBriefSha256: briefSha256,
      },
      {
        id: "voice",
        role: "voice_mp3",
        relativePath: voiceResult.artifact.relativePath,
        contentSha256: voiceResult.artifact.contentSha256,
        source: "derived_from_brief",
        derivedFromBriefSha256: briefSha256,
      },
      {
        id: "video",
        role: "video_mp4",
        relativePath: `${DELIVERABLES_REL}/video.mp4`,
        contentSha256: sha256File(videoDest),
        source: "derived_from_brief",
        derivedFromBriefSha256: briefSha256,
      },
    ],
  });
  write(`${EVIDENCE_REL}/ASSET-PROVENANCE.json`, `${JSON.stringify(provenance, null, 2)}\n`);

  const priorManifest = JSON.parse(
    readFileSync(path.join(repoRoot, `${EVIDENCE_REL}/DELIVERY-MANIFEST.json`), "utf8"),
  ) as {
    files: Array<{
      id: string;
      previewRole: "social-graphic" | "video" | "caption" | "handout-png" | "handout-pdf";
      relativePath: string;
      contentSha256: string;
      byteLength: number;
      widthPx?: number;
      heightPx?: number;
      mimeType: string;
      durationSeconds?: number;
    }>;
  };
  const files = priorManifest.files.map((f) => {
    if (f.id !== "video") return f;
    return {
      ...f,
      contentSha256: sha256File(videoDest),
      byteLength: statSync(videoDest).size,
      widthPx: 1080,
      heightPx: 1920,
      durationSeconds: probe.durationSeconds,
    };
  });
  const manifest = buildScenario1DeliveryManifest({
    packageId: brief.packageId,
    scenarioId: brief.scenarioId,
    campaignId: brief.campaignId,
    briefSha256,
    generatedAt,
    files,
  });
  write(`${EVIDENCE_REL}/DELIVERY-MANIFEST.json`, `${JSON.stringify(manifest, null, 2)}\n`);

  const priorProduction = JSON.parse(
    readFileSync(path.join(repoRoot, `${EVIDENCE_REL}/PRODUCTION-RECORD.json`), "utf8"),
  ) as Record<string, unknown>;

  write(
    `${EVIDENCE_REL}/PRODUCTION-RECORD.json`,
    `${JSON.stringify(
      {
        ...priorProduction,
        generatedAt,
        briefSha256,
        voice: {
          relativePath: voiceResult.artifact.relativePath,
          contentSha256: voiceResult.artifact.contentSha256,
          skuUsedForTtsAdapter: "ap-001",
          soldAs: "supporting narration for v2-rtu-short-video",
          generation: "one_continuous_elevenlabs_tts_request",
          script: narration,
        },
        video: {
          packet: packetRel,
          artifact: render.artifact.relativePath,
          durationSeconds: probe.durationSeconds,
          providerRenderId: render.job.providerRenderId,
          revision: "continuous-narration-quality-1",
        },
        ownerLabor,
        qa: {
          ...(typeof priorProduction.qa === "object" && priorProduction.qa
            ? priorProduction.qa
            : {}),
          runId: randomUUID(),
          correction: "continuous-narration-quality-1",
          videoDurationInBand:
            probe.durationSeconds >= 20 && probe.durationSeconds <= 30,
          videoHasAudio: probe.hasAudio,
          audioPeakDb: videoLevels.peakDb,
          audioMeanDb: videoLevels.meanDb,
          audioClipped: videoLevels.clipped,
          sourceAudioPeakDb: audioLevels.peakDb,
          sourceAudioClipped: audioLevels.clipped,
          narrationIsApprovedContinuous: true,
          stillsUnchanged: true,
          videoPlateHasExactFacts:
            ctaPlate.line1 === "(804) 555-0147" &&
            ctaPlate.line2 === "cedarlaneorganizing.example/book",
        },
      },
      null,
      2,
    )}\n`,
  );

  write(
    `${EVIDENCE_REL}/PRODUCTION-RECORD.md`,
    `# Production record — Scenario 1

Machine-readable companion: \`PRODUCTION-RECORD.json\`

| Field | Value |
|-------|--------|
| Narration revision | ${generatedAt} |
| Brief SHA-256 | \`${briefSha256}\` |
| Video | revised continuous-narration MP4 |
| Video duration | ${probe.durationSeconds.toFixed(2)}s |
| Shotstack render | \`${render.job.providerRenderId}\` |
| Stills | unchanged (social, handout, caption, plates) |
| Owner labor | None |

Execution script: \`scripts/revise-room-4c-scenario-1-narration.mts\`
`,
  );

  const transitions = packet.scenes.map((s) => ({
    beat: s.sceneNumber,
    startSeconds: s.startSeconds,
    endSeconds: s.endSeconds,
    caption: s.caption,
  }));

  write(
    `${REVIEW_REL}/OWNER-REVIEW.md`,
    `# Owner-review index — Scenario 1 Cedar Lane

Review evidence only. Classification remains **OWNER DECISION PENDING**.

Do **not** review superseded MP4s under \`video/cedar-lane-fall-closet-reset-1787257821973.mp4\` or earlier. Current customer video is \`deliverables/video.mp4\`.

Do **not** review \`campaign-artifacts/renders/v1\` through \`v5\`. Current stills are the \`deliverables/\` files.

| # | Item | Path |
|---|------|------|
| 1 | Full social square (unchanged) | \`${DELIVERABLES_REL}/social-square.png\` |
| 2 | Complete 390×390 phone preview (unchanged) | \`${DELIVERABLES_REL}/social-square-phone-390.png\` |
| 3 | Letter handout PNG (unchanged) | \`${DELIVERABLES_REL}/handout.png\` |
| 4 | Letter PDF (unchanged) | \`${DELIVERABLES_REL}/handout.pdf\` |
| 5 | High-resolution contact crop (unchanged) | \`${REVIEW_REL}/handout-contact-crop.png\` |
| 6 | **Revised final video MP4** | \`${DELIVERABLES_REL}/video.mp4\` |
| 7 | Caption (unchanged) | \`${DELIVERABLES_REL}/caption.txt\` |
| 8 | Contact sheet | \`${REVIEW_REL}/contact-sheet.png\` |

Video timing record: \`${REVIEW_REL}/VIDEO-REVIEW.md\`
`,
  );

  write(
    `${REVIEW_REL}/VIDEO-REVIEW.md`,
    `# Video review support — Scenario 1 (narration revision)

Machine duration: **${probe.durationSeconds.toFixed(2)}s**. This does **not** replace Tagia watching and listening.

## Text-card transitions

| Beat | Start | End | On-screen |
|------|-------|-----|-----------|
${transitions
  .map(
    (row) =>
      `| ${row.beat} | ${row.startSeconds.toFixed(3)}s | ${row.endSeconds.toFixed(3)}s | ${row.caption} |`,
  )
  .join("\n")}

## Narration transcript (one continuous TTS request)

${narration}

Phone and URL are **not** spoken. They remain on the final CTA plate: **(804) 555-0147** · **cedarlaneorganizing.example/book**.

## Audio

Peak ${videoLevels.peakDb ?? "unknown"} dB · mean ${videoLevels.meanDb ?? "unknown"} dB · clipped=${videoLevels.clipped}. Source MP3 peak ${audioLevels.peakDb ?? "unknown"} dB · clipped=${audioLevels.clipped}.
`,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        briefSha256,
        narrationContinuous: true,
        video: `${DELIVERABLES_REL}/video.mp4`,
        videoSha256: sha256File(videoDest),
        durationSeconds: probe.durationSeconds,
        hasAudio: probe.hasAudio,
        audioPeakDb: videoLevels.peakDb,
        audioClipped: videoLevels.clipped,
        stillsUnchanged: true,
        providerRenderId: render.job.providerRenderId,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
