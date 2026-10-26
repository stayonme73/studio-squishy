/**
 * STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-IDEMPOTENCY-1
 * Durable lookup + lock for one successful identity per execution fingerprint.
 */

import { randomUUID } from "crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "fs";
import path from "path";

import {
  DESIGN_RENDERER_VERSION,
  designFactSignature,
  fingerprintDesignSpec,
  fingerprintMaterials,
  resolveRenderPaths,
  sha256File,
  specCarriesGeneratedVisual,
} from "@/lib/studio-design-renderer";
import type {
  DesignArtifactIdentity,
  FlyerDesignSpec,
} from "@/lib/studio-design-renderer";

import {
  readProductionSpendLedger,
  unreceiptedPaidAttempts,
} from "./production-spend-ledger";

export const DESIGN_DISPATCH_HOOK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-1" as const;

export type HookReceiptStatus =
  | "success"
  | "qa_failed"
  | "failed"
  | "partial";

export type DispatchHookReceipt = {
  packageId:
    | typeof DESIGN_DISPATCH_HOOK_PACKAGE_ID
    | "STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-IDEMPOTENCY-1";
  status: HookReceiptStatus;
  idempotencyKey: string;
  dispatchId: string;
  jobId: string;
  campaignId: string;
  skuId: string;
  designSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: string;
  /**
   * The customer request this artifact was produced to satisfy, with workflow
   * fields (correction brief, loop constraints) removed — see `buildRequestKey`.
   *
   * Recorded so entitlement can ask "has this request already been satisfied?"
   * from immutable receipts alone. Absent on receipts written before this field
   * existed; those are recognised instead by the facts their stored spec carries —
   * see `receiptDescribesRequest`.
   */
  requestKey?: string;
  /**
   * Facts the request asked for, recorded at produce time. Stage 0 presentation
   * specs use display case and lockup roles, so a later reader cannot reconstruct
   * this from the stored design-spec alone.
   */
  requestFactSignature?: string;
  renderVersion?: number;
  identity?: DesignArtifactIdentity;
  pngContentSha256?: string;
  pdfContentSha256?: string;
  qaOk?: boolean;
  failureCode?: string;
  message?: string;
  invokedAt: string;
};

export type IdempotencyTuple = {
  dispatchId: string;
  jobId: string;
  skuId: string;
  designSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: string;
  correctionBriefFingerprint: string;
  /**
   * Production method that will build the artifact. The renderer-only method is
   * the historical default and stays out of the key so existing receipts keep
   * binding. A generated visual layer is a different execution.
   */
  productionMethodId?: string;
};

export const RENDERER_ONLY_PRODUCTION_METHOD_ID = "renderer_only" as const;

export function buildIdempotencyTuple(input: {
  dispatchId: string;
  jobId: string;
  skuId: string;
  spec: FlyerDesignSpec;
  correctionBriefFingerprint?: string;
  productionMethodId?: string;
}): IdempotencyTuple {
  return {
    dispatchId: input.dispatchId,
    jobId: input.jobId,
    skuId: input.skuId,
    designSpecFingerprint: fingerprintDesignSpec(input.spec),
    materialFingerprint: fingerprintMaterials(input.spec),
    rendererVersion: DESIGN_RENDERER_VERSION,
    correctionBriefFingerprint: input.correctionBriefFingerprint ?? "none",
    productionMethodId: input.productionMethodId,
  };
}

export function buildIdempotencyKey(tuple: IdempotencyTuple): string {
  const parts = [
    tuple.dispatchId,
    tuple.jobId,
    tuple.skuId,
    tuple.designSpecFingerprint,
    tuple.materialFingerprint,
    tuple.rendererVersion,
    tuple.correctionBriefFingerprint,
  ];
  if (
    tuple.productionMethodId &&
    tuple.productionMethodId !== RENDERER_ONLY_PRODUCTION_METHOD_ID
  ) {
    parts.push(tuple.productionMethodId);
  }
  return parts.join("|");
}

/**
 * The customer's *request*, with workflow removed.
 *
 * The idempotency key answers "may this artifact be served from cache", so it
 * includes how the Studio was trying to satisfy the request — the correction brief,
 * and constraints folded into the spec fingerprint. Those come from correction-loop
 * state, which is mutable and has more than one writer.
 *
 * Spend authority cannot rest on that. This key is the same identity with the
 * workflow fields dropped: dispatch, job, SKU, the request's own deterministic spec,
 * its materials, the renderer version, and the production method. Two invocations of
 * an unchanged customer request produce the same request key no matter what state a
 * correction loop happens to be in, which is what makes "already satisfied" a fact
 * about the request rather than a fact about workflow.
 */
export function buildRequestKey(input: {
  dispatchId: string;
  jobId: string;
  skuId: string;
  /** Fingerprint of the request's spec, reasoned without loop constraints. */
  requestSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: string;
  productionMethodId?: string;
}): string {
  const parts = [
    input.dispatchId,
    input.jobId,
    input.skuId,
    input.requestSpecFingerprint,
    input.materialFingerprint,
    input.rendererVersion,
  ];
  if (
    input.productionMethodId &&
    input.productionMethodId !== RENDERER_ONLY_PRODUCTION_METHOD_ID
  ) {
    parts.push(input.productionMethodId);
  }
  return parts.join("|");
}

/**
 * What a stored artifact must match to count as producing this request.
 *
 * The request key is the fast path and binds exactly, but only artifacts minted
 * after receipts carried a request key have one to compare. Everything older is
 * recognised by what its own stored spec says — see `designFactSignature`. Both
 * sources are immutable: a receipt on disk and the spec the renderer was given.
 */
export type RequestEquivalence = {
  /** Exact match against `receipt.requestKey`. */
  requestKey: string;
  /** Facts the request asks the artifact to carry. */
  factSignature: string;
  dispatchId: string;
  jobId: string;
  skuId: string;
  rendererVersion: string;
  /** Whether this request is for a generated visual layer. */
  hybrid: boolean;
};

function specForVersion(
  repoRoot: string,
  artifactRootRel: string,
  renderVersion: number,
): FlyerDesignSpec | null {
  const specRel = resolveRenderPaths({ artifactRootRel, renderVersion }).specRel;
  return readJsonIfExists<FlyerDesignSpec>(path.join(repoRoot, specRel));
}

/**
 * Whether this receipt records an attempt at the request described by `equivalence`.
 *
 * Two independent ways to match, because the reconstruct-the-old-key approach this
 * replaces could not do it reliably. Rebuilding a historical request key from a
 * stored idempotency key keeps that key's spec fingerprint, which has the layout
 * family baked in — so whether an old artifact was recognised depended on which
 * family the variety selector happened to pick today. Pick a different one and the
 * delivered artifact stopped matching, the request looked new, and the Studio paid
 * to produce a duplicate of something it had already delivered.
 *
 * The fact signature does not have that problem. It is read from the spec stored
 * beside the artifact and is invariant to every styling choice a correction or the
 * variety selector is allowed to make, so an old artifact is recognised by what it
 * tells the customer rather than by how it happened to be laid out.
 *
 * That invariance is also its limit, and why it is confined to receipts with no
 * request key of their own. The projection deliberately discards palette, type,
 * geometry, and which role a string is placed in — so a revision that changes only
 * those would match a delivered artifact and be served back to the customer
 * unchanged. A receipt that *has* a request key needs no such inference: that key is
 * variety-stable, and if it differs, the request genuinely differs. Falling back to
 * facts there would let a coarse match overrule an exact one.
 */
export function receiptDescribesRequest(input: {
  repoRoot: string;
  artifactRootRel: string;
  receipt: DispatchHookReceipt;
  renderVersion: number;
  equivalence: RequestEquivalence;
}): boolean {
  const { receipt, equivalence } = input;
  if (receipt.requestKey) {
    // Exact identity is available for this artifact, so it is the whole answer.
    return receipt.requestKey === equivalence.requestKey;
  }

  // Scope first: facts alone must never let one job's artifact answer another's.
  if (receipt.dispatchId !== equivalence.dispatchId) return false;
  if (receipt.jobId !== equivalence.jobId) return false;
  if (receipt.skuId !== equivalence.skuId) return false;
  if (receipt.rendererVersion !== equivalence.rendererVersion) return false;

  if (receipt.requestFactSignature) {
    if (receipt.requestFactSignature !== equivalence.factSignature) return false;
    const staged = specForVersion(
      input.repoRoot,
      input.artifactRootRel,
      receipt.renderVersion ?? input.renderVersion,
    );
    if (staged) return specCarriesGeneratedVisual(staged) === equivalence.hybrid;
    return !equivalence.hybrid;
  }

  const spec = specForVersion(
    input.repoRoot,
    input.artifactRootRel,
    receipt.renderVersion ?? input.renderVersion,
  );
  // No stored spec means the facts it carries are unverifiable. An unverifiable
  // artifact is not evidence of anything, so it neither satisfies the request nor
  // counts against its budget.
  if (!spec) return false;
  if (specCarriesGeneratedVisual(spec) !== equivalence.hybrid) return false;
  return designFactSignature(spec) === equivalence.factSignature;
}

/**
 * What immutable evidence says about a request: is it already satisfied, and how much
 * production has already been paid for on its behalf.
 *
 * This is the sole factual basis for spend authority. It reads receipts, the specs
 * stored beside the artifacts they describe, and the append-only spend ledger — all
 * immutable. No mutable execution state can influence it.
 */
export function summarizeRequestSatisfaction(input: {
  repoRoot: string;
  artifactRootRel: string;
  equivalence: RequestEquivalence;
}): {
  /** A delivered, QA-passing artifact for this request, if one exists. */
  satisfiedBy: { receipt: DispatchHookReceipt; identity: DesignArtifactIdentity } | null;
  /**
   * Attempts that spent provider money on this request.
   *
   * Counted from two sources because either alone undercounts. Receipts cover every
   * attempt that produced a version — success or QA failure. The spend ledger covers
   * attempts that paid for a generated visual and then failed before there was any
   * version to write a receipt against; without it those attempts read as zero and
   * every repeat invocation is entitled to spend as if it were the first.
   */
  completedAttempts: number;
  /**
   * Whether the spend history could actually be consulted.
   *
   * A ledger that is absent is history: nothing was spent. A ledger that exists and
   * cannot be read is the opposite — spend happened and its extent is unknown, which
   * `completedAttempts` cannot express. Callers must refuse to produce rather than
   * read the resulting count as permission.
   */
  spendHistoryReadable: boolean;
} {
  const rendersDir = path.join(input.repoRoot, input.artifactRootRel, "renders");
  let satisfiedBy: {
    receipt: DispatchHookReceipt;
    identity: DesignArtifactIdentity;
  } | null = null;
  const countedVersions = new Set<number>();

  if (existsSync(rendersDir)) {
    const versions = readdirSync(rendersDir)
      .map((name) => (/^v(\d+)$/.exec(name) ? Number(name.slice(1)) : null))
      .filter((version): version is number => version != null)
      .sort((a, b) => b - a);

    for (const version of versions) {
      const receipt = readJsonIfExists<DispatchHookReceipt>(
        path.join(input.repoRoot, receiptPathForVersion(input.artifactRootRel, version)),
      );
      if (!receipt) continue;
      if (
        !receiptDescribesRequest({
          repoRoot: input.repoRoot,
          artifactRootRel: input.artifactRootRel,
          receipt,
          renderVersion: version,
          equivalence: input.equivalence,
        })
      ) {
        continue;
      }
      if (receipt.status === "success" || receipt.status === "qa_failed") {
        countedVersions.add(version);
      }
      if (satisfiedBy || receipt.status !== "success" || receipt.qaOk !== true) continue;
      // Only an artifact that is still whole and still passing counts as satisfying
      // the request. Highest version first, so the newest delivered artifact wins.
      if (!receipt.identity) continue;
      if (!artifactsIntact(input.repoRoot, receipt.identity)) continue;
      if (!qaRecordOk(input.repoRoot, receipt.identity)) continue;
      satisfiedBy = { receipt, identity: receipt.identity };
    }
  }

  const ledger = readProductionSpendLedger({
    repoRoot: input.repoRoot,
    artifactRootRel: input.artifactRootRel,
  });
  const completedAttempts =
    countedVersions.size +
    unreceiptedPaidAttempts({
      entries: ledger.entries,
      requestKey: input.equivalence.requestKey,
      knownRenderVersions: countedVersions,
    }) +
    // A line torn by a crash is an attempt whose cost cannot be read back. It is
    // charged to this request because a torn write means the ledger was mid-write,
    // which is when spend is most likely to have happened. Which request it belonged
    // to is also unreadable, so it is charged here rather than nowhere.
    ledger.unreadableLines;

  return {
    satisfiedBy,
    completedAttempts,
    spendHistoryReadable: ledger.readable,
  };
}

/**
 * Whether a durable identity alone can stand in for a receipt.
 *
 * Only for the historical execution shape those identities were written under:
 * no correction brief and the renderer-only production method. Any request that
 * depends on a field the identity does not record must find a real receipt whose
 * `idempotencyKey` matches in full, or execute again.
 */
export function legacyIdentityCanBindTuple(tuple: IdempotencyTuple): boolean {
  const noCorrectionBrief =
    !tuple.correctionBriefFingerprint || tuple.correctionBriefFingerprint === "none";
  const rendererOnly =
    !tuple.productionMethodId ||
    tuple.productionMethodId === RENDERER_ONLY_PRODUCTION_METHOD_ID;
  return noCorrectionBrief && rendererOnly;
}

export function idempotencyKeyFileToken(key: string): string {
  // Windows-safe lock/receipt token (no ':' or '|').
  return key.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 180);
}

function receiptPathForVersion(
  artifactRootRel: string,
  renderVersion: number,
): string {
  return `${artifactRootRel}/renders/v${renderVersion}/dispatch-hook-receipt.json`;
}

export function currentReceiptPointerRel(artifactRootRel: string): string {
  return `${artifactRootRel}/current-dispatch-hook-receipt.json`;
}

export function findCurrentSuccessfulReceipt(input: {
  repoRoot: string;
  artifactRootRel: string;
}):
  | { found: true; receipt: DispatchHookReceipt; identity: DesignArtifactIdentity }
  | { found: false; reason: string } {
  const pointerAbs = path.join(
    input.repoRoot,
    currentReceiptPointerRel(input.artifactRootRel),
  );
  const receipt = readJsonIfExists<DispatchHookReceipt>(pointerAbs);
  if (!receipt) return { found: false, reason: "no_current_receipt" };
  if (receipt.status !== "success" || receipt.qaOk !== true || !receipt.identity) {
    return { found: false, reason: "current_receipt_not_success" };
  }
  if (!artifactsIntact(input.repoRoot, receipt.identity)) {
    return { found: false, reason: "current_artifacts_not_intact" };
  }
  if (!qaRecordOk(input.repoRoot, receipt.identity)) {
    return { found: false, reason: "current_qa_not_ok" };
  }
  return { found: true, receipt, identity: receipt.identity };
}

function readJsonIfExists<T>(abs: string): T | null {
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as T;
  } catch {
    return null;
  }
}

function artifactsIntact(
  repoRoot: string,
  identity: DesignArtifactIdentity,
): boolean {
  const pngAbs = path.join(repoRoot, identity.pngRelativePath);
  const pdfAbs = path.join(repoRoot, identity.pdfRelativePath);
  if (!existsSync(pngAbs) || !existsSync(pdfAbs)) return false;
  try {
    return (
      sha256File(pngAbs) === identity.pngContentSha256 &&
      sha256File(pdfAbs) === identity.pdfContentSha256
    );
  } catch {
    return false;
  }
}

function qaRecordOk(repoRoot: string, identity: DesignArtifactIdentity): boolean {
  const qaRel = identity.pngRelativePath.replace(/\.png$/i, ".design-qa.json");
  const qa = readJsonIfExists<{ ok?: boolean }>(path.join(repoRoot, qaRel));
  if (!qa) return false;
  return qa.ok === true;
}

/**
 * Find a reusable successful render for this exact execution fingerprint.
 * Ignores qa_failed / failed / partial / incomplete evidence.
 */
export function findSuccessfulRenderForFingerprint(input: {
  repoRoot: string;
  artifactRootRel: string;
  tuple: IdempotencyTuple;
}):
  | { found: true; receipt: DispatchHookReceipt; identity: DesignArtifactIdentity }
  | { found: false; reason: string } {
  const key = buildIdempotencyKey(input.tuple);
  const rendersDir = path.join(input.repoRoot, input.artifactRootRel, "renders");
  if (!existsSync(rendersDir)) {
    return { found: false, reason: "no_renders_dir" };
  }

  const versions = readdirSync(rendersDir)
    .map((name) => {
      const m = /^v(\d+)$/.exec(name);
      return m ? Number(m[1]) : null;
    })
    .filter((n): n is number => n != null)
    .sort((a, b) => b - a);

  for (const version of versions) {
    const paths = resolveRenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion: version,
    });
    const receiptRel = receiptPathForVersion(input.artifactRootRel, version);
    const receipt = readJsonIfExists<DispatchHookReceipt>(
      path.join(input.repoRoot, receiptRel),
    );
    const identity = readJsonIfExists<DesignArtifactIdentity>(
      path.join(input.repoRoot, paths.identityRel),
    );

    if (receipt) {
      if (receipt.status !== "success") continue;
      if (receipt.idempotencyKey !== key) continue;
      if (!receipt.identity) continue;
      if (!artifactsIntact(input.repoRoot, receipt.identity)) continue;
      if (!qaRecordOk(input.repoRoot, receipt.identity)) continue;
      if (receipt.qaOk !== true) continue;
      if (
        receipt.designSpecFingerprint !== input.tuple.designSpecFingerprint ||
        receipt.materialFingerprint !== input.tuple.materialFingerprint ||
        receipt.rendererVersion !== input.tuple.rendererVersion
      ) {
        continue;
      }
      return { found: true, receipt, identity: receipt.identity };
    }

    // Legacy / receipt-missing but durable identity+QA still bind the fingerprint.
    if (!identity) continue;
    // `DesignArtifactIdentity` predates the correction brief and the production
    // method, so it cannot prove either field. Reusing on the fields it *can*
    // prove would serve renderer-only pixels as a hybrid build, or serve the
    // pre-correction artifact for a correction request — the identity would look
    // like a match because the differing input is simply not recorded in it.
    // A receipt is required whenever the request depends on those fields.
    if (!legacyIdentityCanBindTuple(input.tuple)) continue;
    if (identity.dispatchId !== input.tuple.dispatchId) continue;
    if (identity.jobId !== input.tuple.jobId) continue;
    if (identity.skuId !== input.tuple.skuId) continue;
    if (
      identity.designSpecFingerprint !== input.tuple.designSpecFingerprint ||
      identity.materialFingerprint !== input.tuple.materialFingerprint ||
      identity.rendererVersion !== input.tuple.rendererVersion
    ) {
      continue;
    }
    if (!artifactsIntact(input.repoRoot, identity)) continue;
    if (!qaRecordOk(input.repoRoot, identity)) continue;

    const synthesized: DispatchHookReceipt = {
      packageId: DESIGN_DISPATCH_HOOK_PACKAGE_ID,
      status: "success",
      idempotencyKey: key,
      dispatchId: identity.dispatchId,
      jobId: identity.jobId,
      campaignId: identity.campaignId,
      skuId: identity.skuId,
      designSpecFingerprint: identity.designSpecFingerprint,
      materialFingerprint: identity.materialFingerprint,
      rendererVersion: identity.rendererVersion,
      renderVersion: identity.renderVersion,
      identity,
      pngContentSha256: identity.pngContentSha256,
      pdfContentSha256: identity.pdfContentSha256,
      qaOk: true,
      invokedAt: identity.createdAt,
    };
    return { found: true, receipt: synthesized, identity };
  }

  return { found: false, reason: "no_matching_success" };
}

/**
 * Detect incomplete render folders (bytes without durable identity).
 * QA-failed versions with identity+receipt are not "partial" — they simply are not reusable successes.
 */
export function findPartialRenderState(input: {
  repoRoot: string;
  artifactRootRel: string;
}): { partial: boolean; detail: string } {
  const rendersDir = path.join(input.repoRoot, input.artifactRootRel, "renders");
  if (!existsSync(rendersDir)) return { partial: false, detail: "none" };

  for (const name of readdirSync(rendersDir)) {
    const m = /^v(\d+)$/.exec(name);
    if (!m) continue;
    const version = Number(m[1]);
    const paths = resolveRenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion: version,
    });
    const receiptRel = receiptPathForVersion(input.artifactRootRel, version);
    const receipt = readJsonIfExists<DispatchHookReceipt>(
      path.join(input.repoRoot, receiptRel),
    );
    if (receipt?.status === "partial") {
      return { partial: true, detail: `renders/v${version} marked partial` };
    }

    const pngAbs = path.join(input.repoRoot, paths.pngRel);
    const identityAbs = path.join(input.repoRoot, paths.identityRel);
    const hasPng = existsSync(pngAbs);
    const hasIdentity = existsSync(identityAbs);

    if (hasPng && !hasIdentity) {
      return {
        partial: true,
        detail: `renders/v${version} has PNG without artifact-identity`,
      };
    }
    if (hasIdentity && !hasPng) {
      return {
        partial: true,
        detail: `renders/v${version} has identity without PNG`,
      };
    }
  }
  return { partial: false, detail: "none" };
}

export function writeImmutableVersionReceipt(input: {
  repoRoot: string;
  artifactRootRel: string;
  receipt: DispatchHookReceipt;
  renderVersion: number;
}): { versionReceiptRel: string; pointerRel: string } {
  const versionReceiptRel = receiptPathForVersion(
    input.artifactRootRel,
    input.renderVersion,
  );
  const versionAbs = path.join(input.repoRoot, versionReceiptRel);
  mkdirSync(path.dirname(versionAbs), { recursive: true });

  if (existsSync(versionAbs)) {
    // Immutable: never overwrite an existing version receipt.
    throw new Error(
      `RECEIPT_IMMUTABLE: ${versionReceiptRel} already exists — refusing overwrite`,
    );
  }

  writeFileSync(versionAbs, `${JSON.stringify(input.receipt, null, 2)}\n`, "utf8");

  const pointerRel = currentReceiptPointerRel(input.artifactRootRel);
  const pointerAbs = path.join(input.repoRoot, pointerRel);
  writeFileSync(pointerAbs, `${JSON.stringify(input.receipt, null, 2)}\n`, "utf8");

  return { versionReceiptRel, pointerRel };
}

/**
 * The render lock, as a sequence of generations that are never deleted.
 *
 * Four revisions of this lock were wrong in the same way, and the shape is worth naming
 * because it is easy to walk into again. Each revision let one process *delete* a lock
 * file on the strength of something it had read earlier:
 *
 * 1. Read the holder, then `unlink`. Two contenders read the same dead holder and both
 *    deleted — the second deleting the replacement the first had already created.
 * 2. Read the holder, then `rename` it aside. Same defect: `rename` acts on whatever
 *    occupies the path, not the file that was read.
 * 3. Re-read under an exclusive `.reclaim` marker. Better, but the marker's own leaked-
 *    marker cleanup was read-then-`unlink` — the original bug, one level down. A
 *    separate mtime-based path could also delete a *live* holder's lock, because
 *    `wx` creates the file before its payload is written, so a healthy holder is briefly
 *    indistinguishable from a torn one.
 *
 * The lesson is that the bug was never in the deletion primitive. It was in deleting at
 * all: a filesystem path is not an identity, so any check followed by a delete is a
 * check of one file followed by a delete of possibly another.
 *
 * So nothing shared is ever deleted here. A request's lock is a directory of numbered
 * generations, and taking the lock means *creating the next number*:
 *
 *   locks/<token>/g1        holder record for generation 1
 *   locks/<token>/g1.done   generation 1 finished
 *   locks/<token>/g2        holder record for generation 2
 *
 * The current generation is the highest `gN` present. It is held unless it has finished
 * (`gN.done` exists) or its process is gone. A contender may then create `g(N+1)`, and
 * because creation is exclusive, exactly one contender can. Everything else follows:
 *
 * - **A live holder cannot be displaced.** Displacing it requires creating a higher
 *   generation, which requires the current one to be finished or dead.
 * - **A stale reading is harmless.** Acting on one means trying to create a generation
 *   that already exists, which fails; the caller re-reads and tries again.
 * - **A crash needs no cleanup.** The holder's process is gone, so the next contender
 *   simply takes the next generation.
 * - **Releasing cannot harm anyone.** It creates `gN.done` rather than deleting `gN`, so
 *   a holder returning late has nothing to delete and no way to affect a successor.
 * - **There is no torn-payload state.** A generation record is written to a private
 *   temporary file and *linked* into place, so it is either absent or complete.
 *
 * Generations accumulate, which is the price of never deleting. A satisfied request stops
 * taking the lock at all, since entitlement resolves `ALREADY_RENDERED` before locking, so
 * in practice this is a handful of records per request — but it is not a hard bound: a
 * request that keeps failing without spending can keep opening generations, and the
 * numbers eventually exhaust and fail closed. Records left by crashed holders are also
 * the evidence anyone debugging a stuck request would want.
 *
 * Same-host only, which is what these file locks already assumed.
 */
type RenderLockPayload = {
  lockKey: string;
  /** Identifies *this* holder, so nobody else's generation can be mistaken for it. */
  owner: string;
  pid: number;
  generation: number;
  acquiredAt: string;
};

export type RenderLockHandle = {
  /** The generation record this holder created. Nothing else ever writes to it. */
  lockAbs: string;
  owner: string;
  generation: number;
  release: () => void;
};

function readLockPayload(lockAbs: string): RenderLockPayload | null {
  try {
    return JSON.parse(readFileSync(lockAbs, "utf8")) as RenderLockPayload;
  } catch {
    return null;
  }
}

/** Highest generation present, and 0 when the request has never been locked. */
function currentGeneration(lockDirAbs: string): number | null {
  let names: string[];
  try {
    names = readdirSync(lockDirAbs);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return 0;
    // An unreadable lock directory cannot be reasoned about, and guessing here is how
    // money gets spent twice. Refusing is free.
    return null;
  }

  let highest = 0;
  for (const name of names) {
    const match = /^g(\d+)$/.exec(name);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isSafeInteger(n) && n > highest) highest = n;
  }
  return highest;
}

/**
 * Publish a generation record so that it is either absent or complete, and so that
 * exactly one contender can publish generation N.
 *
 * `link` supplies both properties at once: the payload is fully written and flushed to a
 * private temporary file first, and linking it into place fails with `EEXIST` if anyone
 * else got there. Creating the target directly with `wx` would give exclusivity but not
 * completeness — the file appears before its contents do.
 */
function publishGeneration(input: {
  lockDirAbs: string;
  generation: number;
  payload: RenderLockPayload;
}): "published" | "taken" | "unavailable" {
  const targetAbs = path.join(input.lockDirAbs, `g${input.generation}`);
  const tempAbs = path.join(
    input.lockDirAbs,
    `g${input.generation}.${input.payload.owner}.pending`,
  );

  try {
    const fd = openSync(tempAbs, "wx");
    try {
      writeSync(fd, `${JSON.stringify(input.payload)}\n`, null, "utf8");
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  } catch {
    return "unavailable";
  }

  let outcome: "published" | "taken" | "unavailable";
  try {
    linkSync(tempAbs, targetAbs);
    outcome = "published";
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "EEXIST") {
      outcome = "taken";
    } else {
      // Filesystems without hard links (some network and FAT volumes) leave exclusive
      // create as the only option. It cannot guarantee completeness, but nothing acts on
      // an incomplete record: an unreadable generation reads as held, which is refusal.
      // A crash inside this write therefore holds the request until someone deletes the
      // one file by hand — free and visible, unlike the alternative of reading a partial
      // record as free and displacing a holder that is still producing.
      try {
        const fd = openSync(targetAbs, "wx");
        try {
          writeSync(fd, `${JSON.stringify(input.payload)}\n`, null, "utf8");
          fsyncSync(fd);
        } finally {
          closeSync(fd);
        }
        outcome = "published";
      } catch (fallbackError) {
        outcome =
          (fallbackError as NodeJS.ErrnoException).code === "EEXIST"
            ? "taken"
            : "unavailable";
      }
    }
  }

  // Deleting a name that contains our own owner id, which no other process can hold.
  try {
    unlinkSync(tempAbs);
  } catch {
    /* a leftover pending file is inert — nothing reads it */
  }

  return outcome;
}

/**
 * Whether the process that holds this lock still exists.
 *
 * Signal 0 checks for existence without delivering anything. `EPERM` means the
 * process is alive but owned by another user, which still counts as alive. A lock
 * whose holder is gone is safe to take immediately, whatever its lease says.
 *
 * Same-host only, which is what these file locks already assume.
 */
function lockHolderIsAlive(payload: RenderLockPayload): boolean {
  if (!Number.isInteger(payload.pid) || payload.pid <= 0) return false;
  if (payload.pid === process.pid) return true;
  try {
    process.kill(payload.pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Whether the generation currently at the top of the sequence is still held.
 *
 * Held means a holder could still be producing under it. Only two things end a
 * generation: the holder marking it finished, or the holder's process ceasing to exist.
 * Elapsed time is deliberately not one of them — a live process that has gone quiet
 * (blocked event loop, long synchronous export) is still producing, and displacing it
 * means paying twice for the same request. Refusing is merely slow, and a permanently
 * stuck request surfaces as `CONCURRENT_IN_PROGRESS`: visible, free, fixable by hand.
 */
function generationIsHeld(lockDirAbs: string, generation: number): boolean {
  if (generation <= 0) return false;
  if (existsSync(path.join(lockDirAbs, `g${generation}.done`))) return false;

  const payload = readLockPayload(path.join(lockDirAbs, `g${generation}`));
  // Unreadable is treated as held. `link` makes this state unreachable in normal
  // operation, and reading it as free would be a licence to displace a live holder.
  if (!payload) return true;

  if (!Number.isInteger(payload.pid) || payload.pid <= 0) return false;
  if (payload.pid === process.pid) return true;
  try {
    // Signal 0 tests for existence without delivering anything. `EPERM` means the
    // process is alive but owned by another user, which still counts as alive.
    process.kill(payload.pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Take the render lock for one request by creating the next generation.
 *
 * `stale_cleared_retry` means the sequence moved while we were looking — someone else
 * created the generation we were about to. The caller re-reads and tries again rather
 * than acting on what it saw a moment ago.
 */
export function tryAcquireRenderLock(input: {
  repoRoot: string;
  artifactRootRel: string;
  idempotencyKey: string;
}):
  | { ok: true; handle: RenderLockHandle }
  | { ok: false; reason: "busy" | "stale_cleared_retry" } {
  const token = idempotencyKeyFileToken(input.idempotencyKey);
  const lockDirAbs = path.join(
    input.repoRoot,
    `${input.artifactRootRel}/locks/${token}`,
  );

  try {
    mkdirSync(lockDirAbs, { recursive: true });
  } catch {
    return { ok: false, reason: "busy" };
  }

  const highest = currentGeneration(lockDirAbs);
  if (highest === null) return { ok: false, reason: "busy" };
  if (generationIsHeld(lockDirAbs, highest)) return { ok: false, reason: "busy" };

  const generation = highest + 1;
  const owner = randomUUID();
  const published = publishGeneration({
    lockDirAbs,
    generation,
    payload: {
      lockKey: input.idempotencyKey,
      owner,
      pid: process.pid,
      generation,
      acquiredAt: new Date().toISOString(),
    },
  });

  // Someone else published this generation first. Whether they are still holding it is
  // not ours to assume, so look again from the top.
  if (published === "taken") return { ok: false, reason: "stale_cleared_retry" };
  if (published === "unavailable") return { ok: false, reason: "busy" };

  const lockAbs = path.join(lockDirAbs, `g${generation}`);
  return {
    ok: true,
    handle: {
      lockAbs,
      owner,
      generation,
      release: () => {
        // Marking finished, not deleting. A holder returning late therefore has nothing
        // to delete, and cannot affect whoever legitimately took the lock after it.
        try {
          closeSync(openSync(path.join(lockDirAbs, `g${generation}.done`), "wx"));
        } catch {
          /* already marked, or unwritable; either way nothing to undo */
        }
      },
    },
  };
}

/**
 * Serialize production of one *request*, not one execution identity.
 *
 * The lock used to be keyed on the idempotency key, which folds in the correction
 * brief and the loop constraints — mutable state with more than one writer. Two
 * concurrent invocations of the same customer request holding different stale brief
 * state computed different keys, took different locks, each looked and saw the
 * request unsatisfied, and each produced. The lock was held throughout and prevented
 * nothing, because they were never contending for the same one.
 *
 * `lockKey` is therefore the request key. Whatever workflow state an invocation
 * arrives with, all invocations of the same request contend for the same lock, so the
 * entitlement recheck the winner performs is the last word for that request.
 */
export async function acquireRenderLockWithBriefWait(input: {
  repoRoot: string;
  artifactRootRel: string;
  lockKey: string;
  lookup: () =>
    | { found: true; receipt: DispatchHookReceipt; identity: DesignArtifactIdentity }
    | { found: false; reason: string };
}): Promise<
  | { ok: true; handle: RenderLockHandle }
  | { ok: false; already?: { receipt: DispatchHookReceipt; identity: DesignArtifactIdentity }; busy: true }
> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const acquired = tryAcquireRenderLock({
      repoRoot: input.repoRoot,
      artifactRootRel: input.artifactRootRel,
      idempotencyKey: input.lockKey,
    });
    if (acquired.ok) return { ok: true, handle: acquired.handle };

    const existing = input.lookup();
    if (existing.found) {
      return {
        ok: false,
        busy: true,
        already: { receipt: existing.receipt, identity: existing.identity },
      };
    }

    if (acquired.reason === "stale_cleared_retry") continue;
    await new Promise((r) => setTimeout(r, 40 + attempt * 20));
  }

  const existing = input.lookup();
  if (existing.found) {
    return {
      ok: false,
      busy: true,
      already: { receipt: existing.receipt, identity: existing.identity },
    };
  }
  return { ok: false, busy: true };
}
