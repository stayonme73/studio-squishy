/**
 * STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-DISPATCH-HOOK-1
 * Idempotency for four-post social campaign-set renders (graphics + captions + order).
 * Does not alter flyer/card/menu/service-sheet/promo receipt lookup.
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
  SOCIAL_POSTS_EXACT_COUNT,
  SOCIAL_POSTS_RENDERER_VERSION,
  fingerprintSocialPostsMaterials,
  fingerprintSocialPostsSharedSpec,
  resolveSocialPostsRenderPaths,
  sha256File,
} from "@/lib/studio-design-renderer";
import type {
  SocialPostsSetIdentity,
  SocialPostsSetSpec,
} from "@/lib/studio-design-renderer";

import {
  tryAcquireRenderLock,
  type RenderLockHandle,
} from "./hook-idempotency";

export const SOCIAL_POSTS_DISPATCH_HOOK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-DISPATCH-HOOK-1" as const;

export type SocialPostsHookReceiptStatus =
  | "success"
  | "qa_failed"
  | "failed"
  | "partial";

export type SocialPostsDispatchHookReceipt = {
  packageId: typeof SOCIAL_POSTS_DISPATCH_HOOK_PACKAGE_ID;
  status: SocialPostsHookReceiptStatus;
  idempotencyKey: string;
  dispatchId: string;
  jobId: string;
  campaignId: string;
  skuId: string;
  sharedSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: string;
  campaignSetRenderVersion?: number;
  identity?: SocialPostsSetIdentity;
  postPngShas?: readonly string[];
  captionSetFingerprint?: string;
  postingOrderFingerprint?: string;
  qaOk?: boolean;
  failureCode?: string;
  message?: string;
  invokedAt: string;
};

export type SocialPostsIdempotencyTuple = {
  dispatchId: string;
  jobId: string;
  skuId: string;
  sharedSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: string;
};

export function buildSocialPostsIdempotencyTuple(input: {
  dispatchId: string;
  jobId: string;
  skuId: string;
  spec: SocialPostsSetSpec;
}): SocialPostsIdempotencyTuple {
  return {
    dispatchId: input.dispatchId,
    jobId: input.jobId,
    skuId: input.skuId,
    sharedSpecFingerprint: fingerprintSocialPostsSharedSpec(input.spec),
    materialFingerprint: fingerprintSocialPostsMaterials(input.spec),
    rendererVersion: SOCIAL_POSTS_RENDERER_VERSION,
  };
}

export function buildSocialPostsIdempotencyKey(
  tuple: SocialPostsIdempotencyTuple,
): string {
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

export function currentSocialPostsReceiptPointerRel(
  artifactRootRel: string,
): string {
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

function socialSetQaRelFromIdentity(identity: SocialPostsSetIdentity): string {
  return identity.designSpecRelativePath.replace(
    /campaign-set-design-spec\.json$/i,
    "campaign-set.design-qa.json",
  );
}

function socialArtifactsIntact(
  repoRoot: string,
  identity: SocialPostsSetIdentity,
): boolean {
  if (identity.assets.length !== SOCIAL_POSTS_EXACT_COUNT) return false;
  if (identity.captions.length !== SOCIAL_POSTS_EXACT_COUNT) return false;
  if (identity.postingOrder.length !== SOCIAL_POSTS_EXACT_COUNT) return false;

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

  const captionsAbs = path.join(repoRoot, identity.captionFileRelativePath);
  const orderAbs = path.join(repoRoot, identity.postingOrderRelativePath);
  if (!existsSync(captionsAbs) || !existsSync(orderAbs)) return false;
  return true;
}

function socialSetQaRecordOk(
  repoRoot: string,
  identity: SocialPostsSetIdentity,
): boolean {
  const qaRel = socialSetQaRelFromIdentity(identity);
  const qa = readJsonIfExists<{ ok?: boolean }>(path.join(repoRoot, qaRel));
  if (!qa) return false;
  return qa.ok === true;
}

export function findSuccessfulSocialPostsRenderForFingerprint(input: {
  repoRoot: string;
  artifactRootRel: string;
  tuple: SocialPostsIdempotencyTuple;
}):
  | {
      found: true;
      receipt: SocialPostsDispatchHookReceipt;
      identity: SocialPostsSetIdentity;
    }
  | { found: false; reason: string } {
  const key = buildSocialPostsIdempotencyKey(input.tuple);
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
    const setPaths = resolveSocialPostsRenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion: version,
      assetId: "set",
    });
    const receiptRel = receiptPathForVersion(input.artifactRootRel, version);
    const receipt = readJsonIfExists<SocialPostsDispatchHookReceipt>(
      path.join(input.repoRoot, receiptRel),
    );
    const identity = readJsonIfExists<SocialPostsSetIdentity>(
      path.join(input.repoRoot, setPaths.identityRel),
    );

    if (receipt) {
      if (receipt.status !== "success") continue;
      if (receipt.idempotencyKey !== key) continue;
      if (!receipt.identity) continue;
      if (!socialArtifactsIntact(input.repoRoot, receipt.identity)) continue;
      if (!socialSetQaRecordOk(input.repoRoot, receipt.identity)) continue;
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
    if (!socialArtifactsIntact(input.repoRoot, identity)) continue;
    if (!socialSetQaRecordOk(input.repoRoot, identity)) continue;

    const synthesized: SocialPostsDispatchHookReceipt = {
      packageId: SOCIAL_POSTS_DISPATCH_HOOK_PACKAGE_ID,
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
      postPngShas: identity.assets.map((a) => a.pngContentSha256),
      captionSetFingerprint: identity.captionSetFingerprint,
      postingOrderFingerprint: identity.postingOrderFingerprint,
      qaOk: true,
      invokedAt: identity.createdAt,
    };
    return { found: true, receipt: synthesized, identity };
  }

  return { found: false, reason: "no_matching_success" };
}

export function findPartialSocialPostsRenderState(input: {
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
    const setPaths = resolveSocialPostsRenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion: version,
      assetId: "set",
    });
    const receipt = readJsonIfExists<SocialPostsDispatchHookReceipt>(
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
    const hasCaptions = existsSync(
      path.join(input.repoRoot, setPaths.captionsRel),
    );
    const hasOrder = existsSync(
      path.join(input.repoRoot, setPaths.postingOrderRel),
    );

    if (hasSpec && !hasIdentity) {
      return {
        partial: true,
        detail: `renders/v${version} has campaign-set design-spec without artifact-identity`,
      };
    }
    if ((hasAnyPng || hasCaptions || hasOrder) && !hasIdentity) {
      return {
        partial: true,
        detail: `renders/v${version} has post/caption/order artifacts without artifact-identity`,
      };
    }

    if (hasIdentity) {
      const identity = readJsonIfExists<SocialPostsSetIdentity>(identityAbs);
      if (
        identity &&
        identity.setQaOk === false &&
        socialArtifactsIntact(input.repoRoot, identity)
      ) {
        return {
          partial: true,
          detail: `renders/v${version} has artifacts but setQaOk is false`,
        };
      }
      if (
        identity &&
        hasAnyPng &&
        !socialArtifactsIntact(input.repoRoot, identity)
      ) {
        return {
          partial: true,
          detail: `renders/v${version} has identity without complete 4-post + caption + order set`,
        };
      }
    }
  }
  return { partial: false, detail: "none" };
}

export function writeImmutableSocialPostsVersionReceipt(input: {
  repoRoot: string;
  artifactRootRel: string;
  receipt: SocialPostsDispatchHookReceipt;
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

  const pointerRel = currentSocialPostsReceiptPointerRel(input.artifactRootRel);
  writeFileSync(
    path.join(input.repoRoot, pointerRel),
    `${JSON.stringify(input.receipt, null, 2)}\n`,
    "utf8",
  );

  return { versionReceiptRel, pointerRel };
}

export async function acquireSocialPostsRenderLockWithBriefWait(input: {
  repoRoot: string;
  artifactRootRel: string;
  idempotencyKey: string;
  lookup: () =>
    | {
        found: true;
        receipt: SocialPostsDispatchHookReceipt;
        identity: SocialPostsSetIdentity;
      }
    | { found: false; reason: string };
}): Promise<
  | { ok: true; handle: RenderLockHandle }
  | {
      ok: false;
      already?: {
        receipt: SocialPostsDispatchHookReceipt;
        identity: SocialPostsSetIdentity;
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
