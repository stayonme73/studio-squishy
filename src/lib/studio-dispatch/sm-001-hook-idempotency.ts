/**
 * STUDIO-OPERATING-DESIGN-SM-001-DISPATCH-HOOK-1
 * Idempotency for sm-001 Launch Set renders (N posts + captions + posting order
 * + advisory schedule manifest). One whole-set version binds all of them.
 *
 * Does not alter flyer/card/menu/service-sheet/promo/social-posts receipt lookup.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { createHash } from "crypto";
import path from "path";

import {
  SM_001_RENDERER_VERSION,
  fingerprintSm001Materials,
  fingerprintSm001SharedSpec,
  resolveSm001RenderPaths,
  sha256File,
} from "@/lib/studio-design-renderer";
import type {
  Sm001CalendarManifest,
  Sm001PlannedPostCount,
  Sm001SetIdentity,
  Sm001SetSpec,
  Sm001TimingConstraints,
} from "@/lib/studio-design-renderer";

import {
  tryAcquireRenderLock,
  type RenderLockHandle,
} from "./hook-idempotency";

export const SM_001_DISPATCH_HOOK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-SM-001-DISPATCH-HOOK-1" as const;

export type Sm001HookReceiptStatus =
  | "success"
  | "qa_failed"
  | "failed"
  | "partial";

export type Sm001DispatchHookReceipt = {
  packageId: typeof SM_001_DISPATCH_HOOK_PACKAGE_ID;
  status: Sm001HookReceiptStatus;
  idempotencyKey: string;
  dispatchId: string;
  jobId: string;
  campaignId: string;
  skuId: string;
  plannedPostCount: Sm001PlannedPostCount;
  sharedSpecFingerprint: string;
  materialFingerprint: string;
  /** Pre-render fingerprint of the calendar inputs (N + campaign timing). */
  calendarInputFingerprint: string;
  rendererVersion: string;
  campaignSetRenderVersion?: number;
  identity?: Sm001SetIdentity;
  postPngShas?: readonly string[];
  captionSetFingerprint?: string;
  postingOrderFingerprint?: string;
  /** Rendered advisory schedule manifest fingerprint from set identity. */
  calendarFingerprint?: string;
  qaOk?: boolean;
  failureCode?: string;
  message?: string;
  invokedAt: string;
};

export type Sm001IdempotencyTuple = {
  dispatchId: string;
  jobId: string;
  skuId: string;
  plannedPostCount: Sm001PlannedPostCount;
  sharedSpecFingerprint: string;
  materialFingerprint: string;
  calendarInputFingerprint: string;
  rendererVersion: string;
};

/**
 * Calendar identity before the set exists: N plus the authoritative campaign
 * timing constraints that govern every suggested date.
 */
export function fingerprintSm001CalendarInputs(input: {
  plannedPostCount: Sm001PlannedPostCount;
  timingConstraints: Sm001TimingConstraints;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        plannedPostCount: input.plannedPostCount,
        startDate: input.timingConstraints.startDate ?? null,
        endDate: input.timingConstraints.endDate ?? null,
        eventDate: input.timingConstraints.eventDate ?? null,
        blackoutDates: [...(input.timingConstraints.blackoutDates ?? [])].sort(),
      }),
    )
    .digest("hex");
}

export function buildSm001IdempotencyTuple(input: {
  dispatchId: string;
  jobId: string;
  skuId: string;
  spec: Sm001SetSpec;
  timingConstraints: Sm001TimingConstraints;
}): Sm001IdempotencyTuple {
  return {
    dispatchId: input.dispatchId,
    jobId: input.jobId,
    skuId: input.skuId,
    plannedPostCount: input.spec.plannedPostCount,
    sharedSpecFingerprint: fingerprintSm001SharedSpec(input.spec),
    materialFingerprint: fingerprintSm001Materials(input.spec),
    calendarInputFingerprint: fingerprintSm001CalendarInputs({
      plannedPostCount: input.spec.plannedPostCount,
      timingConstraints: input.timingConstraints,
    }),
    rendererVersion: SM_001_RENDERER_VERSION,
  };
}

export function buildSm001IdempotencyKey(tuple: Sm001IdempotencyTuple): string {
  return [
    tuple.dispatchId,
    tuple.jobId,
    tuple.skuId,
    String(tuple.plannedPostCount),
    tuple.sharedSpecFingerprint,
    tuple.materialFingerprint,
    tuple.calendarInputFingerprint,
    tuple.rendererVersion,
  ].join("|");
}

function receiptPathForVersion(
  artifactRootRel: string,
  renderVersion: number,
): string {
  return `${artifactRootRel}/renders/v${renderVersion}/dispatch-hook-receipt.json`;
}

export function currentSm001ReceiptPointerRel(artifactRootRel: string): string {
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

function sm001SetQaRelFromIdentity(identity: Sm001SetIdentity): string {
  return identity.designSpecRelativePath.replace(
    /campaign-set-design-spec\.json$/i,
    "campaign-set.design-qa.json",
  );
}

/** Persisted schedule manifest — written wrapped in a provenance envelope. */
function readPersistedCalendarEntryCount(
  repoRoot: string,
  calendarRelativePath: string,
): number | null {
  const parsed = readJsonIfExists<{
    manifest?: Sm001CalendarManifest;
    entries?: readonly unknown[];
  }>(path.join(repoRoot, calendarRelativePath));
  if (!parsed) return null;
  const entries = parsed.manifest?.entries ?? parsed.entries;
  return Array.isArray(entries) ? entries.length : null;
}

/** N/N posts + N captions + N order entries + N schedule entries, all on disk. */
export function sm001ArtifactsIntact(
  repoRoot: string,
  identity: Sm001SetIdentity,
): boolean {
  const n = identity.plannedPostCount;
  if (identity.assets.length !== n) return false;
  if (identity.captions.length !== n) return false;
  if (identity.postingOrder.length !== n) return false;
  if (identity.calendar?.entries?.length !== n) return false;
  if (identity.calendar.plannedPostCount !== n) return false;

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

  const calendarAbs = path.join(repoRoot, identity.calendarRelativePath);
  if (!existsSync(calendarAbs)) return false;
  if (readPersistedCalendarEntryCount(repoRoot, identity.calendarRelativePath) !== n) {
    return false;
  }

  return true;
}

function sm001SetQaRecordOk(
  repoRoot: string,
  identity: Sm001SetIdentity,
): boolean {
  const qa = readJsonIfExists<{ ok?: boolean }>(
    path.join(repoRoot, sm001SetQaRelFromIdentity(identity)),
  );
  if (!qa) return false;
  return qa.ok === true;
}

export function findSuccessfulSm001RenderForFingerprint(input: {
  repoRoot: string;
  artifactRootRel: string;
  tuple: Sm001IdempotencyTuple;
}):
  | {
      found: true;
      receipt: Sm001DispatchHookReceipt;
      identity: Sm001SetIdentity;
    }
  | { found: false; reason: string } {
  const key = buildSm001IdempotencyKey(input.tuple);
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
    const setPaths = resolveSm001RenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion: version,
      assetId: "set",
    });
    const receipt = readJsonIfExists<Sm001DispatchHookReceipt>(
      path.join(
        input.repoRoot,
        receiptPathForVersion(input.artifactRootRel, version),
      ),
    );
    const identity = readJsonIfExists<Sm001SetIdentity>(
      path.join(input.repoRoot, setPaths.identityRel),
    );

    if (receipt) {
      if (receipt.status !== "success") continue;
      if (receipt.idempotencyKey !== key) continue;
      if (!receipt.identity) continue;
      if (receipt.qaOk !== true) continue;
      if (
        receipt.plannedPostCount !== input.tuple.plannedPostCount ||
        receipt.sharedSpecFingerprint !== input.tuple.sharedSpecFingerprint ||
        receipt.materialFingerprint !== input.tuple.materialFingerprint ||
        receipt.calendarInputFingerprint !==
          input.tuple.calendarInputFingerprint ||
        receipt.rendererVersion !== input.tuple.rendererVersion
      ) {
        continue;
      }
      if (!sm001ArtifactsIntact(input.repoRoot, receipt.identity)) continue;
      if (!sm001SetQaRecordOk(input.repoRoot, receipt.identity)) continue;
      return { found: true, receipt, identity: receipt.identity };
    }

    if (!identity) continue;
    if (identity.dispatchId !== input.tuple.dispatchId) continue;
    if (identity.jobId !== input.tuple.jobId) continue;
    if (identity.skuId !== input.tuple.skuId) continue;
    if (identity.plannedPostCount !== input.tuple.plannedPostCount) continue;
    if (
      identity.sharedSpecFingerprint !== input.tuple.sharedSpecFingerprint ||
      identity.materialFingerprint !== input.tuple.materialFingerprint ||
      identity.rendererVersion !== input.tuple.rendererVersion
    ) {
      continue;
    }
    if (!identity.setQaOk) continue;
    if (!sm001ArtifactsIntact(input.repoRoot, identity)) continue;
    if (!sm001SetQaRecordOk(input.repoRoot, identity)) continue;

    const synthesized: Sm001DispatchHookReceipt = {
      packageId: SM_001_DISPATCH_HOOK_PACKAGE_ID,
      status: "success",
      idempotencyKey: key,
      dispatchId: identity.dispatchId,
      jobId: identity.jobId,
      campaignId: identity.campaignId,
      skuId: identity.skuId,
      plannedPostCount: identity.plannedPostCount,
      sharedSpecFingerprint: identity.sharedSpecFingerprint,
      materialFingerprint: identity.materialFingerprint,
      calendarInputFingerprint: input.tuple.calendarInputFingerprint,
      rendererVersion: identity.rendererVersion,
      campaignSetRenderVersion: identity.campaignSetRenderVersion,
      identity,
      postPngShas: identity.assets.map((a) => a.pngContentSha256),
      captionSetFingerprint: identity.captionSetFingerprint,
      postingOrderFingerprint: identity.postingOrderFingerprint,
      calendarFingerprint: identity.calendarFingerprint,
      qaOk: true,
      invokedAt: identity.createdAt,
    };
    return { found: true, receipt: synthesized, identity };
  }

  return { found: false, reason: "no_matching_success" };
}

export function findPartialSm001RenderState(input: {
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
    const setPaths = resolveSm001RenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion: version,
      assetId: "set",
    });
    const receipt = readJsonIfExists<Sm001DispatchHookReceipt>(
      path.join(
        input.repoRoot,
        receiptPathForVersion(input.artifactRootRel, version),
      ),
    );
    if (receipt?.status === "partial") {
      return { partial: true, detail: `renders/v${version} marked partial` };
    }

    const hasSpec = existsSync(path.join(input.repoRoot, setPaths.specRel));
    const identityAbs = path.join(input.repoRoot, setPaths.identityRel);
    const hasIdentity = existsSync(identityAbs);

    const hasAnyPng = readdirSync(versionDir).some((f) =>
      f.toLowerCase().endsWith(".png"),
    );
    const hasCaptions = existsSync(
      path.join(input.repoRoot, setPaths.captionsRel),
    );
    const hasOrder = existsSync(
      path.join(input.repoRoot, setPaths.postingOrderRel),
    );
    const hasCalendar = existsSync(
      path.join(input.repoRoot, setPaths.calendarRel),
    );

    if (hasSpec && !hasIdentity) {
      return {
        partial: true,
        detail: `renders/v${version} has Launch Set design-spec without artifact-identity`,
      };
    }
    if ((hasAnyPng || hasCaptions || hasOrder || hasCalendar) && !hasIdentity) {
      return {
        partial: true,
        detail: `renders/v${version} has post/caption/order/calendar artifacts without artifact-identity`,
      };
    }

    if (hasIdentity) {
      const identity = readJsonIfExists<Sm001SetIdentity>(identityAbs);
      if (
        identity &&
        identity.setQaOk === false &&
        sm001ArtifactsIntact(input.repoRoot, identity)
      ) {
        return {
          partial: true,
          detail: `renders/v${version} has artifacts but setQaOk is false`,
        };
      }
      if (
        identity &&
        hasAnyPng &&
        !sm001ArtifactsIntact(input.repoRoot, identity)
      ) {
        return {
          partial: true,
          detail:
            `renders/v${version} has identity without a complete ` +
            `${identity.plannedPostCount}-post + caption + order + calendar set`,
        };
      }
    }
  }
  return { partial: false, detail: "none" };
}

export function writeImmutableSm001VersionReceipt(input: {
  repoRoot: string;
  artifactRootRel: string;
  receipt: Sm001DispatchHookReceipt;
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

  writeFileSync(
    versionAbs,
    `${JSON.stringify(input.receipt, null, 2)}\n`,
    "utf8",
  );

  const pointerRel = currentSm001ReceiptPointerRel(input.artifactRootRel);
  writeFileSync(
    path.join(input.repoRoot, pointerRel),
    `${JSON.stringify(input.receipt, null, 2)}\n`,
    "utf8",
  );

  return { versionReceiptRel, pointerRel };
}

export async function acquireSm001RenderLockWithBriefWait(input: {
  repoRoot: string;
  artifactRootRel: string;
  idempotencyKey: string;
  lookup: () =>
    | {
        found: true;
        receipt: Sm001DispatchHookReceipt;
        identity: Sm001SetIdentity;
      }
    | { found: false; reason: string };
}): Promise<
  | { ok: true; handle: RenderLockHandle }
  | {
      ok: false;
      already?: {
        receipt: Sm001DispatchHookReceipt;
        identity: Sm001SetIdentity;
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
