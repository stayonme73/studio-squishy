/**
 * READ-ONLY diagnosis — why a plain repeated invocation minted a duplicate.
 *
 * Reconstructs the exact reuse decision the flyer dispatch hook would make for
 * Customer-One's next invocation, using the same functions the hook uses, and
 * reports whether that invocation would reuse the existing artifact or spend money
 * on a duplicate.
 *
 * Calls no provider. Writes no file inside the repo. Mints nothing. Does not touch
 * Customer-One or Maya.
 *
 * Usage: npx tsx scripts/remint-duplicate-defect-diagnosis.mts
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { readCampaignEnvelope } from "../src/lib/campaign-store/store";
import { readMaterialsEnvelope } from "../src/lib/materials/store";
import { mapFlyerProjectTruthFromJob } from "../src/lib/studio-dispatch/map-flyer-job-truth";
import {
  buildIdempotencyKey,
  buildIdempotencyTuple,
  buildRequestKey,
  findCurrentSuccessfulReceipt,
  findSuccessfulRenderForFingerprint,
  summarizeRequestSatisfaction,
} from "../src/lib/studio-dispatch/hook-idempotency";
import { resolveProductionEntitlement } from "../src/lib/studio-dispatch/production-entitlement";
import { studioAutonomousProductionLoopV1 } from "../src/config/studio-autonomous-production-loop-v1";
import {
  designFactSignature,
  factProjectionTruth,
  fingerprintDesignSpec,
  fingerprintMaterials,
  reasonFlyerDesignSpecDeterministic,
} from "../src/lib/studio-design-renderer";
import { resolveWorkingProductionLoop } from "../src/lib/studio-production-correction/ledger";
import type { InternalProductionLoopRecord } from "../src/lib/studio-production-correction/types";

const CAMPAIGN_ID = "9c6c25f2-2562-4192-97a5-44536e45cd18";
const SKU = "v2-rtu-flyer";
const ARTIFACT_ROOT_REL = `data/campaign-design-artifacts/${CAMPAIGN_ID}/dd_${CAMPAIGN_ID}_${SKU}`;
const HYBRID_METHOD_ID = "image_plus_renderer";

function short(value: string | null | undefined): string {
  if (!value) return String(value);
  return value.length > 18 ? `${value.slice(0, 14)}…` : value;
}

/** Decode a stored key into its named parts so mismatches are readable. */
function decodeKey(key: string) {
  const [dispatchId, jobId, skuId, specFp, materialFp, renderer, brief, method] =
    key.split("|");
  return {
    dispatchId,
    jobId,
    skuId,
    specFingerprint: short(specFp),
    materialFingerprint: short(materialFp),
    rendererVersion: renderer,
    correctionBriefFingerprint: short(brief),
    productionMethodId: method ?? "(renderer_only, omitted)",
  };
}

async function main() {
  const repoRoot = process.cwd();

  const envelope = await readCampaignEnvelope(CAMPAIGN_ID);
  if (!envelope) throw new Error("Customer-One campaign missing");
  const dispatchRecord = envelope.record.dispatchExecution?.records.find(
    (record) => record.skuId === SKU,
  );
  if (!dispatchRecord) throw new Error("flyer dispatch record missing");

  const mapped = mapFlyerProjectTruthFromJob({
    repoRoot,
    campaign: envelope.record,
    dispatchRecord,
    materials: (await readMaterialsEnvelope(CAMPAIGN_ID))?.items ?? [],
  });
  if (!mapped.ok) throw new Error(`truth mapping failed: ${mapped.code}`);

  // ---- What the hook computes, in the hook's own order ----
  const unconstrainedSpec = reasonFlyerDesignSpecDeterministic(mapped.truth);
  const productionFactFingerprint = fingerprintDesignSpec(unconstrainedSpec);
  // Mirrors the hook: the request with the Studio's variety selection pinned, because
  // that selection is scored against a global log of recent renders and so is not
  // request truth.
  const requestFactsSpec = reasonFlyerDesignSpecDeterministic(
    factProjectionTruth(mapped.truth),
  );

  const loopPath = path.join(repoRoot, ARTIFACT_ROOT_REL, "internal-production-loop.json");
  const stored: InternalProductionLoopRecord | null = existsSync(loopPath)
    ? (JSON.parse(readFileSync(loopPath, "utf8")) as InternalProductionLoopRecord)
    : null;

  const working = resolveWorkingProductionLoop({
    stored,
    campaignId: CAMPAIGN_ID,
    jobId: dispatchRecord.jobId,
    dispatchId: dispatchRecord.dispatchId,
    productionFactFingerprint,
  });
  const loopWasReset = stored != null && working !== stored;

  console.log("=== stored internal production loop ===");
  console.log({
    status: stored?.status ?? null,
    origin: stored?.origin ?? null,
    attempts: stored?.attempts.length ?? 0,
    settledBriefFingerprint: short(stored?.settledBriefFingerprint),
    settledConstraints: stored?.settledConstraints ?? null,
    storedProductionFactFingerprint: short(stored?.productionFactFingerprint),
  });
  console.log("\n=== what this invocation computes ===");
  console.log({
    productionFactFingerprint: short(productionFactFingerprint),
    matchesStored: stored?.productionFactFingerprint === productionFactFingerprint,
    loopWasReset,
    workingLoopStatus: working.status,
    workingLoopOrigin: working.origin,
    workingSettledBriefFingerprint: short(working.settledBriefFingerprint),
  });

  // ---- Gate 1: findCurrentSuccessfulReceipt + full-key equality ----
  const current = findCurrentSuccessfulReceipt({
    repoRoot,
    artifactRootRel: ARTIFACT_ROOT_REL,
  });

  // The hook derives the comparison tuple from the *working* loop, exactly as here.
  const settledConstraints =
    working.status === "passed" ? (working.settledConstraints ?? undefined) : undefined;
  const gate1Tuple = buildIdempotencyTuple({
    dispatchId: dispatchRecord.dispatchId,
    jobId: dispatchRecord.jobId,
    skuId: dispatchRecord.skuId,
    spec: reasonFlyerDesignSpecDeterministic(mapped.truth, settledConstraints),
    correctionBriefFingerprint: working.settledBriefFingerprint ?? "none",
    productionMethodId: HYBRID_METHOD_ID,
  });
  const gate1Key = buildIdempotencyKey(gate1Tuple);

  console.log("\n=== gate 1 — current successful receipt vs recomputed identity ===");
  console.log({
    currentReceiptFound: current.found,
    currentReceiptVersion: current.found ? current.identity.renderVersion : null,
  });
  if (current.found) {
    const same = current.receipt.idempotencyKey === gate1Key;
    console.log({ wouldReuse: same });
    if (!same) {
      console.log("stored key parts :", decodeKey(current.receipt.idempotencyKey));
      console.log("recomputed parts :", decodeKey(gate1Key));
    }
  }

  // ---- Gate 2: fingerprint lookup across every version ----
  const gate2 = findSuccessfulRenderForFingerprint({
    repoRoot,
    artifactRootRel: ARTIFACT_ROOT_REL,
    tuple: gate1Tuple,
  });
  console.log("\n=== gate 2 — any successful render for this identity ===");
  console.log(
    gate2.found
      ? { found: true, renderVersion: gate2.identity.renderVersion }
      : { found: false, reason: gate2.reason },
  );

  // ---- Which stored receipts carry the recomputed key, at any status? ----
  const rendersDir = path.join(repoRoot, ARTIFACT_ROOT_REL, "renders");
  const matches: Array<{ version: number; status: string; qaOk: unknown }> = [];
  if (existsSync(rendersDir)) {
    for (const name of readdirSync(rendersDir)) {
      const m = /^v(\d+)$/.exec(name);
      if (!m) continue;
      const receiptPath = path.join(rendersDir, name, "dispatch-hook-receipt.json");
      if (!existsSync(receiptPath)) continue;
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        idempotencyKey?: string;
        status?: string;
        qaOk?: unknown;
      };
      if (receipt.idempotencyKey === gate1Key) {
        matches.push({
          version: Number(m[1]),
          status: String(receipt.status),
          qaOk: receipt.qaOk,
        });
      }
    }
  }
  console.log("\n=== stored receipts carrying the recomputed key (any status) ===");
  console.log(matches.length ? matches : "none");

  // ---- Is the spec fingerprint stable across versions? ----
  // Two distinct spec fingerprints appear in the stored keys for what should be one
  // unchanged execution. Fingerprint each stored spec to find what moved.
  console.log("\n=== stored design specs, re-fingerprinted ===");
  for (const name of existsSync(rendersDir) ? readdirSync(rendersDir) : []) {
    const m = /^v(\d+)$/.exec(name);
    if (!m || Number(m[1]) < 12) continue;
    const specPath = path.join(rendersDir, name, "design-spec.json");
    if (!existsSync(specPath)) continue;
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    console.log(name, {
      fingerprint: short(fingerprintDesignSpec(spec)),
      layers: (spec.layers ?? []).map((layer: { id: string }) => layer.id).join(","),
      materials: (spec.materials ?? [])
        .map((material: { materialId: string }) => material.materialId)
        .join(","),
    });
  }
  console.log("\nunconstrained spec reasoned right now:", {
    fingerprint: short(productionFactFingerprint),
    layers: unconstrainedSpec.layers.map((layer) => layer.id).join(","),
    materials: unconstrainedSpec.materials
      .map((material) => material.materialId)
      .join(","),
  });

  // ---- Gate 3: entitlement, the decision that must precede any spend ----
  // Derived from the request key and immutable receipts only. No loop state.
  const requestKey = buildRequestKey({
    dispatchId: dispatchRecord.dispatchId,
    jobId: dispatchRecord.jobId,
    skuId: dispatchRecord.skuId,
    requestSpecFingerprint: fingerprintDesignSpec(requestFactsSpec),
    materialFingerprint: fingerprintMaterials(requestFactsSpec),
    rendererVersion: gate1Tuple.rendererVersion,
    productionMethodId: HYBRID_METHOD_ID,
  });
  const satisfaction = summarizeRequestSatisfaction({
    repoRoot,
    artifactRootRel: ARTIFACT_ROOT_REL,
    equivalence: {
      requestKey,
      factSignature: designFactSignature(requestFactsSpec),
      dispatchId: dispatchRecord.dispatchId,
      jobId: dispatchRecord.jobId,
      skuId: dispatchRecord.skuId,
      rendererVersion: gate1Tuple.rendererVersion,
      hybrid: true,
    },
  });
  // No authorization: this models the plain invocation that caused the incident.
  const entitlement = resolveProductionEntitlement({
    requestAlreadySatisfied: Boolean(satisfaction.satisfiedBy),
    completedAttemptsForRequest: satisfaction.completedAttempts,
    correctionAttemptBudget:
      studioAutonomousProductionLoopV1.maxInternalProductionAttempts,
    explicitAuthorization: null,
    explicitAuthorizationAlreadyUsed: false,
  });
  console.log("\n=== gate 3 — entitlement (resolved before any provider call) ===");
  console.log({
    requestKey,
    satisfiedByVersion: satisfaction.satisfiedBy?.identity.renderVersion ?? null,
    completedAttemptsForRequest: satisfaction.completedAttempts,
    entitlement,
  });

  // The verdict is entitlement's, not the cache's. Reporting a mint on an
  // exact-identity miss overstated the risk: a miss only says the identity did not
  // match, and entitlement is what decides whether anything may be produced.
  const wouldMint = entitlement.decision === "AUTHORIZED_NEW_PRODUCTION";
  console.log("\n=== VERDICT ===");
  console.log(
    wouldMint
      ? "WOULD MINT — this invocation reaches production and spends provider money."
      : entitlement.decision === "ALREADY_RENDERED"
        ? `WOULD REUSE — no provider spend; v${satisfaction.satisfiedBy?.identity.renderVersion} satisfies this request.`
        : "WOULD REFUSE — blocked before any provider call.",
  );
  if (!gate2.found && !wouldMint) {
    console.log(
      `Exact-identity reuse missed (${gate2.reason}), but entitlement resolved ` +
        `${entitlement.decision} from immutable evidence — so the miss costs nothing.`,
    );
  }
  if (wouldMint && matches.length > 0) {
    console.log(
      `The identity is not new: ${matches.length} stored receipt(s) already carry this exact key ` +
        `(${matches.map((entry) => `v${entry.version}=${entry.status}`).join(", ")}). ` +
        "Reuse is refused because none of them is a success, so the Machine treats an " +
        "already-attempted identity as unproduced work.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
