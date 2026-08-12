/**
 * STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1
 * (+ BUSINESS-CARD-DISPATCH-HOOK-1 card lane)
 *
 * Auto-invoke after durable ensureDispatchExecution for:
 *   - v2-rtu-flyer (sealed flyer hook)
 *   - v2-rtu-business-card (card hook — double-sided)
 * Relies on hook idempotency (ALREADY_RENDERED). Observer does not mint versions itself.
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import {
  DESIGN_RENDERER_BUSINESS_CARD_SKU,
  DESIGN_RENDERER_PROOF_SKU,
} from "@/lib/studio-design-renderer";
import { readMaterialsEnvelope } from "@/lib/materials/store";

import { invokeBusinessCardDispatchHook } from "./business-card-dispatch-hook";
import { invokeDesignRendererDispatchHook } from "./design-renderer-hook";
import type { DispatchExecutionRecord, JobDispatchRecord } from "./types";

export const DESIGN_DISPATCH_OBSERVER_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1" as const;

const OBSERVED_RENDERER_SKUS = new Set<string>([
  DESIGN_RENDERER_PROOF_SKU,
  DESIGN_RENDERER_BUSINESS_CARD_SKU,
]);

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
  /** Flyer single PNG hash, or card front PNG hash. */
  pngContentSha256?: string;
  backPngContentSha256?: string;
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
 * Hard gates for automatic design-renderer invoke (flyer or business card).
 * Non-matches are silent skips (do nothing).
 */
export function shouldObserveDesignRenderer(
  record: JobDispatchRecord,
): { invoke: true } | { invoke: false; reason: string } {
  if (!OBSERVED_RENDERER_SKUS.has(record.skuId)) {
    return { invoke: false, reason: "sku_not_design_renderer_lane" };
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
 * Observe durable dispatchExecution and invoke the matching design hook when gated.
 * Safe under repeated ensureDispatchExecution (hooks return ALREADY_RENDERED).
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
      if (OBSERVED_RENDERER_SKUS.has(record.skuId)) {
        results.push(skip(record, gate.reason));
      }
      continue;
    }

    if (record.skuId === DESIGN_RENDERER_PROOF_SKU) {
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
      continue;
    }

    if (record.skuId === DESIGN_RENDERER_BUSINESS_CARD_SKU) {
      const hooked = await invokeBusinessCardDispatchHook({
        repoRoot,
        campaign: input.campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath,
      });

      if (hooked.ok) {
        const front = hooked.identity.sides.find((s) => s.side === "front");
        const back = hooked.identity.sides.find((s) => s.side === "back");
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: true,
          invocationOutcome: hooked.invocationOutcome,
          renderVersion: hooked.identity.renderVersion,
          pngContentSha256: front?.pngContentSha256,
          backPngContentSha256: back?.pngContentSha256,
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
