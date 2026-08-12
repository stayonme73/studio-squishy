/**
 * STUDIO-OPERATING-DESIGN-MENU-DISPATCH-HOOK-1
 * Idempotency for single-surface menu renders — modeled on flyer hook-idempotency.
 * Does not alter flyer/card receipt / identity lookup.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import path from "path";

import {
  MENU_RENDERER_VERSION,
  fingerprintMenuDesignSpec,
  fingerprintMenuMaterials,
  resolveMenuRenderPaths,
  sha256File,
} from "@/lib/studio-design-renderer";
import type {
  MenuArtifactIdentity,
  MenuDesignSpec,
} from "@/lib/studio-design-renderer";

import {
  tryAcquireRenderLock,
  type RenderLockHandle,
} from "./hook-idempotency";

export const MENU_DISPATCH_HOOK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-MENU-DISPATCH-HOOK-1" as const;

export type MenuHookReceiptStatus =
  | "success"
  | "qa_failed"
  | "failed"
  | "partial";

export type MenuDispatchHookReceipt = {
  packageId: typeof MENU_DISPATCH_HOOK_PACKAGE_ID;
  status: MenuHookReceiptStatus;
  idempotencyKey: string;
  dispatchId: string;
  jobId: string;
  campaignId: string;
  skuId: string;
  designSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: string;
  renderVersion?: number;
  identity?: MenuArtifactIdentity;
  pngContentSha256?: string;
  pdfContentSha256?: string;
  qaOk?: boolean;
  failureCode?: string;
  message?: string;
  invokedAt: string;
};

export type MenuIdempotencyTuple = {
  dispatchId: string;
  jobId: string;
  skuId: string;
  designSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: string;
};

export function buildMenuIdempotencyTuple(input: {
  dispatchId: string;
  jobId: string;
  skuId: string;
  spec: MenuDesignSpec;
}): MenuIdempotencyTuple {
  return {
    dispatchId: input.dispatchId,
    jobId: input.jobId,
    skuId: input.skuId,
    designSpecFingerprint: fingerprintMenuDesignSpec(input.spec),
    materialFingerprint: fingerprintMenuMaterials(input.spec),
    rendererVersion: MENU_RENDERER_VERSION,
  };
}

export function buildMenuIdempotencyKey(tuple: MenuIdempotencyTuple): string {
  return [
    tuple.dispatchId,
    tuple.jobId,
    tuple.skuId,
    tuple.designSpecFingerprint,
    tuple.materialFingerprint,
    tuple.rendererVersion,
  ].join("|");
}

function receiptPathForVersion(
  artifactRootRel: string,
  renderVersion: number,
): string {
  return `${artifactRootRel}/renders/v${renderVersion}/dispatch-hook-receipt.json`;
}

export function currentMenuReceiptPointerRel(artifactRootRel: string): string {
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

function menuArtifactsIntact(
  repoRoot: string,
  identity: MenuArtifactIdentity,
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

function menuQaRecordOk(
  repoRoot: string,
  identity: MenuArtifactIdentity,
): boolean {
  const qaRel = identity.pngRelativePath.replace(/\.png$/i, ".design-qa.json");
  const qa = readJsonIfExists<{ ok?: boolean }>(path.join(repoRoot, qaRel));
  if (!qa) return false;
  return qa.ok === true;
}

export function findSuccessfulMenuRenderForFingerprint(input: {
  repoRoot: string;
  artifactRootRel: string;
  tuple: MenuIdempotencyTuple;
}):
  | {
      found: true;
      receipt: MenuDispatchHookReceipt;
      identity: MenuArtifactIdentity;
    }
  | { found: false; reason: string } {
  const key = buildMenuIdempotencyKey(input.tuple);
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
    const paths = resolveMenuRenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion: version,
    });
    const receiptRel = receiptPathForVersion(input.artifactRootRel, version);
    const receipt = readJsonIfExists<MenuDispatchHookReceipt>(
      path.join(input.repoRoot, receiptRel),
    );
    const identity = readJsonIfExists<MenuArtifactIdentity>(
      path.join(input.repoRoot, paths.identityRel),
    );

    if (receipt) {
      if (receipt.status !== "success") continue;
      if (receipt.idempotencyKey !== key) continue;
      if (!receipt.identity) continue;
      if (!menuArtifactsIntact(input.repoRoot, receipt.identity)) continue;
      if (!menuQaRecordOk(input.repoRoot, receipt.identity)) continue;
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
    if (!menuArtifactsIntact(input.repoRoot, identity)) continue;
    if (!menuQaRecordOk(input.repoRoot, identity)) continue;

    const synthesized: MenuDispatchHookReceipt = {
      packageId: MENU_DISPATCH_HOOK_PACKAGE_ID,
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

export function findPartialMenuRenderState(input: {
  repoRoot: string;
  artifactRootRel: string;
}): { partial: boolean; detail: string } {
  const rendersDir = path.join(input.repoRoot, input.artifactRootRel, "renders");
  if (!existsSync(rendersDir)) return { partial: false, detail: "none" };

  for (const name of readdirSync(rendersDir)) {
    const m = /^v(\d+)$/.exec(name);
    if (!m) continue;
    const version = Number(m[1]);
    const paths = resolveMenuRenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion: version,
    });
    const receipt = readJsonIfExists<MenuDispatchHookReceipt>(
      path.join(
        input.repoRoot,
        receiptPathForVersion(input.artifactRootRel, version),
      ),
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

export function writeImmutableMenuVersionReceipt(input: {
  repoRoot: string;
  artifactRootRel: string;
  receipt: MenuDispatchHookReceipt;
  renderVersion: number;
}): { versionReceiptRel: string; pointerRel: string } {
  const versionReceiptRel = receiptPathForVersion(
    input.artifactRootRel,
    input.renderVersion,
  );
  const versionAbs = path.join(input.repoRoot, versionReceiptRel);
  mkdirSync(path.dirname(versionAbs), { recursive: true });

  if (existsSync(versionAbs)) {
    throw new Error(
      `RECEIPT_IMMUTABLE: ${versionReceiptRel} already exists — refusing overwrite`,
    );
  }

  writeFileSync(versionAbs, `${JSON.stringify(input.receipt, null, 2)}\n`, "utf8");

  const pointerRel = currentMenuReceiptPointerRel(input.artifactRootRel);
  writeFileSync(
    path.join(input.repoRoot, pointerRel),
    `${JSON.stringify(input.receipt, null, 2)}\n`,
    "utf8",
  );

  return { versionReceiptRel, pointerRel };
}

export async function acquireMenuRenderLockWithBriefWait(input: {
  repoRoot: string;
  artifactRootRel: string;
  idempotencyKey: string;
  lookup: () =>
    | {
        found: true;
        receipt: MenuDispatchHookReceipt;
        identity: MenuArtifactIdentity;
      }
    | { found: false; reason: string };
}): Promise<
  | { ok: true; handle: RenderLockHandle }
  | {
      ok: false;
      already?: {
        receipt: MenuDispatchHookReceipt;
        identity: MenuArtifactIdentity;
      };
      busy: true;
    }
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
