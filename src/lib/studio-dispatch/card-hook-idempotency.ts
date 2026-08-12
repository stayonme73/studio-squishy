/**
 * STUDIO-OPERATING-DESIGN-BUSINESS-CARD-DISPATCH-HOOK-1
 * Idempotency for double-sided card renders — modeled on flyer hook-idempotency.
 * Does not alter flyer receipt / identity lookup.
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
  BUSINESS_CARD_RENDERER_VERSION,
  fingerprintBusinessCardDesignSpec,
  fingerprintBusinessCardMaterials,
  resolveBusinessCardRenderPaths,
  sha256File,
} from "@/lib/studio-design-renderer";
import type {
  BusinessCardArtifactIdentity,
  BusinessCardDesignSpec,
} from "@/lib/studio-design-renderer";

import { tryAcquireRenderLock, type RenderLockHandle } from "./hook-idempotency";

export const BUSINESS_CARD_DISPATCH_HOOK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-BUSINESS-CARD-DISPATCH-HOOK-1" as const;

export type CardHookReceiptStatus =
  | "success"
  | "qa_failed"
  | "failed"
  | "partial";

export type BusinessCardDispatchHookReceipt = {
  packageId: typeof BUSINESS_CARD_DISPATCH_HOOK_PACKAGE_ID;
  status: CardHookReceiptStatus;
  idempotencyKey: string;
  dispatchId: string;
  jobId: string;
  campaignId: string;
  skuId: string;
  designSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: string;
  renderVersion?: number;
  identity?: BusinessCardArtifactIdentity;
  frontPngContentSha256?: string;
  backPngContentSha256?: string;
  pdfContentSha256?: string;
  qaOk?: boolean;
  failureCode?: string;
  message?: string;
  invokedAt: string;
};

export type CardIdempotencyTuple = {
  dispatchId: string;
  jobId: string;
  skuId: string;
  designSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: string;
};

export function buildCardIdempotencyTuple(input: {
  dispatchId: string;
  jobId: string;
  skuId: string;
  spec: BusinessCardDesignSpec;
}): CardIdempotencyTuple {
  return {
    dispatchId: input.dispatchId,
    jobId: input.jobId,
    skuId: input.skuId,
    designSpecFingerprint: fingerprintBusinessCardDesignSpec(input.spec),
    materialFingerprint: fingerprintBusinessCardMaterials(input.spec),
    rendererVersion: BUSINESS_CARD_RENDERER_VERSION,
  };
}

export function buildCardIdempotencyKey(tuple: CardIdempotencyTuple): string {
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

export function currentCardReceiptPointerRel(artifactRootRel: string): string {
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

function cardArtifactsIntact(
  repoRoot: string,
  identity: BusinessCardArtifactIdentity,
): boolean {
  const front = identity.sides.find((s) => s.side === "front");
  const back = identity.sides.find((s) => s.side === "back");
  if (!front || !back) return false;
  const frontAbs = path.join(repoRoot, front.pngRelativePath);
  const backAbs = path.join(repoRoot, back.pngRelativePath);
  const pdfAbs = path.join(repoRoot, identity.pdfRelativePath);
  if (!existsSync(frontAbs) || !existsSync(backAbs) || !existsSync(pdfAbs)) {
    return false;
  }
  try {
    return (
      sha256File(frontAbs) === front.pngContentSha256 &&
      sha256File(backAbs) === back.pngContentSha256 &&
      sha256File(pdfAbs) === identity.pdfContentSha256
    );
  } catch {
    return false;
  }
}

function cardQaRecordOk(
  repoRoot: string,
  identity: BusinessCardArtifactIdentity,
): boolean {
  const front = identity.sides.find((s) => s.side === "front");
  if (!front) return false;
  const qaRel = front.pngRelativePath.replace(/front\.png$/i, "card.design-qa.json");
  const qa = readJsonIfExists<{ ok?: boolean }>(path.join(repoRoot, qaRel));
  if (!qa) return false;
  return qa.ok === true;
}

export function findSuccessfulCardRenderForFingerprint(input: {
  repoRoot: string;
  artifactRootRel: string;
  tuple: CardIdempotencyTuple;
}):
  | {
      found: true;
      receipt: BusinessCardDispatchHookReceipt;
      identity: BusinessCardArtifactIdentity;
    }
  | { found: false; reason: string } {
  const key = buildCardIdempotencyKey(input.tuple);
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
    const paths = resolveBusinessCardRenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion: version,
    });
    const receiptRel = receiptPathForVersion(input.artifactRootRel, version);
    const receipt = readJsonIfExists<BusinessCardDispatchHookReceipt>(
      path.join(input.repoRoot, receiptRel),
    );
    const identity = readJsonIfExists<BusinessCardArtifactIdentity>(
      path.join(input.repoRoot, paths.identityRel),
    );

    if (receipt) {
      if (receipt.status !== "success") continue;
      if (receipt.idempotencyKey !== key) continue;
      if (!receipt.identity) continue;
      if (!cardArtifactsIntact(input.repoRoot, receipt.identity)) continue;
      if (!cardQaRecordOk(input.repoRoot, receipt.identity)) continue;
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
    if (!cardArtifactsIntact(input.repoRoot, identity)) continue;
    if (!cardQaRecordOk(input.repoRoot, identity)) continue;

    const front = identity.sides.find((s) => s.side === "front")!;
    const back = identity.sides.find((s) => s.side === "back")!;
    const synthesized: BusinessCardDispatchHookReceipt = {
      packageId: BUSINESS_CARD_DISPATCH_HOOK_PACKAGE_ID,
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
      frontPngContentSha256: front.pngContentSha256,
      backPngContentSha256: back.pngContentSha256,
      pdfContentSha256: identity.pdfContentSha256,
      qaOk: true,
      invokedAt: identity.createdAt,
    };
    return { found: true, receipt: synthesized, identity };
  }

  return { found: false, reason: "no_matching_success" };
}

export function findPartialCardRenderState(input: {
  repoRoot: string;
  artifactRootRel: string;
}): { partial: boolean; detail: string } {
  const rendersDir = path.join(input.repoRoot, input.artifactRootRel, "renders");
  if (!existsSync(rendersDir)) return { partial: false, detail: "none" };

  for (const name of readdirSync(rendersDir)) {
    const m = /^v(\d+)$/.exec(name);
    if (!m) continue;
    const version = Number(m[1]);
    const paths = resolveBusinessCardRenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion: version,
    });
    const receipt = readJsonIfExists<BusinessCardDispatchHookReceipt>(
      path.join(input.repoRoot, receiptPathForVersion(input.artifactRootRel, version)),
    );
    if (receipt?.status === "partial") {
      return { partial: true, detail: `renders/v${version} marked partial` };
    }

    const frontAbs = path.join(input.repoRoot, paths.frontPngRel);
    const backAbs = path.join(input.repoRoot, paths.backPngRel);
    const identityAbs = path.join(input.repoRoot, paths.identityRel);
    const hasFront = existsSync(frontAbs);
    const hasBack = existsSync(backAbs);
    const hasIdentity = existsSync(identityAbs);

    if ((hasFront || hasBack) && !hasIdentity) {
      return {
        partial: true,
        detail: `renders/v${version} has PNG side(s) without artifact-identity`,
      };
    }
    if (hasIdentity && (!hasFront || !hasBack)) {
      return {
        partial: true,
        detail: `renders/v${version} has identity without both front+back PNGs`,
      };
    }
  }
  return { partial: false, detail: "none" };
}

export function writeImmutableCardVersionReceipt(input: {
  repoRoot: string;
  artifactRootRel: string;
  receipt: BusinessCardDispatchHookReceipt;
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

  const pointerRel = currentCardReceiptPointerRel(input.artifactRootRel);
  writeFileSync(
    path.join(input.repoRoot, pointerRel),
    `${JSON.stringify(input.receipt, null, 2)}\n`,
    "utf8",
  );

  return { versionReceiptRel, pointerRel };
}

export async function acquireCardRenderLockWithBriefWait(input: {
  repoRoot: string;
  artifactRootRel: string;
  idempotencyKey: string;
  lookup: () =>
    | {
        found: true;
        receipt: BusinessCardDispatchHookReceipt;
        identity: BusinessCardArtifactIdentity;
      }
    | { found: false; reason: string };
}): Promise<
  | { ok: true; handle: RenderLockHandle }
  | {
      ok: false;
      already?: {
        receipt: BusinessCardDispatchHookReceipt;
        identity: BusinessCardArtifactIdentity;
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
