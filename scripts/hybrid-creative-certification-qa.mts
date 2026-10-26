/**
 * Controlled non-Owner hybrid certification.
 * Does not remint Customer-One. Does not merge. Does not push. Does not open Review.
 *
 * Usage: npx tsx scripts/hybrid-creative-certification-qa.mts
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { studioProjectAlphaHybridCreativeCertificationV1 } from "../src/config/studio-project-alpha-hybrid-creative-certification-v1";
import {
  deriveCreativeBrief,
  paletteForBrief,
  selectCreativeDirection,
} from "../src/lib/studio-design-intelligence";
import { runDesignRendererJobPipeline } from "../src/lib/studio-design-renderer/pipeline";
import type { FlyerProjectTruth } from "../src/lib/studio-design-renderer/types";
import {
  buildStudioJob,
  orchestrateStudioJob,
} from "../src/lib/studio-orchestration";
import { routeProductionMethod } from "../src/lib/studio-project-alpha/tool-chest";

const REPO = process.cwd();
process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH ||
  path.join(REPO, ".playwright-browsers");
const OWNER_CAMPAIGN_ID = "9c6c25f2-2562-4192-97a5-44536e45cd18";
const MAYA_CAMPAIGN_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const OUT = path.join(
  REPO,
  "docs/launch/studio-operating-project-alpha-hybrid-creative-certification-1/proofs",
);

const JOBS = [
  {
    id: "hybrid-fashion",
    businessName: "Atelier Noir",
    purpose: "Fall collection night",
    industry: "retail_fashion",
    mood: "editorial / fashion-forward",
    mustInclude:
      "Atelier Noir\nReady-to-wear preview\nAn editorial evening of new looks for the city.\n(212) 555-0144\nateliernoir.example\n$180",
    materials: "Fashion-forward. Choose for me. No logo.",
    cta: "Reserve a seat",
  },
  {
    id: "hybrid-beauty",
    businessName: "Maison Solace",
    purpose: "Member facial hour",
    industry: "beauty_wellness",
    mood: "refined / restrained / premium",
    mustInclude:
      "Maison Solace\nMember facial hour\nA quiet luxury facial for lasting skin.\n(415) 555-0190\nmaisonsolace.example\n$240",
    materials: "Spa wellness atmosphere. Choose for me. No logo.",
    cta: "Book the hour",
  },
] as const;

async function loadEnvLocal() {
  const raw = await readFile(path.join(REPO, ".env.local"), "utf8");
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
    if (!process.env[key]) process.env[key] = value;
  }
}

function truthFrom(job: (typeof JOBS)[number]): FlyerProjectTruth {
  const brief = deriveCreativeBrief({
    businessName: job.businessName,
    flyerPurpose: job.purpose,
    mustInclude: job.mustInclude,
    materials: job.materials,
    intendedUse: "Both print and digital",
    sizeNotes: "",
    cta: job.cta,
    headline: job.purpose,
    offerName: job.mustInclude.split("\n")[1] ?? job.businessName,
    body: job.mustInclude
      .split("\n")
      .slice(2)
      .filter((line) => !/\(\d{3}\)/.test(line) && !/\.example/.test(line) && !/\$\d/.test(line))
      .join(" ")
      .slice(0, 280),
    logoAvailable: false,
    suppliedImagery: false,
    requiredFacts: [job.businessName, job.cta],
  });
  const direction = selectCreativeDirection({ brief, recent: [] });
  const palette = paletteForBrief(brief);
  const price = job.mustInclude.match(/\$\s?\d+/)?.[0]?.replace(/\s+/g, "") ?? "";
  return {
    campaignId: job.id,
    jobId: `${job.id}:v2-rtu-flyer`,
    dispatchId: `dd:${job.id}:v2-rtu-flyer`,
    skuId: "v2-rtu-flyer",
    fixtureId: job.id,
    label: "Hybrid certification",
    outputMode: "customer",
    businessName: job.businessName,
    wordmark: job.businessName,
    descriptor: "",
    headline: job.purpose,
    offerName: job.mustInclude.split("\n")[1] ?? job.businessName,
    priceDisplay: price,
    dateWindow: "",
    body: job.mustInclude
      .split("\n")
      .slice(2)
      .filter((line) => !/\(\d{3}\)/.test(line) && !/\.example/.test(line) && !/\$\d/.test(line))
      .join(" ")
      .slice(0, 280),
    cta: job.cta,
    phone: job.mustInclude.match(/\(\d{3}\)\s?\d{3}-\d{4}/)?.[0] ?? "",
    webDisplay: job.mustInclude.match(/[a-z0-9.-]+\.example/)?.[0] ?? "",
    webUrl: "",
    disclaimer: "",
    intendedUse: "Both print and digital",
    brandColors: { ...palette },
    approvedLogoVariantId: null,
    materials: [],
    requiredTextTokens: [job.businessName.split(/\s+/)[0]!],
    prohibitedClaimPatterns: ["guarantee"],
    creativeDirection: direction,
  };
}

async function main() {
  process.env.PLAYWRIGHT_BROWSERS_PATH =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    path.join(REPO, ".playwright-browsers");
  await loadEnvLocal();
  if (
    [OWNER_CAMPAIGN_ID, MAYA_CAMPAIGN_ID].includes(
      process.env.HYBRID_FORCE_CUSTOMER_ONE ?? "",
    )
  ) {
    throw new Error("Customer-One is out of bounds for this script.");
  }
  const report: Record<string, unknown> = {
    packageId: studioProjectAlphaHybridCreativeCertificationV1.packageId,
    provider: "openai",
    imageModel: "gpt-image-1",
    visionModel: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
    openaiKeyPresent: Boolean(process.env.OPENAI_API_KEY?.trim()),
    customerOneUntouched: true,
    revisionUsed: 0,
    jobs: [] as unknown[],
  };

  const jobs = [];
  for (const job of JOBS) {
    const truth = truthFrom(job);
    const machine = orchestrateStudioJob(
      buildStudioJob({
        campaignId: job.id,
        customerId: "controlled-non-owner",
        sku: "v2-rtu-flyer",
        businessName: job.businessName,
        industry: job.industry,
        mood: job.mood,
        objective: job.purpose,
        chooseForMe: true,
        requiredFacts: [job.businessName, job.cta],
      }),
    );
    const method = routeProductionMethod(truth.creativeDirection!.brief);
    const artifactRootRel = `data/design-intelligence-qa/${job.id}`;
    let pipeline = await runDesignRendererJobPipeline({
      repoRoot: REPO,
      truth,
      artifactRootRel,
      preferAnthropic: false,
      hybridProduction: { enabled: true, attempt: 1 },
    });
    const attempts = [
      {
        attempt: 1,
        ok: pipeline.ok,
        message: pipeline.ok ? pipeline.qaSummary : pipeline.message,
      },
    ];
    if (!pipeline.ok) {
      pipeline = await runDesignRendererJobPipeline({
        repoRoot: REPO,
        truth,
        artifactRootRel,
        preferAnthropic: false,
        constraints: {
          capDominantGeometry: false,
          tightenComposition: true,
          preferOfferLedHierarchy: true,
          preferAlternateLayoutFamily: true,
        },
        hybridProduction: {
          enabled: true,
          attempt: 2,
          priorVisionCritique: "Change atmosphere and canvas use. No customer text in the image.",
        },
      });
      attempts.push({
        attempt: 2,
        ok: pipeline.ok,
        message: pipeline.ok ? pipeline.qaSummary : pipeline.message,
      });
    }
    const spec = pipeline.designSpec;
    const pngRel =
      pipeline.ok
        ? pipeline.identity.pngRelativePath
        : pipeline.identity?.pngRelativePath ?? null;
    jobs.push({
      id: job.id,
      machineRoute: machine.manager.route.route,
      machineAction: machine.manager.action,
      machineFailClosed: machine.failClosed,
      designMethod: method.method,
      pipelineOk: pipeline.ok,
      failure: pipeline.ok ? null : pipeline.message,
      generatedHero: Boolean(
        spec?.layers.some((layer) => layer.id === "generated-hero"),
      ),
      rendererOwnsName: spec?.layers.some(
        (layer) => layer.type === "text" && layer.content.includes(job.businessName),
      ),
      rendererOwnsCta: spec?.layers.some(
        (layer) => layer.type === "text" && layer.content === job.cta,
      ),
      png: pngRel,
      attempts,
    });
    if (pngRel) {
      await mkdir(OUT, { recursive: true });
      await copyFile(path.join(REPO, pngRel), path.join(OUT, `${job.id}.png`));
    }
  }

  const beauty = JOBS[1];
  const correctionTruth = truthFrom(beauty);
  const first = await runDesignRendererJobPipeline({
    repoRoot: REPO,
    truth: correctionTruth,
    artifactRootRel: "data/design-intelligence-qa/hybrid-correction",
    preferAnthropic: false,
    hybridProduction: {
      enabled: true,
      attempt: 1,
      forceInsufficientVisual: true,
    },
  });
  const second = await runDesignRendererJobPipeline({
    repoRoot: REPO,
    truth: correctionTruth,
    artifactRootRel: "data/design-intelligence-qa/hybrid-correction",
    preferAnthropic: false,
    hybridProduction: {
      enabled: true,
      attempt: 2,
      priorVisionCritique:
        "Studio correction: change camera angle, lighting, density, and visual language. Fill the frame. Avoid a flat field.",
    },
  });
  await mkdir(OUT, { recursive: true });
  const firstPng = first.ok
    ? first.identity.pngRelativePath
    : first.identity?.pngRelativePath;
  const secondPng = second.ok
    ? second.identity.pngRelativePath
    : second.identity?.pngRelativePath;
  if (firstPng) {
    await copyFile(path.join(REPO, firstPng), path.join(OUT, "hybrid-correction-a1.png"));
  }
  if (secondPng) {
    await copyFile(path.join(REPO, secondPng), path.join(OUT, "hybrid-correction-a2.png"));
  }

  report.jobs = jobs;
  report.correction = {
    firstRejected: first.ok === false,
    firstMessage: first.ok ? null : first.message,
    secondOk: second.ok,
    secondMessage: second.ok ? second.qaSummary : second.message,
    generatedVisualChanged:
      first.designSpec?.materials.find((m) => m.materialId === "hybrid-generated-visual")
        ?.contentSha256 !==
      second.designSpec?.materials.find((m) => m.materialId === "hybrid-generated-visual")
        ?.contentSha256,
    revisionUsed: 0,
  };
  report.controlledPassed =
    jobs.every((job) => job.pipelineOk && job.machineRoute === "image_plus_renderer" && job.generatedHero) &&
    Boolean((report.correction as { firstRejected: boolean; secondOk: boolean; generatedVisualChanged: boolean }).firstRejected) &&
    Boolean((report.correction as { secondOk: boolean }).secondOk);

  await mkdir(OUT, { recursive: true });
  await writeFile(
    path.join(OUT, "hybrid-certification-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));
  if (!report.controlledPassed) process.exit(1);
}

void main();
