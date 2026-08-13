/**
 * STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-DISPATCH-HOOK-1
 * Idempotency for two-asset promotion-graphics campaign-set renders.
 * Does not alter flyer/card/menu/service-sheet receipt / identity lookup.
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
  PROMO_RENDERER_VERSION,
  fingerprintPromoMaterials,
  fingerprintPromoSharedSpec,
  resolvePromoRenderPaths,
  sha256File,
} from "@/lib/studio-design-renderer";
import type {
  PromoCampaignSetIdentity,
  PromoCampaignSetSpec,
} from "@/lib/studio-design-renderer";

import {
  tryAcquireRenderLock,
  type RenderLockHandle,
} from "./hook-idempotency";

export const PROMO_DISPATCH_HOOK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-DISPATCH-HOOK-1" as const;

export type PromoHookReceiptStatus =
  | "success"
  | "qa_failed"
  | "failed"
  | "partial";

export type PromoDispatchHookReceipt = {
  packageId: typeof PROMO_DISPATCH_HOOK_PACKAGE_ID;
  status: PromoHookReceiptStatus;
  idempotencyKey: string;
  dispatchId: string;
  jobId: string;
  campaignId: string;
  skuId: string;
  sharedSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: string;
  campaignSetRenderVersion?: number;
  identity?: PromoCampaignSetIdentity;
  assetAPngSha?: string;
  assetBPngSha?: string;
  qaOk?: boolean;
  failureCode?: string;
  message?: string;
  invokedAt: string;
};

export type PromoIdempotencyTuple = {
  dispatchId: string;
  jobId: string;
  skuId: string;
  sharedSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: string;
};

export function buildPromoIdempotencyTuple(input: {
  dispatchId: string;
  jobId: string;
  skuId: string;
  spec: PromoCampaignSetSpec;
}): PromoIdempotencyTuple {
  return {
    dispatchId: input.dispatchId,
    jobId: input.jobId,
    skuId: input.skuId,
    sharedSpecFingerprint: fingerprintPromoSharedSpec(input.spec),
    materialFingerprint: fingerprintPromoMaterials(input.spec),
    rendererVersion: PROMO_RENDERER_VERSION,
  };
}

export function buildPromoIdempotencyKey(tuple: PromoIdempotencyTuple): string {
  return [
    tuple.dispatchId,
    tuple.jobId,
    tuple.skuId,
    tuple.sharedSpecFingerprint,
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

export function currentPromoReceiptPointerRel(artifactRootRel: string): string {
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

function promoSetQaRelFromIdentity(identity: PromoCampaignSetIdentity): string {
  return identity.designSpecRelativePath.replace(
    /campaign-set-design-spec\.json$/i,
    "campaign-set.design-qa.json",
  );
}

function promoArtifactsIntact(
  repoRoot: string,
  identity: PromoCampaignSetIdentity,
): boolean {
  if (identity.assets.length !== 2) return false;
  for (const asset of identity.assets) {
    const pngAbs = path.join(repoRoot, asset.pngRelativePath);
    const pdfAbs = path.join(repoRoot, asset.pdfRelativePath);
    if (!existsSync(pngAbs) || !existsSync(pdfAbs)) return false;
    try {
      if (
        sha256File(pngAbs) !== asset.pngContentSha256 ||
        sha256File(pdfAbs) !== asset.pdfContentSha256
      ) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

function promoSetQaRecordOk(
  repoRoot: string,
  identity: PromoCampaignSetIdentity,
): boolean {
  const qaRel = promoSetQaRelFromIdentity(identity);
  const qa = readJsonIfExists<{ ok?: boolean }>(path.join(repoRoot, qaRel));
  if (!qa) return false;
  return qa.ok === true;
}

export function findSuccessfulPromoRenderForFingerprint(input: {
  repoRoot: string;
  artifactRootRel: string;
  tuple: PromoIdempotencyTuple;
}):
  | {
      found: true;
      receipt: PromoDispatchHookReceipt;
      identity: PromoCampaignSetIdentity;
    }
  | { found: false; reason: string } {
  const key = buildPromoIdempotencyKey(input.tuple);
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
    const setPaths = resolvePromoRenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion: version,
      assetId: "set",
    });
    const receiptRel = receiptPathForVersion(input.artifactRootRel, version);
    const receipt = readJsonIfExists<PromoDispatchHookReceipt>(
      path.join(input.repoRoot, receiptRel),
    );
    const identity = readJsonIfExists<PromoCampaignSetIdentity>(
      path.join(input.repoRoot, setPaths.identityRel),
    );

    if (receipt) {
      if (receipt.status !== "success") continue;
      if (receipt.idempotencyKey !== key) continue;
      if (!receipt.identity) continue;
      if (!promoArtifactsIntact(input.repoRoot, receipt.identity)) continue;
      if (!promoSetQaRecordOk(input.repoRoot, receipt.identity)) continue;
      if (receipt.qaOk !== true) continue;
      if (
        receipt.sharedSpecFingerprint !== input.tuple.sharedSpecFingerprint ||
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
      identity.sharedSpecFingerprint !== input.tuple.sharedSpecFingerprint ||
      identity.materialFingerprint !== input.tuple.materialFingerprint ||
      identity.rendererVersion !== input.tuple.rendererVersion
    ) {
      continue;
    }
    if (!identity.setQaOk) continue;
    if (!promoArtifactsIntact(input.repoRoot, identity)) continue;
    if (!promoSetQaRecordOk(input.repoRoot, identity)) continue;

    const [assetA, assetB] = identity.assets;
    const synthesized: PromoDispatchHookReceipt = {
      packageId: PROMO_DISPATCH_HOOK_PACKAGE_ID,
      status: "success",
      idempotencyKey: key,
      dispatchId: identity.dispatchId,
      jobId: identity.jobId,
      campaignId: identity.campaignId,
      skuId: identity.skuId,
      sharedSpecFingerprint: identity.sharedSpecFingerprint,
      materialFingerprint: identity.materialFingerprint,
      rendererVersion: identity.rendererVersion,
      campaignSetRenderVersion: identity.campaignSetRenderVersion,
      identity,
      assetAPngSha: assetA.pngContentSha256,
      assetBPngSha: assetB.pngContentSha256,
      qaOk: true,
      invokedAt: identity.createdAt,
    };
    return { found: true, receipt: synthesized, identity };
  }

  return { found: false, reason: "no_matching_success" };
}

export function findPartialPromoRenderState(input: {
  repoRoot: string;
  artifactRootRel: string;
}): { partial: boolean; detail: string } {
  const rendersDir = path.join(input.repoRoot, input.artifactRootRel, "renders");
  if (!existsSync(rendersDir)) return { partial: false, detail: "none" };

  for (const name of readdirSync(rendersDir)) {
    const m = /^v(\d+)$/.exec(name);
    if (!m) continue;
    const version = Number(m[1]);
    const versionDir = path.join(rendersDir, name);
    const setPaths = resolvePromoRenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion: version,
      assetId: "set",
    });
    const receipt = readJsonIfExists<PromoDispatchHookReceipt>(
      path.join(
        input.repoRoot,
        receiptPathForVersion(input.artifactRootRel, version),
      ),
    );
    if (receipt?.status === "partial") {
      return { partial: true, detail: `renders/v${version} marked partial` };
    }

    const specAbs = path.join(input.repoRoot, setPaths.specRel);
    const identityAbs = path.join(input.repoRoot, setPaths.identityRel);
    const hasSpec = existsSync(specAbs);
    const hasIdentity = existsSync(identityAbs);

    const pngFiles = readdirSync(versionDir).filter((f) =>
      f.toLowerCase().endsWith(".png"),
    );
    const hasAnyPng = pngFiles.length > 0;

    if (hasSpec && !hasIdentity) {
      return {
        partial: true,
        detail: `renders/v${version} has campaign-set design-spec without artifact-identity`,
      };
    }
    if (hasAnyPng && !hasIdentity) {
      return {
        partial: true,
        detail: `renders/v${version} has asset PNG(s) without artifact-identity`,
      };
    }

    if (hasIdentity) {
      const identity = readJsonIfExists<PromoCampaignSetIdentity>(identityAbs);
      if (identity && identity.setQaOk === false && promoArtifactsIntact(input.repoRoot, identity)) {
        return {
          partial: true,
          detail: `renders/v${version} has artifacts but setQaOk is false`,
        };
      }
      if (identity && hasAnyPng && !promoArtifactsIntact(input.repoRoot, identity)) {
        return {
          partial: true,
          detail: `renders/v${version} has identity without complete asset PNG+PDF set`,
        };
      }
    }
  }
  return { partial: false, detail: "none" };
}

export function writeImmutablePromoVersionReceipt(input: {
  repoRoot: string;
  artifactRootRel: string;
  receipt: PromoDispatchHookReceipt;
  campaignSetRenderVersion: number;
}): { versionReceiptRel: string; pointerRel: string } {
  const versionReceiptRel = receiptPathForVersion(
    input.artifactRootRel,
    input.campaignSetRenderVersion,
  );
  const versionAbs = path.join(input.repoRoot, versionReceiptRel);
  mkdirSync(path.dirname(versionAbs), { recursive: true });

  if (existsSync(versionAbs)) {
    throw new Error(
      `RECEIPT_IMMUTABLE: ${versionReceiptRel} already exists — refusing overwrite`,
    );
  }

  writeFileSync(versionAbs, `${JSON.stringify(input.receipt, null, 2)}\n`, "utf8");

  const pointerRel = currentPromoReceiptPointerRel(input.artifactRootRel);
  writeFileSync(
    path.join(input.repoRoot, pointerRel),
    `${JSON.stringify(input.receipt, null, 2)}\n`,
    "utf8",
  );

  return { versionReceiptRel, pointerRel };
}

export async function acquirePromoRenderLockWithBriefWait(input: {
  repoRoot: string;
  artifactRootRel: string;
  idempotencyKey: string;
  lookup: () =>
    | {
        found: true;
        receipt: PromoDispatchHookReceipt;
        identity: PromoCampaignSetIdentity;
      }
    | { found: false; reason: string };
}): Promise<
  | { ok: true; handle: RenderLockHandle }
  | {
      ok: false;
      already?: {
        receipt: PromoDispatchHookReceipt;
        identity: PromoCampaignSetIdentity;
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
