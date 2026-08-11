/**
 * STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1
 *
 * Flyer-only auto-invoke after durable ensureDispatchExecution.
 * Relies on hook idempotency (ALREADY_RENDERED). Observer does not mint versions itself.
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { DESIGN_RENDERER_PROOF_SKU } from "@/lib/studio-design-renderer";
import { readMaterialsEnvelope } from "@/lib/materials/store";

import { invokeDesignRendererDispatchHook } from "./design-renderer-hook";
import type { DispatchExecutionRecord, JobDispatchRecord } from "./types";

export const DESIGN_DISPATCH_OBSERVER_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1" as const;

export type DesignRendererObserverResult = {
  dispatchId: string;
  skuId: string;
  action: "invoked" | "skipped";
  skipReason?: string;
  ok: boolean;
  invocationOutcome?: "RENDERED" | "ALREADY_RENDERED";
  failureCode?: string;
  message?: string;
  renderVersion?: number;
  pngContentSha256?: string;
  receiptRelativePath?: string;
  ownerRoutineProduction: "NONE";
  canvaRequired: false;
  makeRequired: false;
};

export type DesignRendererObserverPass = {
  packageId: typeof DESIGN_DISPATCH_OBSERVER_PACKAGE_ID;
  observedAt: string;
  campaignId: string;
  results: readonly DesignRendererObserverResult[];
  ownerRoutineProduction: "NONE";
  canvaRequired: false;
  makeRequired: false;
};

function skip(
  record: JobDispatchRecord,
  skipReason: string,
): DesignRendererObserverResult {
  return {
    dispatchId: record.dispatchId,
    skuId: record.skuId,
    action: "skipped",
    skipReason,
    ok: true,
    ownerRoutineProduction: "NONE",
    canvaRequired: false,
    makeRequired: false,
  };
}

function resolveStagedLogoRelativePath(
  repoRoot: string,
  campaignId: string,
): string | undefined {
  const candidate = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
  if (existsSync(path.join(repoRoot, candidate))) return candidate;
  return undefined;
}

/**
 * Hard gates for automatic flyer invoke. Non-matches are silent skips (do nothing).
 */
export function shouldObserveDesignRenderer(
  record: JobDispatchRecord,
): { invoke: true } | { invoke: false; reason: string } {
  if (record.skuId !== DESIGN_RENDERER_PROOF_SKU) {
    return { invoke: false, reason: "sku_not_flyer" };
  }
  if (!record.executionIdentityReady) {
    return { invoke: false, reason: "not_execution_identity_ready" };
  }
  if (record.status !== "EXECUTION_IDENTITY_READY") {
    return { invoke: false, reason: "status_not_ready" };
  }
  if (record.requirements?.primaryTool.toolId !== "studio_design_renderer") {
    return { invoke: false, reason: "primary_tool_not_design_renderer" };
  }
  return { invoke: true };
}

/**
 * Observe durable dispatchExecution and invoke the flyer design hook when gated.
 * Safe under repeated ensureDispatchExecution (hook returns ALREADY_RENDERED).
 */
export async function runDesignRendererDispatchObserver(input: {
  campaign: CampaignRecord;
  dispatch: DispatchExecutionRecord;
  repoRoot?: string;
}): Promise<DesignRendererObserverPass> {
  const repoRoot = input.repoRoot ?? process.cwd();
  const observedAt = new Date().toISOString();
  const materials =
    (await readMaterialsEnvelope(input.campaign.campaignId))?.items ?? [];
  const stagedLogoRelativePath = resolveStagedLogoRelativePath(
    repoRoot,
    input.campaign.campaignId,
  );

  const results: DesignRendererObserverResult[] = [];

  for (const record of input.dispatch.records) {
    const gate = shouldObserveDesignRenderer(record);
    if (!gate.invoke) {
      // Only record skips for flyer-shaped attempts that failed a readiness gate;
      // ignore other SKUs entirely (no noise / no cross-SKU side effects).
      if (record.skuId === DESIGN_RENDERER_PROOF_SKU) {
        results.push(skip(record, gate.reason));
      }
      continue;
    }

    const hooked = await invokeDesignRendererDispatchHook({
      repoRoot,
      campaign: input.campaign,
      dispatchRecord: record,
      materials,
      stagedLogoRelativePath,
      preferAnthropic: false,
    });

    if (hooked.ok) {
      results.push({
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        action: "invoked",
        ok: true,
        invocationOutcome: hooked.invocationOutcome,
        renderVersion: hooked.identity.renderVersion,
        pngContentSha256: hooked.identity.pngContentSha256,
        receiptRelativePath: hooked.receiptRelativePath,
        ownerRoutineProduction: "NONE",
        canvaRequired: false,
        makeRequired: false,
      });
    } else {
      results.push({
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        action: "invoked",
        ok: false,
        failureCode: hooked.failureCode,
        message: hooked.message,
        ownerRoutineProduction: "NONE",
        canvaRequired: false,
        makeRequired: false,
      });
    }
  }

  return {
    packageId: DESIGN_DISPATCH_OBSERVER_PACKAGE_ID,
    observedAt,
    campaignId: input.campaign.campaignId,
    results,
    ownerRoutineProduction: "NONE",
    canvaRequired: false,
    makeRequired: false,
  };
}
