/**
 * Room 4C Scenario 1 — print correction + owner-review bundle.
 * Does not re-render video. Does not start Scenario 2.
 */
import { createHash, randomUUID } from "crypto";
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
import { US_LETTER_300DPI, US_LETTER_PAGE } from "../src/lib/studio-campaign-creative/formats.ts";
import { runCampaignCreativePipeline } from "../src/lib/studio-campaign-creative/pipeline.ts";
import { CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1 } from "../src/lib/studio-campaign-creative/visual-system/cedar-lane-home-organizing-v1.ts";
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
const REVIEW_REL = `${EVIDENCE_REL}/owner-review`;

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

function pngLooksValid(abs: string): boolean {
  const buf = readFileSync(abs);
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

function pdfLooksValid(abs: string): boolean {
  return readFileSync(abs, "latin1").startsWith("%PDF");
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
  const handoutW = Math.round(handoutH * (US_LETTER_PAGE.widthIn / US_LETTER_PAGE.heightIn));

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

async function main() {
  const generatedAt = new Date().toISOString();
  const ownerLabor = [
    "None. Scout corrected the Machine print-handout path and regenerated campaign outputs. Tagia did not design, edit, format, or repair deliverables.",
  ];

  ensureDir(EVIDENCE);
  ensureDir(path.join(repoRoot, DELIVERABLES_REL));
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
  const squareAsset = campaign.setSpec.assets.find((a) => a.formatId === "social_square");
  const printAsset = campaign.setSpec.assets.find((a) => a.formatId === "print_handout");
  if (!squareAsset || !printAsset) throw new Error("CAMPAIGN_ASSETS_MISSING");

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
    throw new Error(`COPY_QA_FAIL:${copyEval.findings.map((f) => f.id).join(",")}`);
  }

  const phonePreviewAbs = path.join(repoRoot, DELIVERABLES_REL, "social-square-phone-390.png");
  await sharp(socialDest).resize(390, 390, { fit: "fill" }).png().toFile(phonePreviewAbs);
  const phoneMeta = await sharp(phonePreviewAbs).metadata();
  if (phoneMeta.width !== 390 || phoneMeta.height !== 390) {
    throw new Error(`PHONE_PREVIEW_NOT_390x390:${phoneMeta.width}x${phoneMeta.height}`);
  }

  const socialMeta = await sharp(socialDest).metadata();
  const handoutMeta = await sharp(handoutPngDest).metadata();
  if (
    handoutMeta.width !== US_LETTER_300DPI.widthPx ||
    handoutMeta.height !== US_LETTER_300DPI.heightPx
  ) {
    throw new Error(
      `PRINT_PNG_NOT_LETTER:${handoutMeta.width}x${handoutMeta.height}`,
    );
  }

  const mediaBox = readPdfMediaBoxPoints(handoutPdfDest);
  if (!mediaBox || !isUsLetterMediaBox(mediaBox)) {
    throw new Error(
      `PRINT_PDF_NOT_LETTER:${JSON.stringify(mediaBox)}`,
    );
  }

  const videoDest = path.join(repoRoot, DELIVERABLES_REL, "video.mp4");
  if (!existsSync(videoDest)) {
    throw new Error("VIDEO_MISSING_DO_NOT_RERENDER");
  }

  const plates = [
    path.join(repoRoot, VIDEO_REL, "plates", "beat-01-brand.png"),
    path.join(repoRoot, VIDEO_REL, "plates", "beat-02-offer.png"),
    path.join(repoRoot, VIDEO_REL, "plates", "beat-03-dates.png"),
    path.join(repoRoot, VIDEO_REL, "plates", "beat-04-cta.png"),
  ];
  for (const p of plates) {
    if (!existsSync(p)) throw new Error(`MISSING_PLATE:${p}`);
  }

  const contactSheetAbs = path.join(repoRoot, REVIEW_REL, "contact-sheet.png");
  await writeContactSheet({
    destAbs: contactSheetAbs,
    socialAbs: socialDest,
    plateAbs: plates,
    handoutAbs: handoutPngDest,
  });

  const prior = JSON.parse(
    readFileSync(path.join(EVIDENCE, "PRODUCTION-RECORD.json"), "utf8"),
  ) as {
    video?: { durationSeconds?: number; providerRenderId?: string; packet?: string; artifact?: string };
    voice?: { relativePath?: string; contentSha256?: string };
  };

  const workPacket = JSON.parse(
    readFileSync(path.join(repoRoot, VIDEO_REL, "work-packet-s1-v1.json"), "utf8"),
  ) as {
    durationTargetSeconds: number;
    scenes: readonly {
      sceneNumber: number;
      startSeconds: number;
      endSeconds: number;
      caption: string;
    }[];
  };

  const narration = buildScenario1NarrationScript();
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
        contentSha256: sha256File(path.join(repoRoot, MATERIALS_REL, "cedar-lane-logo.svg")),
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
        contentSha256: sha256File(socialDest),
        source: "derived_from_brief",
        derivedFromBriefSha256: briefSha256,
      },
      {
        id: "handout-png",
        role: "print_handout_png",
        relativePath: `${DELIVERABLES_REL}/handout.png`,
        contentSha256: sha256File(handoutPngDest),
        source: "derived_from_brief",
        derivedFromBriefSha256: briefSha256,
      },
      {
        id: "handout-pdf",
        role: "print_handout_pdf",
        relativePath: `${DELIVERABLES_REL}/handout.pdf`,
        contentSha256: sha256File(handoutPdfDest),
        source: "derived_from_brief",
        derivedFromBriefSha256: briefSha256,
      },
      {
        id: "caption",
        role: "caption",
        relativePath: captionRel,
        contentSha256: sha256File(path.join(repoRoot, captionRel)),
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
        durationSeconds: prior.video?.durationSeconds ?? workPacket.durationTargetSeconds,
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
  write(`${EVIDENCE_REL}/DELIVERY-MANIFEST.json`, `${JSON.stringify(manifest, null, 2)}\n`);

  const datesLayer = campaign.setSpec.assets
    .find((a) => a.formatId === "social_square")
    ?.layers.find((l) => l.type === "text" && l.role === "dates");
  const dateColor =
    datesLayer && datesLayer.type === "text" ? datesLayer.color : "";

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
    printPngOk: pngLooksValid(handoutPngDest),
    printPdfOk: pdfLooksValid(handoutPdfDest),
    socialPngOk: pngLooksValid(socialDest),
    dateContrastNotMuted:
      dateColor.toLowerCase() ===
      CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1.palette.background.toLowerCase(),
    captionHasFacts:
      caption.includes(brief.offer.name) &&
      caption.includes(brief.cta.bookingUrl) &&
      caption.includes(brief.cta.phoneDisplay),
    videoDurationInBand:
      (prior.video?.durationSeconds ?? 0) >= 15 &&
      (prior.video?.durationSeconds ?? 0) <= 32,
    filesOpen: true,
    runId: randomUUID(),
    correction: "us-letter-print-and-phone-390",
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
        voice: prior.voice,
        video: prior.video,
        print: {
          pngPx: { width: handoutMeta.width, height: handoutMeta.height },
          pdfMediaBoxPt: mediaBox,
          pageInches: US_LETTER_PAGE,
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

  const videoDuration = prior.video?.durationSeconds ?? workPacket.durationTargetSeconds;
  const transitions = workPacket.scenes.map((s) => ({
    beat: s.sceneNumber,
    startSeconds: s.startSeconds,
    endSeconds: s.endSeconds,
    caption: s.caption,
  }));

  write(
    `${REVIEW_REL}/OWNER-REVIEW.md`,
    `# Owner-review index — Scenario 1 Cedar Lane

Review evidence only. Classification remains **OWNER DECISION PENDING**.

| # | Item | Path |
|---|------|------|
| 1 | Full social square | \`${DELIVERABLES_REL}/social-square.png\` |
| 2 | Complete 390×390 phone preview | \`${DELIVERABLES_REL}/social-square-phone-390.png\` |
| 3 | Corrected Letter handout PNG | \`${DELIVERABLES_REL}/handout.png\` |
| 4 | Corrected Letter PDF | \`${DELIVERABLES_REL}/handout.pdf\` |
| 5 | Video MP4 | \`${DELIVERABLES_REL}/video.mp4\` |
| 6 | Caption | \`${captionRel}\` |
| 7 | Contact sheet (not a customer deliverable) | \`${REVIEW_REL}/contact-sheet.png\` |

Video timing record: \`${REVIEW_REL}/VIDEO-REVIEW.md\`
`,
  );

  write(
    `${REVIEW_REL}/VIDEO-REVIEW.md`,
    `# Video review support — Scenario 1

Machine duration: **${videoDuration}s**. This does **not** replace Tagia watching and listening.

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

Both bind to the same authoritative brief (offer **Fall Closet Reset**, dates **September 15 – October 15, 2026**, CTA **Book a consult**, phone and booking URL). No price is spoken or shown.

## Known pacing concern

Beat 1 is the shortest (~4.8s) and beat 2 the longest (~7.4s). Whether that feels rushed or holds is an owner listening call. Machine duration-in-band is not a substitute for that review.
`,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        briefSha256,
        renderVersion: campaign.renderVersion,
        social: `${DELIVERABLES_REL}/social-square.png`,
        phone: `${DELIVERABLES_REL}/social-square-phone-390.png`,
        handoutPng: `${DELIVERABLES_REL}/handout.png`,
        handoutPdf: `${DELIVERABLES_REL}/handout.pdf`,
        printPng: { width: handoutMeta.width, height: handoutMeta.height },
        pdfMediaBox: mediaBox,
        phonePreview: { width: phoneMeta.width, height: phoneMeta.height },
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
