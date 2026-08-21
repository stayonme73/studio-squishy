/**
 * Room 4C Scenario 3 — Moss & Thread multi-service gauntlet execution.
 * One authoritative brief. No Scenario 1/2 mutation. No Room 4C closeout.
 */
import { createHash, randomUUID } from "crypto";
import { execFileSync, spawnSync } from "child_process";
import { createRequire } from "module";
import {
  existsSync,
  mkdirSync,
  readdirSync,
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
import { CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER } from "../src/lib/studio-campaign-creative/formats.ts";
import { CERT_VOICE_PROVIDER } from "../src/lib/studio-kitchen-production/cert-voice/fixtures.ts";
import { evaluateCopyQuality } from "../src/lib/studio-kitchen-production/copy-quality/evaluate.ts";
import {
  runShotstackWorkPacketPipeline,
  type ShotstackWorkPacket,
} from "../src/lib/studio-kitchen-production/video-integration/index.ts";
import { evaluateRenderedMotionSafety } from "../src/lib/studio-kitchen-production/video-motion-safety/index.ts";
import { generateVoiceArtifact } from "../src/lib/studio-kitchen-production/voice-production/generate.ts";
import { captureFlyerExports } from "../src/lib/studio-design-renderer/capture.ts";
import {
  isUsLetterMediaBox,
  readPdfMediaBoxPoints,
} from "../src/lib/studio-room-4c-scenario-1/pdf-page.ts";
import {
  SCENARIO_3_BRIEF_SHA256,
  SCENARIO_3_NARRATION_SENTENCES,
  assertExactCanonicalLaunchFacts,
  assertScenario3ClaimAuthority,
  assertScenario3CustomerFactSourceGate,
  assertScenario3ProductionAuthorized,
  assertScenario3ProductionRoutingAllowed,
  buildScenario3CampaignDirection,
  buildScenario3Caption,
  buildScenario3DeliveryManifest,
  buildScenario3NarrationScript,
  buildScenario3Provenance,
  buildSemanticBeatWindows,
  buildSemanticTimingTable,
  evaluateScenario3Acceptance,
  evaluateScenario3ClaimCopyGate,
  evaluateScenario3CustomerFactSourceGate,
  evaluateScenario3PhotoAuthorityAgreement,
  evaluateScenario3PhotoPackIngest,
  evaluateSemanticVideoFlow,
  formatScenario3EmailPasteReady,
  hashScenario3Brief,
  hashScenarioDeliverables,
  mapSentencesToAlignment,
  routeScenario3Services,
  scenario3CopyQualityBrief,
  scenario3EmailCopyQualityBrief,
  scenario3VideoPlateCopy,
  synthesizeAlignmentFromDuration,
} from "../src/lib/studio-room-4c-scenario-3/index.ts";

const require = createRequire(import.meta.url);
const sharp = require("sharp") as typeof import("sharp");

const repoRoot = process.cwd();
const EVIDENCE_REL =
  "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-3-moss-and-thread";
const EVIDENCE = path.join(repoRoot, EVIDENCE_REL);
const DELIVERABLES_REL = `${EVIDENCE_REL}/deliverables`;
const VIDEO_REL = `${EVIDENCE_REL}/video`;
const REVIEW_REL = `${EVIDENCE_REL}/owner-review`;
const PHOTO_REL = MOSS_THREAD_PHOTO_PACK_DIR;

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

function pdfLooksValid(abs: string): boolean {
  const buf = readFileSync(abs);
  return buf.length > 100 && buf.subarray(0, 4).toString("latin1") === "%PDF";
}

async function writeVideoBackground(input: {
  destAbs: string;
  photoAbs: string;
}) {
  await sharp(input.photoAbs)
    .resize(1215, 2160, { fit: "cover", position: "centre" })
    .png()
    .toFile(input.destAbs);
}

async function writeVideoTextOverlay(input: {
  destAbs: string;
  eyebrow: string;
  line1: string;
  line2?: string;
  line3?: string;
  /** Optional fourth line kept inside phone-safe width (URL). */
  line4?: string;
}) {
  const W = 1080;
  const H = 1920;
  // Safe area right edge is 1008; keep glyph ink well inside.
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
  ${
    input.line2
      ? `<text x="96" y="1440" font-family="Georgia, serif" font-size="26" fill="#F3EDE4">${esc(input.line2)}</text>`
      : ""
  }
  ${
    input.line3
      ? `<text x="96" y="1510" font-family="Georgia, serif" font-size="28" fill="#C4844A">${esc(input.line3)}</text>`
      : ""
  }
  ${
    input.line4
      ? `<text x="96" y="1570" font-family="Georgia, serif" font-size="24" fill="#E8DCC8">${esc(input.line4)}</text>`
      : ""
  }
</svg>`);
  await sharp(overlay).png().toFile(input.destAbs);
}

async function composeSocialSquare(destAbs: string, productAbs: string) {
  const W = 1080;
  const H = 1080;
  const photo = await sharp(productAbs)
    .resize(W, H, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  const overlay = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="48" y="760" width="984" height="272" rx="18" fill="#1F3A2E" fill-opacity="0.88"/>
  <text x="84" y="830" font-family="Georgia, serif" font-size="28" fill="#E8DCC8">${esc(brief.customer.businessName)}</text>
  <text x="84" y="890" font-family="Georgia, serif" font-size="44" font-weight="700" fill="#F3EDE4">${esc(brief.offer.name)}</text>
  <text x="84" y="948" font-family="Georgia, serif" font-size="26" fill="#F3EDE4">${esc(brief.offer.windowDisplay)} · ${esc(brief.offer.admissionDisplay)}</text>
  <text x="84" y="998" font-family="Georgia, serif" font-size="24" fill="#C4844A">${esc(brief.cta.label)} · ${esc(brief.cta.eventUrl)}</text>
</svg>`);
  await sharp(photo)
    .composite([{ input: await sharp(overlay).png().toBuffer() }])
    .png()
    .toFile(destAbs);
}

async function composeSocialVertical(
  destAbs: string,
  productAbs: string,
  studioAbs: string,
) {
  const W = 1080;
  const H = 1920;
  const top = await sharp(productAbs)
    .resize(W, 1100, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  const bottom = await sharp(studioAbs)
    .resize(W, 820, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  const base = await sharp({
    create: { width: W, height: H, channels: 3, background: "#1F3A2E" },
  })
    .composite([
      { input: top, top: 0, left: 0 },
      { input: bottom, top: 1100, left: 0 },
    ])
    .png()
    .toBuffer();
  const overlay = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="56" y="1480" width="968" height="360" rx="18" fill="#1F3A2E" fill-opacity="0.9"/>
  <text x="92" y="1560" font-family="Georgia, serif" font-size="26" fill="#E8DCC8">${esc(brief.customer.businessName)}</text>
  <text x="92" y="1630" font-family="Georgia, serif" font-size="46" font-weight="700" fill="#F3EDE4">${esc(brief.offer.name)}</text>
  <text x="92" y="1700" font-family="Georgia, serif" font-size="26" fill="#F3EDE4">${esc(brief.offer.windowDisplay)}</text>
  <text x="92" y="1756" font-family="Georgia, serif" font-size="24" fill="#F3EDE4">${esc(brief.customer.locationDisplay)}</text>
  <text x="92" y="1810" font-family="Georgia, serif" font-size="26" fill="#C4844A">${esc(brief.cta.label)} · ${esc(brief.cta.eventUrl)}</text>
</svg>`);
  await sharp(base)
    .composite([{ input: await sharp(overlay).png().toBuffer() }])
    .png()
    .toFile(destAbs);
}

async function composeInvitationHandout(destAbs: string, photos: {
  product1: string;
  product2: string;
  maker: string;
  studio: string;
}) {
  const W = 2550;
  const H = 3300;
  const hero = await sharp(photos.studio)
    .resize(W, 1500, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  const p1 = await sharp(photos.product1)
    .resize(1180, 900, { fit: "cover" })
    .png()
    .toBuffer();
  const maker = await sharp(photos.maker)
    .resize(1180, 900, { fit: "cover" })
    .png()
    .toBuffer();
  const base = await sharp({
    create: { width: W, height: H, channels: 3, background: "#F3EDE4" },
  })
    .composite([
      { input: hero, top: 0, left: 0 },
      { input: p1, top: 1580, left: 80 },
      { input: maker, top: 1580, left: 1290 },
    ])
    .png()
    .toBuffer();
  const overlay = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="1180" width="${W}" height="320" fill="#1F3A2E" fill-opacity="0.92"/>
  <text x="120" y="1280" font-family="Georgia, serif" font-size="42" fill="#E8DCC8">${esc(brief.customer.businessName)}</text>
  <text x="120" y="1360" font-family="Georgia, serif" font-size="72" font-weight="700" fill="#F3EDE4">${esc(brief.offer.name)}</text>
  <text x="120" y="1440" font-family="Georgia, serif" font-size="36" fill="#F3EDE4">${esc(brief.offer.windowDisplay)} · ${esc(brief.offer.admissionDisplay)}</text>
  <rect x="80" y="2560" width="2390" height="640" rx="24" fill="#FFFFFF" fill-opacity="0.92"/>
  <text x="140" y="2660" font-family="Georgia, serif" font-size="34" fill="#1F3A2E">${esc(brief.customer.locationDisplay)}</text>
  <text x="140" y="2730" font-family="Georgia, serif" font-size="30" fill="#1F3A2E">Saturday ${esc(brief.offer.hoursSaturdayDisplay)}</text>
  <text x="140" y="2790" font-family="Georgia, serif" font-size="30" fill="#1F3A2E">Sunday ${esc(brief.offer.hoursSundayDisplay)}</text>
  <text x="140" y="2870" font-family="Georgia, serif" font-size="28" fill="#1F3A2E">Visitors may view the studio, meet the maker, and shop available textile pieces in person.</text>
  <text x="140" y="2950" font-family="Georgia, serif" font-size="32" font-weight="700" fill="#8B4A2F">${esc(brief.cta.label)}</text>
  <text x="140" y="3015" font-family="Georgia, serif" font-size="28" fill="#1F3A2E">${esc(brief.cta.eventUrl)}</text>
  <text x="140" y="3085" font-family="Georgia, serif" font-size="26" fill="#1F3A2E">${esc(brief.cta.supportEmail)}</text>
</svg>`);
  // product2 intentionally unused on print — secondary social/video continuity only
  void photos.product2;
  await sharp(base)
    .composite([{ input: await sharp(overlay).png().toBuffer() }])
    .png()
    .toFile(destAbs);
}

async function writeContactSheet(input: {
  destAbs: string;
  socialAbs: string;
  verticalAbs: string;
  handoutAbs: string;
  plateAbs: readonly string[];
}) {
  const W = 4200;
  const H = 2200;
  const social = await sharp(input.socialAbs).resize(900, 900).png().toBuffer();
  const vertical = await sharp(input.verticalAbs)
    .resize(405, 720)
    .png()
    .toBuffer();
  const handout = await sharp(input.handoutAbs)
    .resize(510, 660)
    .png()
    .toBuffer();
  const plates = await Promise.all(
    input.plateAbs.map((p) => sharp(p).resize(280, 500).png().toBuffer()),
  );
  const composites: { input: Buffer; top: number; left: number }[] = [
    { input: social, top: 120, left: 80 },
    { input: vertical, top: 120, left: 1040 },
    { input: handout, top: 120, left: 1520 },
  ];
  plates.forEach((buf, i) => {
    composites.push({ input: buf, top: 120, left: 2140 + i * 300 });
  });
  const label = Buffer.from(`
<svg width="${W}" height="80" xmlns="http://www.w3.org/2000/svg">
  <text x="80" y="50" font-family="Georgia, serif" font-size="28" fill="#1F3A2E">Moss &amp; Thread — owner-review contact sheet (not a customer deliverable)</text>
</svg>`);
  await sharp({
    create: { width: W, height: H, channels: 3, background: "#F3EDE4" },
  })
    .composite([
      { input: await sharp(label).png().toBuffer(), top: 20, left: 0 },
      ...composites,
    ])
    .png()
    .toFile(input.destAbs);
}

async function writeFrameContactSheet(input: {
  destAbs: string;
  frames: readonly { absolutePath: string; label?: string }[];
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
  <text x="${pad}" y="40" font-family="Georgia, serif" font-size="22" fill="#1F3A2E">Moss &amp; Thread — rendered-frame motion-safety sheet</text>
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

async function main() {
  loadEnvLocal();
  const generatedAt = new Date().toISOString();
  const stamp = Date.now();

  const briefSha256 = hashScenario3Brief();
  if (briefSha256 !== SCENARIO_3_BRIEF_SHA256) {
    throw new Error(`BRIEF_HASH_MISMATCH:${briefSha256}`);
  }
  const onDiskBrief = readFileSync(
    path.join(repoRoot, EVIDENCE_REL, "campaign-brief.json"),
    "utf8",
  );
  if (hashScenario3Brief(onDiskBrief) !== SCENARIO_3_BRIEF_SHA256) {
    throw new Error("ON_DISK_BRIEF_HASH_MISMATCH");
  }

  const s1HashesStart = hashScenarioDeliverables(repoRoot, 1);
  const s2HashesStart = hashScenarioDeliverables(repoRoot, 2);

  assertScenario3ProductionRoutingAllowed();
  assertScenario3CustomerFactSourceGate();
  assertScenario3ProductionAuthorized();
  const photoPack = evaluateScenario3PhotoPackIngest();
  if (!photoPack.ok) throw new Error(`PHOTO_PACK_FAIL:${photoPack.findings.join(",")}`);
  const agreement = evaluateScenario3PhotoAuthorityAgreement();
  if (!agreement.ok) throw new Error(`PHOTO_AUTHORITY_FAIL:${agreement.findings.join(",")}`);
  const acceptance = evaluateScenario3Acceptance();
  if (!acceptance.productionMayStart) {
    throw new Error(`ACCEPTANCE_BLOCKED:${acceptance.findings.join(",")}`);
  }

  for (const entry of MOSS_THREAD_CERTIFICATION_PHOTO_PACK) {
    const abs = photoAbs(entry.filename);
    if (!existsSync(abs)) throw new Error(`PHOTO_MISSING:${entry.filename}`);
    if (sha256File(abs) !== entry.sha256) {
      throw new Error(`PHOTO_HASH_MISMATCH:${entry.filename}`);
    }
  }

  ensureDir(path.join(repoRoot, DELIVERABLES_REL));
  ensureDir(path.join(repoRoot, VIDEO_REL, "plates"));
  ensureDir(path.join(repoRoot, REVIEW_REL));

  const direction = buildScenario3CampaignDirection();
  const caption = buildScenario3Caption();
  const emailText = formatScenario3EmailPasteReady();
  const narration = buildScenario3NarrationScript();

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
    "emailDisplay",
    "locationDisplay",
    "hoursDisplay",
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
    { label: "narration", text: narration },
  ]);
  if (!claimGate.ok) {
    throw new Error(`CLAIM_GATE_FAIL:${claimGate.findings.join(",")}`);
  }
  assertScenario3ClaimAuthority("caption", caption);
  assertScenario3ClaimAuthority("email", emailText);
  assertScenario3ClaimAuthority("narration", narration);

  const captionEval = evaluateCopyQuality({
    brief: scenario3CopyQualityBrief(),
    submission: { kind: "plain_text", plainText: caption },
  });
  const emailBuilt = {
    subjectOptions: [`${brief.offer.name} — ${brief.offer.windowDisplay}`],
    previewText: `${brief.offer.admissionDisplay} · ${brief.customer.locationDisplay}`,
    body: emailText,
    cta: brief.cta.label,
  };
  const emailEval = evaluateCopyQuality({
    brief: scenario3EmailCopyQualityBrief(),
    submission: { kind: "email_set", emails: [emailBuilt] },
  });
  if (!captionEval.ok) {
    throw new Error(
      `COPY_QA_FAIL_CAPTION:${captionEval.findings.map((f) => f.id).join(",")}`,
    );
  }
  if (!emailEval.ok) {
    throw new Error(
      `COPY_QA_FAIL_EMAIL:${emailEval.findings.map((f) => f.id).join(",")}`,
    );
  }
  if (
    narration.includes("mossthread.example") ||
    narration.includes("@") ||
    /214 Loom/.test(narration)
  ) {
    throw new Error("NARRATION_MUST_NOT_SPEAK_CONTACT_OR_ADDRESS");
  }

  const product1 = photoAbs("moss-thread-product-textile-1.png");
  const product2 = photoAbs("moss-thread-product-textile-2.png");
  const maker = photoAbs("moss-thread-maker-at-work.png");
  const studio = photoAbs("moss-thread-studio-interior.png");

  const socialDest = path.join(repoRoot, DELIVERABLES_REL, "social-square.png");
  const verticalDest = path.join(
    repoRoot,
    DELIVERABLES_REL,
    "social-vertical.png",
  );
  const handoutPngDest = path.join(
    repoRoot,
    DELIVERABLES_REL,
    "invitation-handout.png",
  );
  const handoutPdfDest = path.join(
    repoRoot,
    DELIVERABLES_REL,
    "invitation-handout.pdf",
  );

  await composeSocialSquare(socialDest, product1);
  await composeSocialVertical(verticalDest, product1, studio);
  await composeInvitationHandout(handoutPngDest, {
    product1,
    product2,
    maker,
    studio,
  });

  const handoutHtmlRel = `${EVIDENCE_REL}/campaign-artifacts/invitation-handout.html`;
  const handoutHtmlAbs = path.join(repoRoot, handoutHtmlRel);
  ensureDir(path.dirname(handoutHtmlAbs));
  const handoutPngData = readFileSync(handoutPngDest).toString("base64");
  writeFileSync(
    handoutHtmlAbs,
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
html,body{margin:0;padding:0;width:2550px;height:3300px;overflow:hidden;}
.canvas{width:2550px;height:3300px;}
img{width:2550px;height:3300px;display:block;}
</style></head><body><div class="canvas"><img src="data:image/png;base64,${handoutPngData}" alt=""/></div></body></html>`,
    "utf8",
  );
  const capture = await captureFlyerExports({
    htmlAbsolutePath: handoutHtmlAbs,
    pngAbsolutePath: path.join(
      repoRoot,
      EVIDENCE_REL,
      "campaign-artifacts",
      "invitation-handout-capture.png",
    ),
    pdfAbsolutePath: handoutPdfDest,
    widthPx: CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER.widthPx,
    heightPx: CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER.heightPx,
    pdfPage: {
      width: CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER.pdfPage.width,
      height: CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER.pdfPage.height,
    },
  });
  if (!capture.overflowOk) {
    throw new Error(`PRINT_OVERFLOW:${capture.overflowDetail}`);
  }

  const plates = scenario3VideoPlateCopy();
  const photoByAsset: Record<string, string> = {
    "moss-thread-product-textile-1": product1,
    "moss-thread-product-textile-2": product2,
    "moss-thread-maker-at-work": maker,
    "moss-thread-studio-interior": studio,
  };
  const overlayAbsPaths: string[] = [];
  for (const plate of plates) {
    const bgRel = `${VIDEO_REL}/plates/bg-${plate.file}`;
    const overlayRel = `${VIDEO_REL}/plates/type-${plate.file}`;
    const src = photoByAsset[plate.photoAssetId];
    if (!src) throw new Error(`PLATE_PHOTO_MISSING:${plate.photoAssetId}`);
    await writeVideoBackground({
      destAbs: path.join(repoRoot, bgRel),
      photoAbs: src,
    });
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
    scriptVersionId: `moss-thread-s3-narration-${stamp}`,
    outputFormat: "mp3",
    repoRoot,
    internalTest: false,
    artifactRoot: `${VIDEO_REL}/voice`,
    voiceConfiguration,
    withTimestamps: true,
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
  const maxVolumeDb = probeMaxVolumeDb(voiceResult.artifact.absolutePath);
  const alignment =
    voiceResult.alignment ??
    synthesizeAlignmentFromDuration(SCENARIO_3_NARRATION_SENTENCES, duration);
  const spokenTimings = mapSentencesToAlignment(
    SCENARIO_3_NARRATION_SENTENCES,
    alignment,
  );
  const windows = buildSemanticBeatWindows({
    timings: spokenTimings,
    audioDurationSeconds: duration,
  });
  const timeline = windows[3]!.endSeconds;
  const scenes = plates.map((plate, idx) => ({
    sceneNumber: idx + 1,
    assetId: `moss-thread-beat-${idx + 1}`,
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
    workPacketId: `room-4c-s3-${stamp}`,
    workPacketVersion: "wp-s3-v1",
    storyboardVersion: "sb-s3-v1",
    scriptVersionId: `moss-thread-s3-narration-${stamp}`,
    campaignId: brief.campaignId,
    skuId: "v2-rtu-short-video",
    label:
      "Room 4C Scenario 3 Moss & Thread Studio — coordinated short-form video",
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
    exportRelativePath: `${VIDEO_REL}/moss-thread-open-weekend-${stamp}.mp4`,
    ctaCaptionSceneNumber: 4,
    primaryCtaText: brief.cta.label,
    requiredShotstackEnv: "v1",
    correctionReason:
      "Background photographs move; type stays stationary inside the 9:16 safe area. Four coordinated certification-fixture scenes.",
    sceneToScriptMap: plates.map((plate, index) => ({
      sceneNumber: index + 1,
      timeRange: `${windows[index]!.startSeconds.toFixed(3)}-${windows[index]!.endSeconds.toFixed(3)}`,
      narrationBeat:
        spokenTimings.find((t) => t.visualBeat === index + 1)?.sentence ??
        plate.line1,
      visual: plate.spokenSubject,
      designedText: [plate.line1, plate.line2, plate.line3]
        .filter(Boolean)
        .join(" · "),
      captionBehavior: "stationary_type_overlay",
    })),
    scenes,
  };
  const packetRel = `${VIDEO_REL}/work-packet-s3-${stamp}.json`;
  write(packetRel, `${JSON.stringify(packet, null, 2)}\n`);

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
      `${JSON.stringify(
        {
          blocked: true,
          stage: "shotstack",
          verdict: submitted.verdict,
          message: submitted.message,
          note: "Keys not printed.",
        },
        null,
        2,
      )}\n`,
    );
    throw new Error(`VIDEO_BLOCKED:${submitted.verdict}`);
  }

  const videoSrc = path.join(repoRoot, submitted.artifact.relativePath);
  const videoDest = path.join(repoRoot, DELIVERABLES_REL, "video.mp4");
  copyOver(videoSrc, videoDest);

  const socialMeta = await sharp(socialDest).metadata();
  const verticalMeta = await sharp(verticalDest).metadata();
  const handoutMeta = await sharp(handoutPngDest).metadata();
  const mediaBox = readPdfMediaBoxPoints(handoutPdfDest);
  if (
    socialMeta.width !== 1080 ||
    socialMeta.height !== 1080 ||
    verticalMeta.width !== 1080 ||
    verticalMeta.height !== 1920
  ) {
    throw new Error("SOCIAL_DIMENSIONS_FAIL");
  }
  if (
    handoutMeta.width !== 2550 ||
    handoutMeta.height !== 3300 ||
    !mediaBox ||
    !isUsLetterMediaBox(mediaBox) ||
    !pdfLooksValid(handoutPdfDest)
  ) {
    throw new Error(
      `PRINT_NOT_US_LETTER:png=${handoutMeta.width}x${handoutMeta.height} pdf=${JSON.stringify(mediaBox)}`,
    );
  }

  const videoDuration = probeDurationSeconds(videoDest);
  const timingTable = buildSemanticTimingTable({
    timings: spokenTimings,
    windows,
  });
  const s1HashesEnd = hashScenarioDeliverables(repoRoot, 1);
  const s2HashesEnd = hashScenarioDeliverables(repoRoot, 2);
  const s1Ok = JSON.stringify(s1HashesStart) === JSON.stringify(s1HashesEnd);
  const s2Ok = JSON.stringify(s2HashesStart) === JSON.stringify(s2HashesEnd);
  const flowProof = evaluateSemanticVideoFlow({
    timings: spokenTimings,
    windows,
    audioDurationSeconds: duration,
    videoDurationSeconds: videoDuration ?? 0,
    maxVolumeDb: maxVolumeDb ?? undefined,
    scenario1HashesUnchanged: s1Ok,
    scenario2HashesUnchanged: s2Ok,
  });
  if (!flowProof.ok) {
    throw new Error(`VIDEO_FLOW_PROOF_FAIL:${flowProof.findings.join(",")}`);
  }

  const framesDirAbs = path.join(repoRoot, REVIEW_REL, "motion-safety-frames");
  const motionSafety = await evaluateRenderedMotionSafety({
    videoAbs: videoDest,
    framesDirAbs,
    durationSeconds: videoDuration ?? timeline,
    beats: plates.map((plate, idx) => ({
      beat: idx + 1,
      startSeconds: windows[idx]!.startSeconds,
      endSeconds: windows[idx]!.endSeconds,
      overlayAbs: overlayAbsPaths[idx]!,
      expectedText: [plate.line1, plate.line2, plate.line3].filter(
        (line): line is string => Boolean(line),
      ),
      isCta: idx === 3,
    })),
  });
  write(
    `${REVIEW_REL}/MOTION-SAFETY.json`,
    `${JSON.stringify(motionSafety, null, 2)}\n`,
  );
  write(
    `${REVIEW_REL}/MOTION-SAFETY-REPORT.md`,
    `# Motion-safety report — Scenario 3

Result: **${motionSafety.ok ? "PASS" : "FAIL"}**

Machine rendered-frame inspection for stationary type inside the 9:16 phone-safe area. This does not replace Tagia watching the video.

Findings: ${motionSafety.findings.map((f) => f.id).join(", ") || "none"}

JSON companion: \`${REVIEW_REL}/MOTION-SAFETY.json\`
`,
  );
  if (!motionSafety.ok) {
    throw new Error(
      `MOTION_SAFETY_FAIL:${motionSafety.findings
        .filter((f) => !f.ok)
        .map((f) => f.id)
        .join(",")}`,
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

  const plateAbs = plates.map((p) =>
    path.join(repoRoot, VIDEO_REL, "plates", `bg-${p.file}`),
  );
  await writeContactSheet({
    destAbs: path.join(repoRoot, REVIEW_REL, "contact-sheet.png"),
    socialAbs: socialDest,
    verticalAbs: verticalDest,
    handoutAbs: handoutPngDest,
    plateAbs,
  });

  const routing = routeScenario3Services();
  const factSources = evaluateScenario3CustomerFactSourceGate();
  write(
    `${EVIDENCE_REL}/ACCEPTANCE-CHECK.json`,
    `${JSON.stringify(acceptance, null, 2)}\n`,
  );
  write(
    `${EVIDENCE_REL}/CUSTOMER-FACT-SOURCES.json`,
    `${JSON.stringify(factSources, null, 2)}\n`,
  );
  write(
    `${EVIDENCE_REL}/ASSET-PROVENANCE.json`,
    `${JSON.stringify(
      buildScenario3Provenance({
        briefSha256,
        generatedAt,
        photoFiles: MOSS_THREAD_CERTIFICATION_PHOTO_PACK.map((p) => ({
          assetId: p.assetId,
          filename: p.filename,
          sha256: p.sha256,
          rightsBasis: "STUDIO_GENERATED_CERTIFICATION_FIXTURE",
        })),
        toolIds: [
          "studio_campaign_creative",
          "studio_copy_quality_gate",
          "elevenlabs_tts_adapter",
          "shotstack",
          "studio_rendered_frame_motion_safety",
        ],
      }),
      null,
      2,
    )}\n`,
  );

  const deliveryFiles = [
    {
      id: "campaign-direction",
      previewRole: "campaign-direction" as const,
      relativePath: `${DELIVERABLES_REL}/campaign-direction.md`,
      contentSha256: sha256File(
        path.join(repoRoot, DELIVERABLES_REL, "campaign-direction.md"),
      ),
      byteLength: statSync(
        path.join(repoRoot, DELIVERABLES_REL, "campaign-direction.md"),
      ).size,
      mimeType: "text/markdown",
    },
    {
      id: "social-square",
      previewRole: "social-square" as const,
      relativePath: `${DELIVERABLES_REL}/social-square.png`,
      contentSha256: sha256File(socialDest),
      byteLength: statSync(socialDest).size,
      widthPx: 1080,
      heightPx: 1080,
      mimeType: "image/png",
    },
    {
      id: "social-vertical",
      previewRole: "social-vertical" as const,
      relativePath: `${DELIVERABLES_REL}/social-vertical.png`,
      contentSha256: sha256File(verticalDest),
      byteLength: statSync(verticalDest).size,
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
      durationSeconds: videoDuration ?? undefined,
      mimeType: "video/mp4",
    },
    {
      id: "caption",
      previewRole: "caption" as const,
      relativePath: `${DELIVERABLES_REL}/caption.txt`,
      contentSha256: sha256File(
        path.join(repoRoot, DELIVERABLES_REL, "caption.txt"),
      ),
      byteLength: statSync(path.join(repoRoot, DELIVERABLES_REL, "caption.txt"))
        .size,
      mimeType: "text/plain",
    },
    {
      id: "email",
      previewRole: "email" as const,
      relativePath: `${DELIVERABLES_REL}/email.txt`,
      contentSha256: sha256File(
        path.join(repoRoot, DELIVERABLES_REL, "email.txt"),
      ),
      byteLength: statSync(path.join(repoRoot, DELIVERABLES_REL, "email.txt"))
        .size,
      mimeType: "text/plain",
    },
    {
      id: "invitation-handout-png",
      previewRole: "invitation-handout-png" as const,
      relativePath: `${DELIVERABLES_REL}/invitation-handout.png`,
      contentSha256: sha256File(handoutPngDest),
      byteLength: statSync(handoutPngDest).size,
      widthPx: 2550,
      heightPx: 3300,
      mimeType: "image/png",
    },
    {
      id: "invitation-handout-pdf",
      previewRole: "invitation-handout-pdf" as const,
      relativePath: `${DELIVERABLES_REL}/invitation-handout.pdf`,
      contentSha256: sha256File(handoutPdfDest),
      byteLength: statSync(handoutPdfDest).size,
      mimeType: "application/pdf",
    },
  ];
  const deliveryManifest = buildScenario3DeliveryManifest({
    packageId: brief.packageId,
    scenarioId: brief.scenarioId,
    campaignId: brief.campaignId,
    briefSha256,
    generatedAt,
    files: deliveryFiles,
  });
  write(
    `${EVIDENCE_REL}/DELIVERY-MANIFEST.json`,
    `${JSON.stringify(deliveryManifest, null, 2)}\n`,
  );

  const productionRecord = {
    schemaVersion: 1,
    scenarioId: brief.scenarioId,
    campaignId: brief.campaignId,
    briefSha256,
    generatedAt,
    runId: randomUUID(),
    acceptance,
    routing,
    voice: {
      relativePath: voiceResult.artifact.relativePath,
      contentSha256: voiceResult.artifact.contentSha256,
      durationSeconds: duration,
      maxVolumeDb,
      withTimestamps: true,
    },
    video: {
      relativePath: `${DELIVERABLES_REL}/video.mp4`,
      contentSha256: sha256File(videoDest),
      durationSeconds: videoDuration,
      workPacket: packetRel,
      providerRenderId: submitted.job.providerRenderId,
    },
    print: {
      png: { width: 2550, height: 3300 },
      pdfMediaBoxPt: mediaBox,
    },
    scenario1HashesUnchanged: s1Ok,
    scenario2HashesUnchanged: s2Ok,
    classificationRecommended: "PASS WITH EXPLICIT LIMITS",
    ownerDecision: "OWNER DECISION PENDING",
  };
  write(
    `${EVIDENCE_REL}/PRODUCTION-RECORD.json`,
    `${JSON.stringify(productionRecord, null, 2)}\n`,
  );
  write(
    `${EVIDENCE_REL}/PRODUCTION-RECORD.md`,
    `# Production record — Scenario 3 Moss & Thread

**Brief SHA-256:** \`${briefSha256}\`  
**Generated:** ${generatedAt}  
**Recommended classification:** PASS WITH EXPLICIT LIMITS  
**Owner decision:** OWNER DECISION PENDING

## Tools
- studio_campaign_creative (photo compose)
- studio_copy_quality_gate
- elevenlabs_tts_adapter
- shotstack
- studio_rendered_frame_motion_safety

## Video
Duration ~${videoDuration?.toFixed(2) ?? "unknown"}s. Audio ~${duration.toFixed(2)}s. Peak ${maxVolumeDb ?? "unknown"} dB.

## Explicit limit
The external real-customer photo-supply and rights-verification path is not proven. Scenario 3 uses Studio-generated certification fixtures.
`,
  );
  write(
    `${EVIDENCE_REL}/SERVICE-ROUTING.md`,
    `# Service routing — Scenario 3

| Deliverable | Launch Now service | Tool |
|-------------|-------------------|------|
${routing.map((r) => `| ${r.deliverableId} | ${r.launchNowService} | ${r.toolId} |`).join("\n")}
`,
  );
  write(
    `${EVIDENCE_REL}/CROSS-SERVICE-FACT-CHECK.md`,
    `# Cross-service fact check — Scenario 3

All deliverables bind to brief \`${briefSha256}\`.

- Business: ${brief.customer.businessName}
- Event: ${brief.offer.name}
- Dates: ${brief.offer.windowDisplay}
- Location: ${brief.customer.locationDisplay}
- Hours: ${brief.offer.hoursDisplay}
- Admission: ${brief.offer.admissionDisplay}
- CTA / URL: ${brief.cta.label} / ${brief.cta.eventUrl}
- Email: ${brief.cta.supportEmail}
- Phone: not authorized

Scenario 1 hashes unchanged: ${s1Ok}  
Scenario 2 hashes unchanged: ${s2Ok}
`,
  );
  write(
    `${EVIDENCE_REL}/QA-FINDINGS.md`,
    `# QA findings — Scenario 3

- Fact source gate: PASS
- Photo pack / rights / authority agreement: PASS
- Claim authority: PASS
- Copy quality (caption/email): PASS
- Print US Letter PNG 2550×3300 / PDF 612×792: PASS
- Video duration band 20–30s: ${flowProof.ok ? "PASS" : "FAIL"}
- Motion-safety rendered frames: ${motionSafety.ok ? "PASS" : "FAIL"}
- Scenario 1/2 regression: ${s1Ok && s2Ok ? "PASS" : "FAIL"}
- Independent AI voice-naturalness: NOT CERTIFIED (Tagia must listen)
`,
  );
  write(
    `${EVIDENCE_REL}/OWNER-LABOR-RECORD.md`,
    `# Owner labor record — Scenario 3

No owner production labor. Owner creative review (listen / approve) remains required and is not production.

Authorization stamped 2026-08-21. Post-delivery decision: OWNER DECISION PENDING.
`,
  );
  write(
    `${EVIDENCE_REL}/MOBILE-RESPONSIVE-OBSERVATIONS.md`,
    `# Mobile-responsive observations — Scenario 3

Social square/vertical and short-form video are fixed pixel contracts (1080×1080, 1080×1920). Print is US Letter. These are not Room 4 mobile certification of The Studio web UI.

Phone-safe area for video type overlays was machine-checked via rendered-frame motion-safety.
`,
  );
  write(
    `${EVIDENCE_REL}/DEFECTS-AND-LIMITATIONS.md`,
    `# Defects and limitations — Scenario 3

## Required explicit limit
The external real-customer photo-supply and rights-verification path is not proven. Scenario 3 uses Studio-generated certification fixtures (\`STUDIO_GENERATED_CERTIFICATION_FIXTURE\`).

## Other limits
- Independent AI voice-naturalness judgment remains NOT CERTIFIED.
- No carousel, ad operations, email sending, or event management.
- Maker-at-work photograph is brand-story imagery; it does not authorize a live demonstration claim.
`,
  );
  write(
    `${EVIDENCE_REL}/CLASSIFICATION.md`,
    `# Classification — Scenario 3

**Scout recommendation:** PASS WITH EXPLICIT LIMITS  
**Owner decision:** OWNER DECISION PENDING

Retain: external real-customer photo path is NOT PROVEN.
`,
  );

  write(
    `${REVIEW_REL}/SYNCHRONIZATION-PROOF.json`,
    `${JSON.stringify(
      {
        generatedAt,
        narration,
        sentences: SCENARIO_3_NARRATION_SENTENCES,
        audioDurationSeconds: duration,
        videoDurationSeconds: videoDuration,
        audioMaxVolumeDb: maxVolumeDb,
        continuousGeneration: true,
        alignmentSource: voiceResult.alignment
          ? "elevenlabs_character_timestamps"
          : "synthesized_from_duration",
        timing: timingTable,
        windows,
        findings: flowProof.findings,
        ok: flowProof.ok,
      },
      null,
      2,
    )}\n`,
  );
  write(
    `${REVIEW_REL}/VIDEO-REVIEW.md`,
    `# Video review support — Scenario 3

Machine duration: **${videoDuration ?? "unknown"}s**. Audio: **${duration.toFixed(2)}s**. Peak: **${maxVolumeDb ?? "unknown"} dB**. This does **not** replace Tagia watching and listening.

## Semantic timing

| Sentence | Spoken start | Spoken end | Visual beat | On-screen | Transition |
|----------|--------------|------------|-------------|-----------|------------|
${timingTable
  .map(
    (row) =>
      `| ${row.narrationSentence} | ${row.spokenStartSeconds.toFixed(3)}s | ${row.spokenEndSeconds.toFixed(3)}s | ${row.visualBeat} | ${row.onScreenText} | ${row.transitionTimeSeconds.toFixed(3)}s |`,
  )
  .join("\n")}

## Narration

${narration}

Motion-safety: **${motionSafety.ok ? "PASS" : "FAIL"}**. Independent AI voice-naturalness remains NOT CERTIFIED.
`,
  );
  write(
    `${REVIEW_REL}/OWNER-REVIEW.md`,
    `# Owner review — Scenario 3 Moss & Thread

This is the **current** review set. Classification remains **OWNER DECISION PENDING**.

| # | Item | Path |
|---|------|------|
| 1 | Campaign direction | \`${DELIVERABLES_REL}/campaign-direction.md\` |
| 2 | Social square | \`${DELIVERABLES_REL}/social-square.png\` |
| 3 | Social vertical | \`${DELIVERABLES_REL}/social-vertical.png\` |
| 4 | Invitation handout PNG | \`${DELIVERABLES_REL}/invitation-handout.png\` |
| 5 | Invitation handout PDF | \`${DELIVERABLES_REL}/invitation-handout.pdf\` |
| 6 | Video MP4 | \`${DELIVERABLES_REL}/video.mp4\` |
| 7 | Caption | \`${DELIVERABLES_REL}/caption.txt\` |
| 8 | Email | \`${DELIVERABLES_REL}/email.txt\` |
| 9 | Contact sheet | \`${REVIEW_REL}/contact-sheet.png\` |
| 10 | Video contact sheet | \`${REVIEW_REL}/video-contact-sheet.png\` |
| 11 | VIDEO-REVIEW | \`${REVIEW_REL}/VIDEO-REVIEW.md\` |
| 12 | SYNCHRONIZATION-PROOF | \`${REVIEW_REL}/SYNCHRONIZATION-PROOF.json\` |
| 13 | MOTION-SAFETY-REPORT | \`${REVIEW_REL}/MOTION-SAFETY-REPORT.md\` |

Please listen to the video before final approval. Choppy or robotic narration is a no-charge Studio defect.
`,
  );

  const ledgerPath =
    "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/DEFECT-AND-LIMITATION-LEDGER.md";
  if (existsSync(path.join(repoRoot, ledgerPath))) {
    let ledger = readFileSync(path.join(repoRoot, ledgerPath), "utf8");
    ledger = ledger.replace(
      /\| 3 Moss & Thread \| PRE_PRODUCTION_BLOCKED \|[^\n]*/,
      `| 3 Moss & Thread | IN_PRODUCTION / OWNER DECISION PENDING | PASS WITH EXPLICIT LIMITS (Scout) | Production authorized 2026-08-21. External customer photo path NOT PROVEN. |`,
    );
    write(ledgerPath, ledger);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        briefSha256,
        social: `${DELIVERABLES_REL}/social-square.png`,
        vertical: `${DELIVERABLES_REL}/social-vertical.png`,
        video: `${DELIVERABLES_REL}/video.mp4`,
        handoutPng: `${DELIVERABLES_REL}/invitation-handout.png`,
        handoutPdf: `${DELIVERABLES_REL}/invitation-handout.pdf`,
        videoDuration,
        s1Ok,
        s2Ok,
        motionSafety: motionSafety.ok,
        classification: "PASS WITH EXPLICIT LIMITS",
        ownerDecision: "OWNER DECISION PENDING",
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
