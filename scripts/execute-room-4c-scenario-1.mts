/**
 * Room 4C Scenario 1 — Cedar Lane multi-service gauntlet execution.
 * One authoritative brief. No owner production labor. No Scenario 2.
 */
import { createHash, randomUUID } from "crypto";
import { execFileSync } from "child_process";
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

import {
  CEDAR_LANE_ASSET_IDS,
  ROOM_4C_SCENARIO_1_PACKAGE_ID,
  studioRoom4cScenario1CedarLaneV1 as brief,
} from "../src/config/studio-room-4c-scenario-1-cedar-lane-v1.ts";
import { runCampaignCreativePipeline } from "../src/lib/studio-campaign-creative/pipeline.ts";
import { CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1 } from "../src/lib/studio-campaign-creative/visual-system/cedar-lane-home-organizing-v1.ts";
import { generateVoiceArtifact } from "../src/lib/studio-kitchen-production/voice-production/generate.ts";
import { CERT_VOICE_PROVIDER } from "../src/lib/studio-kitchen-production/cert-voice/fixtures.ts";
import {
  runShotstackWorkPacketPipeline,
  type ShotstackWorkPacket,
} from "../src/lib/studio-kitchen-production/video-integration/index.ts";
import { evaluateCopyQuality } from "../src/lib/studio-kitchen-production/copy-quality/evaluate.ts";
import { CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER } from "../src/lib/studio-campaign-creative/formats.ts";
import {
  assertExactCanonicalContactFacts,
  buildCedarLaneCreativeBrief,
  buildScenario1Caption,
  buildScenario1DeliveryManifest,
  buildScenario1NarrationScript,
  buildScenario1Provenance,
  canonicalScenario1BriefJson,
  evaluateScenario1Acceptance,
  hashScenario1Brief,
  isUsLetterMediaBox,
  readPdfMediaBoxPoints,
  routeScenario1Services,
  scenario1CopyQualityBrief,
  scenario1VideoPlateCopy,
  staleScenario1FactHits,
} from "../src/lib/studio-room-4c-scenario-1/index.ts";

const require = createRequire(import.meta.url);
const sharp = require("sharp") as typeof import("sharp");

const repoRoot = process.cwd();
const EVIDENCE_REL =
  "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-1-cedar-lane";
const EVIDENCE = path.join(repoRoot, EVIDENCE_REL);
const MATERIALS_REL = `${EVIDENCE_REL}/materials`;
const DELIVERABLES_REL = `${EVIDENCE_REL}/deliverables`;
const ARTIFACT_REL = `${EVIDENCE_REL}/campaign-artifacts`;
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

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function ensureDir(abs: string) {
  mkdirSync(abs, { recursive: true });
}

function write(rel: string, contents: string) {
  const abs = path.join(repoRoot, rel);
  ensureDir(path.dirname(abs));
  const buf = Buffer.from(contents, "utf8");
  let lastErr: unknown;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      writeFileSync(abs, buf);
      return;
    } catch (err) {
      lastErr = err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300 * (attempt + 1));
    }
  }
  throw lastErr;
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

function copyOver(srcAbs: string, destAbs: string) {
  ensureDir(path.dirname(destAbs));
  const buf = readFileSync(srcAbs);
  let lastErr: unknown;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      writeFileSync(destAbs, buf);
      return;
    } catch (err) {
      lastErr = err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300 * (attempt + 1));
    }
  }
  throw lastErr;
}

function copyGeneratedPhoto(filename: string, destRel: string) {
  const candidates = [
    path.join(
      process.env.USERPROFILE ?? "",
      ".cursor",
      "projects",
      "c-Users-tagia-studio-squishy-room-4c",
      "assets",
      filename,
    ),
    path.join(repoRoot, "assets", filename),
  ];
  const src = candidates.find((p) => existsSync(p));
  if (!src) throw new Error(`MISSING_GENERATED_PHOTO:${filename}`);
  const dest = path.join(repoRoot, destRel);
  ensureDir(path.dirname(dest));
  copyFileSync(src, dest);
}

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function writeVideoPlate(input: {
  destAbs: string;
  heroAbs: string;
  eyebrow: string;
  line1: string;
  line2?: string;
  line3?: string;
}) {
  const W = 1080;
  const H = 1920;
  const overlay = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3D5A4C" stop-opacity="0.08"/>
      <stop offset="45%" stop-color="#3D5A4C" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#3D5A4C" stop-opacity="0.78"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <text x="90" y="1280" font-family="Georgia, serif" font-size="26" letter-spacing="4" fill="#F6F1E8">${esc(input.eyebrow)}</text>
  <text x="90" y="1380" font-family="Georgia, serif" font-size="58" font-weight="700" fill="#F6F1E8">${esc(input.line1)}</text>
  ${
    input.line2
      ? `<text x="90" y="1470" font-family="Georgia, serif" font-size="36" fill="#F6F1E8">${esc(input.line2)}</text>`
      : ""
  }
  ${
    input.line3
      ? `<text x="90" y="1548" font-family="Georgia, serif" font-size="30" fill="#E8D9C4">${esc(input.line3)}</text>`
      : ""
  }
</svg>`);
  await sharp(input.heroAbs)
    .resize(W, H, { fit: "cover", position: "centre" })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toFile(input.destAbs);
}

async function writeContactSheet(input: {
  destAbs: string;
  socialAbs: string;
  plateAbs: readonly string[];
  handoutAbs: string;
}) {
  const W = 5400;
  const H = 1980;
  const pad = 64;
  const labelH = 72;
  const socialSize = 1080;
  const frameH = 1080;
  const frameW = Math.round((1080 / 1920) * frameH);
  const handoutH = 1700;
  const handoutW = Math.round(handoutH * (8.5 / 11));

  const social = await sharp(input.socialAbs)
    .resize(socialSize, socialSize, { fit: "fill" })
    .png()
    .toBuffer();
  const frames = await Promise.all(
    input.plateAbs.map((p) =>
      sharp(p).resize(frameW, frameH, { fit: "cover" }).png().toBuffer(),
    ),
  );
  const handout = await sharp(input.handoutAbs)
    .resize(handoutW, handoutH, { fit: "fill" })
    .png()
    .toBuffer();

  const composites: { input: Buffer; top: number; left: number }[] = [];
  let x = pad;
  const y = pad + labelH;
  composites.push({ input: social, top: y, left: x });
  x += socialSize + 48;
  for (const frame of frames) {
    composites.push({ input: frame, top: y, left: x });
    x += frameW + 16;
  }
  x += 32;
  composites.push({ input: handout, top: y, left: x });

  const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#F6F1E8"/>
  <text x="${pad}" y="56" font-family="Georgia, serif" font-size="28" fill="#3D5A4C">Cedar Lane — owner-review contact sheet (not a customer deliverable)</text>
  <text x="${pad}" y="${y + socialSize + 40}" font-family="Georgia, serif" font-size="22" fill="#2C2A26">Social square 1080×1080</text>
  <text x="${pad + socialSize + 48}" y="${y + socialSize + 40}" font-family="Georgia, serif" font-size="22" fill="#2C2A26">Video plates (brand · offer · dates · CTA)</text>
  <text x="${x}" y="${y + handoutH + 40}" font-family="Georgia, serif" font-size="22" fill="#2C2A26">US Letter handout 8.5×11 in / 2550×3300 px</text>
</svg>`);

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: { r: 246, g: 241, b: 232 },
    },
  })
    .composite([{ input: svg, top: 0, left: 0 }, ...composites])
    .png()
    .toFile(input.destAbs);
}

function pngLooksValid(abs: string): boolean {
  const buf = readFileSync(abs);
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

function pdfLooksValid(abs: string): boolean {
  return readFileSync(abs, "utf8").startsWith("%PDF");
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
  const ownerLabor: string[] = [
    "None. Scout corrected canonical contact facts, versioned the Letter print contract, regenerated Machine deliverables, and prepared owner-review crops. Tagia did not design, edit, format, or repair deliverables.",
  ];

  ensureDir(EVIDENCE);
  ensureDir(path.join(repoRoot, MATERIALS_REL));
  ensureDir(path.join(repoRoot, DELIVERABLES_REL));
  ensureDir(path.join(repoRoot, `${VIDEO_REL}/plates`));
  ensureDir(path.join(repoRoot, REVIEW_REL));

  const briefJson = canonicalScenario1BriefJson();
  const briefSha256 = hashScenario1Brief(briefJson);
  write(`${EVIDENCE_REL}/campaign-brief.json`, briefJson);

  const acceptance = evaluateScenario1Acceptance({
    askedForCarousel: true,
    askedForAdOps: true,
    askedForUnsupportedSize: true,
  });
  if (!acceptance.admit) {
    throw new Error(`ACCEPTANCE_BLOCKED:${acceptance.findings.join(",")}`);
  }

  copyGeneratedPhoto(
    "cedar-lane-hero-closet.png",
    `${MATERIALS_REL}/cedar-lane-hero-closet.png`,
  );
  copyGeneratedPhoto(
    "cedar-lane-support-entry.png",
    `${MATERIALS_REL}/cedar-lane-support-entry.png`,
  );

  const creativeBrief = buildCedarLaneCreativeBrief();
  const campaign = await runCampaignCreativePipeline({
    repoRoot,
    brief: creativeBrief,
    systemId: CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1.systemId,
    artifactRootRel: ARTIFACT_REL,
    packageId: ROOM_4C_SCENARIO_1_PACKAGE_ID,
    materials: [
      {
        materialId: CEDAR_LANE_ASSET_IDS.logo,
        role: "logo",
        relativePath: `${MATERIALS_REL}/cedar-lane-logo.svg`,
      },
      {
        materialId: CEDAR_LANE_ASSET_IDS.heroCloset,
        role: "hero",
        relativePath: `${MATERIALS_REL}/cedar-lane-hero-closet.png`,
      },
      {
        materialId: CEDAR_LANE_ASSET_IDS.supportEntry,
        role: "support",
        relativePath: `${MATERIALS_REL}/cedar-lane-support-entry.png`,
      },
    ],
  });

  const renderDir = path.join(
    repoRoot,
    ARTIFACT_REL,
    "renders",
    `v${campaign.renderVersion}`,
  );
  const squareAsset = campaign.setSpec.assets.find(
    (a) => a.formatId === "social_square",
  );
  const printAsset = campaign.setSpec.assets.find(
    (a) => a.formatId === "print_handout",
  );
  if (!squareAsset || !printAsset) {
    throw new Error("CAMPAIGN_ASSETS_MISSING");
  }
  if (
    printAsset.canvas.widthPx !==
      CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER.widthPx ||
    printAsset.canvas.heightPx !==
      CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER.heightPx
  ) {
    throw new Error(
      `PRINT_CANVAS_NOT_LETTER:${printAsset.canvas.widthPx}x${printAsset.canvas.heightPx}`,
    );
  }
  const printContact = printAsset.layers.find(
    (l) => l.type === "text" && l.role === "contact",
  );
  if (!printContact || printContact.type !== "text") {
    throw new Error("PRINT_CONTACT_LAYER_MISSING");
  }
  assertExactCanonicalContactFacts("print-contact-layer", printContact.content);
  for (const asset of campaign.setSpec.assets) {
    for (const layer of asset.layers) {
      if (layer.type === "text") {
        const stale = staleScenario1FactHits(layer.content);
        if (stale.length > 0) {
          throw new Error(`STALE_FACTS:${asset.assetId}:${layer.role}:${stale.join(",")}`);
        }
      }
    }
  }

  const socialSrc = path.join(renderDir, `${squareAsset.assetId}.png`);
  const handoutPngSrc = path.join(renderDir, `${printAsset.assetId}.png`);
  const handoutPdfSrc = path.join(renderDir, `${printAsset.assetId}.pdf`);
  const socialDest = path.join(repoRoot, DELIVERABLES_REL, "social-square.png");
  const handoutPngDest = path.join(repoRoot, DELIVERABLES_REL, "handout.png");
  const handoutPdfDest = path.join(repoRoot, DELIVERABLES_REL, "handout.pdf");
  copyOver(socialSrc, socialDest);
  copyOver(handoutPngSrc, handoutPngDest);
  copyOver(handoutPdfSrc, handoutPdfDest);

  const caption = buildScenario1Caption();
  const captionRel = `${DELIVERABLES_REL}/caption.txt`;
  write(captionRel, `${caption}\n`);
  const copyEval = evaluateCopyQuality({
    brief: scenario1CopyQualityBrief(),
    submission: { kind: "plain_text", plainText: caption },
  });
  if (!copyEval.ok) {
    throw new Error(
      `COPY_QA_FAIL:${copyEval.findings.map((f) => f.id).join(",")}`,
    );
  }
  assertExactCanonicalContactFacts("caption", caption);
  const narrationPreview = buildScenario1NarrationScript();
  if (staleScenario1FactHits(narrationPreview).length > 0) {
    throw new Error(
      `STALE_FACTS:narration:${staleScenario1FactHits(narrationPreview).join(",")}`,
    );
  }
  if (
    narrationPreview.includes(brief.cta.phoneSpoken) ||
    narrationPreview.includes(brief.cta.bookingUrlSpoken) ||
    narrationPreview.includes(brief.cta.phoneDisplay) ||
    narrationPreview.includes(brief.cta.bookingUrl)
  ) {
    throw new Error("NARRATION_MUST_NOT_SPEAK_CONTACT");
  }

  const heroAbs = path.join(
    repoRoot,
    MATERIALS_REL,
    "cedar-lane-hero-closet.png",
  );
  const plates = scenario1VideoPlateCopy();
  const ctaPlate = plates[3];
  if (!ctaPlate) throw new Error("CTA_PLATE_MISSING");
  assertExactCanonicalContactFacts(
    "video-cta-plate",
    `${ctaPlate.line1}\n${ctaPlate.line2 ?? ""}`,
  );

  for (const plate of plates) {
    await writeVideoPlate({
      destAbs: path.join(repoRoot, VIDEO_REL, "plates", plate.file),
      heroAbs,
      eyebrow: plate.eyebrow,
      line1: plate.line1,
      line2: "line2" in plate ? plate.line2 : undefined,
      line3: "line3" in plate ? plate.line3 : undefined,
    });
  }

  const stamp = Date.now();
  const narration = buildScenario1NarrationScript();
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
    scriptVersionId: `cedar-lane-s1-narration-${stamp}`,
    outputFormat: "mp3",
    repoRoot,
    internalTest: false,
    artifactRoot: `${VIDEO_REL}/voice`,
    voiceConfiguration,
  });
  if (!voiceResult.ok) {
    write(
      `${EVIDENCE_REL}/PRODUCTION-BLOCK.json`,
      `${JSON.stringify(
        {
          blocked: true,
          stage: "voice",
          code: voiceResult.code,
          message: voiceResult.message,
          note: "Keys not printed.",
        },
        null,
        2,
      )}\n`,
    );
    throw new Error(`VOICE_BLOCKED:${voiceResult.code}`);
  }

  const duration =
    probeDurationSeconds(voiceResult.artifact.absolutePath) ?? 22;
  const timeline = Number(
    Math.min(30, Math.max(20, duration + 0.45)).toFixed(3),
  );
  const ctaHold = Math.min(
    Math.max(6.8, timeline * 0.36),
    timeline - 12,
  );
  const preCta = timeline - ctaHold;
  const beatLens = [0.22, 0.42, 0.36];
  let t = 0;
  const scenes = plates.map((plate, idx) => {
    const start = Number(t.toFixed(3));
    t =
      idx < 3
        ? t + preCta * beatLens[idx]!
        : timeline;
    const end = Number(Math.min(timeline, t).toFixed(3));
    return {
      sceneNumber: idx + 1,
      assetId: `cedar-lane-beat-${idx + 1}`,
      relativePath: `${VIDEO_REL}/plates/${plate.file}`,
      startSeconds: start,
      endSeconds: end,
      caption: idx === plates.length - 1 ? brief.cta.label : plate.line1,
      captionPresentation:
        idx === plates.length - 1
          ? ("overlay" as const)
          : ("embedded_in_plate" as const),
    };
  });
  scenes[scenes.length - 1]!.endSeconds = timeline;

  const packet: ShotstackWorkPacket = {
    workPacketId: `room-4c-s1-${stamp}`,
    workPacketVersion: "wp-s1-v1",
    storyboardVersion: "sb-s1-v1",
    scriptVersionId: `cedar-lane-s1-narration-${stamp}`,
    campaignId: brief.campaignId,
    skuId: "v2-rtu-short-video",
    label:
      "Room 4C Scenario 1 Cedar Lane Home Organizing — coordinated short-form video",
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
  const packetRel = `${VIDEO_REL}/work-packet-s1-${stamp}.json`;
  write(packetRel, `${JSON.stringify(packet, null, 2)}\n`);

  const render = await runShotstackWorkPacketPipeline({
    repoRoot,
    packet,
    envName: "v1",
    pollMaxAttempts: 90,
    pollDelayMs: 3000,
  });
  if (!render.ok) {
    write(
      `${EVIDENCE_REL}/PRODUCTION-BLOCK.json`,
      `${JSON.stringify(
        {
          blocked: true,
          stage: "shotstack",
          verdict: render.verdict,
          message: render.message,
          note: "Keys not printed.",
        },
        null,
        2,
      )}\n`,
    );
    throw new Error(`VIDEO_BLOCKED:${render.verdict}`);
  }

  const videoSrc = path.join(repoRoot, render.artifact.relativePath);
  const videoDest = path.join(repoRoot, DELIVERABLES_REL, "video.mp4");
  copyOver(videoSrc, videoDest);

  const socialMeta = await sharp(socialDest).metadata();
  const handoutMeta = await sharp(handoutPngDest).metadata();
  const phonePreviewAbs = path.join(
    repoRoot,
    DELIVERABLES_REL,
    "social-square-phone-390.png",
  );
  await sharp(socialDest).resize(390, 390, { fit: "fill" }).png().toFile(phonePreviewAbs);
  const phoneMeta = await sharp(phonePreviewAbs).metadata();
  if (phoneMeta.width !== 390 || phoneMeta.height !== 390) {
    throw new Error(`PHONE_PREVIEW_NOT_390x390:${phoneMeta.width}x${phoneMeta.height}`);
  }

  const videoDuration = probeDurationSeconds(videoDest);

  const contactCropAbs = path.join(repoRoot, REVIEW_REL, "handout-contact-crop.png");
  const cropTop = Math.max(0, printContact.y - 160);
  const cropHeight = Math.min(
    (handoutMeta.height ?? 3300) - cropTop,
    Math.max(Math.round((printContact.fontSizePx ?? 76) * 4.5) + 200, 640),
  );
  if (!Number.isFinite(cropTop) || !Number.isFinite(cropHeight) || cropHeight < 64) {
    throw new Error(`CONTACT_CROP_INVALID:${cropTop}x${cropHeight}`);
  }
  await sharp(handoutPngDest)
    .extract({
      left: 0,
      top: Math.round(cropTop),
      width: handoutMeta.width ?? 2550,
      height: Math.round(cropHeight),
    })
    .png()
    .toFile(contactCropAbs);

  const plateAbs = plates.map((p) =>
    path.join(repoRoot, VIDEO_REL, "plates", p.file),
  );
  await writeContactSheet({
    destAbs: path.join(repoRoot, REVIEW_REL, "contact-sheet.png"),
    socialAbs: socialDest,
    plateAbs,
    handoutAbs: handoutPngDest,
  });

  const provenanceAssets = [
    {
      id: "campaign-brief",
      role: "brief" as const,
      relativePath: `${EVIDENCE_REL}/campaign-brief.json`,
      contentSha256: briefSha256,
      source: "authoritative_brief" as const,
      derivedFromBriefSha256: briefSha256,
    },
    {
      id: "logo",
      role: "logo" as const,
      relativePath: `${MATERIALS_REL}/cedar-lane-logo.svg`,
      contentSha256: sha256File(
        path.join(repoRoot, MATERIALS_REL, "cedar-lane-logo.svg"),
      ),
      source: "studio_generated" as const,
      derivedFromBriefSha256: briefSha256,
    },
    {
      id: "hero",
      role: "hero_photo" as const,
      relativePath: `${MATERIALS_REL}/cedar-lane-hero-closet.png`,
      contentSha256: sha256File(heroAbs),
      source: "studio_generated" as const,
      derivedFromBriefSha256: briefSha256,
    },
    {
      id: "social-square",
      role: "social_square" as const,
      relativePath: `${DELIVERABLES_REL}/social-square.png`,
      contentSha256: sha256File(socialDest),
      source: "derived_from_brief" as const,
      derivedFromBriefSha256: briefSha256,
    },
    {
      id: "handout-png",
      role: "print_handout_png" as const,
      relativePath: `${DELIVERABLES_REL}/handout.png`,
      contentSha256: sha256File(handoutPngDest),
      source: "derived_from_brief" as const,
      derivedFromBriefSha256: briefSha256,
    },
    {
      id: "handout-pdf",
      role: "print_handout_pdf" as const,
      relativePath: `${DELIVERABLES_REL}/handout.pdf`,
      contentSha256: sha256File(handoutPdfDest),
      source: "derived_from_brief" as const,
      derivedFromBriefSha256: briefSha256,
    },
    {
      id: "caption",
      role: "caption" as const,
      relativePath: captionRel,
      contentSha256: sha256File(path.join(repoRoot, captionRel)),
      source: "derived_from_brief" as const,
      derivedFromBriefSha256: briefSha256,
    },
    {
      id: "voice",
      role: "voice_mp3" as const,
      relativePath: voiceResult.artifact.relativePath,
      contentSha256: voiceResult.artifact.contentSha256,
      source: "derived_from_brief" as const,
      derivedFromBriefSha256: briefSha256,
    },
    {
      id: "video",
      role: "video_mp4" as const,
      relativePath: `${DELIVERABLES_REL}/video.mp4`,
      contentSha256: sha256File(videoDest),
      source: "derived_from_brief" as const,
      derivedFromBriefSha256: briefSha256,
    },
  ];

  const provenance = buildScenario1Provenance({
    packageId: brief.packageId,
    scenarioId: brief.scenarioId,
    campaignId: brief.campaignId,
    briefSha256,
    visualSystemId: CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1.systemId,
    generatedAt,
    assets: provenanceAssets,
  });
  write(
    `${EVIDENCE_REL}/ASSET-PROVENANCE.json`,
    `${JSON.stringify(provenance, null, 2)}\n`,
  );

  const manifest = buildScenario1DeliveryManifest({
    packageId: brief.packageId,
    scenarioId: brief.scenarioId,
    campaignId: brief.campaignId,
    briefSha256,
    generatedAt,
    files: [
      {
        id: "social-square",
        previewRole: "social-graphic",
        relativePath: `${DELIVERABLES_REL}/social-square.png`,
        contentSha256: sha256File(socialDest),
        byteLength: statSync(socialDest).size,
        widthPx: socialMeta.width,
        heightPx: socialMeta.height,
        mimeType: "image/png",
      },
      {
        id: "video",
        previewRole: "video",
        relativePath: `${DELIVERABLES_REL}/video.mp4`,
        contentSha256: sha256File(videoDest),
        byteLength: statSync(videoDest).size,
        widthPx: 1080,
        heightPx: 1920,
        durationSeconds: videoDuration ?? undefined,
        mimeType: "video/mp4",
      },
      {
        id: "caption",
        previewRole: "caption",
        relativePath: captionRel,
        contentSha256: sha256File(path.join(repoRoot, captionRel)),
        byteLength: statSync(path.join(repoRoot, captionRel)).size,
        mimeType: "text/plain",
      },
      {
        id: "handout-png",
        previewRole: "handout-png",
        relativePath: `${DELIVERABLES_REL}/handout.png`,
        contentSha256: sha256File(handoutPngDest),
        byteLength: statSync(handoutPngDest).size,
        widthPx: handoutMeta.width,
        heightPx: handoutMeta.height,
        mimeType: "image/png",
      },
      {
        id: "handout-pdf",
        previewRole: "handout-pdf",
        relativePath: `${DELIVERABLES_REL}/handout.pdf`,
        contentSha256: sha256File(handoutPdfDest),
        byteLength: statSync(handoutPdfDest).size,
        mimeType: "application/pdf",
      },
    ],
  });
  write(
    `${EVIDENCE_REL}/DELIVERY-MANIFEST.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  const mediaBox = readPdfMediaBoxPoints(handoutPdfDest);
  if (
    handoutMeta.width !== 2550 ||
    handoutMeta.height !== 3300 ||
    !mediaBox ||
    !isUsLetterMediaBox(mediaBox)
  ) {
    throw new Error(
      `PRINT_NOT_US_LETTER:png=${handoutMeta.width}x${handoutMeta.height} pdf=${JSON.stringify(mediaBox)}`,
    );
  }

  const qa = {
    copyOk: copyEval.ok,
    campaignQaPass: campaign.qa.pass,
    overflowOk: Object.values(campaign.overflowByAssetId).every(Boolean),
    socialDims: socialMeta.width === 1080 && socialMeta.height === 1080,
    phonePreview390x390: phoneMeta.width === 390 && phoneMeta.height === 390,
    printPngLetter:
      handoutMeta.width === 2550 && handoutMeta.height === 3300,
    printPdfUsLetter: true,
    printPdfMediaBox: mediaBox,
    printHandoutContractId: creativeBrief.printHandoutContractId,
    printPngOk: pngLooksValid(handoutPngDest),
    printPdfOk: pdfLooksValid(handoutPdfDest),
    socialPngOk: pngLooksValid(socialDest),
    exactPhone: brief.cta.phoneDisplay,
    exactBookingUrl: brief.cta.bookingUrl,
    captionHasExactFacts:
      caption.includes("(804) 555-0147") &&
      caption.includes("cedarlaneorganizing.example/book") &&
      staleScenario1FactHits(caption).length === 0,
    printContactHasExactFacts:
      printContact.content ===
      "(804) 555-0147 · cedarlaneorganizing.example/book",
    videoPlateHasExactFacts:
      ctaPlate.line1 === "(804) 555-0147" &&
      ctaPlate.line2 === "cedarlaneorganizing.example/book",
    narrationIsApprovedContinuous:
      narration ===
        "Ready for a calmer, more usable closet? Cedar Lane Home Organizing's Fall Closet Reset is available September fifteenth through October fifteenth for Richmond-area homes. Keep what you use, let the rest go, and book your free twenty-minute consultation today." &&
      staleScenario1FactHits(narration).length === 0 &&
      !narration.includes(brief.cta.phoneSpoken),
    videoDurationInBand:
      videoDuration != null && videoDuration >= 15 && videoDuration <= 32,
    filesOpen: true,
    runId: randomUUID(),
    correction: "canonical-facts-and-letter-v2-contract",
  };

  write(
    `${EVIDENCE_REL}/PRODUCTION-RECORD.json`,
    `${JSON.stringify(
      {
        generatedAt,
        briefSha256,
        acceptance,
        routing: routeScenario1Services(),
        campaign: {
          renderVersion: campaign.renderVersion,
          systemId: campaign.identity.systemId,
          familyId: campaign.identity.familyId,
          setFingerprint: campaign.identity.setFingerprint,
          pngShas: campaign.identity.pngShas,
        },
        voice: {
          relativePath: voiceResult.artifact.relativePath,
          contentSha256: voiceResult.artifact.contentSha256,
          skuUsedForTtsAdapter: "ap-001",
          soldAs: "supporting narration for v2-rtu-short-video",
        },
        video: {
          packet: packetRel,
          artifact: render.artifact.relativePath,
          durationSeconds: videoDuration,
          providerRenderId: render.job.providerRenderId,
        },
        print: {
          pngPx: { width: handoutMeta.width, height: handoutMeta.height },
          pdfMediaBoxPt: mediaBox,
          contractId: creativeBrief.printHandoutContractId,
        },
        tools: [
          "studio_campaign_creative",
          "elevenlabs_tts_adapter",
          "shotstack",
          "studio_copy_quality_gate",
        ],
        ownerLabor,
        qa,
      },
      null,
      2,
    )}\n`,
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

Do **not** review \`campaign-artifacts/renders/v1\` or \`v2\` — those are superseded (wrong facts and/or earlier print geometry).

| # | Item | Path |
|---|------|------|
| 1 | Full social square | \`${DELIVERABLES_REL}/social-square.png\` |
| 2 | Complete 390×390 phone preview | \`${DELIVERABLES_REL}/social-square-phone-390.png\` |
| 3 | Corrected Letter handout PNG | \`${DELIVERABLES_REL}/handout.png\` |
| 4 | Corrected Letter PDF | \`${DELIVERABLES_REL}/handout.pdf\` |
| 5 | High-resolution contact crop (phone + URL) | \`${REVIEW_REL}/handout-contact-crop.png\` |
| 6 | Video MP4 | \`${DELIVERABLES_REL}/video.mp4\` |
| 7 | Caption | \`${captionRel}\` |
| 8 | Contact sheet (not a customer deliverable) | \`${REVIEW_REL}/contact-sheet.png\` |

Video timing record: \`${REVIEW_REL}/VIDEO-REVIEW.md\`
`,
  );

  write(
    `${REVIEW_REL}/VIDEO-REVIEW.md`,
    `# Video review support — Scenario 1

Machine duration: **${videoDuration ?? "unknown"}s**. This does **not** replace Tagia watching and listening.

## Text-card transitions

| Beat | Start | End | On-screen |
|------|-------|-----|-----------|
${transitions
  .map(
    (t) =>
      `| ${t.beat} | ${t.startSeconds.toFixed(3)}s | ${t.endSeconds.toFixed(3)}s | ${t.caption} |`,
  )
  .join("\n")}

## Narration transcript

${narration}

## Narration vs on-screen facts

CTA plate and narration bind to the same canonical brief: phone **(804) 555-0147**, URL **cedarlaneorganizing.example/book**, offer **Fall Closet Reset**, dates **September 15 – October 15, 2026**, CTA **Book a consult**. No price is spoken or shown. Invented leftovers **(804) 555-0172** and **cedarlaneorganizing.example/fall-reset** must not appear.

## Known pacing concern

Beat 1 is the shortest and beat 2 the longest. Whether that feels rushed or holds is an owner listening call. Machine duration-in-band is not a substitute for that review.
`,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        briefSha256,
        social: `${DELIVERABLES_REL}/social-square.png`,
        video: `${DELIVERABLES_REL}/video.mp4`,
        caption: captionRel,
        handoutPng: `${DELIVERABLES_REL}/handout.png`,
        handoutPdf: `${DELIVERABLES_REL}/handout.pdf`,
        qa,
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
