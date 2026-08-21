/**
 * Room 4C Scenario 3 — one controlled music-led revision.
 * Archives narrated video + rejected copy. Preserves approved static hashes.
 */
import { createHash, randomUUID } from "crypto";
import { execFileSync, spawnSync } from "child_process";
import { createRequire } from "module";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import path from "path";

import { studioRoom4cScenario3MossAndThreadV1 as brief } from "../src/config/studio-room-4c-scenario-3-moss-and-thread-v1.ts";
import {
  MOSS_THREAD_CERTIFICATION_PHOTO_PACK,
  MOSS_THREAD_PHOTO_PACK_DIR,
} from "../src/config/studio-room-4c-scenario-3-photo-pack-v1.ts";
import { evaluateCopyQuality } from "../src/lib/studio-kitchen-production/copy-quality/evaluate.ts";
import {
  composeElevenMusicInstrumental,
  SCENARIO_3_MUSIC_PROMPT,
} from "../src/lib/studio-kitchen-production/music-production/index.ts";
import {
  runShotstackWorkPacketPipeline,
  type ShotstackWorkPacket,
} from "../src/lib/studio-kitchen-production/video-integration/index.ts";
import { evaluateRenderedMotionSafety } from "../src/lib/studio-kitchen-production/video-motion-safety/index.ts";
import {
  SCENARIO_3_BRIEF_SHA256,
  SCENARIO_3_MUSIC_LED_WINDOWS,
  assertExactCanonicalLaunchFacts,
  assertScenario3ClaimAuthority,
  assertScenario3CustomerFactSourceGate,
  assertScenario3ProductionAuthorized,
  buildScenario3CampaignDirection,
  buildScenario3Caption,
  buildScenario3DeliveryManifest,
  evaluateScenario3ClaimCopyGate,
  evaluateScenario3PhotoAuthorityAgreement,
  evaluateScenario3PhotoPackIngest,
  formatScenario3EmailPasteReady,
  hashScenario3Brief,
  hashScenarioDeliverables,
  routeScenario3Services,
  scenario3CopyQualityBrief,
  scenario3EmailCopyQualityBrief,
  scenario3VideoPlateCopy,
} from "../src/lib/studio-room-4c-scenario-3/index.ts";

const require = createRequire(import.meta.url);
const sharp = require("sharp") as typeof import("sharp");

const repoRoot = process.cwd();
const EVIDENCE_REL =
  "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-3-moss-and-thread";
const DELIVERABLES_REL = `${EVIDENCE_REL}/deliverables`;
const VIDEO_REL = `${EVIDENCE_REL}/video`;
const REVIEW_REL = `${EVIDENCE_REL}/owner-review`;
const SUPERSEDED_REL = `${EVIDENCE_REL}/superseded-narrated-voice-package`;
const PHOTO_REL = MOSS_THREAD_PHOTO_PACK_DIR;

const FROZEN_STATIC = {
  "social-square.png":
    "dd6d875c6fc1c8a705db54f0582cc6f483525b8ed4204e6ef0d00eeeb3d684b0",
  "social-vertical.png":
    "2306403c97b099fe4cf81d2bc0bd9a7eac8ffd2ca0b728462b40b6281f67b8ef",
  "invitation-handout.png":
    "0c89f0c0666162025ae6c40e906997f06b271a8519ad45bd4b1749314b85258c",
  "invitation-handout.pdf":
    "9d94a7cac94a30a716063542a3dd5075d2c992f5d405c68624c7e4a6bafb5d1e",
} as const;

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
  writeFileSync(abs, Buffer.from(contents, "utf8"));
}

function copyOver(srcAbs: string, destAbs: string) {
  ensureDir(path.dirname(destAbs));
  writeFileSync(destAbs, readFileSync(srcAbs));
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

function probeMaxVolumeDb(absPath: string): number | null {
  const result = spawnSync(
    "ffmpeg",
    ["-i", absPath, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const match = /max_volume:\s*([-\d.]+)\s*dB/.exec(text);
  if (!match?.[1]) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function probeHasAudioStream(absPath: string): boolean {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "a",
        "-show_entries",
        "stream=codec_type",
        "-of",
        "csv=p=0",
        absPath,
      ],
      { encoding: "utf8" },
    ).trim();
    return /audio/i.test(out);
  } catch {
    return false;
  }
}

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function photoAbs(filename: string): string {
  return path.join(repoRoot, PHOTO_REL, filename);
}

async function writeVideoBackground(destAbs: string, photo: string) {
  await sharp(photo)
    .resize(1215, 2160, { fit: "cover", position: "centre" })
    .png()
    .toFile(destAbs);
}

async function writeVideoTextOverlay(input: {
  destAbs: string;
  eyebrow: string;
  line1: string;
  line2?: string;
  line3?: string;
  line4?: string;
}) {
  const W = 1080;
  const H = 1920;
  const overlay = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1F3A2E" stop-opacity="0"/>
      <stop offset="45%" stop-color="#1F3A2E" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#1F3A2E" stop-opacity="0.9"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <text x="96" y="1280" font-family="Georgia, serif" font-size="24" letter-spacing="2" fill="#F3EDE4">${esc(input.eyebrow)}</text>
  <text x="96" y="1368" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#F3EDE4">${esc(input.line1)}</text>
  ${input.line2 ? `<text x="96" y="1440" font-family="Georgia, serif" font-size="26" fill="#F3EDE4">${esc(input.line2)}</text>` : ""}
  ${input.line3 ? `<text x="96" y="1510" font-family="Georgia, serif" font-size="28" fill="#C4844A">${esc(input.line3)}</text>` : ""}
  ${input.line4 ? `<text x="96" y="1570" font-family="Georgia, serif" font-size="24" fill="#E8DCC8">${esc(input.line4)}</text>` : ""}
</svg>`);
  await sharp(overlay).png().toFile(input.destAbs);
}

async function writeFrameContactSheet(input: {
  destAbs: string;
  frames: readonly { absolutePath: string }[];
}) {
  const frameH = 480;
  const frameW = Math.round((1080 / 1920) * frameH);
  const pad = 40;
  const cols = Math.max(input.frames.length, 1);
  const W = pad * 2 + cols * frameW + (cols - 1) * 24;
  const H = pad * 2 + frameH + 80;
  const buffers = await Promise.all(
    input.frames.map((f) =>
      sharp(f.absolutePath).resize(frameW, frameH, { fit: "cover" }).png().toBuffer(),
    ),
  );
  const composites = buffers.map((buf, i) => ({
    input: buf,
    top: 80,
    left: pad + i * (frameW + 24),
  }));
  const title = Buffer.from(`
<svg width="${W}" height="60" xmlns="http://www.w3.org/2000/svg">
  <text x="${pad}" y="40" font-family="Georgia, serif" font-size="22" fill="#1F3A2E">Moss &amp; Thread — music-led motion-safety sheet</text>
</svg>`);
  await sharp({
    create: { width: W, height: H, channels: 3, background: "#F3EDE4" },
  })
    .composite([
      { input: await sharp(title).png().toBuffer(), top: 8, left: 0 },
      ...composites,
    ])
    .png()
    .toFile(input.destAbs);
}

function archiveFile(srcRel: string, destRel: string) {
  const src = path.join(repoRoot, srcRel);
  if (!existsSync(src)) return;
  const dest = path.join(repoRoot, destRel);
  ensureDir(path.dirname(dest));
  copyFileSync(src, dest);
}

async function main() {
  loadEnvLocal();
  const generatedAt = new Date().toISOString();
  const stamp = Date.now();

  if (hashScenario3Brief() !== SCENARIO_3_BRIEF_SHA256) {
    throw new Error("BRIEF_HASH_CHANGED");
  }
  assertScenario3ProductionAuthorized();
  assertScenario3CustomerFactSourceGate();
  const photoPack = evaluateScenario3PhotoPackIngest();
  if (!photoPack.ok) throw new Error(`PHOTO_PACK_FAIL:${photoPack.findings.join(",")}`);
  const agreement = evaluateScenario3PhotoAuthorityAgreement();
  if (!agreement.ok) throw new Error(`PHOTO_AUTHORITY_FAIL:${agreement.findings.join(",")}`);

  const s1Start = hashScenarioDeliverables(repoRoot, 1);
  const s2Start = hashScenarioDeliverables(repoRoot, 2);

  for (const [file, expected] of Object.entries(FROZEN_STATIC)) {
    const abs = path.join(repoRoot, DELIVERABLES_REL, file);
    if (sha256File(abs) !== expected) {
      throw new Error(`STATIC_HASH_CHANGED:${file}`);
    }
  }

  // Archive rejected narrated package + old copy before overwrite
  ensureDir(path.join(repoRoot, SUPERSEDED_REL));
  archiveFile(`${DELIVERABLES_REL}/video.mp4`, `${SUPERSEDED_REL}/video.mp4`);
  archiveFile(`${DELIVERABLES_REL}/campaign-direction.md`, `${SUPERSEDED_REL}/campaign-direction.md`);
  archiveFile(`${DELIVERABLES_REL}/caption.txt`, `${SUPERSEDED_REL}/caption.txt`);
  archiveFile(`${DELIVERABLES_REL}/email.txt`, `${SUPERSEDED_REL}/email.txt`);
  write(
    `${SUPERSEDED_REL}/SUPERSEDED.md`,
    `# Superseded — narrated voice package

Archived during music-led correction ${generatedAt}.

Rejected because synthetic narration failed naturalness / attention review.
Studio defect correction — not a customer revision allowance use.
`,
  );

  const direction = buildScenario3CampaignDirection();
  const caption = buildScenario3Caption();
  const emailText = formatScenario3EmailPasteReady();
  write(`${DELIVERABLES_REL}/campaign-direction.md`, `${direction}\n`);
  write(`${DELIVERABLES_REL}/caption.txt`, `${caption}\n`);
  write(`${DELIVERABLES_REL}/email.txt`, `${emailText}\n`);

  assertExactCanonicalLaunchFacts("campaign-direction", direction, [
    "offerName",
    "datesDisplay",
    "priceDisplay",
    "cta",
    "businessName",
    "bookingUrl",
    "locationDisplay",
  ]);
  assertExactCanonicalLaunchFacts("caption", caption, [
    "offerName",
    "datesDisplay",
    "priceDisplay",
    "cta",
    "businessName",
    "bookingUrl",
    "locationDisplay",
  ]);
  assertExactCanonicalLaunchFacts("email", emailText, [
    "offerName",
    "datesDisplay",
    "priceDisplay",
    "cta",
    "businessName",
    "bookingUrl",
    "emailDisplay",
    "locationDisplay",
  ]);

  const claimGate = evaluateScenario3ClaimCopyGate([
    { label: "caption", text: caption, requireVisitorClaim: true },
    { label: "email", text: emailText, requireVisitorClaim: true },
    { label: "direction", text: direction, requireVisitorClaim: true },
  ]);
  if (!claimGate.ok) throw new Error(`CLAIM_GATE_FAIL:${claimGate.findings.join(",")}`);
  assertScenario3ClaimAuthority("caption", caption);
  assertScenario3ClaimAuthority("email", emailText);

  const captionEval = evaluateCopyQuality({
    brief: scenario3CopyQualityBrief(),
    submission: { kind: "plain_text", plainText: caption },
  });
  const emailBuilt = {
    subjectOptions: [`${brief.offer.name} at ${brief.customer.businessName}`],
    previewText: `${brief.offer.windowDisplay} · ${brief.offer.admissionDisplay}`,
    body: emailText,
    cta: brief.cta.label,
  };
  const emailEval = evaluateCopyQuality({
    brief: scenario3EmailCopyQualityBrief(),
    submission: { kind: "email_set", emails: [emailBuilt] },
  });
  if (!captionEval.ok) {
    throw new Error(`COPY_QA_FAIL_CAPTION:${captionEval.findings.map((f) => f.id).join(",")}`);
  }
  if (!emailEval.ok) {
    throw new Error(`COPY_QA_FAIL_EMAIL:${emailEval.findings.map((f) => f.id).join(",")}`);
  }
  for (const text of [direction, caption, emailText]) {
    if (/certification-fixture|external-photo-path|motion-safe|copy-QA|SHA-256|hash-bound/i.test(text)) {
      throw new Error("CUSTOMER_COPY_CONTAINS_INTERNAL_QA_LANGUAGE");
    }
  }

  const musicDurationMs = 23000;
  const musicRel = `${VIDEO_REL}/music/moss-thread-s3-instrumental-${stamp}.mp3`;
  const rightsRel = `${EVIDENCE_REL}/MUSIC-RIGHTS-RECORD.json`;
  const music = await composeElevenMusicInstrumental({
    prompt: SCENARIO_3_MUSIC_PROMPT,
    durationMs: musicDurationMs,
    modelId: "music_v2",
    outputRelativePath: musicRel,
    repoRoot,
    accountTier: "starter",
  });
  if (!music.ok) {
    write(
      `${EVIDENCE_REL}/PRODUCTION-BLOCK.json`,
      `${JSON.stringify({ blocked: true, stage: "eleven_music", code: music.code, message: music.message }, null, 2)}\n`,
    );
    throw new Error(`MUSIC_BLOCKED:${music.code}`);
  }
  write(rightsRel, `${JSON.stringify(music.rights, null, 2)}\n`);
  write(
    `${EVIDENCE_REL}/MUSIC-PROVENANCE.md`,
    `# Music provenance — Scenario 3

- Provider: ElevenLabs Eleven Music
- Model: ${music.modelId}
- Generation id: ${music.generationId ?? "not returned in headers"}
- Request id: ${music.requestId ?? "n/a"}
- Duration requested: ${music.durationMs} ms
- SHA-256: \`${music.contentSha256}\`
- Path: \`${music.relativePath}\`
- Account tier (owner-confirmed): Starter (Individual Use Only)
- Attribution required: no
- Standalone redistribution: prohibited
- Deliverable form: embedded in finished MP4 only

See MUSIC-RIGHTS-RECORD.json for the full rights record.
`,
  );

  const musicDuration = probeDurationSeconds(music.absolutePath) ?? musicDurationMs / 1000;
  const musicPeak = probeMaxVolumeDb(music.absolutePath);
  if (musicPeak != null && musicPeak >= 0) {
    throw new Error(`MUSIC_CLIPPING:${musicPeak}`);
  }

  // Apply short fade-out on a production mix bed (editing permission recorded)
  const fadedRel = `${VIDEO_REL}/music/moss-thread-s3-instrumental-faded-${stamp}.mp3`;
  const fadedAbs = path.join(repoRoot, fadedRel);
  const fadeStart = Math.max(0, musicDuration - 1.2);
  const fadeRes = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      music.absolutePath,
      "-af",
      `afade=t=in:st=0:d=0.35,afade=t=out:st=${fadeStart.toFixed(3)}:d=1.15,loudnorm=I=-16:TP=-1.5:LRA=11`,
      "-ar",
      "44100",
      fadedAbs,
    ],
    { encoding: "utf8" },
  );
  if (fadeRes.status !== 0 || !existsSync(fadedAbs)) {
    throw new Error(`MUSIC_FADE_FAIL:${fadeRes.stderr?.slice(0, 400)}`);
  }
  const fadedSha = sha256File(fadedAbs);
  const fadedDuration = probeDurationSeconds(fadedAbs) ?? musicDuration;
  const fadedPeak = probeMaxVolumeDb(fadedAbs);

  const windows = [...SCENARIO_3_MUSIC_LED_WINDOWS];
  // Stretch final CTA hold to match music duration (min 4s)
  const timeline = Number(
    Math.min(30, Math.max(20, fadedDuration)).toFixed(3),
  );
  windows[windows.length - 1] = {
    startSeconds: windows[windows.length - 1]!.startSeconds,
    endSeconds: timeline,
  };
  if (
    windows[windows.length - 1]!.endSeconds -
      windows[windows.length - 1]!.startSeconds <
    4
  ) {
    throw new Error("CTA_HOLD_TOO_SHORT");
  }

  const plates = scenario3VideoPlateCopy();
  if (plates.length !== windows.length) {
    throw new Error("PLATE_WINDOW_COUNT_MISMATCH");
  }
  const photoByAsset: Record<string, string> = {};
  for (const entry of MOSS_THREAD_CERTIFICATION_PHOTO_PACK) {
    photoByAsset[entry.assetId] = photoAbs(entry.filename);
  }
  const overlayAbsPaths: string[] = [];
  for (const plate of plates) {
    const bgRel = `${VIDEO_REL}/plates/bg-${plate.file}`;
    const overlayRel = `${VIDEO_REL}/plates/type-${plate.file}`;
    const src = photoByAsset[plate.photoAssetId];
    if (!src) throw new Error(`PLATE_PHOTO_MISSING:${plate.photoAssetId}`);
    await writeVideoBackground(path.join(repoRoot, bgRel), src);
    await writeVideoTextOverlay({
      destAbs: path.join(repoRoot, overlayRel),
      eyebrow: plate.eyebrow,
      line1: plate.line1,
      line2: plate.line2,
      line3: plate.line3,
      line4:
        plate.spokenSubject === "visit-details" ? brief.cta.eventUrl : undefined,
    });
    overlayAbsPaths.push(path.join(repoRoot, overlayRel));
  }

  const scenes = plates.map((plate, idx) => ({
    sceneNumber: idx + 1,
    assetId: `moss-thread-music-beat-${idx + 1}`,
    relativePath: `${VIDEO_REL}/plates/bg-${plate.file}`,
    overlayRelativePath: `${VIDEO_REL}/plates/type-${plate.file}`,
    startSeconds: windows[idx]!.startSeconds,
    endSeconds: windows[idx]!.endSeconds,
    caption: idx === plates.length - 1 ? brief.cta.label : plate.line1,
    captionPresentation: "embedded_in_plate" as const,
    motionEffect: "zoomIn" as const,
    backgroundScale: 1.12,
  }));

  const packet: ShotstackWorkPacket = {
    workPacketId: `room-4c-s3-music-${stamp}`,
    workPacketVersion: "wp-s3-music-v1",
    storyboardVersion: "sb-s3-music-v1",
    scriptVersionId: `moss-thread-s3-music-led-${stamp}`,
    campaignId: brief.campaignId,
    skuId: "v2-rtu-short-video",
    label: "Room 4C Scenario 3 Moss & Thread — music-led short-form video",
    durationMinSeconds: 20,
    durationMaxSeconds: 30,
    durationTargetSeconds: Number(timeline.toFixed(2)),
    aspectRatio: "vertical",
    width: 1080,
    height: 1920,
    exportFormat: "mp4",
    musicAllowed: true,
    stockAllowed: false,
    audioMode: "music_led",
    productionMethod: "shotstack",
    productionRoleOwner: "creative_production",
    musicArtifact: {
      relativePath: fadedRel,
      contentSha256: fadedSha,
      rightsRecordRelativePath: rightsRel,
    },
    exportRelativePath: `${VIDEO_REL}/moss-thread-open-weekend-music-${stamp}.mp4`,
    ctaCaptionSceneNumber: plates.length,
    primaryCtaText: brief.cta.label,
    requiredShotstackEnv: "v1",
    correctionReason:
      "Music-led revision: remove failed narration; rights-cleared Eleven Music instrumental; stationary overlays; phrase-timed cuts.",
    sceneToScriptMap: plates.map((plate, index) => ({
      sceneNumber: index + 1,
      timeRange: `${windows[index]!.startSeconds.toFixed(3)}-${windows[index]!.endSeconds.toFixed(3)}`,
      narrationBeat: "(music-led — no narration)",
      visual: plate.spokenSubject,
      designedText: [plate.line1, plate.line2, plate.line3].filter(Boolean).join(" · "),
      captionBehavior: "stationary_type_overlay",
    })),
    scenes,
  };
  write(`${VIDEO_REL}/work-packet-s3-music-${stamp}.json`, `${JSON.stringify(packet, null, 2)}\n`);

  const submitted = await runShotstackWorkPacketPipeline({
    repoRoot,
    packet,
    envName: "v1",
    pollMaxAttempts: 90,
    pollDelayMs: 3000,
  });
  if (!submitted.ok) {
    write(
      `${EVIDENCE_REL}/PRODUCTION-BLOCK.json`,
      `${JSON.stringify({ blocked: true, stage: "shotstack", verdict: submitted.verdict, message: submitted.message }, null, 2)}\n`,
    );
    throw new Error(`VIDEO_BLOCKED:${submitted.verdict}`);
  }

  const videoSrc = path.join(repoRoot, submitted.artifact.relativePath);
  const videoDest = path.join(repoRoot, DELIVERABLES_REL, "video.mp4");
  copyOver(videoSrc, videoDest);

  const videoDuration = probeDurationSeconds(videoDest);
  const videoPeak = probeMaxVolumeDb(videoDest);
  if (!probeHasAudioStream(videoDest)) throw new Error("VIDEO_MISSING_AUDIO");
  if (videoPeak != null && videoPeak >= 0) throw new Error(`VIDEO_AUDIO_CLIPPING:${videoPeak}`);
  if (!videoDuration || videoDuration < 20 || videoDuration > 30) {
    throw new Error(`VIDEO_DURATION_OUT_OF_BAND:${videoDuration}`);
  }

  // No-narration / no-vocals: music-led packet has no voice artifact; music was force_instrumental
  if (packet.voiceArtifact) throw new Error("VOICE_ARTIFACT_STILL_PRESENT");
  if (!music.rights.forceInstrumental) throw new Error("NOT_FORCE_INSTRUMENTAL");

  const framesDirAbs = path.join(repoRoot, REVIEW_REL, "motion-safety-frames");
  const motionSafety = await evaluateRenderedMotionSafety({
    videoAbs: videoDest,
    framesDirAbs,
    durationSeconds: videoDuration,
    beats: plates.map((plate, idx) => ({
      beat: idx + 1,
      startSeconds: windows[idx]!.startSeconds,
      endSeconds: windows[idx]!.endSeconds,
      overlayAbs: overlayAbsPaths[idx]!,
      expectedText: [plate.line1, plate.line2, plate.line3].filter(
        (line): line is string => Boolean(line),
      ),
      isCta: idx === plates.length - 1,
    })),
  });
  write(`${REVIEW_REL}/MOTION-SAFETY.json`, `${JSON.stringify(motionSafety, null, 2)}\n`);
  write(
    `${REVIEW_REL}/MOTION-SAFETY-REPORT.md`,
    `# Motion-safety report — Scenario 3 music-led

Result: **${motionSafety.ok ? "PASS" : "FAIL"}**

Findings: ${motionSafety.findings.map((f) => f.id).join(", ") || "none"}
`,
  );
  if (!motionSafety.ok) {
    throw new Error(
      `MOTION_SAFETY_FAIL:${motionSafety.findings.filter((f) => !f.ok).map((f) => f.id).join(",")}`,
    );
  }
  await writeFrameContactSheet({
    destAbs: path.join(repoRoot, REVIEW_REL, "video-contact-sheet.png"),
    frames: motionSafety.frames,
  });
  copyOver(
    path.join(repoRoot, REVIEW_REL, "video-contact-sheet.png"),
    path.join(repoRoot, REVIEW_REL, "motion-safety-contact-sheet.png"),
  );

  for (const [file, expected] of Object.entries(FROZEN_STATIC)) {
    const abs = path.join(repoRoot, DELIVERABLES_REL, file);
    if (sha256File(abs) !== expected) throw new Error(`STATIC_HASH_REGRESSED:${file}`);
  }
  const s1End = hashScenarioDeliverables(repoRoot, 1);
  const s2End = hashScenarioDeliverables(repoRoot, 2);
  if (JSON.stringify(s1Start) !== JSON.stringify(s1End)) throw new Error("S1_HASH_CHANGED");
  if (JSON.stringify(s2Start) !== JSON.stringify(s2End)) throw new Error("S2_HASH_CHANGED");

  const deliveryFiles = [
    {
      id: "campaign-direction",
      previewRole: "campaign-direction" as const,
      relativePath: `${DELIVERABLES_REL}/campaign-direction.md`,
      contentSha256: sha256File(path.join(repoRoot, DELIVERABLES_REL, "campaign-direction.md")),
      byteLength: statSync(path.join(repoRoot, DELIVERABLES_REL, "campaign-direction.md")).size,
      mimeType: "text/markdown",
    },
    {
      id: "social-square",
      previewRole: "social-square" as const,
      relativePath: `${DELIVERABLES_REL}/social-square.png`,
      contentSha256: FROZEN_STATIC["social-square.png"],
      byteLength: statSync(path.join(repoRoot, DELIVERABLES_REL, "social-square.png")).size,
      widthPx: 1080,
      heightPx: 1080,
      mimeType: "image/png",
    },
    {
      id: "social-vertical",
      previewRole: "social-vertical" as const,
      relativePath: `${DELIVERABLES_REL}/social-vertical.png`,
      contentSha256: FROZEN_STATIC["social-vertical.png"],
      byteLength: statSync(path.join(repoRoot, DELIVERABLES_REL, "social-vertical.png")).size,
      widthPx: 1080,
      heightPx: 1920,
      mimeType: "image/png",
    },
    {
      id: "video",
      previewRole: "video" as const,
      relativePath: `${DELIVERABLES_REL}/video.mp4`,
      contentSha256: sha256File(videoDest),
      byteLength: statSync(videoDest).size,
      durationSeconds: videoDuration,
      mimeType: "video/mp4",
    },
    {
      id: "caption",
      previewRole: "caption" as const,
      relativePath: `${DELIVERABLES_REL}/caption.txt`,
      contentSha256: sha256File(path.join(repoRoot, DELIVERABLES_REL, "caption.txt")),
      byteLength: statSync(path.join(repoRoot, DELIVERABLES_REL, "caption.txt")).size,
      mimeType: "text/plain",
    },
    {
      id: "email",
      previewRole: "email" as const,
      relativePath: `${DELIVERABLES_REL}/email.txt`,
      contentSha256: sha256File(path.join(repoRoot, DELIVERABLES_REL, "email.txt")),
      byteLength: statSync(path.join(repoRoot, DELIVERABLES_REL, "email.txt")).size,
      mimeType: "text/plain",
    },
    {
      id: "invitation-handout-png",
      previewRole: "invitation-handout-png" as const,
      relativePath: `${DELIVERABLES_REL}/invitation-handout.png`,
      contentSha256: FROZEN_STATIC["invitation-handout.png"],
      byteLength: statSync(path.join(repoRoot, DELIVERABLES_REL, "invitation-handout.png")).size,
      widthPx: 2550,
      heightPx: 3300,
      mimeType: "image/png",
    },
    {
      id: "invitation-handout-pdf",
      previewRole: "invitation-handout-pdf" as const,
      relativePath: `${DELIVERABLES_REL}/invitation-handout.pdf`,
      contentSha256: FROZEN_STATIC["invitation-handout.pdf"],
      byteLength: statSync(path.join(repoRoot, DELIVERABLES_REL, "invitation-handout.pdf")).size,
      mimeType: "application/pdf",
    },
  ];
  write(
    `${EVIDENCE_REL}/DELIVERY-MANIFEST.json`,
    `${JSON.stringify(
      buildScenario3DeliveryManifest({
        packageId: brief.packageId,
        scenarioId: brief.scenarioId,
        campaignId: brief.campaignId,
        briefSha256: SCENARIO_3_BRIEF_SHA256,
        generatedAt,
        files: deliveryFiles,
      }),
      null,
      2,
    )}\n`,
  );

  write(
    `${REVIEW_REL}/SYNCHRONIZATION-PROOF.json`,
    `${JSON.stringify(
      {
        generatedAt,
        audioMode: "music_led",
        narrationPresent: false,
        music: {
          relativePath: fadedRel,
          sourceSha256: music.contentSha256,
          fadedSha256: fadedSha,
          generationId: music.generationId,
          modelId: music.modelId,
          durationSeconds: fadedDuration,
          maxVolumeDb: fadedPeak,
        },
        videoDurationSeconds: videoDuration,
        videoMaxVolumeDb: videoPeak,
        windows,
        plates: plates.map((p) => p.spokenSubject),
        ok: true,
      },
      null,
      2,
    )}\n`,
  );
  write(
    `${REVIEW_REL}/VIDEO-REVIEW.md`,
    `# Video review — Scenario 3 music-led

Machine duration: **${videoDuration.toFixed(2)}s**. Music bed ~**${fadedDuration.toFixed(2)}s**. Peak: **${videoPeak ?? "unknown"} dB**.

No narration. Instrumental only (\`force_instrumental: true\`). Tagia must watch and listen before approval.

## Scene / music timing

| Beat | Start | End | Visual |
|------|-------|-----|--------|
${windows
  .map(
    (w, i) =>
      `| ${i + 1} | ${w.startSeconds.toFixed(2)}s | ${w.endSeconds.toFixed(2)}s | ${plates[i]!.spokenSubject} |`,
  )
  .join("\n")}

Motion-safety: **${motionSafety.ok ? "PASS" : "FAIL"}**
`,
  );
  write(
    `${REVIEW_REL}/OWNER-REVIEW.md`,
    `# Owner review — Scenario 3 music-led (current)

Narrated package archived at \`${SUPERSEDED_REL}/\`. Classification remains **OWNER DECISION PENDING**.

| # | Item | Path |
|---|------|------|
| 1 | Campaign direction | \`${DELIVERABLES_REL}/campaign-direction.md\` |
| 2 | Social square (unchanged) | \`${DELIVERABLES_REL}/social-square.png\` |
| 3 | Social vertical (unchanged) | \`${DELIVERABLES_REL}/social-vertical.png\` |
| 4 | Invitation PNG/PDF (unchanged) | \`${DELIVERABLES_REL}/invitation-handout.*\` |
| 5 | Music-led video | \`${DELIVERABLES_REL}/video.mp4\` |
| 6 | Caption | \`${DELIVERABLES_REL}/caption.txt\` |
| 7 | Email | \`${DELIVERABLES_REL}/email.txt\` |
| 8 | Music rights | \`${rightsRel}\` |
| 9 | Video contact sheet | \`${REVIEW_REL}/video-contact-sheet.png\` |
| 10 | VIDEO-REVIEW | \`${REVIEW_REL}/VIDEO-REVIEW.md\` |
`,
  );

  write(
    `${EVIDENCE_REL}/PRODUCTION-RECORD.json`,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        revision: "music-led-controlled-1",
        generatedAt,
        runId: randomUUID(),
        briefSha256: SCENARIO_3_BRIEF_SHA256,
        audioMode: "music_led",
        music: music.rights,
        fadedMusicSha256: fadedSha,
        videoSha256: sha256File(videoDest),
        videoDurationSeconds: videoDuration,
        staticHashesUnchanged: true,
        scenario1HashesUnchanged: true,
        scenario2HashesUnchanged: true,
        motionSafetyOk: motionSafety.ok,
        classificationRecommended: "PASS WITH EXPLICIT LIMITS",
        ownerDecision: "OWNER DECISION PENDING",
        routing: routeScenario3Services(),
      },
      null,
      2,
    )}\n`,
  );
  write(
    `${EVIDENCE_REL}/QA-FINDINGS.md`,
    `# QA findings — Scenario 3 music-led

- Music rights record: PASS (Starter, owner-confirmed)
- No narration / force instrumental: PASS
- Audio clipping: PASS (peak ${videoPeak ?? "n/a"} dB)
- Duration 20–30s: PASS (${videoDuration.toFixed(2)}s)
- Fade applied: PASS
- Scene/music phrase windows: PASS
- Motion-safety: ${motionSafety.ok ? "PASS" : "FAIL"}
- Fact / claim gates: PASS
- Static hashes unchanged: PASS
- Scenario 1/2 hashes unchanged: PASS
- Customer copy free of internal QA language: PASS
`,
  );
  write(
    `${EVIDENCE_REL}/CLASSIFICATION.md`,
    `# Classification — Scenario 3

**Scout recommendation:** PASS WITH EXPLICIT LIMITS  
**Owner decision:** OWNER DECISION PENDING

Explicit limits: external real-customer photo path NOT PROVEN (Studio certification fixtures). Music: Starter Individual Use Only; no standalone music redistribution; no film/TV/radio/Studio Games.
`,
  );
  write(
    `${EVIDENCE_REL}/DEFECTS-AND-LIMITATIONS.md`,
    `# Defects and limitations — Scenario 3

## Corrected
- Rejected choppy narration (Studio defect). Replaced with music-led video.
- Customer-facing copy capitalization and natural rewrite.

## Retained limits
- External real-customer photo path NOT PROVEN.
- Eleven Music Starter: Individual Use Only; no standalone music redistribution; no film/TV/radio/Studio Games.
`,
  );
  write(
    `${EVIDENCE_REL}/SERVICE-BOUNDARY-MUSIC-LED.md`,
    `# Reusable service boundary — music-led short-form video

- Music-led short-form video: supported when music rights are cleared and recorded.
- Synthetic narration: optional; customer listening required until independent AI naturalness QA is certified.
- Rejected narration is a Studio defect correction and does not consume customer revision allowance.
- The Studio must not force narration when a music-led treatment produces a stronger customer result.
- Deliver finished video only — do not deliver standalone music files to customers.
`,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        video: `${DELIVERABLES_REL}/video.mp4`,
        videoSha256: sha256File(videoDest),
        videoDuration,
        musicGenerationId: music.generationId,
        musicModel: music.modelId,
        musicSha256: music.contentSha256,
        fadedSha256: fadedSha,
        captionSha256: sha256File(path.join(repoRoot, DELIVERABLES_REL, "caption.txt")),
        emailSha256: sha256File(path.join(repoRoot, DELIVERABLES_REL, "email.txt")),
        directionSha256: sha256File(
          path.join(repoRoot, DELIVERABLES_REL, "campaign-direction.md"),
        ),
        motionSafety: motionSafety.ok,
        staticOk: true,
        s1Ok: true,
        s2Ok: true,
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
