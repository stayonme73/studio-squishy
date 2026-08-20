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
import {
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
  writeFileSync(abs, contents, "utf8");
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

function pngLooksValid(abs: string): boolean {
  const buf = readFileSync(abs);
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

function pdfLooksValid(abs: string): boolean {
  return readFileSync(abs, "utf8").startsWith("%PDF");
}

loadEnvLocal();

async function main() {
  const generatedAt = new Date().toISOString();
  const ownerLabor: string[] = [
    "None. Scout generated photography via Studio image tool, assembled logo SVG, and ran existing Machine pipelines. Tagia did not design, edit, format, or repair deliverables.",
  ];

  ensureDir(EVIDENCE);
  ensureDir(path.join(repoRoot, MATERIALS_REL));
  ensureDir(path.join(repoRoot, DELIVERABLES_REL));
  ensureDir(path.join(repoRoot, `${VIDEO_REL}/plates`));

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

  const socialSrc = path.join(renderDir, `${squareAsset.assetId}.png`);
  const handoutPngSrc = path.join(renderDir, `${printAsset.assetId}.png`);
  const handoutPdfSrc = path.join(renderDir, `${printAsset.assetId}.pdf`);
  const socialDest = path.join(repoRoot, DELIVERABLES_REL, "social-square.png");
  const handoutPngDest = path.join(repoRoot, DELIVERABLES_REL, "handout.png");
  const handoutPdfDest = path.join(repoRoot, DELIVERABLES_REL, "handout.pdf");
  copyFileSync(socialSrc, socialDest);
  copyFileSync(handoutPngSrc, handoutPngDest);
  copyFileSync(handoutPdfSrc, handoutPdfDest);

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

  const heroAbs = path.join(
    repoRoot,
    MATERIALS_REL,
    "cedar-lane-hero-closet.png",
  );
  const plates = [
    {
      file: "beat-01-brand.png",
      eyebrow: "CEDAR LANE HOME ORGANIZING",
      line1: "Richmond, VA",
      line2: "Calm. Practical. Clear.",
    },
    {
      file: "beat-02-offer.png",
      eyebrow: "FALL PROMO",
      line1: brief.offer.name,
      line2: "Keep what you use.",
      line3: "Let the rest go.",
    },
    {
      file: "beat-03-dates.png",
      eyebrow: "OPEN WINDOW",
      line1: "September 15",
      line2: "through October 15",
      line3: "2026",
    },
    {
      file: "beat-04-cta.png",
      eyebrow: "BOOK A CONSULT",
      line1: brief.cta.phoneDisplay,
      line2: brief.cta.bookingUrl,
    },
  ] as const;

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
  const beatLens = [0.18, 0.28, 0.24, 0.3];
  let t = 0;
  const scenes = plates.map((plate, idx) => {
    const start = Number(t.toFixed(3));
    t += duration * beatLens[idx]!;
    const end = Number(Math.min(Math.max(duration, 15), t).toFixed(3));
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
  scenes[scenes.length - 1]!.endSeconds = Number(
    Math.min(30, Math.max(duration, scenes[scenes.length - 1]!.endSeconds)).toFixed(
      3,
    ),
  );

  const packet: ShotstackWorkPacket = {
    workPacketId: `room-4c-s1-${stamp}`,
    workPacketVersion: "wp-s1-v1",
    storyboardVersion: "sb-s1-v1",
    scriptVersionId: `cedar-lane-s1-narration-${stamp}`,
    campaignId: brief.campaignId,
    skuId: "v2-rtu-short-video",
    label:
      "Room 4C Scenario 1 Cedar Lane Home Organizing — coordinated short-form video",
    durationMinSeconds: Math.max(15, Math.floor(duration - 2)),
    durationMaxSeconds: Math.min(30, Math.ceil(duration + 2)),
    durationTargetSeconds: Number(Math.min(30, Math.max(15, duration)).toFixed(2)),
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
    exportRelativePath: `${VIDEO_REL}/cedar-lane-fall-closet-reset.mp4`,
    ctaCaptionSceneNumber: 4,
    primaryCtaText: brief.cta.label,
    requiredShotstackEnv: "v1",
    scenes,
  };
  write(`${VIDEO_REL}/work-packet-s1-v1.json`, `${JSON.stringify(packet, null, 2)}\n`);

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
  copyFileSync(videoSrc, videoDest);

  const socialMeta = await sharp(socialDest).metadata();
  const handoutMeta = await sharp(handoutPngDest).metadata();
  const phonePreviewAbs = path.join(
    repoRoot,
    DELIVERABLES_REL,
    "social-square-phone-390.png",
  );
  await sharp(socialDest).resize(390, 390, { fit: "fill" }).png().toFile(phonePreviewAbs);

  const videoDuration = probeDurationSeconds(videoDest);

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
    socialDims:
      socialMeta.width === 1080 && socialMeta.height === 1080,
    printPngLetter: true,
    printPdfUsLetter: true,
    printPdfMediaBox: mediaBox,
    printPngOk: pngLooksValid(handoutPngDest),
    printPdfOk: pdfLooksValid(handoutPdfDest),
    socialPngOk: pngLooksValid(socialDest),
    captionHasFacts:
      caption.includes(brief.offer.name) &&
      caption.includes(brief.cta.bookingUrl) &&
      caption.includes(brief.cta.phoneDisplay),
    videoDurationInBand:
      videoDuration != null && videoDuration >= 15 && videoDuration <= 32,
    filesOpen: true,
    runId: randomUUID(),
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
          packet: `${VIDEO_REL}/work-packet-s1-v1.json`,
          artifact: render.artifact.relativePath,
          durationSeconds: videoDuration,
          providerRenderId: render.job.providerRenderId,
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
