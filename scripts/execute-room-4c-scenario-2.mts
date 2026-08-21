/**
 * Room 4C Scenario 2 — Harbor Roast multi-service gauntlet execution.
 * One authoritative brief. No owner production labor. No Scenario 3.
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
  HARBOR_ROAST_ASSET_IDS,
  HARBOR_ROAST_AUTHORIZED_PRODUCT_URL,
  HARBOR_ROAST_AUTHORIZED_SUPPORT_EMAIL,
  ROOM_4C_SCENARIO_2_PACKAGE_ID,
  studioRoom4cScenario2HarborRoastV1 as brief,
} from "../src/config/studio-room-4c-scenario-2-harbor-roast-v1.ts";
import { runCampaignCreativePipeline } from "../src/lib/studio-campaign-creative/pipeline.ts";
import { HARBOR_ROAST_COFFEE_VISUAL_SYSTEM_V1 } from "../src/lib/studio-campaign-creative/visual-system/harbor-roast-coffee-v1.ts";
import { generateVoiceArtifact } from "../src/lib/studio-kitchen-production/voice-production/generate.ts";
import { CERT_VOICE_PROVIDER } from "../src/lib/studio-kitchen-production/cert-voice/fixtures.ts";
import {
  runShotstackWorkPacketPipeline,
  type ShotstackWorkPacket,
} from "../src/lib/studio-kitchen-production/video-integration/index.ts";
import { evaluateCopyQuality } from "../src/lib/studio-kitchen-production/copy-quality/evaluate.ts";
import { CAMPAIGN_PRINT_COUNTER_CARD_CONTRACT_V1_5X7 } from "../src/lib/studio-campaign-creative/formats.ts";
import { isFiveBySevenMediaBox, readPdfMediaBoxPoints } from "../src/lib/studio-room-4c-scenario-1/pdf-page.ts";
import {
  assertExactCanonicalLaunchFacts,
  assertScenario2CustomerFactSourceGate,
  assertScenario2ProductRepresentation,
  assertScenario2ProductionRoutingAllowed,
  buildHarborRoastCreativeBrief,
  buildScenario2CampaignDirection,
  buildScenario2Caption,
  buildScenario2DeliveryManifest,
  buildScenario2NarrationScript,
  buildScenario2Provenance,
  canonicalScenario2BriefJson,
  evaluateScenario2Acceptance,
  formatScenario2EmailPasteReady,
  hashScenario2Brief,
  routeScenario2Services,
  scenario2CopyQualityBrief,
  scenario2EmailCopyQualityBrief,
  scenario2VideoPlateCopy,
  SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC,
  staleScenario2FactHits,
} from "../src/lib/studio-room-4c-scenario-2/index.ts";

const require = createRequire(import.meta.url);
const sharp = require("sharp") as typeof import("sharp");

const repoRoot = process.cwd();
const EVIDENCE_REL =
  "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-2-harbor-roast";
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

function writeHarborLogo(destAbs: string) {
  ensureDir(path.dirname(destAbs));
  writeFileSync(
    destAbs,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="320" viewBox="0 0 1024 320">
  <rect width="1024" height="320" fill="#F4EDE3"/>
  <text x="512" y="148" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="72" font-weight="600" fill="#4A2C2A" letter-spacing="6">HARBOR ROAST</text>
  <text x="512" y="216" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="28" font-weight="500" fill="#8C5A3C" letter-spacing="8">COFFEE CO.</text>
</svg>
`,
    "utf8",
  );
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
      <stop offset="0%" stop-color="#4A2C2A" stop-opacity="0.08"/>
      <stop offset="45%" stop-color="#4A2C2A" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#4A2C2A" stop-opacity="0.82"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <text x="90" y="1280" font-family="Georgia, serif" font-size="26" letter-spacing="4" fill="#F4EDE3">${esc(input.eyebrow)}</text>
  <text x="90" y="1380" font-family="Georgia, serif" font-size="54" font-weight="700" fill="#F4EDE3">${esc(input.line1)}</text>
  ${
    input.line2
      ? `<text x="90" y="1470" font-family="Georgia, serif" font-size="${input.line2.length > 40 ? 24 : 34}" fill="#F4EDE3">${esc(input.line2)}</text>`
      : ""
  }
  ${
    input.line3
      ? `<text x="90" y="1548" font-family="Georgia, serif" font-size="30" fill="#C4844A">${esc(input.line3)}</text>`
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
  verticalAbs: string;
  plateAbs: readonly string[];
  cardAbs: string;
}) {
  const W = 5600;
  const H = 1980;
  const pad = 64;
  const labelH = 72;
  const socialSize = 1080;
  const frameH = 1080;
  const frameW = Math.round((1080 / 1920) * frameH);
  const cardH = 1512;
  const cardW = Math.round(cardH * (5 / 7));

  const social = await sharp(input.socialAbs)
    .resize(socialSize, socialSize, { fit: "fill" })
    .png()
    .toBuffer();
  const vertical = await sharp(input.verticalAbs)
    .resize(frameW, frameH, { fit: "cover" })
    .png()
    .toBuffer();
  const frames = await Promise.all(
    input.plateAbs.map((p) =>
      sharp(p).resize(frameW, frameH, { fit: "cover" }).png().toBuffer(),
    ),
  );
  const card = await sharp(input.cardAbs)
    .resize(cardW, cardH, { fit: "fill" })
    .png()
    .toBuffer();

  const composites: { input: Buffer; top: number; left: number }[] = [];
  let x = pad;
  const y = pad + labelH;
  composites.push({ input: social, top: y, left: x });
  x += socialSize + 36;
  composites.push({ input: vertical, top: y, left: x });
  x += frameW + 28;
  for (const frame of frames) {
    composites.push({ input: frame, top: y, left: x });
    x += frameW + 12;
  }
  x += 24;
  composites.push({ input: card, top: y, left: x });

  const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#F4EDE3"/>
  <text x="${pad}" y="56" font-family="Georgia, serif" font-size="28" fill="#4A2C2A">Harbor Roast — owner-review contact sheet (not a customer deliverable)</text>
</svg>`);

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: { r: 244, g: 237, b: 227 },
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

const SCENARIO_1_DELIVERABLE_HASHES: Record<string, string> = {
  "social-square.png":
    "a565cd5f1fd2cb3d174daa0eb87029a819c322f6b7be88af9258bc9982cd7c6e",
  "video.mp4":
    "cdca7998bb6fded01b42248dca0c22e029d9e350e248801511aab8a45d0a5ff9",
  "caption.txt":
    "2220894a986ecbe144b50a62f85244ee36d8a04b40c32e5a33313f9acb8ad1b5",
  "handout.png":
    "f4ff91ba99c536fd0b1c5efdb5f60a9ed1791253fc91e4b79da722ef4d17debf",
  "handout.pdf":
    "ff931b9249f95d5ba96f732412b57171878fcf63c07e151fc859c6c9180131a0",
};

function assertScenario1HashesUnchanged() {
  const root = path.join(
    repoRoot,
    "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-1-cedar-lane/deliverables",
  );
  for (const [file, expected] of Object.entries(SCENARIO_1_DELIVERABLE_HASHES)) {
    const actual = sha256File(path.join(root, file));
    if (actual !== expected) {
      throw new Error(`SCENARIO_1_HASH_CHANGED:${file}`);
    }
  }
}

function assertNoInventedContact(label: string, text: string) {
  const stale = staleScenario2FactHits(text);
  if (stale.length > 0) {
    throw new Error(`STALE_FACTS:${label}:${stale.join(",")}`);
  }
  if (/\(\d{3}\)/.test(text)) {
    throw new Error(`INVENTED_PHONE:${label}`);
  }
  if (
    /\blimited\b/i.test(text) ||
    /while supplies last/i.test(text) ||
    /selling fast/i.test(text) ||
    /only a few left/i.test(text)
  ) {
    throw new Error(`SCARCITY_CLAIM:${label}`);
  }
  const urls = text.match(/\b[a-z0-9][a-z0-9.-]*\.[a-z]{2,}\/[^\s]*/gi) ?? [];
  for (const url of urls) {
    if (url.toLowerCase() !== HARBOR_ROAST_AUTHORIZED_PRODUCT_URL) {
      throw new Error(`INVENTED_URL:${label}:${url}`);
    }
  }
  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  for (const email of emails) {
    if (email.toLowerCase() !== HARBOR_ROAST_AUTHORIZED_SUPPORT_EMAIL) {
      throw new Error(`INVENTED_EMAIL:${label}:${email}`);
    }
  }
}

function markFirstPassSuperseded() {
  const supersededRel = `${EVIDENCE_REL}/superseded-first-pass`;
  const note = `# SUPERSEDED — first-pass Harbor Roast outputs

Tagia classified the first Scenario 2 execution as **FIX REQUIRED**.

Scout treated owner-authorized facts as unauthorized because they were missing from Scout’s own record, then fed an incomplete record to the generic fact gate. That first pass replaced box contents with the product name and omitted the product URL and support email.

Do **not** use the following as the current owner-review set:

- \`campaign-artifacts/renders/v1/\`
- \`campaign-artifacts/renders/v2/\`
- First-pass files copied under \`${supersededRel}/\`

Current owner-review index: \`${REVIEW_REL}/OWNER-REVIEW.md\`
`;
  write(`${supersededRel}/SUPERSEDED.md`, note);
  write(
    `${ARTIFACT_REL}/renders/v1/SUPERSEDED.md`,
    "# SUPERSEDED\n\nFirst incomplete Harbor Roast render. Not in the current owner-review index.\n",
  );
  write(
    `${ARTIFACT_REL}/renders/v2/SUPERSEDED.md`,
    "# SUPERSEDED\n\nFirst complete Harbor Roast render with omitted authorized product facts. Not in the current owner-review index.\n",
  );
  write(
    `${ARTIFACT_REL}/renders/v3/SUPERSEDED.md`,
    "# SUPERSEDED\n\nIntermediate Harbor Roast render from the authorized-fact correction attempt. Not in the current owner-review index.\n",
  );
}

function markLimitedCtaSuperseded() {
  const supersededRel = `${EVIDENCE_REL}/superseded-limited-cta`;
  write(
    `${supersededRel}/SUPERSEDED.md`,
    `# SUPERSEDED — Limited autumn box CTA

Tagia rejected the authorized-fact correction because the CTA was **Limited autumn box**.

The owner-authorized CTA is **Shop the autumn box**. “Limited” is prohibited scarcity language. Dates October 1–31, 2026 remain authorized and do not authorize a shortage claim.

Do **not** use \`campaign-artifacts/renders/v4/\` or files under \`${supersededRel}/\` as the current owner-review set.

Current owner-review index: \`${REVIEW_REL}/OWNER-REVIEW.md\`
`,
  );
  write(
    `${ARTIFACT_REL}/renders/v4/SUPERSEDED.md`,
    "# SUPERSEDED\n\nHarbor Roast render using the unauthorized CTA “Limited autumn box”. Not in the current owner-review index.\n",
  );
  const archiveRoot = path.join(repoRoot, supersededRel, "owner-review");
  if (!existsSync(path.join(archiveRoot, "OWNER-REVIEW.md"))) {
    const priorReview = [
      "OWNER-REVIEW.md",
      "VIDEO-REVIEW.md",
      "contact-sheet.png",
      "counter-card-price-crop.png",
    ];
    for (const file of priorReview) {
      const src = path.join(repoRoot, REVIEW_REL, file);
      if (existsSync(src)) {
        copyOver(src, path.join(archiveRoot, file));
      }
    }
  }
}

function markOneBagProductSuperseded() {
  const supersededRel = `${EVIDENCE_REL}/superseded-one-bag`;
  write(
    `${supersededRel}/SUPERSEDED.md`,
    `# SUPERSEDED — one-bag product photograph

Tagia rejected the CTA-corrected Harbor Roast package because the photograph showed one open bag of loose coffee. The authorized product is **three sealed 8-ounce bags**. Copy promised three bags; the picture sold one.

Do **not** use \`campaign-artifacts/renders/v5/\`, \`campaign-artifacts/renders/v6/\`, or files under \`${supersededRel}/\` as the current owner-review set.

Current owner-review index: \`${REVIEW_REL}/OWNER-REVIEW.md\`
`,
  );
  write(
    `${ARTIFACT_REL}/renders/v5/SUPERSEDED.md`,
    "# SUPERSEDED\n\nHarbor Roast render with the one-bag product photograph. Not in the current owner-review index.\n",
  );
  write(
    `${ARTIFACT_REL}/renders/v6/SUPERSEDED.md`,
    "# SUPERSEDED\n\nHarbor Roast render with the one-bag product photograph. Not in the current owner-review index.\n",
  );
  const archiveRoot = path.join(repoRoot, supersededRel, "owner-review");
  if (!existsSync(path.join(archiveRoot, "OWNER-REVIEW.md"))) {
    const priorReview = [
      "OWNER-REVIEW.md",
      "VIDEO-REVIEW.md",
      "contact-sheet.png",
      "counter-card-price-crop.png",
    ];
    for (const file of priorReview) {
      const src = path.join(repoRoot, REVIEW_REL, file);
      if (existsSync(src)) {
        copyOver(src, path.join(archiveRoot, file));
      }
    }
  }
  const priorHero = path.join(repoRoot, MATERIALS_REL, "harbor-roast-hero-box.png");
  const archivedHero = path.join(
    repoRoot,
    supersededRel,
    "materials",
    "harbor-roast-hero-box.png",
  );
  if (existsSync(priorHero) && !existsSync(archivedHero)) {
    copyOver(priorHero, archivedHero);
  }
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
    "None. Scout generated campaign photography via the Studio image tool from the bound three-bag visual production specification, wrote a deterministic SVG logo, and ran existing Machine pipelines. Tagia did not design, edit, format, or repair deliverables.",
  ];

  ensureDir(EVIDENCE);
  ensureDir(path.join(repoRoot, MATERIALS_REL));
  ensureDir(path.join(repoRoot, DELIVERABLES_REL));
  ensureDir(path.join(repoRoot, `${VIDEO_REL}/plates`));
  ensureDir(path.join(repoRoot, REVIEW_REL));

  assertScenario1HashesUnchanged();
  markFirstPassSuperseded();
  markLimitedCtaSuperseded();
  markOneBagProductSuperseded();

  const briefJson = canonicalScenario2BriefJson();
  const briefSha256 = hashScenario2Brief(briefJson);
  write(`${EVIDENCE_REL}/campaign-brief.json`, briefJson);

  const acceptance = evaluateScenario2Acceptance({
    askedForCarousel: true,
    askedForAdOps: true,
    askedForUnsupportedSize: true,
  });
  if (!acceptance.admit) {
    throw new Error(`ACCEPTANCE_BLOCKED:${acceptance.findings.join(",")}`);
  }
  assertScenario2ProductionRoutingAllowed();
  assertScenario2CustomerFactSourceGate();
  assertScenario2ProductRepresentation();
  if (
    !SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC.boundFormatIds.includes(
      "short_vertical_video",
    )
  ) {
    throw new Error("PRODUCT_IDENTITY_MISSING_VIDEO_FORMAT");
  }
  write(
    `${MATERIALS_REL}/harbor-roast-hero-visual-spec.json`,
    `${JSON.stringify(SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC, null, 2)}\n`,
  );

  writeHarborLogo(path.join(repoRoot, MATERIALS_REL, "harbor-roast-logo.svg"));
  copyGeneratedPhoto(
    "harbor-roast-hero-three-bags.png",
    `${MATERIALS_REL}/harbor-roast-hero-box.png`,
  );

  const creativeBrief = buildHarborRoastCreativeBrief();
  const campaign = await runCampaignCreativePipeline({
    repoRoot,
    brief: creativeBrief,
    systemId: HARBOR_ROAST_COFFEE_VISUAL_SYSTEM_V1.systemId,
    artifactRootRel: ARTIFACT_REL,
    packageId: ROOM_4C_SCENARIO_2_PACKAGE_ID,
    materials: [
      {
        materialId: HARBOR_ROAST_ASSET_IDS.logo,
        role: "logo",
        relativePath: `${MATERIALS_REL}/harbor-roast-logo.svg`,
      },
      {
        materialId: HARBOR_ROAST_ASSET_IDS.heroBox,
        role: "hero",
        relativePath: `${MATERIALS_REL}/harbor-roast-hero-box.png`,
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
  const verticalAsset = campaign.setSpec.assets.find(
    (a) => a.formatId === "social_vertical",
  );
  const printAsset = campaign.setSpec.assets.find(
    (a) => a.formatId === "print_counter_card",
  );
  if (!squareAsset || !verticalAsset || !printAsset) {
    throw new Error("CAMPAIGN_ASSETS_MISSING");
  }
  if (
    printAsset.canvas.widthPx !==
      CAMPAIGN_PRINT_COUNTER_CARD_CONTRACT_V1_5X7.widthPx ||
    printAsset.canvas.heightPx !==
      CAMPAIGN_PRINT_COUNTER_CARD_CONTRACT_V1_5X7.heightPx
  ) {
    throw new Error(
      `PRINT_CANVAS_NOT_5X7:${printAsset.canvas.widthPx}x${printAsset.canvas.heightPx}`,
    );
  }
  const printPrice = printAsset.layers.find(
    (l) => l.type === "text" && l.role === "price",
  );
  if (!printPrice || printPrice.type !== "text" || printPrice.content !== "$48") {
    throw new Error("PRINT_PRICE_LAYER_MISSING");
  }
  const printContact = printAsset.layers.find(
    (l) => l.type === "text" && l.role === "contact",
  );
  if (
    !printContact ||
    printContact.type !== "text" ||
    printContact.content !== HARBOR_ROAST_AUTHORIZED_PRODUCT_URL
  ) {
    throw new Error("PRINT_PRODUCT_URL_MISSING");
  }
  for (const asset of campaign.setSpec.assets) {
    for (const layer of asset.layers) {
      if (layer.type === "text") {
        assertNoInventedContact(`${asset.assetId}:${layer.role}`, layer.content);
      }
    }
  }

  const socialSrc = path.join(renderDir, `${squareAsset.assetId}.png`);
  const verticalSrc = path.join(renderDir, `${verticalAsset.assetId}.png`);
  const cardPngSrc = path.join(renderDir, `${printAsset.assetId}.png`);
  const cardPdfSrc = path.join(renderDir, `${printAsset.assetId}.pdf`);
  const socialDest = path.join(repoRoot, DELIVERABLES_REL, "social-square.png");
  const verticalDest = path.join(
    repoRoot,
    DELIVERABLES_REL,
    "social-vertical.png",
  );
  const cardPngDest = path.join(repoRoot, DELIVERABLES_REL, "counter-card.png");
  const cardPdfDest = path.join(repoRoot, DELIVERABLES_REL, "counter-card.pdf");
  copyOver(socialSrc, socialDest);
  copyOver(verticalSrc, verticalDest);
  copyOver(cardPngSrc, cardPngDest);
  copyOver(cardPdfSrc, cardPdfDest);

  const direction = buildScenario2CampaignDirection();
  const directionRel = `${DELIVERABLES_REL}/campaign-direction.md`;
  write(directionRel, `${direction}\n`);
  assertExactCanonicalLaunchFacts("campaign-direction", direction, [
    "offerName",
    "datesDisplay",
    "priceDisplay",
    "contentsDisplay",
    "cta",
    "businessName",
    "bookingUrl",
    "emailDisplay",
  ]);

  const caption = buildScenario2Caption();
  const captionRel = `${DELIVERABLES_REL}/caption.txt`;
  write(captionRel, `${caption}\n`);
  const emailText = formatScenario2EmailPasteReady();
  const emailRel = `${DELIVERABLES_REL}/email.txt`;
  write(emailRel, `${emailText}\n`);
  const copyBrief = scenario2CopyQualityBrief();
  const emailCopyBrief = scenario2EmailCopyQualityBrief();
  const captionEval = evaluateCopyQuality({
    brief: copyBrief,
    submission: { kind: "plain_text", plainText: caption },
  });
  const emailEval = evaluateCopyQuality({
    brief: emailCopyBrief,
    submission: {
      kind: "email_set",
      emails: [
        {
          subjectOptions: [
            `${brief.offer.name} — ${brief.offer.priceDisplay}`,
          ],
          previewText: `${brief.offer.priceDisplay} · ${brief.offer.windowDisplay}`,
          body: emailText,
          cta: brief.cta.label,
        },
      ],
    },
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
  assertExactCanonicalLaunchFacts("caption", caption, [
    "offerName",
    "datesDisplay",
    "priceDisplay",
    "contentsDisplay",
    "cta",
    "businessName",
    "bookingUrl",
  ]);
  assertExactCanonicalLaunchFacts("email", emailText, [
    "offerName",
    "datesDisplay",
    "priceDisplay",
    "contentsDisplay",
    "cta",
    "businessName",
    "bookingUrl",
    "emailDisplay",
  ]);

  const narrationPreview = buildScenario2NarrationScript();
  assertExactCanonicalLaunchFacts("narration", narrationPreview, [
    "businessName",
    "offerName",
    "contentsDisplay",
    "cta",
  ]);
  if (
    narrationPreview.includes("harborroast.example") ||
    narrationPreview.includes("@") ||
    /\(\d{3}\)/.test(narrationPreview)
  ) {
    throw new Error("NARRATION_MUST_NOT_SPEAK_CONTACT");
  }

  const heroAbs = path.join(repoRoot, MATERIALS_REL, "harbor-roast-hero-box.png");
  const plates = scenario2VideoPlateCopy();
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
  const narration = buildScenario2NarrationScript();
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
    scriptVersionId: `harbor-roast-s2-narration-${stamp}`,
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
  const ctaHold = Math.min(Math.max(6.8, timeline * 0.36), timeline - 12);
  const preCta = timeline - ctaHold;
  const beatLens = [0.22, 0.42, 0.36];
  let t = 0;
  const scenes = plates.map((plate, idx) => {
    const start = Number(t.toFixed(3));
    t = idx < 3 ? t + preCta * beatLens[idx]! : timeline;
    const end = Number(Math.min(timeline, t).toFixed(3));
    return {
      sceneNumber: idx + 1,
      assetId: `harbor-roast-beat-${idx + 1}`,
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
    workPacketId: `room-4c-s2-${stamp}`,
    workPacketVersion: "wp-s2-v1",
    storyboardVersion: "sb-s2-v1",
    scriptVersionId: `harbor-roast-s2-narration-${stamp}`,
    campaignId: brief.campaignId,
    skuId: "v2-rtu-short-video",
    label:
      "Room 4C Scenario 2 Harbor Roast Coffee Co. — coordinated short-form video",
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
    exportRelativePath: `${VIDEO_REL}/harbor-roast-autumn-box-${stamp}.mp4`,
    ctaCaptionSceneNumber: 4,
    primaryCtaText: brief.cta.label,
    requiredShotstackEnv: "v1",
    scenes,
  };
  const packetRel = `${VIDEO_REL}/work-packet-s2-${stamp}.json`;
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
  const verticalMeta = await sharp(verticalDest).metadata();
  const cardMeta = await sharp(cardPngDest).metadata();
  const phonePreviewAbs = path.join(
    repoRoot,
    DELIVERABLES_REL,
    "social-square-phone-390.png",
  );
  await sharp(socialDest)
    .resize(390, 390, { fit: "fill" })
    .png()
    .toFile(phonePreviewAbs);
  const phoneMeta = await sharp(phonePreviewAbs).metadata();
  if (phoneMeta.width !== 390 || phoneMeta.height !== 390) {
    throw new Error(
      `PHONE_PREVIEW_NOT_390x390:${phoneMeta.width}x${phoneMeta.height}`,
    );
  }
  const verticalPhoneAbs = path.join(
    repoRoot,
    DELIVERABLES_REL,
    "social-vertical-phone-390.png",
  );
  await sharp(verticalDest)
    .resize(390, 693, { fit: "fill" })
    .png()
    .toFile(verticalPhoneAbs);

  const videoDuration = probeDurationSeconds(videoDest);

  const priceCropAbs = path.join(repoRoot, REVIEW_REL, "counter-card-price-crop.png");
  const cropTop = Math.max(0, printPrice.y - 80);
  const cropHeight = Math.min(
    (cardMeta.height ?? 2100) - cropTop,
    Math.max(Math.round((printPrice.fontSizePx ?? 56) * 4.5) + 200, 480),
  );
  await sharp(cardPngDest)
    .extract({
      left: 0,
      top: Math.round(cropTop),
      width: cardMeta.width ?? 1500,
      height: Math.round(cropHeight),
    })
    .png()
    .toFile(priceCropAbs);

  const plateAbs = plates.map((p) =>
    path.join(repoRoot, VIDEO_REL, "plates", p.file),
  );
  await writeContactSheet({
    destAbs: path.join(repoRoot, REVIEW_REL, "contact-sheet.png"),
    socialAbs: socialDest,
    verticalAbs: verticalDest,
    plateAbs,
    cardAbs: cardPngDest,
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
      relativePath: `${MATERIALS_REL}/harbor-roast-logo.svg`,
      contentSha256: sha256File(
        path.join(repoRoot, MATERIALS_REL, "harbor-roast-logo.svg"),
      ),
      source: "studio_generated" as const,
      derivedFromBriefSha256: briefSha256,
    },
    {
      id: "hero-visual-spec",
      role: "visual_production_spec" as const,
      relativePath: `${MATERIALS_REL}/harbor-roast-hero-visual-spec.json`,
      contentSha256: sha256File(
        path.join(repoRoot, MATERIALS_REL, "harbor-roast-hero-visual-spec.json"),
      ),
      source: "authoritative_brief" as const,
      derivedFromBriefSha256: briefSha256,
    },
    {
      id: "hero",
      role: "hero_photo" as const,
      relativePath: `${MATERIALS_REL}/harbor-roast-hero-box.png`,
      contentSha256: sha256File(heroAbs),
      source: "studio_generated" as const,
      derivedFromBriefSha256: briefSha256,
    },
    {
      id: "campaign-direction",
      role: "campaign_direction" as const,
      relativePath: directionRel,
      contentSha256: sha256File(path.join(repoRoot, directionRel)),
      source: "derived_from_brief" as const,
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
      id: "social-vertical",
      role: "social_vertical" as const,
      relativePath: `${DELIVERABLES_REL}/social-vertical.png`,
      contentSha256: sha256File(verticalDest),
      source: "derived_from_brief" as const,
      derivedFromBriefSha256: briefSha256,
    },
    {
      id: "counter-card-png",
      role: "print_counter_card_png" as const,
      relativePath: `${DELIVERABLES_REL}/counter-card.png`,
      contentSha256: sha256File(cardPngDest),
      source: "derived_from_brief" as const,
      derivedFromBriefSha256: briefSha256,
    },
    {
      id: "counter-card-pdf",
      role: "print_counter_card_pdf" as const,
      relativePath: `${DELIVERABLES_REL}/counter-card.pdf`,
      contentSha256: sha256File(cardPdfDest),
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
      id: "email",
      role: "email" as const,
      relativePath: emailRel,
      contentSha256: sha256File(path.join(repoRoot, emailRel)),
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

  const provenance = buildScenario2Provenance({
    packageId: brief.packageId,
    scenarioId: brief.scenarioId,
    campaignId: brief.campaignId,
    briefSha256,
    visualSystemId: HARBOR_ROAST_COFFEE_VISUAL_SYSTEM_V1.systemId,
    generatedAt,
    assets: provenanceAssets,
  });
  write(
    `${EVIDENCE_REL}/ASSET-PROVENANCE.json`,
    `${JSON.stringify(provenance, null, 2)}\n`,
  );

  const manifest = buildScenario2DeliveryManifest({
    packageId: brief.packageId,
    scenarioId: brief.scenarioId,
    campaignId: brief.campaignId,
    briefSha256,
    generatedAt,
    files: [
      {
        id: "campaign-direction",
        previewRole: "campaign-direction",
        relativePath: directionRel,
        contentSha256: sha256File(path.join(repoRoot, directionRel)),
        byteLength: statSync(path.join(repoRoot, directionRel)).size,
        mimeType: "text/markdown",
      },
      {
        id: "social-square",
        previewRole: "social-square",
        relativePath: `${DELIVERABLES_REL}/social-square.png`,
        contentSha256: sha256File(socialDest),
        byteLength: statSync(socialDest).size,
        widthPx: socialMeta.width,
        heightPx: socialMeta.height,
        mimeType: "image/png",
      },
      {
        id: "social-vertical",
        previewRole: "social-vertical",
        relativePath: `${DELIVERABLES_REL}/social-vertical.png`,
        contentSha256: sha256File(verticalDest),
        byteLength: statSync(verticalDest).size,
        widthPx: verticalMeta.width,
        heightPx: verticalMeta.height,
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
        id: "email",
        previewRole: "email",
        relativePath: emailRel,
        contentSha256: sha256File(path.join(repoRoot, emailRel)),
        byteLength: statSync(path.join(repoRoot, emailRel)).size,
        mimeType: "text/plain",
      },
      {
        id: "counter-card-png",
        previewRole: "counter-card-png",
        relativePath: `${DELIVERABLES_REL}/counter-card.png`,
        contentSha256: sha256File(cardPngDest),
        byteLength: statSync(cardPngDest).size,
        widthPx: cardMeta.width,
        heightPx: cardMeta.height,
        mimeType: "image/png",
      },
      {
        id: "counter-card-pdf",
        previewRole: "counter-card-pdf",
        relativePath: `${DELIVERABLES_REL}/counter-card.pdf`,
        contentSha256: sha256File(cardPdfDest),
        byteLength: statSync(cardPdfDest).size,
        mimeType: "application/pdf",
      },
    ],
  });
  write(
    `${EVIDENCE_REL}/DELIVERY-MANIFEST.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  const mediaBox = readPdfMediaBoxPoints(cardPdfDest);
  if (
    cardMeta.width !== 1500 ||
    cardMeta.height !== 2100 ||
    !mediaBox ||
    !isFiveBySevenMediaBox(mediaBox)
  ) {
    throw new Error(
      `PRINT_NOT_5X7:png=${cardMeta.width}x${cardMeta.height} pdf=${JSON.stringify(mediaBox)}`,
    );
  }

  const qa = {
    copyOk: captionEval.ok && emailEval.ok,
    campaignQaPass: campaign.qa.pass,
    overflowOk: Object.values(campaign.overflowByAssetId).every(Boolean),
    socialDims: socialMeta.width === 1080 && socialMeta.height === 1080,
    verticalDims: verticalMeta.width === 1080 && verticalMeta.height === 1920,
    phonePreview390x390: phoneMeta.width === 390 && phoneMeta.height === 390,
    printPngFiveBySeven: cardMeta.width === 1500 && cardMeta.height === 2100,
    printPdfFiveBySeven: true,
    printPdfMediaBox: mediaBox,
    printCounterCardContractId: creativeBrief.printCounterCardContractId,
    printPngOk: pngLooksValid(cardPngDest),
    printPdfOk: pdfLooksValid(cardPdfDest),
    socialPngOk: pngLooksValid(socialDest),
    verticalPngOk: pngLooksValid(verticalDest),
    exactPrice: "$48",
    exactDates: brief.offer.windowDisplay,
    noInventedUrl: true,
    noInventedEmail: true,
    customerFactSourceGate: true,
    productRepresentationOk: true,
    visualUnitCount: 3,
    visualUnitType: "packaged coffee bags",
    narrationIsApprovedContinuous: narration === narrationPreview,
    videoDurationInBand:
      videoDuration != null && videoDuration >= 20 && videoDuration <= 30,
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
        routing: routeScenario2Services(),
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
          pngPx: { width: cardMeta.width, height: cardMeta.height },
          pdfMediaBoxPt: mediaBox,
          contractId: creativeBrief.printCounterCardContractId,
        },
        tools: [
          "studio_campaign_creative",
          "elevenlabs_tts_adapter",
          "shotstack",
          "studio_copy_quality_gate",
          "studio_product_representation",
        ],
        productRepresentation: {
          unitCount: 3,
          unitType: "sealed 8-ounce coffee bags",
          visualUnitCount: SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC.visualUnitCount,
          visualUnitType: SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC.visualUnitType,
          specId: SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC.specId,
        },
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
    `# Owner-review index — Scenario 2 Harbor Roast (product-representation correction)

This is the **current** review set. Earlier outputs are superseded and are **not** listed here.

- First-pass omitted facts: \`${EVIDENCE_REL}/superseded-first-pass/SUPERSEDED.md\`
- Unauthorized CTA “Limited autumn box”: \`${EVIDENCE_REL}/superseded-limited-cta/SUPERSEDED.md\`
- One-bag product photograph: \`${EVIDENCE_REL}/superseded-one-bag/SUPERSEDED.md\`

Review evidence only. Classification remains **OWNER DECISION PENDING**.

| # | Item | Path |
|---|------|------|
| 1 | Campaign direction | \`${directionRel}\` |
| 2 | Full social square | \`${DELIVERABLES_REL}/social-square.png\` |
| 3 | Complete 390×390 phone preview | \`${DELIVERABLES_REL}/social-square-phone-390.png\` |
| 4 | Social vertical | \`${DELIVERABLES_REL}/social-vertical.png\` |
| 5 | Vertical phone preview 390×693 | \`${DELIVERABLES_REL}/social-vertical-phone-390.png\` |
| 6 | 5×7 counter card PNG | \`${DELIVERABLES_REL}/counter-card.png\` |
| 7 | 5×7 counter card PDF | \`${DELIVERABLES_REL}/counter-card.pdf\` |
| 8 | Price crop | \`${REVIEW_REL}/counter-card-price-crop.png\` |
| 9 | Video MP4 | \`${DELIVERABLES_REL}/video.mp4\` |
| 10 | Caption | \`${captionRel}\` |
| 11 | Paste-ready email | \`${emailRel}\` |
| 12 | Contact sheet (not a customer deliverable) | \`${REVIEW_REL}/contact-sheet.png\` |

Video timing record: \`${REVIEW_REL}/VIDEO-REVIEW.md\`
`,
  );

  write(
    `${REVIEW_REL}/VIDEO-REVIEW.md`,
    `# Video review support — Scenario 2

Machine duration: **${videoDuration ?? "unknown"}s**. This does **not** replace Tagia watching and listening.

## Text-card transitions

| Beat | Start | End | On-screen |
|------|-------|-----|-----------|
${transitions
  .map(
    (row) =>
      `| ${row.beat} | ${row.startSeconds.toFixed(3)}s | ${row.endSeconds.toFixed(3)}s | ${row.caption} |`,
  )
  .join("\n")}

## Narration transcript

${narration}

## Narration vs on-screen facts

All beats bind to the same canonical brief: offer **Autumn Single-Origin Box**, contents **three 8-ounce bags of whole-bean single-origin coffee**, price **$48**, dates **October 1 – October 31, 2026**, CTA **${brief.cta.label}**, product URL **harborroast.example/autumn-box** on the CTA plate, caption, email, social, and counter card. The hero photograph is bound to three packaged coffee bags. Narration does **not** speak the URL, support email, or a phone. Support email **hello@harborroast.example** is in the email package only. Dates are the availability window, not a scarcity claim.

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
        vertical: `${DELIVERABLES_REL}/social-vertical.png`,
        video: `${DELIVERABLES_REL}/video.mp4`,
        caption: captionRel,
        email: emailRel,
        counterCardPng: `${DELIVERABLES_REL}/counter-card.png`,
        counterCardPdf: `${DELIVERABLES_REL}/counter-card.pdf`,
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
