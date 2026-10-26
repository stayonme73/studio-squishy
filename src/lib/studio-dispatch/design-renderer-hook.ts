/**
 * STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-1 (+ IDEMPOTENCY-1)
 *
 * Thin dd:{jobId} invoke for v2-rtu-flyer only.
 * Idempotent for the same authoritative execution fingerprint.
 * Does not live inside evaluateJobDispatch. Observer NOT wired.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_PROOF_SKU,
  DESIGN_RENDERER_VERSION,
  designFactSignature,
  factProjectionTruth,
  fingerprintDesignSpec,
  fingerprintMaterials,
  reasonFlyerDesignSpec,
  reasonFlyerDesignSpecDeterministic,
  runDesignRendererJobPipeline,
  resolveRenderPaths,
} from "@/lib/studio-design-renderer";
import type {
  DesignArtifactIdentity,
  DesignRendererPipelineResult,
  FlyerDesignSpec,
  FlyerProjectTruth,
} from "@/lib/studio-design-renderer";
import {
  appendInternalAttempt,
  beginNewAttemptSequence,
  buildProductionCorrectionBrief,
  constraintsFromBrief,
  emptyFlyerReasoningConstraints,
  mergeFlyerReasoningConstraints,
  nextAttemptTriggeredBy,
  readInternalProductionLoopFile,
  resolveWorkingProductionLoop,
  writeInternalProductionLoopFile,
  type InternalProductionLoopRecord,
} from "@/lib/studio-production-correction";
import type { DesignQualityFinding } from "@/lib/studio-kitchen-production/design-quality";
import { studioAutonomousProductionLoopV1 } from "@/config/studio-autonomous-production-loop-v1";

import {
  DESIGN_DISPATCH_HOOK_PACKAGE_ID,
  acquireRenderLockWithBriefWait,
  buildIdempotencyKey,
  buildIdempotencyTuple,
  buildRequestKey,
  findCurrentSuccessfulReceipt,
  findPartialRenderState,
  findSuccessfulRenderForFingerprint,
  summarizeRequestSatisfaction,
  writeImmutableVersionReceipt,
  RENDERER_ONLY_PRODUCTION_METHOD_ID,
  type DispatchHookReceipt,
  type RequestEquivalence,
} from "./hook-idempotency";
import {
  resolveProductionEntitlement,
  type ExplicitProductionAuthorization,
} from "./production-entitlement";
import {
  appendProductionSpendEntry,
  claimExplicitAuthorization,
  explicitAuthorizationAlreadyClaimed,
  releaseUnspentAuthorizationClaim,
  reserveProductionSpendAttempt,
} from "./production-spend-ledger";
import { clampBillableProductionInput } from "@/lib/studio-payment/disposable-cert-billable-clamp";
import { disposableSocialPromoCertBlocksBillableProviders } from "@/lib/studio-payment/disposable-social-promo-cert-isolation";
import { disposableSpCertBillableHookRefusal } from "@/lib/studio-payment/disposable-test-isolation-guards";
import {
  collectProviderCost,
  summarizeProviderCost,
} from "@/lib/studio-project-alpha/cost-telemetry";
import { existsSync, readFileSync } from "fs";
import path from "path";
import {
  isProductionFrozen,
  readFrozenFlyerIdentity,
  readFrozenFlyerSpec,
} from "@/lib/studio-production-team-workforce/freeze-maya";
import {
  customerArtifactRootRel,
  mapFlyerProjectTruthFromJob,
} from "./map-flyer-job-truth";
import {
  isCampaignLaunchKitBranchJob,
  projectCampaignLaunchKitOntoFlyer,
} from "./campaign-launch-kit-brief";
import type { JobDispatchRecord } from "./types";
import { DESIGN_INTELLIGENCE_VERSION } from "@/config/studio-design-intelligence-v1";
import { persistSuccessfulSignature } from "@/lib/studio-design-intelligence";
import {
  createEngineeringRecoveryTicket,
  isEngineeringDefect,
} from "@/lib/studio-project-alpha/engineering-recovery";
import {
  openaiImageConfigured,
  routeProductionMethod,
} from "@/lib/studio-project-alpha/tool-chest";
import { liveCustomerJobSpecOverride } from "@/lib/studio-static-creative-lane/live-flyer-compose";

export { DESIGN_DISPATCH_HOOK_PACKAGE_ID };

export const DESIGN_DISPATCH_HOOK_IDEMPOTENCY_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-IDEMPOTENCY-1" as const;

export type DesignDispatchInvocationOutcome =
  | "RENDERED"
  | "ALREADY_RENDERED";

export type DesignDispatchHookResult =
  | {
      ok: true;
      packageId: typeof DESIGN_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: DesignDispatchInvocationOutcome;
      dispatchId: string;
      skuId: typeof DESIGN_RENDERER_PROOF_SKU;
      pipeline?: Extract<DesignRendererPipelineResult, { ok: true }>;
      identity: DesignArtifactIdentity;
      designSpec: FlyerDesignSpec;
      receiptRelativePath: string;
      idempotencyKey: string;
      internalLoop?: InternalProductionLoopRecord;
      /** Machine-selected production method for this execution. */
      productionMethodId?: string;
      productionMethodWhy?: string;
      /**
       * Set only when reuse was bypassed under an explicit certification
       * authorization, so a forced measurement mint is never read as organic
       * customer behavior.
       */
      certificationFreshExecution?: ExplicitProductionAuthorization;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    }
  | {
      ok: false;
      packageId: typeof DESIGN_DISPATCH_HOOK_PACKAGE_ID;
      dispatchId?: string;
      skuId?: string;
      failureCode: string;
      message: string;
      identity?: DesignArtifactIdentity;
      internalLoop?: InternalProductionLoopRecord;
      productionMethodId?: string;
      productionMethodWhy?: string;
      ownerRoutineProduction: "NONE";
      canvaRequired: false;
      makeRequired: false;
    };

function baseMeta() {
  return {
    packageId: DESIGN_DISPATCH_HOOK_PACKAGE_ID,
    ownerRoutineProduction: "NONE" as const,
    canvaRequired: false as const,
    makeRequired: false as const,
  };
}

function versionReceiptRel(
  artifactRootRel: string,
  renderVersion: number,
): string {
  return `${artifactRootRel}/renders/v${renderVersion}/dispatch-hook-receipt.json`;
}

/**
 * Ensure a durable per-version receipt exists for an ALREADY_RENDERED hit
 * (e.g. legacy identity-only success). Never overwrites an existing receipt.
 */
function ensureVersionReceiptPresent(input: {
  repoRoot: string;
  artifactRootRel: string;
  receipt: DispatchHookReceipt;
  identity: DesignArtifactIdentity;
}): string {
  const rel = versionReceiptRel(
    input.artifactRootRel,
    input.identity.renderVersion,
  );
  const abs = path.join(input.repoRoot, rel);
  if (existsSync(abs)) return rel;
  writeImmutableVersionReceipt({
    repoRoot: input.repoRoot,
    artifactRootRel: input.artifactRootRel,
    receipt: {
      ...input.receipt,
      packageId: DESIGN_DISPATCH_HOOK_IDEMPOTENCY_PACKAGE_ID,
      status: "success",
      qaOk: true,
      renderVersion: input.identity.renderVersion,
      identity: input.identity,
      pngContentSha256: input.identity.pngContentSha256,
      pdfContentSha256: input.identity.pdfContentSha256,
    },
    renderVersion: input.identity.renderVersion,
  });
  return rel;
}

function alreadyRenderedResult(input: {
  dispatchId: string;
  identity: DesignArtifactIdentity;
  designSpec: FlyerDesignSpec;
  receiptRelativePath: string;
  idempotencyKey: string;
  internalLoop?: InternalProductionLoopRecord;
  productionMethodId?: string;
  productionMethodWhy?: string;
}): DesignDispatchHookResult {
  return {
    ok: true,
    ...baseMeta(),
    invocationOutcome: "ALREADY_RENDERED",
    dispatchId: input.dispatchId,
    skuId: DESIGN_RENDERER_PROOF_SKU,
    identity: input.identity,
    designSpec: input.designSpec,
    receiptRelativePath: input.receiptRelativePath,
    idempotencyKey: input.idempotencyKey,
    internalLoop: input.internalLoop,
    productionMethodId: input.productionMethodId,
    productionMethodWhy: input.productionMethodWhy,
  };
}

function readDesignQaFindings(
  repoRoot: string,
  pngRelativePath: string | undefined,
): DesignQualityFinding[] {
  if (!pngRelativePath) return [];
  const qaPath = path.join(
    repoRoot,
    pngRelativePath.replace(/\.png$/i, ".design-qa.json"),
  );
  if (!existsSync(qaPath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(qaPath, "utf8")) as {
      evaluation?: { findings?: DesignQualityFinding[] };
    };
    return parsed.evaluation?.findings ?? [];
  } catch {
    return [];
  }
}

function persistLoop(
  repoRoot: string,
  artifactRootRel: string,
  loop: InternalProductionLoopRecord,
): InternalProductionLoopRecord {
  writeInternalProductionLoopFile({ repoRoot, artifactRootRel, loop });
  return loop;
}

const HYBRID_PRODUCTION_METHOD_ID = "image_plus_renderer" as const;
const GENERATED_HERO_LAYER_ID = "generated-hero" as const;

/**
 * The Machine — not the caller — decides whether this job takes the hybrid
 * image_plus_renderer route. Requires a derived creative brief, a brief whose
 * route is hybrid, and a configured image capability. Anything missing falls back
 * to renderer-only rather than failing the job.
 */
function resolveMachineProductionMethod(truth: FlyerProjectTruth): {
  methodId: string;
  hybrid: boolean;
  why: string;
} {
  const brief = truth.creativeDirection?.brief;
  if (!brief) {
    return {
      methodId: RENDERER_ONLY_PRODUCTION_METHOD_ID,
      hybrid: false,
      why: "No derived creative brief on this job.",
    };
  }
  const routed = routeProductionMethod(brief);
  if (routed.method !== HYBRID_PRODUCTION_METHOD_ID) {
    return { methodId: routed.method, hybrid: false, why: routed.why };
  }
  if (!openaiImageConfigured()) {
    return {
      methodId: RENDERER_ONLY_PRODUCTION_METHOD_ID,
      hybrid: false,
      why: "Machine routed image_plus_renderer but the image capability is not configured — fail closed to renderer-only.",
    };
  }
  return {
    methodId: HYBRID_PRODUCTION_METHOD_ID,
    hybrid: true,
    why: routed.why,
  };
}

function specCarriesGeneratedVisual(spec: FlyerDesignSpec): boolean {
  return spec.layers.some((layer) => layer.id === GENERATED_HERO_LAYER_ID);
}

function resolveLoopConstraints(loop: InternalProductionLoopRecord) {
  return mergeFlyerReasoningConstraints(
    loop.settledConstraints,
    constraintsFromBrief(loop.activeBrief),
  );
}

/**
 * Invoke the proven design-renderer contract for one ready flyer dispatch record.
 * Same fingerprint → ALREADY_RENDERED (no new vN). Observer not authorized here.
 */
export async function invokeDesignRendererDispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
  preferAnthropic?: boolean;
  /** Test harness only. */
  forceQaFail?: boolean;
  /**
   * Certification measurement only — run production again for an execution the
   * cache would otherwise serve from disk.
   *
   * Production cost cannot be measured from a cache hit: a reuse run makes zero
   * provider calls, so a cost report built from one would be a copy of an older
   * run's numbers rather than a measurement. This bypasses **reuse only**. It does
   * not alter customer facts, the Intake, the route decision, QA, or the customer's
   * revision ledger, and the authorization is recorded on the result so a forced
   * mint can never be mistaken for organic customer behavior.
   *
   * Never set this from a customer-facing runtime path. The observer and the paid
   * recovery chain deliberately have no way to pass it.
   *
   * Single-use. `authorizationId` is recorded on the spend ledger when the attempt is
   * reserved, and presenting the same id again resolves to `ALREADY_RENDERED` rather
   * than producing a second time. A genuinely new measurement run needs a new id.
   */
  certificationFreshExecution?: ExplicitProductionAuthorization;
}): Promise<DesignDispatchHookResult> {
  input = clampBillableProductionInput(input);
  const billableRefusal = disposableSpCertBillableHookRefusal(input.campaign);
  if (billableRefusal.blocked) {
    const record = input.dispatchRecord;
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: billableRefusal.failureCode,
      message: billableRefusal.message,
    };
  }
  const record = input.dispatchRecord;

  if (record.skuId !== DESIGN_RENDERER_PROOF_SKU) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SKU_NOT_SUPPORTED",
      message: `Design dispatch hook refuses SKU ${record.skuId} — v2-rtu-flyer only`,
    };
  }

  if (!record.executionIdentityReady) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "DISPATCH_NOT_READY",
      message: `Dispatch ${record.dispatchId} is not EXECUTION_IDENTITY_READY`,
    };
  }

  const toolId = record.requirements?.primaryTool.toolId;
  if (toolId !== "studio_design_renderer") {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "EXECUTOR_MISMATCH",
      message: `Expected primaryTool studio_design_renderer, got ${toolId ?? "none"}`,
    };
  }

  if (isProductionFrozen(input.campaign, record.skuId)) {
    const frozenVersion = input.campaign.productionFreeze?.renderVersion;
    const identity = readFrozenFlyerIdentity({
      repoRoot: input.repoRoot,
      campaignId: input.campaign.campaignId,
      renderVersion: frozenVersion,
    });
    const designSpec = readFrozenFlyerSpec({
      repoRoot: input.repoRoot,
      campaignId: input.campaign.campaignId,
      renderVersion: frozenVersion,
    });
    if (!identity || !designSpec) {
      return {
        ok: false,
        ...baseMeta(),
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        failureCode: "PRODUCTION_FROZEN",
        message:
          "This campaign is frozen. Machine refused remint because the frozen identity is missing.",
      };
    }
    const artifactRootRel = customerArtifactRootRel(
      input.campaign.campaignId,
      record.dispatchId,
    );
    // A frozen artifact reports the method that actually built it, read from the
    // frozen spec — not the method the Machine would choose today.
    const frozenHybrid = specCarriesGeneratedVisual(designSpec);
    return alreadyRenderedResult({
      dispatchId: record.dispatchId,
      identity,
      designSpec,
      receiptRelativePath: `${artifactRootRel}/renders/v${identity.renderVersion}/dispatch-hook-receipt.json`,
      idempotencyKey: `frozen:${identity.renderId}`,
      productionMethodId: frozenHybrid
        ? HYBRID_PRODUCTION_METHOD_ID
        : RENDERER_ONLY_PRODUCTION_METHOD_ID,
      productionMethodWhy: frozenHybrid
        ? "Frozen artifact was built with a generated visual layer."
        : "Frozen artifact was built by the renderer alone.",
    });
  }

  let flyerCampaign = input.campaign;
  let allowApprovedCustomerExampleDomain = false;
  if (isCampaignLaunchKitBranchJob(record.jobId)) {
    const projected = projectCampaignLaunchKitOntoFlyer(input.campaign);
    if (!projected.ok) {
      return {
        ok: false,
        ...baseMeta(),
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        failureCode: "INVALID_DESIGN_SPEC",
        message: projected.message,
      };
    }
    flyerCampaign = projected.campaign;
    allowApprovedCustomerExampleDomain = true;
  } else if (record.jobId.includes(":studio-extra:flyer:")) {
    // The Extra flyer prints the contact the customer supplied. The approved
    // Harbor fixture website is the same example domain the Campaign flyer
    // already prints; the certification-label ban still applies.
    allowApprovedCustomerExampleDomain = true;
  }
  const mapped = mapFlyerProjectTruthFromJob({
    repoRoot: input.repoRoot,
    campaign: flyerCampaign,
    dispatchRecord: record,
    materials: input.materials,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
    allowApprovedCustomerExampleDomain,
  });
  if (!mapped.ok) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: mapped.code,
      message: mapped.message,
    };
  }

  const artifactRootRel = customerArtifactRootRel(
    input.campaign.campaignId,
    record.dispatchId,
  );

  const machineMethod = resolveMachineProductionMethod(mapped.truth);

  const stored =
    (input.campaign.internalProductionLoop?.jobId === record.jobId
      ? input.campaign.internalProductionLoop
      : null) ??
    readInternalProductionLoopFile(input.repoRoot, artifactRootRel);

  if (!input.forceQaFail && !input.certificationFreshExecution) {
    const current = findCurrentSuccessfulReceipt({
      repoRoot: input.repoRoot,
      artifactRootRel,
    });
    if (current.found) {
      const specRel = resolveRenderPaths({
        artifactRootRel,
        renderVersion: current.identity.renderVersion,
      }).specRel;
      const specAbs = path.join(input.repoRoot, specRel);
      const specOnDisk = existsSync(specAbs);
      const designSpec = specOnDisk
        ? (JSON.parse(readFileSync(specAbs, "utf8")) as FlyerDesignSpec)
        : reasonFlyerDesignSpecDeterministic(mapped.truth);
      const intelligenceUpgrade =
        Boolean(mapped.truth.creativeDirection) &&
        designSpec.creativeDirection?.intelligenceVersion !==
          DESIGN_INTELLIGENCE_VERSION;
      const settledConstraints =
        stored?.status === "passed"
          ? (stored.settledConstraints ?? undefined)
          : undefined;
      const currentTuple = buildIdempotencyTuple({
        dispatchId: record.dispatchId,
        jobId: record.jobId,
        skuId: record.skuId,
        spec: reasonFlyerDesignSpecDeterministic(mapped.truth, settledConstraints),
        correctionBriefFingerprint: stored?.settledBriefFingerprint ?? "none",
        productionMethodId: machineMethod.methodId,
      });
      // Reuse the current artifact only when its receipt binds the *whole*
      // execution identity — dispatch, job, SKU, spec, materials, renderer
      // version, correction brief, and production method. Comparing only the
      // spec and material fingerprints let a renderer version bump, a settled
      // correction brief, or a switch to the hybrid route serve a stale artifact.
      const sameExecutionIdentity =
        current.receipt.idempotencyKey === buildIdempotencyKey(currentTuple);
      if (!intelligenceUpgrade && sameExecutionIdentity) {
        const receiptRelativePath = ensureVersionReceiptPresent({
          repoRoot: input.repoRoot,
          artifactRootRel,
          receipt: current.receipt,
          identity: current.identity,
        });
        // Report the method that actually built this artifact, read from its own
        // stored spec — not the method the Machine would choose today. Without
        // that spec on disk the build method is unverifiable, so say so instead
        // of guessing.
        const builtHybrid = specCarriesGeneratedVisual(designSpec);
        return alreadyRenderedResult({
          dispatchId: record.dispatchId,
          identity: current.identity,
          designSpec,
          receiptRelativePath,
          idempotencyKey: current.receipt.idempotencyKey,
          productionMethodId: specOnDisk
            ? builtHybrid
              ? HYBRID_PRODUCTION_METHOD_ID
              : RENDERER_ONLY_PRODUCTION_METHOD_ID
            : undefined,
          productionMethodWhy: specOnDisk
            ? builtHybrid
              ? "Reused artifact was built with a generated visual layer."
              : "Reused artifact was built by the renderer alone."
            : "Reused artifact's stored design spec is missing — build method not verifiable from the artifact.",
        });
      }
    }
  }

  const unconstrainedSpec = reasonFlyerDesignSpecDeterministic(mapped.truth);
  const productionFactFingerprint = fingerprintDesignSpec(unconstrainedSpec);

  /**
   * The customer's request with the Studio's variety selection removed.
   *
   * `mapFlyerProjectTruthFromJob` picks a creative direction by scoring routes against
   * `readRecentSignatures` — a global, rolling log of the last two dozen renders across
   * *all* campaigns, kept so consecutive jobs don't look alike. That makes the chosen
   * route a function of what the Studio rendered recently, not of what this customer
   * asked for. Any other customer's render can therefore change the direction this job
   * computes, and with it the spec fingerprint.
   *
   * Spend authority cannot depend on that. If it did, an unrelated render elsewhere in
   * the Studio would make an already-delivered request look like new work and buy a
   * duplicate — the same failure as the correction-loop leak, arriving from a different
   * direction. Variety is a decision about *how* to satisfy a request, so it is pinned
   * to one fixed route here and kept out of the request key. Pinned rather than removed
   * because removing it is not neutral — see `factProjectionTruth`.
   */
  const requestFactsSpec = reasonFlyerDesignSpecDeterministic(
    factProjectionTruth(mapped.truth),
  );

  /**
   * The customer's request, as immutable evidence describes it.
   *
   * Built from the facts-only spec and the machine's production method, both of which
   * are functions of the request. Nothing about workflow progress reaches it, so it is
   * the same on every invocation of an unchanged request.
   */
  const requestKey = buildRequestKey({
    dispatchId: record.dispatchId,
    jobId: record.jobId,
    skuId: record.skuId,
    requestSpecFingerprint: fingerprintDesignSpec(requestFactsSpec),
    materialFingerprint: fingerprintMaterials(requestFactsSpec),
    rendererVersion: DESIGN_RENDERER_VERSION,
    productionMethodId: machineMethod.methodId,
  });
  const requestEquivalence: RequestEquivalence = {
    requestKey,
    factSignature: designFactSignature(requestFactsSpec),
    dispatchId: record.dispatchId,
    jobId: record.jobId,
    skuId: record.skuId,
    rendererVersion: DESIGN_RENDERER_VERSION,
    hybrid: machineMethod.hybrid,
  };

  /**
   * Ask the immutable record whether this request is already satisfied and what it
   * has already cost. Re-read rather than cached: it is asked again under the render
   * lock, where the answer may have changed because another invocation finished.
   */
  const authorization = input.certificationFreshExecution ?? null;

  /**
   * Whether the presented grant has already been spent — anywhere, on anything.
   *
   * Repo-wide rather than per-request. Checking only this request's ledger scoped the
   * grant to the request, so the same authorization presented against another request
   * or campaign looked unused and bought another artifact.
   *
   * Read on every call rather than captured once, because the answer changes the
   * moment any invocation claims it.
   */
  const authorizationSpent = () =>
    authorization
      ? explicitAuthorizationAlreadyClaimed({
          repoRoot: input.repoRoot,
          authorizationId: authorization.authorizationId,
        })
      : false;

  const resolveEntitlement = () => {
    const satisfaction = summarizeRequestSatisfaction({
      repoRoot: input.repoRoot,
      artifactRootRel,
      equivalence: requestEquivalence,
    });
    return {
      satisfaction,
      entitlement: resolveProductionEntitlement({
        requestAlreadySatisfied: Boolean(satisfaction.satisfiedBy),
        completedAttemptsForRequest: satisfaction.completedAttempts,
        correctionAttemptBudget:
          studioAutonomousProductionLoopV1.maxInternalProductionAttempts,
        explicitAuthorization: authorization,
        explicitAuthorizationAlreadyUsed: authorizationSpent(),
      }),
    };
  };

  /** Serve the artifact immutable evidence says already satisfies this request. */
  const serveSatisfiedArtifact = (
    satisfied: { receipt: DispatchHookReceipt; identity: DesignArtifactIdentity },
    internalLoop?: InternalProductionLoopRecord,
  ): DesignDispatchHookResult => {
    const receiptRelativePath = ensureVersionReceiptPresent({
      repoRoot: input.repoRoot,
      artifactRootRel,
      receipt: satisfied.receipt,
      identity: satisfied.identity,
    });
    const storedSpecAbs = path.join(
      input.repoRoot,
      resolveRenderPaths({
        artifactRootRel,
        renderVersion: satisfied.identity.renderVersion,
      }).specRel,
    );
    // Report the artifact's own stored spec, so the caller sees what was actually
    // delivered rather than what today's request would have produced.
    const designSpec = existsSync(storedSpecAbs)
      ? (JSON.parse(readFileSync(storedSpecAbs, "utf8")) as FlyerDesignSpec)
      : requestFactsSpec;
    return alreadyRenderedResult({
      dispatchId: record.dispatchId,
      identity: satisfied.identity,
      designSpec,
      receiptRelativePath,
      idempotencyKey: satisfied.receipt.idempotencyKey,
      internalLoop,
      productionMethodId: machineMethod.methodId,
      productionMethodWhy: machineMethod.why,
    });
  };

  let loop: InternalProductionLoopRecord = resolveWorkingProductionLoop({
    stored,
    campaignId: input.campaign.campaignId,
    jobId: record.jobId,
    dispatchId: record.dispatchId,
    productionFactFingerprint,
  });
  if (!loop.productionFactFingerprint) {
    loop = { ...loop, productionFactFingerprint };
  }

  // Satisfaction is decided before escalation, and the order is the point.
  //
  // `loop.status === "escalated"` is mutable state. Checking it first meant a request
  // whose artifact had already been delivered and accepted could still be refused,
  // because a correction loop left over from an earlier attempt sequence said the
  // budget was spent. Escalation is a statement about attempts, not about whether the
  // customer's work exists — and a repeat of a satisfied request owes no attempts.
  //
  // Asking the immutable record first also costs nothing: serving a delivered artifact
  // makes no provider call, so there is no spend for escalation to protect against.
  const preflight = resolveEntitlement();
  if (preflight.entitlement.decision === "ALREADY_RENDERED") {
    return serveSatisfiedArtifact(preflight.satisfaction.satisfiedBy!, loop);
  }

  // Serving a delivered artifact above needs no spend history. Everything past this
  // point may produce, and producing without being able to read what has already been
  // spent is how a request pays for the same work repeatedly. An unreadable history is
  // not zero attempts; it is unknown attempts.
  if (!preflight.satisfaction.spendHistoryReadable) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "SPEND_LEDGER_UNAVAILABLE",
      message:
        "Refusing to produce: this job's production spend history exists but cannot " +
        "be read, so what has already been paid for is unknown.",
      internalLoop: loop,
    };
  }

  if (loop.status === "escalated" || loop.status === "fail_closed") {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "INTERNAL_CORRECTION_EXHAUSTED",
      message:
        loop.failClosed?.reason ??
        loop.ownerEscalation?.reason ??
        "Internal production correction budget exhausted.",
      internalLoop: loop,
    };
  }

  const partial = findPartialRenderState({
    repoRoot: input.repoRoot,
    artifactRootRel,
  });
  if (partial.partial) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      failureCode: "PARTIAL_RENDER_STATE",
      message: `Fail closed on partial render state: ${partial.detail}`,
      internalLoop: loop,
    };
  }

  let lastIdentity: DesignArtifactIdentity | undefined;
  let lastMessage = "Production QA did not pass.";
  let lastVisionCritique: string | undefined;

  /**
   * Attempts this invocation has made. The only counter that can say "this run has
   * already tried", because it is the only one that describes this run.
   */
  let attemptsThisInvocation = 0;

  // What bounds a single invocation, and what does not.
  //
  // This used to be `remainingInternalAttempts(loop)` — mutable state, and the wrong
  // question. `loop.attempts` is the job's history, so a sequence that had already
  // finished lent its attempts to the next run: Customer-One's authorized fresh
  // production began with 2 of 3 attempts rather than 3, and two more authorized
  // productions on unchanged facts would have been refused
  // INTERNAL_CORRECTION_EXHAUSTED while fully entitled to produce.
  //
  // The real budget is enforced inside this loop, by entitlement, from immutable
  // evidence: receipts and the append-only spend ledger say how many attempts this
  // *request* has paid for, and `BLOCKED` / `CORRECTION_BUDGET_EXHAUSTED` stops the
  // loop when that budget is gone. So this condition only has to guarantee that one
  // invocation terminates, which a local counter does unconditionally — no file, no
  // writer, nothing to go stale.
  while (
    attemptsThisInvocation <
    studioAutonomousProductionLoopV1.maxInternalProductionAttempts
  ) {
    const constraints =
      loop.status === "passed"
        ? (loop.settledConstraints ?? emptyFlyerReasoningConstraints())
        : resolveLoopConstraints(loop);
    const briefFingerprint =
      loop.settledBriefFingerprint ??
      loop.activeBrief?.fingerprint ??
      "none";
    // Identity is fingerprinted from the *request*, never from the creative sample.
    //
    // `reasonFlyerDesignSpec({ preferAnthropic: true })` asks a model to compose the
    // layout, so it returns a different spec every time it is called. Fingerprinting
    // that made the cache key a function of an LLM sample: a repeated invocation
    // that began a fresh attempt sequence sampled new creative, computed a key no
    // stored receipt could carry, missed reuse, and paid to produce a duplicate of
    // work that already existed — which then produced yet another key, so the next
    // invocation missed again.
    //
    // The deterministic spec is a pure function of the inputs the request is made of
    // (mapped truth plus the settled constraints), so it identifies the request
    // stably. The sampled spec is still what gets rendered; it just does not get to
    // decide whether the request is new. New creative requires a reason that is *in*
    // the key — a correction brief, changed customer facts, a different production
    // method — not a fresh roll of the dice.
    const identitySpec = reasonFlyerDesignSpecDeterministic(mapped.truth, constraints);
    const tuple = buildIdempotencyTuple({
      dispatchId: record.dispatchId,
      jobId: record.jobId,
      skuId: record.skuId,
      spec: identitySpec,
      correctionBriefFingerprint: briefFingerprint,
      productionMethodId: machineMethod.methodId,
    });
    const idempotencyKey = buildIdempotencyKey(tuple);
    // One reuse decision for every call site — the initial check, the lock wait,
    // and the post-lock recheck. Gating them individually is how a "forced" run
    // ends up reporting ALREADY_RENDERED from whichever gate was missed.
    // An authorization suppresses reuse only while it is unspent. Once it has bought
    // an artifact, replaying it must fall back to ordinary reuse — otherwise the
    // suppression itself becomes the standing right to keep producing.
    const lookup = () =>
      authorization && !authorizationSpent()
        ? ({ found: false, reason: "certification_fresh_execution" } as const)
        : findSuccessfulRenderForFingerprint({
            repoRoot: input.repoRoot,
            artifactRootRel,
            tuple,
          });

    const existing = lookup();
    if (existing.found) {
      const receiptRelativePath = ensureVersionReceiptPresent({
        repoRoot: input.repoRoot,
        artifactRootRel,
        receipt: existing.receipt,
        identity: existing.identity,
      });
      if (loop.status !== "passed") {
        loop = persistLoop(
          input.repoRoot,
          artifactRootRel,
          appendInternalAttempt(
            loop,
            {
              attemptNumber: loop.attempts.length + 1,
              triggeredBy: nextAttemptTriggeredBy(loop),
              productionCapabilityId: "studio_design_renderer",
              correctionBriefId: loop.activeBrief?.briefId ?? null,
              correctionBriefFingerprint: briefFingerprint,
              renderVersion: existing.identity.renderVersion,
              pngContentSha256: existing.identity.pngContentSha256,
              qaResult: "pass",
              failureClasses: [],
              failureCode: null,
              message: "Reused successful identity for this correction fingerprint.",
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            },
            null,
            new Date().toISOString(),
            constraints,
          ),
        );
      }
      return alreadyRenderedResult({
        dispatchId: record.dispatchId,
        identity: existing.identity,
        designSpec: identitySpec,
        receiptRelativePath,
        idempotencyKey,
        internalLoop: loop,
        productionMethodId: machineMethod.methodId,
        productionMethodWhy: machineMethod.why,
      });
    }

    // Reuse of this exact identity was ruled out. That is not the same as being
    // entitled to spend money: a missed cache hit only says the identity did not
    // match. Resolve entitlement now, before any billable call.
    //
    // The facts come from immutable receipts, the specs stored beside the artifacts
    // they describe, and the append-only spend ledger. Nothing here reads `loop` — a
    // stale or reset correction loop must not be able to conjure a right to spend on
    // work that was already delivered. The loop still decides *how* an authorized
    // attempt is made, above: which brief, which constraints.
    const { satisfaction, entitlement } = resolveEntitlement();

    if (entitlement.decision === "BLOCKED") {
      return {
        ok: false,
        ...baseMeta(),
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        failureCode: entitlement.failureCode,
        message: entitlement.detail,
        internalLoop: loop,
      };
    }

    if (entitlement.decision === "ALREADY_RENDERED") {
      // The delivered artifact satisfies this request even though its stored identity
      // differs — a correction brief or a settled constraint moved after it was
      // produced. Serve it. This is the branch the duplicate mint should have taken.
      return serveSatisfiedArtifact(satisfaction.satisfiedBy!, loop);
    }

    // Locked on the request, not on this attempt's execution identity, so every
    // invocation of this request contends for the same lock however stale its
    // workflow state.
    const lock = await acquireRenderLockWithBriefWait({
      repoRoot: input.repoRoot,
      artifactRootRel,
      lockKey: requestKey,
      lookup,
    });

    if (!lock.ok) {
      if (lock.already) {
        const receiptRelativePath = ensureVersionReceiptPresent({
          repoRoot: input.repoRoot,
          artifactRootRel,
          receipt: lock.already.receipt,
          identity: lock.already.identity,
        });
        return alreadyRenderedResult({
          dispatchId: record.dispatchId,
          identity: lock.already.identity,
          designSpec: identitySpec,
          receiptRelativePath,
          idempotencyKey,
          internalLoop: loop,
          productionMethodId: machineMethod.methodId,
          productionMethodWhy: machineMethod.why,
        });
      }
      return {
        ok: false,
        ...baseMeta(),
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        failureCode: "CONCURRENT_IN_PROGRESS",
        message:
          "Another invocation holds the render lock for this fingerprint — refuse conflicting mint",
        internalLoop: loop,
      };
    }

    try {
      const again = lookup();
      if (again.found) {
        const receiptRelativePath = ensureVersionReceiptPresent({
          repoRoot: input.repoRoot,
          artifactRootRel,
          receipt: again.receipt,
          identity: again.identity,
        });
        return alreadyRenderedResult({
          dispatchId: record.dispatchId,
          identity: again.identity,
          designSpec: identitySpec,
          receiptRelativePath,
          idempotencyKey,
          internalLoop: loop,
          productionMethodId: machineMethod.methodId,
          productionMethodWhy: machineMethod.why,
        });
      }

      // Entitlement, again, now that this invocation is the only one that can produce
      // this request.
      //
      // The decision taken before the lock was taken against a world no lock was held
      // in. Another invocation could have been mid-production the whole time and
      // finished while this one waited — and the exact-identity check above will not
      // see it if that invocation carried different brief state, because it wrote a
      // different identity for the same request. Entitlement will: it reads what the
      // artifacts say rather than what key they were filed under.
      //
      // Deciding once before the lock is what let two concurrent invocations both
      // observe an unsatisfied request and both pay to satisfy it.
      const locked = resolveEntitlement();
      if (locked.entitlement.decision === "ALREADY_RENDERED") {
        return serveSatisfiedArtifact(locked.satisfaction.satisfiedBy!, loop);
      }
      if (locked.entitlement.decision === "BLOCKED") {
        return {
          ok: false,
          ...baseMeta(),
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          failureCode: locked.entitlement.failureCode,
          message: locked.entitlement.detail,
          internalLoop: loop,
        };
      }

      // Which reasoner composes this attempt.
      //
      // Decided here, from the entitlement that authorized the attempt, at the moment
      // the attempt is authorized — because the question "is this a new production or a
      // retry of one already under way?" has exactly the same answer as "why is this
      // allowed to spend?", and only one of those two had an answer that could not go
      // stale.
      //
      // It used to be `loop.attempts.length === 0`. That is the job's history, so
      // Customer-One's authorized fresh production inherited the attempt that made v17,
      // read as a retry, and was handed the deterministic reasoner: V18 was composed by a
      // lesser path than the one the hybrid route asks for, and the Anthropic leg
      // measured $0 because it never ran.
      //
      // Reading the current sequence instead was still not enough. The loop is read from
      // `campaign.internalProductionLoop` in preference to the artifact ledger, those two
      // copies have separate writers, and on Customer-One they have already diverged —
      // one says `passed` with two attempts, the other `in_progress` with none. Any rule
      // phrased in terms of loop status is therefore a rule about whichever copy happened
      // to be read. The same lesson the spend path already learned: a workflow flag must
      // not decide anything that matters. It may still decide *how* an attempt is made —
      // which brief, which constraints — but not whether this is fresh work.
      //
      // Entitlement names it, from receipts and the append-only spend ledger:
      //
      //   first_production          nothing has been paid for this request — first attempt
      //                             of genuinely new work, so compose
      //   explicit_authorization    an attributed grant to produce against delivered work
      //                             — a fresh production by definition, so compose
      //   studio_quality_correction the request is unsatisfied after a completed attempt,
      //                             so a correction is already under way — steer it
      //                             deterministically against the settled constraints,
      //                             answering the Creative Director rather than rerolling
      //
      // Nothing is forced: `preferAnthropic` still gates it, and a retry inside this
      // invocation is excluded by the local counter rather than by anything on disk.
      const composesNewWork =
        locked.entitlement.reason === "first_production" ||
        locked.entitlement.reason === "explicit_authorization";
      const preferCreative =
        Boolean(input.preferAnthropic) &&
        attemptsThisInvocation === 0 &&
        composesNewWork;

      // The loop record should describe the run it belongs to, for the same reason and
      // from the same authority. This changes only how attempts are *counted* on the
      // record — every prior attempt stays on it — so an inherited count cannot escalate
      // a fresh run on its first failure or mislabel it a QA correction.
      if (composesNewWork) {
        loop = beginNewAttemptSequence(loop);
      }

      // Consume the grant before spending under it.
      //
      // Exclusive-create, repo-wide, so exactly one invocation anywhere can succeed
      // for a given authorization id. This is what makes the grant a single right to
      // spend rather than one right per request: the previous check read this
      // request's own ledger, so the same authorization presented against a different
      // request — or a different campaign, concurrently, holding a different lock —
      // was unused again and bought another artifact.
      const spendingUnderGrant =
        locked.entitlement.reason === "explicit_authorization" && authorization
          ? authorization
          : null;
      if (spendingUnderGrant) {
        const claim = claimExplicitAuthorization({
          repoRoot: input.repoRoot,
          authorizationId: spendingUnderGrant.authorizationId,
          authorizedBy: spendingUnderGrant.authorizedBy,
          reason: spendingUnderGrant.reason,
          requestKey,
          campaignId: input.campaign.campaignId,
        });
        if (!claim.claimed) {
          // Lost the race, or this grant was already spent. Either way it buys nothing
          // more. Serve the delivered artifact if there is one; otherwise say plainly
          // that the authorization is used up.
          const settledNow = resolveEntitlement();
          if (settledNow.satisfaction.satisfiedBy) {
            return serveSatisfiedArtifact(settledNow.satisfaction.satisfiedBy, loop);
          }
          return {
            ok: false,
            ...baseMeta(),
            dispatchId: record.dispatchId,
            skuId: record.skuId,
            failureCode: "AUTHORIZATION_ALREADY_USED",
            message:
              `Authorization ${spendingUnderGrant.authorizationId} has already been spent` +
              `${claim.alreadyClaimedBy ? ` on ${claim.alreadyClaimedBy}` : ""}. ` +
              "A fresh production needs a new authorization.",
            internalLoop: loop,
          };
        }
      }

      // Claim the attempt before spending on it.
      //
      // Recording cost afterwards is not sufficient by itself: if that write fails —
      // disk full, permissions, I/O error — the paid attempt is invisible to every
      // later entitlement decision, and the next plain invocation is entitled to
      // spend again as if it were the first. Unbounded, from one failed write.
      //
      // So the Machine claims the attempt first, and a claim it cannot write is a
      // refusal to produce. Being unable to account for money is a reason not to
      // spend it.
      const attemptStartedAt = new Date().toISOString();
      const reservation = reserveProductionSpendAttempt({
        repoRoot: input.repoRoot,
        artifactRootRel,
        reservation: {
          requestKey,
          idempotencyKey,
          dispatchId: record.dispatchId,
          jobId: record.jobId,
          campaignId: input.campaign.campaignId,
          skuId: record.skuId,
          productionMethodId: machineMethod.methodId,
          // Recorded before the money is committed, so replaying this grant is
          // provably a replay rather than a race.
          authorizationId:
            locked.entitlement.reason === "explicit_authorization" && authorization
              ? authorization.authorizationId
              : null,
          startedAt: attemptStartedAt,
        },
      });
      if (!reservation.ok) {
        // Nothing was spent, so the grant is given back rather than burned on an
        // attempt that never happened.
        if (spendingUnderGrant) {
          releaseUnspentAuthorizationClaim({
            repoRoot: input.repoRoot,
            authorizationId: spendingUnderGrant.authorizationId,
          });
        }
        return {
          ok: false,
          ...baseMeta(),
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          failureCode: "SPEND_LEDGER_UNAVAILABLE",
          message:
            "Refusing to call a paid provider: this attempt could not be recorded, " +
            `so its cost could not be accounted for. ${reservation.error}`,
          internalLoop: loop,
        };
      }

      // The attempt is now claimed and about to spend, so it counts against this
      // invocation. Counted here rather than at the top of the loop because everything
      // above can still return without producing, and an attempt that never happened must
      // not consume the budget of one that could.
      attemptsThisInvocation += 1;

      // First billable call of the attempt, and it is deliberately here: behind the
      // lock, after reuse was ruled out and `entitlement` named a reason to produce.
      // Creative reasoning is a paid model call, so sampling it while the reuse
      // decision was still open meant a request that turned out to be reusable had
      // already been charged for.
      // Everything billable happens inside this collector, so what the attempt cost is
      // a measured fact rather than an estimate. Errors are caught and returned rather
      // than thrown through it: an attempt that pays OpenAI for a generated visual and
      // then crashes must still leave its cost on the ledger, and a throw would carry
      // the stack out past the recording below.
      const collected = await collectProviderCost(async () => {
        try {
          const designSpec = preferCreative
            ? await reasonFlyerDesignSpec({
                truth: mapped.truth,
                preferAnthropic: true,
                constraints,
              })
            : identitySpec;

          const pipeline = await runDesignRendererJobPipeline({
            repoRoot: input.repoRoot,
            truth: mapped.truth,
            artifactRootRel,
            preferAnthropic: input.preferAnthropic ?? false,
            // Live customer jobs must compose on Stage 0. Injecting the reasoned
            // spec is the CERT latch — it keeps Harbor / failure fixtures on the
            // legacy HTML composer and is exactly what stranded CTA-as-headline
            // revisions on hollow_offer_panel.
            specOverride: liveCustomerJobSpecOverride(
              mapped.truth.outputMode,
              designSpec,
            ),
            forceQaFail: input.forceQaFail,
            constraints,
            hybridProduction: {
              enabled:
                machineMethod.hybrid &&
                !disposableSocialPromoCertBlocksBillableProviders(input.campaign),
              attempt: loop.attempts.length + 1,
              // Carry the Creative Director's critique into the next generation so a
              // correction is directed at the rejected weakness, not a fresh reroll.
              priorVisionCritique: lastVisionCritique,
            },
          });
          const producedSpec = pipeline.ok ? pipeline.designSpec : designSpec;
          return { ok: true as const, pipeline, designSpec: producedSpec };
        } catch (e) {
          return { ok: false as const, error: e };
        }
      });

      const spend = summarizeProviderCost(collected.ledger);
      const attempted = collected.result;
      const settled = attempted.ok ? attempted.pipeline : null;

      // Settle the reservation, before any early return can skip it. If this write
      // fails the reservation stands, and an unsettled reservation counts as a paid
      // attempt — so the budget is still bounded, at the cost of one attempt assumed
      // more expensive than it was. That is the right direction to be wrong in.
      appendProductionSpendEntry({
        repoRoot: input.repoRoot,
        artifactRootRel,
        entry: {
          attemptId: reservation.attemptId,
          requestKey,
          idempotencyKey,
          dispatchId: record.dispatchId,
          jobId: record.jobId,
          campaignId: input.campaign.campaignId,
          skuId: record.skuId,
          productionMethodId: machineMethod.methodId,
          renderVersion: settled?.identity?.renderVersion ?? null,
          outcome: !settled
            ? "technical_failure"
            : settled.ok
              ? "success"
              : settled.failureCode === "QA_FAILURE"
                ? "qa_failed"
                : "technical_failure",
          failureCode: !settled
            ? "PRODUCTION_THREW"
            : settled.ok
              ? null
              : settled.failureCode,
          billableCalls: spend.billableCalls,
          totalCostUsd: spend.totalCostUsd,
          costByPurpose: {
            image_generation: {
              calls: spend.imageGenerationCalls,
              costUsd: spend.imageGenerationCostUsd,
            },
            vision_creative_director: {
              calls: spend.creativeDirectorCalls,
              costUsd: spend.creativeDirectorCostUsd,
            },
            vision_text_audit: {
              calls: spend.textAuditCalls,
              costUsd: spend.textAuditCostUsd,
            },
            creative_reasoning: {
              calls: spend.reasoningCalls,
              costUsd: spend.reasoningCostUsd,
            },
          },
          startedAt: attemptStartedAt,
        },
      });

      // Now that the cost is durable, let the failure out.
      if (!attempted.ok) throw attempted.error;
      const { pipeline, designSpec } = attempted;

      if (!pipeline.ok) {
        lastIdentity = pipeline.identity;
        lastMessage = pipeline.message;
        if (pipeline.visionCritique) lastVisionCritique = pipeline.visionCritique;
        if (isEngineeringDefect(pipeline.failureCode)) {
          createEngineeringRecoveryTicket({
            repoRoot: input.repoRoot,
            campaignId: input.campaign.campaignId,
            skuId: record.skuId,
            failureCode: pipeline.failureCode,
            message: pipeline.message,
          });
          return {
            ok: false,
            ...baseMeta(),
            dispatchId: record.dispatchId,
            skuId: record.skuId,
            failureCode: pipeline.failureCode,
            message: pipeline.message,
            identity: pipeline.identity,
            internalLoop: loop,
          };
        }
        // Partial render state is detected by this hook before rendering, so the
        // pipeline never reports it here.
        if (
          pipeline.failureCode === "EXPORT_FAILURE" ||
          pipeline.failureCode === "RENDER_FAILURE" ||
          pipeline.failureCode === "BROKEN_ASSET_REFERENCE"
        ) {
          return {
            ok: false,
            ...baseMeta(),
            dispatchId: record.dispatchId,
            skuId: record.skuId,
            failureCode: pipeline.failureCode,
            message: pipeline.message,
            identity: pipeline.identity,
            internalLoop: loop,
          };
        }
        if (pipeline.identity) {
          const failReceipt: DispatchHookReceipt = {
            packageId: DESIGN_DISPATCH_HOOK_IDEMPOTENCY_PACKAGE_ID,
            status:
              pipeline.failureCode === "QA_FAILURE" ? "qa_failed" : "failed",
            idempotencyKey,
            requestKey,
            requestFactSignature: requestEquivalence.factSignature,
            dispatchId: record.dispatchId,
            jobId: record.jobId,
            campaignId: input.campaign.campaignId,
            skuId: record.skuId,
            designSpecFingerprint: tuple.designSpecFingerprint,
            materialFingerprint: tuple.materialFingerprint,
            rendererVersion: DESIGN_RENDERER_VERSION,
            renderVersion: pipeline.identity.renderVersion,
            identity: pipeline.identity,
            pngContentSha256: pipeline.identity.pngContentSha256,
            pdfContentSha256: pipeline.identity.pdfContentSha256,
            qaOk: false,
            failureCode: pipeline.failureCode,
            message: pipeline.message,
            invokedAt: new Date().toISOString(),
          };
          try {
            writeImmutableVersionReceipt({
              repoRoot: input.repoRoot,
              artifactRootRel,
              receipt: failReceipt,
              renderVersion: pipeline.identity.renderVersion,
            });
          } catch (e) {
            return {
              ok: false,
              ...baseMeta(),
              dispatchId: record.dispatchId,
              skuId: record.skuId,
              failureCode: pipeline.failureCode,
              message: `${pipeline.message}; receipt write: ${
                e instanceof Error ? e.message : String(e)
              }`,
              identity: pipeline.identity,
              internalLoop: loop,
            };
          }
        }

        const findings = readDesignQaFindings(
          input.repoRoot,
          pipeline.identity?.pngRelativePath,
        );
        const rawBrief = buildProductionCorrectionBrief({
          sourceAttemptNumber: loop.attempts.length + 1,
          findings,
          failureCode: pipeline.failureCode,
          message: pipeline.message,
        });
        const nextBrief = {
          ...rawBrief,
          constraints: mergeFlyerReasoningConstraints(
            resolveLoopConstraints(loop),
            rawBrief.constraints,
          ),
        };
        loop = persistLoop(
          input.repoRoot,
          artifactRootRel,
          appendInternalAttempt(
            loop,
            {
              attemptNumber: loop.attempts.length + 1,
              triggeredBy: nextAttemptTriggeredBy(loop),
              productionCapabilityId: "studio_design_renderer",
              correctionBriefId: loop.activeBrief?.briefId ?? null,
              correctionBriefFingerprint: briefFingerprint,
              renderVersion: pipeline.identity?.renderVersion ?? null,
              pngContentSha256: pipeline.identity?.pngContentSha256 ?? null,
              qaResult: "fail",
              failureClasses: nextBrief.failureClasses,
              failureCode: pipeline.failureCode,
              message: pipeline.message,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            },
            nextBrief,
          ),
        );
        if (input.forceQaFail || loop.status === "escalated" || loop.status === "fail_closed") {
          return {
            ok: false,
            ...baseMeta(),
            dispatchId: record.dispatchId,
            skuId: record.skuId,
            failureCode:
              loop.status === "escalated" || loop.status === "fail_closed"
                ? "INTERNAL_CORRECTION_EXHAUSTED"
                : pipeline.failureCode,
            message:
              loop.status === "escalated" || loop.status === "fail_closed"
                ? (loop.failClosed?.reason ?? loop.ownerEscalation?.reason ?? pipeline.message)
                : pipeline.message,
            identity: pipeline.identity,
            internalLoop: loop,
            productionMethodId: machineMethod.methodId,
            productionMethodWhy: machineMethod.why,
          };
        }
        continue;
      }

      const successReceipt: DispatchHookReceipt = {
        packageId: DESIGN_DISPATCH_HOOK_IDEMPOTENCY_PACKAGE_ID,
        status: "success",
        idempotencyKey,
        requestKey,
        requestFactSignature: requestEquivalence.factSignature,
        dispatchId: record.dispatchId,
        jobId: record.jobId,
        campaignId: input.campaign.campaignId,
        skuId: record.skuId,
        designSpecFingerprint: tuple.designSpecFingerprint,
        materialFingerprint: tuple.materialFingerprint,
        rendererVersion: DESIGN_RENDERER_VERSION,
        renderVersion: pipeline.identity.renderVersion,
        identity: pipeline.identity,
        pngContentSha256: pipeline.identity.pngContentSha256,
        pdfContentSha256: pipeline.identity.pdfContentSha256,
        qaOk: true,
        invokedAt: new Date().toISOString(),
      };

      const written = writeImmutableVersionReceipt({
        repoRoot: input.repoRoot,
        artifactRootRel,
        receipt: successReceipt,
        renderVersion: pipeline.identity.renderVersion,
      });

      persistSuccessfulSignature({
        repoRoot: input.repoRoot,
        campaignId: input.campaign.campaignId,
        spec: designSpec,
        direction: mapped.truth.creativeDirection,
      });

      loop = persistLoop(
        input.repoRoot,
        artifactRootRel,
        appendInternalAttempt(
          loop,
          {
            attemptNumber: loop.attempts.length + 1,
            triggeredBy: nextAttemptTriggeredBy(loop),
            productionCapabilityId: "studio_design_renderer",
            correctionBriefId: loop.activeBrief?.briefId ?? null,
            correctionBriefFingerprint: briefFingerprint,
            renderVersion: pipeline.identity.renderVersion,
            pngContentSha256: pipeline.identity.pngContentSha256,
            qaResult: "pass",
            failureClasses: [],
            failureCode: null,
            message: pipeline.qaSummary ?? "QA passed.",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          },
          null,
          new Date().toISOString(),
          constraints,
        ),
      );

      return {
        ok: true,
        ...baseMeta(),
        invocationOutcome: "RENDERED",
        dispatchId: record.dispatchId,
        skuId: DESIGN_RENDERER_PROOF_SKU,
        pipeline,
        identity: pipeline.identity,
        designSpec,
        receiptRelativePath: written.versionReceiptRel,
        idempotencyKey,
        internalLoop: loop,
        productionMethodId: machineMethod.methodId,
        productionMethodWhy: machineMethod.why,
        certificationFreshExecution: input.certificationFreshExecution,
      };
    } finally {
      lock.handle.release();
    }
  }

  return {
    ok: false,
    ...baseMeta(),
    dispatchId: record.dispatchId,
    skuId: record.skuId,
    failureCode: "INTERNAL_CORRECTION_EXHAUSTED",
    message: lastMessage,
    identity: lastIdentity,
    internalLoop: persistLoop(input.repoRoot, artifactRootRel, loop),
    productionMethodId: machineMethod.methodId,
    productionMethodWhy: machineMethod.why,
  };
}
