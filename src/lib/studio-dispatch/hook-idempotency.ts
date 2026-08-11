/**
 * STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-IDEMPOTENCY-1
 * Durable lookup + lock for one successful identity per execution fingerprint.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import path from "path";

import {
  DESIGN_RENDERER_VERSION,
  fingerprintDesignSpec,
  fingerprintMaterials,
  resolveRenderPaths,
  sha256File,
} from "@/lib/studio-design-renderer";
import type {
  DesignArtifactIdentity,
  FlyerDesignSpec,
} from "@/lib/studio-design-renderer";

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
};

export function buildIdempotencyTuple(input: {
  dispatchId: string;
  jobId: string;
  skuId: string;
  spec: FlyerDesignSpec;
}): IdempotencyTuple {
  return {
    dispatchId: input.dispatchId,
    jobId: input.jobId,
    skuId: input.skuId,
    designSpecFingerprint: fingerprintDesignSpec(input.spec),
    materialFingerprint: fingerprintMaterials(input.spec),
    rendererVersion: DESIGN_RENDERER_VERSION,
  };
}

export function buildIdempotencyKey(tuple: IdempotencyTuple): string {
  return [
    tuple.dispatchId,
    tuple.jobId,
    tuple.skuId,
    tuple.designSpecFingerprint,
    tuple.materialFingerprint,
    tuple.rendererVersion,
  ].join("|");
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

const STALE_LOCK_MS = 120_000;

export type RenderLockHandle = {
  lockAbs: string;
  release: () => void;
};

/**
 * Narrow exclusive lock per fingerprint (wx create). No queue system.
 */
export function tryAcquireRenderLock(input: {
  repoRoot: string;
  artifactRootRel: string;
  idempotencyKey: string;
}):
  | { ok: true; handle: RenderLockHandle }
  | { ok: false; reason: "busy" | "stale_cleared_retry" } {
  const token = idempotencyKeyFileToken(input.idempotencyKey);
  const lockRel = `${input.artifactRootRel}/locks/${token}.lock`;
  const lockAbs = path.join(input.repoRoot, lockRel);
  mkdirSync(path.dirname(lockAbs), { recursive: true });

  const payload = JSON.stringify({
    idempotencyKey: input.idempotencyKey,
    pid: process.pid,
    acquiredAt: new Date().toISOString(),
  });

  try {
    writeFileSync(lockAbs, `${payload}\n`, { flag: "wx" });
    return {
      ok: true,
      handle: {
        lockAbs,
        release: () => {
          try {
            if (existsSync(lockAbs)) unlinkSync(lockAbs);
          } catch {
            /* ignore */
          }
        },
      },
    };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code !== "EEXIST") throw e;

    // Stale lock recovery (narrow): if lock older than STALE_LOCK_MS, clear once.
    try {
      const raw = readFileSync(lockAbs, "utf8");
      const parsed = JSON.parse(raw) as { acquiredAt?: string };
      const acquired = parsed.acquiredAt
        ? Date.parse(parsed.acquiredAt)
        : NaN;
      if (Number.isFinite(acquired) && Date.now() - acquired > STALE_LOCK_MS) {
        unlinkSync(lockAbs);
        return { ok: false, reason: "stale_cleared_retry" };
      }
    } catch {
      /* busy */
    }
    return { ok: false, reason: "busy" };
  }
}

export async function acquireRenderLockWithBriefWait(input: {
  repoRoot: string;
  artifactRootRel: string;
  idempotencyKey: string;
  lookup: () =>
    | { found: true; receipt: DispatchHookReceipt; identity: DesignArtifactIdentity }
    | { found: false; reason: string };
}): Promise<
  | { ok: true; handle: RenderLockHandle }
  | { ok: false; already?: { receipt: DispatchHookReceipt; identity: DesignArtifactIdentity }; busy: true }
> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const acquired = tryAcquireRenderLock(input);
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
