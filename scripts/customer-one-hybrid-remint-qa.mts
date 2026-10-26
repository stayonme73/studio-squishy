/**
 * Builder-QA — Customer-One hybrid remint + production cost telemetry.
 *
 * Runs the real paid-operating recovery chain against the existing locked Intake.
 * The Machine chooses the production route; this script only observes and prices.
 *
 * Preserves V4, V7, V8-V10, V11, V12. Does not alter customer facts.
 * Does not open Review. Does not remint Maya. Does not merge. Does not push.
 *
 * Usage: npx tsx scripts/customer-one-hybrid-remint-qa.mts
 */
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

import {
  FLYER_SKU_ECONOMICS_V1,
  STUDIO_PRODUCTION_COST_TELEMETRY_PACKAGE_ID,
  STUDIO_PROVIDER_RATE_CARD_V1,
} from "../src/config/studio-production-cost-telemetry-v1";
import { MAYA_PROTECTED_CAMPAIGN_ID } from "../src/config/studio-production-team-workforce-v1";
import { isGenuineProtectedCorrectionUse } from "../src/lib/campaign-store/protected-campaign-guard";
import { readCampaignEnvelope } from "../src/lib/campaign-store/store";
import { invokeDesignRendererDispatchHook } from "../src/lib/studio-dispatch/design-renderer-hook";
import { recoverPaidOperatingChain } from "../src/lib/studio-paid-activation-recovery/recover";
import {
  collectProviderCost,
  evaluateSkuMargin,
  summarizeProviderCost,
} from "../src/lib/studio-project-alpha/cost-telemetry";
import { mapFlyerProjectTruthFromJob } from "../src/lib/studio-dispatch/map-flyer-job-truth";
import { readMaterialsEnvelope } from "../src/lib/materials/store";
import { routeProductionMethod } from "../src/lib/studio-project-alpha/tool-chest";
import type { FlyerDesignSpec } from "../src/lib/studio-design-renderer/types";

const CAMPAIGN_ID = "9c6c25f2-2562-4192-97a5-44536e45cd18";
const OWNER_USER_ID = "1ae91f0a-0d15-4a11-8db7-1de627f74ea7";
const DISPATCH_DIR = `dd_${CAMPAIGN_ID}_v2-rtu-flyer`;
const ARTIFACT_ROOT_REL = `data/campaign-design-artifacts/${CAMPAIGN_ID}/${DISPATCH_DIR}`;
const PRESERVE_VERSIONS = [4, 7, 8, 9, 10, 11, 12] as const;
/**
 * Maya's protected record is verified by *meaning*, not by a pinned digest.
 *
 * A hardcoded SHA went stale the moment any legitimate write touched her
 * `updatedAt`, and a stale pin fails for the wrong reason — it says "Maya
 * changed" when nothing about her protected truth moved, which trains everyone
 * to ignore the alarm. Worse, refreshing the constant to make the script run is
 * indistinguishable from refreshing it to hide real drift.
 *
 * So this asserts the protected truth itself — 1 included, 1 used, 0 remaining,
 * with her one genuine correction row present by pinned identity — and separately
 * proves her file did not change *during* this run by comparing the digest
 * observed before against the digest observed after. Both are real guards and
 * neither can be quietly weakened.
 */
const MAYA_EXPECTED_INCLUDED = 1;
const MAYA_EXPECTED_USED = 1;
const MAYA_EXPECTED_REMAINING = 0;

/**
 * The one grant this run is allowed to spend under.
 *
 * `authorizationId` is required and single-use repo-wide: the hook claims it with an
 * exclusive create before spending, so running this script twice does not buy two
 * artifacts. The id is read from the environment precisely so that a genuine second
 * measurement run has to be a deliberate act — supplying a new id — rather than a
 * re-run of the same command.
 */
const CERTIFICATION_FRESH_EXECUTION = {
  authorizationId:
    process.env.CUSTOMER_ONE_REMINT_AUTHORIZATION_ID ??
    "customer-one-hybrid-telemetry-1",
  authorizedBy: "owner:Tagia",
  reason:
    "PRE-REMINT BLOCKER REPAIR item 4 — production cost cannot be measured from a cache hit; force one genuine hybrid execution for fresh telemetry without altering customer facts.",
} as const;
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-project-alpha-hybrid-creative-certification-1/customer-one-hybrid-proofs",
);

async function loadEnvLocal() {
  try {
    const raw = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
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

async function sha256File(abs: string): Promise<string | null> {
  if (!existsSync(abs)) return null;
  return createHash("sha256").update(await readFile(abs)).digest("hex");
}

/**
 * Read Maya's protected revision truth from disk, including whether the one
 * genuine correction row is present by pinned identity and whether anything else
 * is sitting in her ledger.
 */
async function readMayaProtectedTruth(repoRoot: string) {
  const campaign = await readCampaignEnvelope(MAYA_PROTECTED_CAMPAIGN_ID);
  const tasksPath = path.join(
    repoRoot,
    "data",
    "campaign-tasks",
    `${MAYA_PROTECTED_CAMPAIGN_ID}.json`,
  );
  const tasks = existsSync(tasksPath)
    ? (JSON.parse(await readFile(tasksPath, "utf8")) as {
        jobCorrectionUses?: Array<{
          idempotencyKey?: string;
          submittedAt?: string;
          campaignId?: string;
        }>;
      })
    : { jobCorrectionUses: [] };
  const rows = tasks.jobCorrectionUses ?? [];
  const genuine = rows.filter((row) => isGenuineProtectedCorrectionUse(row));
  const included = campaign?.record.revisionRoundsIncluded ?? 0;
  const used = campaign?.record.revisionRoundsUsed ?? 0;
  return {
    included,
    used,
    remaining: Math.max(0, included - used),
    ledgerRows: rows.length,
    genuineRowPresent: genuine.length === 1,
    contaminatingRows: rows.length - genuine.length,
  };
}

/** Same staged-logo resolution the observer uses, so the hook sees the same inputs. */
function stagedLogoRelativePath(
  repoRoot: string,
  campaignId: string,
): string | undefined {
  for (const name of ["logo.png", "logo.jpg", "logo.jpeg", "logo.svg"]) {
    const candidate = `data/campaign-design-artifacts/${campaignId}/materials/${name}`;
    if (existsSync(path.join(repoRoot, candidate))) return candidate;
  }
  return undefined;
}

/** Highest render version already on disk, so "new" is measured, not assumed. */
function highestExistingRenderVersion(repoRoot: string): number {
  const rendersDir = path.join(repoRoot, ARTIFACT_ROOT_REL, "renders");
  if (!existsSync(rendersDir)) return 0;
  const versions = readdirSync(rendersDir)
    .map((name) => /^v(\d+)$/.exec(name))
    .map((match) => (match ? Number(match[1]) : null))
    .filter((value): value is number => value != null);
  return versions.length ? Math.max(...versions) : 0;
}

async function snapshotPreservedVersions(repoRoot: string) {
  const snapshot: Record<string, { png: string | null; pdf: string | null; spec: string | null }> = {};
  for (const version of PRESERVE_VERSIONS) {
    const dir = path.join(repoRoot, ARTIFACT_ROOT_REL, "renders", `v${version}`);
    snapshot[`v${version}`] = {
      png: await sha256File(path.join(dir, "flyer.png")),
      pdf: await sha256File(path.join(dir, "flyer.pdf")),
      spec: await sha256File(path.join(dir, "design-spec.json")),
    };
  }
  return snapshot;
}

/** Text the renderer must own — generated art may never carry these. */
function exactFactsFromTruth(truth: {
  businessName: string;
  priceDisplay?: string;
  phone?: string;
  webDisplay?: string;
  cta?: string;
}): Array<{ label: string; value: string }> {
  return (
    [
      { label: "businessName", value: truth.businessName },
      { label: "price", value: truth.priceDisplay ?? "" },
      { label: "phone", value: truth.phone ?? "" },
      { label: "web", value: truth.webDisplay ?? "" },
      { label: "cta", value: truth.cta ?? "" },
    ] as Array<{ label: string; value: string }>
  ).filter((fact) => fact.value.trim().length > 0);
}

function specTextIncludes(spec: FlyerDesignSpec, value: string): boolean {
  const haystack = spec.layers
    .filter((layer) => layer.type === "text")
    .map((layer) => layer.content)
    .join("\n")
    .toLowerCase()
    .replace(/\s+/g, " ");
  return haystack.includes(value.trim().toLowerCase().replace(/\s+/g, " "));
}

async function main() {
  await loadEnvLocal();
  await mkdir(OUT, { recursive: true });
  const repoRoot = process.cwd();

  const checks: Record<string, boolean> = {};
  const report: Record<string, unknown> = {
    packageId: "STUDIO-OPERATING-PROJECT-ALPHA-HYBRID-CREATIVE-CERTIFICATION-1",
    telemetryPackageId: STUDIO_PRODUCTION_COST_TELEMETRY_PACKAGE_ID,
    campaignId: CAMPAIGN_ID,
    ownerReviewOpenedByScript: false,
    checks,
  };

  checks.openaiKeyPresent = Boolean(process.env.OPENAI_API_KEY?.trim());

  const mayaPath = path.join(
    repoRoot,
    "data",
    "campaigns",
    `${MAYA_PROTECTED_CAMPAIGN_ID}.json`,
  );
  const mayaShaBefore = await sha256File(mayaPath);
  const mayaTruth = await readMayaProtectedTruth(repoRoot);
  checks.mayaProtectedTruthVerified =
    mayaTruth.included === MAYA_EXPECTED_INCLUDED &&
    mayaTruth.used === MAYA_EXPECTED_USED &&
    mayaTruth.remaining === MAYA_EXPECTED_REMAINING &&
    mayaTruth.genuineRowPresent &&
    mayaTruth.contaminatingRows === 0;

  // PREFLIGHT — refuse before production, not after.
  //
  // Evaluating these alongside the post-run checks made them a report, not a
  // guard: Maya could already be contaminated and Customer-One would still be
  // reminted, with the failure only surfacing in the exit code afterward. A safety
  // check that fires after the irreversible act protects nothing. Abort here, write
  // the reason, and mint nothing.
  const preflight: Array<{ check: string; ok: boolean; detail: string }> = [
    {
      check: "openaiKeyPresent",
      ok: checks.openaiKeyPresent,
      detail: "OPENAI_API_KEY must be present — a keyless run cannot measure cost.",
    },
    {
      check: "mayaProtectedTruthVerified",
      ok: checks.mayaProtectedTruthVerified,
      detail: `Maya must read 1 included / 1 used / 0 remaining with exactly her genuine correction row. Observed: ${JSON.stringify(mayaTruth)}`,
    },
    {
      check: "mayaDigestReadable",
      ok: mayaShaBefore != null,
      detail:
        "Maya's protected record must be readable before the run so drift during the run is provable.",
    },
  ];
  const preflightFailures = preflight.filter((entry) => !entry.ok);
  if (preflightFailures.length > 0) {
    report.preflight = { ok: false, failures: preflightFailures, mayaTruth };
    report.ok = false;
    report.failed = preflightFailures.map((entry) => entry.check);
    report.abortedBeforeProduction = true;
    await writeFile(
      path.join(OUT, "customer-one-hybrid-remint-qa.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    console.error(JSON.stringify(report, null, 2));
    console.error(
      "\nPREFLIGHT FAILED — refused to mint. Repair the above, then re-run.",
    );
    process.exit(1);
  }
  report.preflight = { ok: true, checked: preflight.map((entry) => entry.check) };

  const before = await readCampaignEnvelope(CAMPAIGN_ID);
  if (!before) throw new Error("Customer-One campaign missing");
  const lockedMustInclude = String(
    before.record.routeMapIntake?.answers?.["v2-rtu-flyer:mustInclude"] ?? "",
  );
  const revisionBefore = before.record.revisionRoundsUsed ?? 0;
  const preservedBefore = await snapshotPreservedVersions(repoRoot);
  const observerBefore = before.record.dispatchExecution?.designRendererObserver?.results?.find(
    (result) => result.skuId === "v2-rtu-flyer",
  );

  // Read the same truth the hook maps, so the route claim is the Machine's, not the script's.
  const dispatchRecord = before.record.dispatchExecution?.records.find(
    (record) => record.skuId === "v2-rtu-flyer",
  );
  if (!dispatchRecord) throw new Error("Customer-One flyer dispatch record missing");
  const mapped = mapFlyerProjectTruthFromJob({
    repoRoot,
    campaign: before.record,
    dispatchRecord,
    materials: (await readMaterialsEnvelope(CAMPAIGN_ID))?.items ?? [],
  });
  if (!mapped.ok) throw new Error(`Truth mapping failed: ${mapped.code}`);
  const exactFacts = exactFactsFromTruth(mapped.truth);
  const machineBrief = mapped.truth.creativeDirection?.brief;
  const machineRoute = machineBrief ? routeProductionMethod(machineBrief) : null;

  report.before = {
    revisionRoundsUsed: revisionBefore,
    renderVersion: observerBefore?.renderVersion ?? null,
    machineRouteFromLockedIntake: machineRoute?.method ?? null,
    machineRouteWhy: machineRoute?.why ?? null,
    industryFamily: machineBrief?.industryFamily ?? null,
    moodId: machineBrief?.moodId ?? null,
    exactFactsRendererMustOwn: exactFacts.map((fact) => fact.label),
  };

  // Customer-One already carries a successful hybrid artifact, so the durable
  // idempotency cache would serve it and the run would make zero provider calls.
  // A cost report built from that would be a copy of an older run's numbers, not a
  // measurement. Force one genuine execution under recorded authorization — reuse
  // is bypassed, nothing else is: same locked Intake, same customer facts, the
  // Machine still picks the route inside the hook, QA still gates the result.
  const versionBefore = highestExistingRenderVersion(repoRoot);
  const hookMaterials = (await readMaterialsEnvelope(CAMPAIGN_ID))?.items ?? [];
  const { result: hookResult, ledger } = await collectProviderCost(() =>
    invokeDesignRendererDispatchHook({
      repoRoot,
      campaign: before.record,
      dispatchRecord,
      materials: hookMaterials,
      stagedLogoRelativePath: stagedLogoRelativePath(repoRoot, CAMPAIGN_ID),
      // Match what the observer passes, or the Anthropic reasoning leg never runs
      // and its cost would be absent from the measurement rather than zero.
      preferAnthropic: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      certificationFreshExecution: CERTIFICATION_FRESH_EXECUTION,
    }),
  );

  const after = (await readCampaignEnvelope(CAMPAIGN_ID))?.record ?? before.record;
  // The hook is the authority for this run; the observer record on the campaign
  // reflects whatever the last chain run wrote and is read only for context.
  const observer = {
    ok: hookResult.ok,
    renderVersion: hookResult.ok ? hookResult.identity.renderVersion : undefined,
    invocationOutcome: hookResult.ok ? hookResult.invocationOutcome : undefined,
    productionMethodId: hookResult.productionMethodId,
    productionMethodWhy: hookResult.productionMethodWhy,
    failureCode: hookResult.ok ? undefined : hookResult.failureCode,
    message: hookResult.ok ? undefined : hookResult.message,
    pngRelativePath: hookResult.ok
      ? hookResult.identity.pngRelativePath
      : undefined,
    pngContentSha256: hookResult.ok
      ? hookResult.identity.pngContentSha256
      : undefined,
  };
  const loop = hookResult.internalLoop ?? after.internalProductionLoop;

  const newVersion = observer.renderVersion ?? null;
  const specRel = newVersion
    ? `${ARTIFACT_ROOT_REL}/renders/v${newVersion}/design-spec.json`
    : null;
  const spec: FlyerDesignSpec | null =
    specRel && existsSync(path.join(repoRoot, specRel))
      ? (JSON.parse(await readFile(path.join(repoRoot, specRel), "utf8")) as FlyerDesignSpec)
      : null;
  const heroLayer = spec?.layers.find((layer) => layer.id === "generated-hero");
  const heroMaterial = spec?.materials.find(
    (material) => material.materialId === "hybrid-generated-visual",
  );
  const generatedBytes = heroMaterial
    ? await sha256File(path.join(repoRoot, heroMaterial.relativePath))
    : null;

  // Machine route + real generated visual + renderer-owned facts.
  checks.machineSelectedHybrid = observer.productionMethodId === "image_plus_renderer";
  checks.generatedVisualPresent = Boolean(heroLayer && heroMaterial);
  checks.generatedVisualOnDisk = Boolean(
    generatedBytes && generatedBytes === heroMaterial?.contentSha256,
  );
  const factCoverage = exactFacts.map((fact) => ({
    ...fact,
    ownedByRenderer: Boolean(spec && specTextIncludes(spec, fact.value)),
  }));
  checks.rendererOwnsExactFacts =
    factCoverage.length > 0 && factCoverage.every((fact) => fact.ownedByRenderer);
  checks.remintSucceeded = Boolean(observer.ok);
  // Fresh production, proven three independent ways: a version above everything
  // that existed before this run, the hook reporting a real mint rather than a
  // cache hit, and the recorded authorization on the result.
  checks.newVersionMinted = (newVersion ?? 0) > versionBefore;
  checks.freshExecutionNotReused = observer.invocationOutcome === "RENDERED";
  checks.freshExecutionAuthorizationRecorded = Boolean(
    hookResult.ok && hookResult.certificationFreshExecution?.authorizedBy,
  );

  // Creative Director inspected the composed artifact, not the spec.
  const visionCalls = ledger.calls.filter(
    (call) => call.purpose === "vision_creative_director",
  );
  const imageCalls = ledger.calls.filter(
    (call) => call.purpose === "image_generation",
  );
  const textAuditCalls = ledger.calls.filter(
    (call) => call.purpose === "vision_text_audit",
  );
  const anthropicCalls = ledger.calls.filter(
    (call) => call.provider === "anthropic",
  );
  // This run is a forced mint, so real provider work is required. Zero calls here
  // means the telemetry would be fabricated from a cache hit.
  checks.visionInspectedComposedArtifact = visionCalls.length >= 1;
  checks.imageGenerationCalled = imageCalls.length >= 1;
  checks.pixelTextAuditRan = textAuditCalls.length >= 1;

  // Customer revision untouched; Studio corrections absorbed internally.
  checks.revisionUnconsumed = (after.revisionRoundsUsed ?? 0) === revisionBefore;
  checks.revisionStillZero = (after.revisionRoundsUsed ?? 0) === 0;
  checks.customerFactsUnchanged =
    String(after.routeMapIntake?.answers?.["v2-rtu-flyer:mustInclude"] ?? "") ===
    lockedMustInclude;

  // Preserved lineage.
  const preservedAfter = await snapshotPreservedVersions(repoRoot);
  const preservedDrift: string[] = [];
  for (const version of PRESERVE_VERSIONS) {
    const key = `v${version}`;
    const a = preservedBefore[key]!;
    const b = preservedAfter[key]!;
    if (a.png !== b.png || a.pdf !== b.pdf || a.spec !== b.spec) {
      preservedDrift.push(key);
    }
    if (!b.png) preservedDrift.push(`${key}:missing_png`);
  }
  checks.preservedVersionsIntact = preservedDrift.length === 0;
  // Maya must be byte-identical across this run, whatever her digest happens to be.
  const mayaShaAfter = await sha256File(mayaPath);
  checks.mayaUntouchedDuringRun =
    mayaShaBefore != null && mayaShaAfter === mayaShaBefore;
  const mayaTruthAfter = await readMayaProtectedTruth(repoRoot);
  checks.mayaProtectedTruthHeld =
    mayaTruthAfter.included === MAYA_EXPECTED_INCLUDED &&
    mayaTruthAfter.used === MAYA_EXPECTED_USED &&
    mayaTruthAfter.remaining === MAYA_EXPECTED_REMAINING &&
    mayaTruthAfter.genuineRowPresent &&
    mayaTruthAfter.contaminatingRows === 0;
  report.mayaProtectedRecord = {
    verifiedBy: "semantic truth + digest stability across this run",
    expected: {
      included: MAYA_EXPECTED_INCLUDED,
      used: MAYA_EXPECTED_USED,
      remaining: MAYA_EXPECTED_REMAINING,
    },
    before: mayaTruth,
    after: mayaTruthAfter,
    sha256Before: mayaShaBefore,
    sha256After: mayaShaAfter,
  };

  const flyerJob = (
    (await readFile(
      path.join(repoRoot, "data", "campaign-tasks", `${CAMPAIGN_ID}.json`),
      "utf8",
    ).then((raw) => JSON.parse(raw)) as {
      envelope?: { jobRecords?: Array<Record<string, unknown>> };
      jobRecords?: Array<Record<string, unknown>>;
    })
  );
  const jobRecords = flyerJob.envelope?.jobRecords ?? flyerJob.jobRecords ?? [];
  const flyer = jobRecords.find((job) => job.skuId === "v2-rtu-flyer");
  const setBy = flyer?.spineStatusSetBy as { role?: string } | undefined;
  checks.reviewNotOpenedByOwner = setBy?.role === "system";

  // Idempotency: with the authorization withheld, the same execution must reuse the
  // artifact just minted and buy nothing. This is the real Machine path — the
  // recovery chain has no way to force a mint, which is the point.
  const { result: secondPass, ledger: secondLedger } = await collectProviderCost(
    async () => {
      const fresh = (await readCampaignEnvelope(CAMPAIGN_ID))?.record ?? after;
      return recoverPaidOperatingChain(fresh, {
        identitySession: {
          sessionCurrentCampaignId: CAMPAIGN_ID,
          sessionClientUserId: OWNER_USER_ID,
          intakeCampaignId: CAMPAIGN_ID,
        },
      });
    },
  );
  const secondObserver =
    secondPass.campaign.dispatchExecution?.designRendererObserver?.results?.find(
      (result) => result.skuId === "v2-rtu-flyer",
    );
  const secondSummary = summarizeProviderCost(secondLedger);
  checks.secondInvocationReusedIdentity =
    secondObserver?.invocationOutcome === "ALREADY_RENDERED" &&
    secondObserver?.renderVersion === newVersion;
  checks.secondInvocationFreeOfProviderCost = secondSummary.totalCostUsd === 0;
  // Telemetry must be scoped to its own request. The forced mint spent money; the
  // reuse run spent none. If the second ledger carried the first run's calls, this
  // would be the symptom.
  checks.telemetryRequestScoped =
    secondLedger.calls.length === 0 && ledger.calls.length > 0;

  // ---- Cost telemetry ----
  const summary = summarizeProviderCost(ledger);
  const attemptsRun = Math.max(1, imageCalls.length);
  const costPerSeriousAttempt =
    attemptsRun > 0 ? summary.totalCostUsd / attemptsRun : summary.totalCostUsd;
  const margin = evaluateSkuMargin({
    skuId: FLYER_SKU_ECONOMICS_V1.skuId,
    priceCents: FLYER_SKU_ECONOMICS_V1.priceCents,
    warningShareOfPrice: FLYER_SKU_ECONOMICS_V1.providerCostWarningShareOfPrice,
    failShareOfPrice: FLYER_SKU_ECONOMICS_V1.providerCostFailShareOfPrice,
    costPerSeriousAttemptUsd: costPerSeriousAttempt,
  });

  report.freshExecution = {
    authorized: CERTIFICATION_FRESH_EXECUTION,
    recordedOnResult:
      (hookResult.ok && hookResult.certificationFreshExecution) || null,
    highestVersionBefore: versionBefore,
    versionMinted: newVersion,
    invocationOutcome: observer.invocationOutcome ?? null,
    reuseBypassScope: "reuse only — Intake, customer facts, route choice, and QA unchanged",
  };
  report.after = {
    renderVersion: newVersion,
    invocationOutcome: observer.invocationOutcome ?? null,
    productionMethodId: observer.productionMethodId ?? null,
    productionMethodWhy: observer.productionMethodWhy ?? null,
    observerOk: observer.ok,
    failureCode: observer.failureCode ?? null,
    message: observer.message ?? null,
    pngRelativePath: observer.pngRelativePath ?? null,
    pngContentSha256: observer.pngContentSha256 ?? null,
    generatedVisualRelativePath: heroMaterial?.relativePath ?? null,
    generatedVisualSha256: heroMaterial?.contentSha256 ?? null,
    revisionRoundsUsed: after.revisionRoundsUsed ?? 0,
    exactFactCoverage: factCoverage,
  };
  report.internalLoop = {
    status: loop?.status ?? null,
    origin: loop?.origin ?? null,
    maxAttempts: loop?.maxAttempts ?? null,
    attemptCount: loop?.attempts.length ?? 0,
    attempts: (loop?.attempts ?? []).map((attempt) => ({
      attemptNumber: attempt.attemptNumber,
      qaResult: attempt.qaResult,
      renderVersion: attempt.renderVersion,
      failureCode: attempt.failureCode,
      message: attempt.message,
    })),
  };
  report.preserved = { versions: PRESERVE_VERSIONS, drift: preservedDrift };
  report.costTelemetry = {
    rateCard: {
      transcribedAt: STUDIO_PROVIDER_RATE_CARD_V1.transcribedAt,
      ratesVerifiedAgainstLiveBilling:
        STUDIO_PROVIDER_RATE_CARD_V1.ratesVerifiedAgainstLiveBilling,
      note: STUDIO_PROVIDER_RATE_CARD_V1.note,
    },
    providersUsed: [...new Set(ledger.calls.map((call) => call.provider))],
    modelsUsed: [...new Set(ledger.calls.map((call) => call.model))],
    seriousAttemptsRun: attemptsRun,
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    anthropicCalls: anthropicCalls.length,
    summary,
    secondInvocation: {
      invocationOutcome: secondObserver?.invocationOutcome ?? null,
      renderVersion: secondObserver?.renderVersion ?? null,
      providerCalls: secondSummary.totalCalls,
      providerCostUsd: secondSummary.totalCostUsd,
    },
    calls: ledger.calls.map((call) => ({
      provider: call.provider,
      model: call.model,
      purpose: call.purpose,
      attempt: call.attempt,
      httpStatus: call.httpStatus,
      billable: call.billable,
      usageReported: call.usageReported,
      usageEstimatedFrom: call.usageEstimatedFrom ?? null,
      usage: call.usage,
      costUsd: call.costUsd,
    })),
    margin,
  };

  // Every agreed telemetry line must be present, priced, and derived from this run.
  // Each category is asserted on its own figure — a combined total lets one leg's
  // spend hide another leg that priced at zero.
  checks.costTelemetryCaptured = summary.totalCalls > 0;
  checks.telemetryImageCostCaptured =
    summary.imageGenerationCalls >= 1 && summary.imageGenerationCostUsd > 0;
  checks.telemetryCreativeDirectorCostCaptured =
    summary.creativeDirectorCalls >= 1 && summary.creativeDirectorCostUsd > 0;
  checks.telemetryTextAuditCostCaptured =
    summary.textAuditCalls >= 1 && summary.textAuditCostUsd > 0;
  // Anthropic is "where available". With a key configured the reasoning leg is
  // expected to run, so a zero count is a gap in the measurement rather than a
  // free lunch; without a key, zero is the honest answer.
  const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  checks.telemetryAnthropicAccountedFor = anthropicConfigured
    ? anthropicCalls.length >= 1 &&
      anthropicCalls.every((call) => !call.rateMissing)
    : anthropicCalls.length === 0;
  checks.telemetryTotalCostCaptured = summary.totalCostUsd > 0;
  // Retry cost must agree with the attempts actually run, both directions: spend
  // after the first attempt when there was one, and nothing when there was not.
  checks.telemetryRetryCostAgreesWithAttempts =
    attemptsRun > 1 ? summary.retryCostUsd > 0 : summary.retryCostUsd === 0;
  checks.telemetryProjectionsPresent =
    Number.isFinite(margin.projected.attempts1) &&
    Number.isFinite(margin.projected.attempts2) &&
    Number.isFinite(margin.projected.attempts3) &&
    margin.projected.attempts3 > margin.projected.attempts1;
  // Unpriced models would make every figure above a floor rather than a number.
  checks.telemetryAllCallsPriced = summary.callsMissingRate === 0;
  // A call with neither reported nor documented-estimated usage is an unmeasured
  // call, and its cost is a guess.
  checks.telemetryAllCallsHaveUsageBasis = ledger.calls.every(
    (call) => call.usageReported || Boolean(call.usageEstimatedFrom),
  );
  checks.marginNotThreatened = margin.verdict !== "material_threat";

  // Proof capture of the composed artifact the Creative Director inspected.
  if (observer.pngRelativePath) {
    const pngAbs = path.join(repoRoot, observer.pngRelativePath);
    if (existsSync(pngAbs)) {
      await copyFile(pngAbs, path.join(OUT, `customer-one-hybrid-v${newVersion}.png`));
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage({ viewport: { width: 560, height: 840 } });
        await page.setContent(
          `<html><body style="margin:0;background:#111"><img src="${pathToFileURL(
            pngAbs,
          ).href}" style="width:540px" /></body></html>`,
        );
        await page.screenshot({
          path: path.join(OUT, "customer-one-hybrid-rendered.png"),
        });
      } finally {
        await browser.close();
      }
    }
  }
  if (heroMaterial) {
    const heroAbs = path.join(repoRoot, heroMaterial.relativePath);
    if (existsSync(heroAbs)) {
      await copyFile(
        heroAbs,
        path.join(OUT, "customer-one-hybrid-generated-visual.png"),
      );
    }
  }

  const failed = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  report.ok = failed.length === 0;
  report.failed = failed;
  await writeFile(
    path.join(OUT, "customer-one-hybrid-remint-qa.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
