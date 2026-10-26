/**
 * Builder-QA — Design Intelligence visual diversity.
 * Renders three fictional industry flyers, then Customer-One Studio correction.
 * Does not remint Maya. Does not merge. Does not push. Does not open Review.
 *
 * Usage: npx tsx scripts/design-intelligence-visual-diversity-qa.mts
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

import { DESIGN_INTELLIGENCE_VERSION } from "../src/config/studio-design-intelligence-v1";
import { MAYA_PROTECTED_CAMPAIGN_ID } from "../src/config/studio-production-team-workforce-v1";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth/session";
import { findUserById, toPublicUser } from "../src/lib/auth/users";
import { readCampaignEnvelope } from "../src/lib/campaign-store/store";
import { recoverPaidOperatingChain } from "../src/lib/studio-paid-activation-recovery/recover";
import {
  deriveCreativeBrief,
  paletteForBrief,
  selectCreativeDirection,
  signatureFromSpec,
} from "../src/lib/studio-design-intelligence";
import { reasonFlyerDesignSpecDeterministic } from "../src/lib/studio-design-renderer/reason";
import { runDesignRendererJobPipeline } from "../src/lib/studio-design-renderer/pipeline";
import { evaluateFlyerSpecCreativeQuality } from "../src/lib/studio-design-renderer/flyer-creative-quality";
import type { FlyerProjectTruth } from "../src/lib/studio-design-renderer/types";

const OWNER_CAMPAIGN_ID = "9c6c25f2-2562-4192-97a5-44536e45cd18";
const OWNER_USER_ID = "1ae91f0a-0d15-4a11-8db7-1de627f74ea7";
const MAYA_SHA =
  "3b19cfe722511f6358602b5635f0e65a7df4f2ab209a9cffdeba436da84983e3";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);
const BASE = process.env.STUDIO_PROOF_ORIGIN ?? "https://localhost:3000";

const INDUSTRIES = [
  {
    id: "intel-qa-trucking",
    businessName: "Iron Range Freight",
    purpose: "Regional trucking capacity",
    mustInclude:
      "Iron Range Freight\nDedicated lanes\nRegional freight and dedicated trucking lanes for manufacturers.\n(218) 555-0194\nironrangefreight.example\n$240",
    materials: "No logo. Professional and readable.",
  },
  {
    id: "intel-qa-bakery",
    businessName: "Hearth & Rye",
    purpose: "Weekend pastry menu",
    mustInclude:
      "Hearth & Rye\nSaturday pastry window\nNeighborhood bakery. Butter croissants and rye loaves.\n(612) 555-0177\nhearthandrye.example\n$12",
    materials: "Warm and welcoming. No photos.",
  },
  {
    id: "intel-qa-architecture",
    businessName: "North Line Architects",
    purpose: "Studio open house",
    mustInclude:
      "North Line Architects\nFall studio open house\nResidential architecture for families who want quiet, lasting houses.\n(651) 555-0118\nnorthlinearchitects.example",
    materials: "Elegant, premium, type-led. No logo.",
  },
] as const;

async function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    const raw = await readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
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
  } catch {
    /* optional */
  }
}

async function sha256File(file: string) {
  const buf = await readFile(file);
  return createHash("sha256").update(buf).digest("hex");
}

function truthFromIndustry(item: (typeof INDUSTRIES)[number]): FlyerProjectTruth {
  const brief = deriveCreativeBrief({
    businessName: item.businessName,
    flyerPurpose: item.purpose,
    mustInclude: item.mustInclude,
    materials: item.materials,
    intendedUse: "Both print and digital",
    sizeNotes: "",
    cta: "Call or visit",
    headline: item.purpose,
    offerName: item.mustInclude.split("\n")[1] ?? item.businessName,
    body: item.mustInclude
      .split("\n")
      .slice(2)
      .filter(
        (line) =>
          !/\(\d{3}\)/.test(line) &&
          !/\.example/.test(line) &&
          !/\$\d/.test(line),
      )
      .join(" ")
      .slice(0, 280),
    logoAvailable: false,
    suppliedImagery: false,
    requiredFacts: [item.businessName.split(/\s+/)[0]!],
  });
  const direction = selectCreativeDirection({ brief, recent: [] });
  const palette = paletteForBrief(brief);
  const price = item.mustInclude.match(/\$\s?\d+/)?.[0] ?? "";
  return {
    campaignId: item.id,
    jobId: `${item.id}:v2-rtu-flyer`,
    dispatchId: `dd:${item.id}:v2-rtu-flyer`,
    skuId: "v2-rtu-flyer",
    fixtureId: item.id,
    label: "Design Intelligence Builder-QA",
    outputMode: "customer",
    businessName: item.businessName,
    wordmark: item.businessName,
    descriptor: "",
    headline: item.purpose,
    offerName: item.mustInclude.split("\n")[1] ?? item.businessName,
    priceDisplay: price.replace(/\s+/g, ""),
    dateWindow: "",
    body: item.mustInclude
      .split("\n")
      .slice(2)
      .filter(
        (line) =>
          !/\(\d{3}\)/.test(line) &&
          !/\.example/.test(line) &&
          !/\$\d/.test(line),
      )
      .join(" ")
      .slice(0, 280),
    cta: "Call or visit",
    phone: item.mustInclude.match(/\(\d{3}\)\s?\d{3}-\d{4}/)?.[0] ?? "",
    webDisplay: item.mustInclude.match(/[a-z0-9.-]+\.example/)?.[0] ?? "",
    webUrl: "",
    disclaimer: "",
    intendedUse: "Both print and digital",
    brandColors: {
      primary: palette.primary,
      secondary: palette.secondary,
      background: palette.background,
      text: palette.text,
      muted: palette.muted,
    },
    approvedLogoVariantId: null,
    materials: [],
    requiredTextTokens: [item.businessName.split(/\s+/)[0]!],
    prohibitedClaimPatterns: ["guarantee"],
    creativeDirection: direction,
  };
}

async function main() {
  await loadEnvLocal();
  await mkdir(OUT, { recursive: true });
  const report: Record<string, unknown> = {
    ok: false,
    intelligenceVersion: DESIGN_INTELLIGENCE_VERSION,
    industries: [],
    customerOne: null,
    checks: {},
  };
  const checks = report.checks as Record<string, boolean>;
  const repoRoot = process.cwd();
  const mayaPath = path.join(repoRoot, "data", "campaigns", `${MAYA_PROTECTED_CAMPAIGN_ID}.json`);
  const mayaBefore = await sha256File(mayaPath);
  checks.mayaShaBefore = mayaBefore === MAYA_SHA;

  const signatures = [];
  for (const item of INDUSTRIES) {
    const truth = truthFromIndustry(item);
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    const fails = evaluateFlyerSpecCreativeQuality(spec, truth).filter(
      (finding) => finding.severity === "fail",
    );
    const pipeline = await runDesignRendererJobPipeline({
      repoRoot,
      truth,
      artifactRootRel: `data/design-intelligence-qa/${item.id}`,
      specOverride: spec,
      preferAnthropic: false,
    });
    const signature = signatureFromSpec(item.id, spec, truth.creativeDirection);
    signatures.push(signature);
    (report.industries as unknown[]).push({
      id: item.id,
      ok: pipeline.ok && fails.length === 0,
      pipelineOk: pipeline.ok,
      qaFails: fails.map((finding) => finding.id),
      palette: signature.paletteFamilyId,
      layout: signature.layoutFamilyId,
      geometry: signature.geometryId,
      type: signature.typeSystemId,
      primary: spec.colors.primary,
      png: pipeline.ok ? pipeline.identity.pngRelativePath : null,
      medallion: spec.layers.some((layer) => layer.id === "offer-medallion"),
    });
    checks[`${item.id}_rendered`] = pipeline.ok;
    checks[`${item.id}_qa`] = fails.length === 0;
    checks[`${item.id}_no_medallion`] = !spec.layers.some(
      (layer) => layer.id === "offer-medallion",
    );
    checks[`${item.id}_not_navy_gold`] =
      spec.colors.primary.toUpperCase() !== "#1F3A5F";
  }

  checks.distinctPalette = new Set(signatures.map((item) => item.paletteFamilyId)).size === 3;
  checks.distinctLayout = new Set(signatures.map((item) => item.layoutFamilyId)).size === 3;
  checks.distinctGeometry = new Set(signatures.map((item) => item.geometryId)).size === 3;
  checks.distinctType = new Set(signatures.map((item) => item.typeSystemId)).size === 3;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 560 } });
    const pngs = (report.industries as Array<{ png?: string | null }>)
      .map((item) => item.png)
      .filter((item): item is string => Boolean(item));
    const html = `<html><body style="margin:0;background:#111;display:flex;gap:12px;padding:12px">${pngs
      .map(
        (rel) =>
          `<img src="${pathToFileURL(path.join(repoRoot, rel)).href}" style="height:520px;width:auto;background:#fff" />`,
      )
      .join("")}</body></html>`;
    await page.setContent(html);
    await page.screenshot({
      path: path.join(OUT, "design-intelligence-three-industry.png"),
      fullPage: true,
    });
  } finally {
    await browser.close();
  }

  const envelope = await readCampaignEnvelope(OWNER_CAMPAIGN_ID);
  if (!envelope) throw new Error("Customer-One campaign missing");
  const revisionBefore = envelope.record.revisionRoundsUsed ?? 0;
  const lockedMust = String(
    envelope.record.routeMapIntake?.answers?.["v2-rtu-flyer:mustInclude"] ?? "",
  );
  const recovered = await recoverPaidOperatingChain(envelope.record, {
    identitySession: {
      sessionCurrentCampaignId: OWNER_CAMPAIGN_ID,
      sessionClientUserId: OWNER_USER_ID,
      intakeCampaignId: OWNER_CAMPAIGN_ID,
    },
  });
  const after = (await readCampaignEnvelope(OWNER_CAMPAIGN_ID))?.record ?? recovered.campaign;
  const observer = after.dispatchExecution?.designRendererObserver?.results?.find(
    (result) => result.skuId === "v2-rtu-flyer",
  );
  const loop = after.internalProductionLoop;
  report.customerOne = {
    recovered: recovered.recovered,
    observer,
    renderVersion: observer?.renderVersion ?? null,
    invocationOutcome: observer?.invocationOutcome ?? null,
    loopOrigin: loop?.origin ?? null,
    loopStatus: loop?.status ?? null,
    attemptCount: loop?.attempts.length ?? 0,
    revisionRoundsUsed: after.revisionRoundsUsed ?? 0,
    mustIncludeUnchanged:
      String(after.routeMapIntake?.answers?.["v2-rtu-flyer:mustInclude"] ?? "") ===
      lockedMust,
  };
  checks.customerOneRecovered = Boolean(observer?.ok);
  checks.customerOneNewVersion = (observer?.renderVersion ?? 0) > 4;
  checks.revisionUnconsumed = (after.revisionRoundsUsed ?? 0) === revisionBefore;
  checks.revisionStillZero = (after.revisionRoundsUsed ?? 0) === 0;
  const mayaAfter = await sha256File(mayaPath);
  checks.mayaUntouched = mayaAfter === MAYA_SHA;

  if (observer?.pngRelativePath) {
    const pngAbs = path.join(repoRoot, observer.pngRelativePath);
    const shotBrowser = await chromium.launch({ headless: true });
    try {
      const page = await shotBrowser.newPage({
        viewport: { width: 540, height: 820 },
      });
      await page.setContent(
        `<html><body style="margin:0;background:#111"><img src="${pathToFileURL(
          pngAbs,
        ).href}" style="width:520px" /></body></html>`,
      );
      await page.screenshot({
        path: path.join(OUT, "design-intelligence-customer-one-correction.png"),
      });
    } finally {
      await shotBrowser.close();
    }
  }

  if (process.env.SESSION_SECRET) {
    const userRecord = await findUserById(OWNER_USER_ID);
    if (userRecord) {
      const token = await createSessionToken(toPublicUser(userRecord));
      const boardBrowser = await chromium.launch({ headless: true });
      try {
        const context = await boardBrowser.newContext({
          ignoreHTTPSErrors: true,
          viewport: { width: 360, height: 780 },
        });
        await context.addCookies([
          {
            name: SESSION_COOKIE_NAME,
            value: token,
            url: BASE,
            httpOnly: true,
            sameSite: "Lax",
          },
        ]);
        const page = await context.newPage();
        await page.goto(`${BASE}/studio-board`, {
          waitUntil: "load",
          timeout: 60000,
        });
        await page.waitForTimeout(2500);
        await page.screenshot({
          path: path.join(OUT, "design-intelligence-customer-one-board.png"),
        });
      } finally {
        await boardBrowser.close();
      }
    }
  }

  const failed = Object.entries(checks).filter(([, value]) => !value);
  report.ok = failed.length === 0;
  report.failed = failed.map(([key]) => key);
  await writeFile(
    path.join(OUT, "design-intelligence-qa.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
