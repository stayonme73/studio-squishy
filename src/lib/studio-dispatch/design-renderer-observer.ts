/**
 * STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1
 * (+ BUSINESS-CARD-DISPATCH-HOOK-1 card lane)
 * (+ MENU-DISPATCH-HOOK-1 menu lane)
 * (+ SERVICE-SHEET-DISPATCH-HOOK-1 service-sheet lane)
 * (+ PROMOTION-GRAPHICS-DISPATCH-HOOK-1 promotion-graphics set lane)
 * (+ SOCIAL-POSTS-DISPATCH-HOOK-1 social-posts four-post set lane)
 * (+ SM-001-DISPATCH-HOOK-1 Social Media Launch Set lane)
 * (+ SM-001-MONTHLY-DISPATCH-HOOK-1 pay-per-cycle monthly Launch Set lane)
 * (+ MA-001-DISPATCH-HOOK-1 Promotion Pack heterogeneous lane)
 * (+ RM-J002-DISPATCH-HOOK-1 Social Profile Setup Kit lane)
 * (+ RM-J008-DISPATCH-HOOK-1 Social Profile Update Kit lane)
 * (+ BF-001-DISPATCH-HOOK-1 Brand Identity Refresh lane)
 * (+ RM-J007-DISPATCH-HOOK-1 Reference-Guided Promotion Update lane)
 *
 * Auto-invoke after durable ensureDispatchExecution for:
 *   - v2-rtu-flyer (sealed flyer hook)
 *   - v2-rtu-business-card (card hook — double-sided)
 *   - v2-rtu-menu (menu hook — single-page sectioned list)
 *   - v2-rtu-service-sheet (service-sheet hook — optional pricing list)
 *   - v2-rtu-promotion-graphics (promo campaign-set hook — Square+Portrait executable)
 *   - v2-rtu-social-posts (social four-post set — square-only + captions + order)
 *   - sm-001 (Launch Set — N∈{4,5,6} square posts + captions + order + calendar)
 *   - sm-001-monthly (cycle-keyed Launch Set — explicit productionCycleId + locked N)
 *   - ma-001 (Promotion Pack — paid composition structure → pack orchestrator)
 *   - rm-j002 (Profile Setup Kit — paid kit structure → kit composer)
 *   - rm-j008 (Profile Update Kit — paid update structure → update kit composer)
 *   - bf-001 (Brand Identity Refresh — paid refresh structure → package composer)
 *   - rm-j007 (Reference-Guided Promotion Update — paid update structure → recreation composer)
 * Relies on hook idempotency (ALREADY_RENDERED). Observer does not mint versions itself.
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import {
  DESIGN_RENDERER_BF_001_SKU,
  DESIGN_RENDERER_BUSINESS_CARD_SKU,
  DESIGN_RENDERER_MA_001_SKU,
  DESIGN_RENDERER_MENU_SKU,
  DESIGN_RENDERER_PROOF_SKU,
  DESIGN_RENDERER_PROMO_SKU,
  DESIGN_RENDERER_RM_J002_SKU,
  DESIGN_RENDERER_RM_J007_SKU,
  DESIGN_RENDERER_RM_J008_SKU,
  DESIGN_RENDERER_SERVICE_SHEET_SKU,
  DESIGN_RENDERER_SM_001_MONTHLY_SKU,
  DESIGN_RENDERER_SM_001_SKU,
  DESIGN_RENDERER_SOCIAL_POSTS_SKU,
} from "@/lib/studio-design-renderer";
import { readMaterialsEnvelope } from "@/lib/materials/store";

import { invokeBf001DispatchHook } from "./bf-001-dispatch-hook";
import { invokeBusinessCardDispatchHook } from "./business-card-dispatch-hook";
import { invokeDesignRendererDispatchHook } from "./design-renderer-hook";
import { invokeMa001DispatchHook } from "./ma-001-dispatch-hook";
import { invokeMenuDispatchHook } from "./menu-dispatch-hook";
import { invokePromoDispatchHook } from "./promo-dispatch-hook";
import { invokeRmJ002DispatchHook } from "./rm-j002-dispatch-hook";
import { invokeRmJ007DispatchHook } from "./rm-j007-dispatch-hook";
import { invokeRmJ008DispatchHook } from "./rm-j008-dispatch-hook";
import { invokeServiceSheetDispatchHook } from "./service-sheet-dispatch-hook";
import { invokeSm001DispatchHook } from "./sm-001-dispatch-hook";
import { invokeSm001MonthlyDispatchHook } from "./sm-001-monthly-dispatch-hook";
import { invokeSocialPostsDispatchHook } from "./social-posts-dispatch-hook";
import type { DispatchExecutionRecord, JobDispatchRecord } from "./types";

export const DESIGN_DISPATCH_OBSERVER_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1" as const;

const OBSERVED_RENDERER_SKUS = new Set<string>([
  DESIGN_RENDERER_PROOF_SKU,
  DESIGN_RENDERER_BUSINESS_CARD_SKU,
  DESIGN_RENDERER_MENU_SKU,
  DESIGN_RENDERER_SERVICE_SHEET_SKU,
  DESIGN_RENDERER_PROMO_SKU,
  DESIGN_RENDERER_SOCIAL_POSTS_SKU,
  DESIGN_RENDERER_SM_001_SKU,
  DESIGN_RENDERER_SM_001_MONTHLY_SKU,
  DESIGN_RENDERER_MA_001_SKU,
  DESIGN_RENDERER_RM_J002_SKU,
  DESIGN_RENDERER_RM_J008_SKU,
  DESIGN_RENDERER_BF_001_SKU,
  DESIGN_RENDERER_RM_J007_SKU,
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
 * Hard gates for automatic design-renderer invoke
 * (flyer, card, menu, service-sheet, promotion-graphics, social-posts, sm-001, sm-001-monthly).
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
      continue;
    }

    if (record.skuId === DESIGN_RENDERER_MENU_SKU) {
      const hooked = await invokeMenuDispatchHook({
        repoRoot,
        campaign: input.campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath,
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

    if (record.skuId === DESIGN_RENDERER_SERVICE_SHEET_SKU) {
      const hooked = await invokeServiceSheetDispatchHook({
        repoRoot,
        campaign: input.campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath,
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

    if (record.skuId === DESIGN_RENDERER_PROMO_SKU) {
      const hooked = await invokePromoDispatchHook({
        repoRoot,
        campaign: input.campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath,
      });

      if (hooked.ok) {
        const [assetA, assetB] = hooked.identity.assets;
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: true,
          invocationOutcome: hooked.invocationOutcome,
          renderVersion: hooked.identity.campaignSetRenderVersion,
          pngContentSha256: assetA?.pngContentSha256,
          backPngContentSha256: assetB?.pngContentSha256,
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

    if (record.skuId === DESIGN_RENDERER_SOCIAL_POSTS_SKU) {
      const hooked = await invokeSocialPostsDispatchHook({
        repoRoot,
        campaign: input.campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath,
      });

      if (hooked.ok) {
        const [post1, post2] = hooked.identity.assets;
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: true,
          invocationOutcome: hooked.invocationOutcome,
          renderVersion: hooked.identity.campaignSetRenderVersion,
          pngContentSha256: post1?.pngContentSha256,
          backPngContentSha256: post2?.pngContentSha256,
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

    if (record.skuId === DESIGN_RENDERER_SM_001_SKU) {
      const hooked = await invokeSm001DispatchHook({
        repoRoot,
        campaign: input.campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath,
      });

      if (hooked.ok) {
        const [post1, post2] = hooked.identity.assets;
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: true,
          invocationOutcome: hooked.invocationOutcome,
          renderVersion: hooked.identity.campaignSetRenderVersion,
          pngContentSha256: post1?.pngContentSha256,
          backPngContentSha256: post2?.pngContentSha256,
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

    if (record.skuId === DESIGN_RENDERER_SM_001_MONTHLY_SKU) {
      const hooked = await invokeSm001MonthlyDispatchHook({
        repoRoot,
        campaign: input.campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath,
      });

      if (hooked.ok) {
        const [post1, post2] = hooked.identity.assets;
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: true,
          invocationOutcome: hooked.invocationOutcome,
          renderVersion: hooked.identity.campaignSetRenderVersion,
          pngContentSha256: post1?.pngContentSha256,
          backPngContentSha256: post2?.pngContentSha256,
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

    if (record.skuId === DESIGN_RENDERER_MA_001_SKU) {
      const hooked = await invokeMa001DispatchHook({
        repoRoot,
        campaign: input.campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath,
      });

      if (hooked.ok) {
        const first = hooked.identity.members[0]?.artifacts.find(
          (a) => a.role === "png",
        );
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: true,
          invocationOutcome: hooked.invocationOutcome,
          renderVersion: hooked.identity.packRenderVersion,
          pngContentSha256: first?.contentSha256,
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

    if (record.skuId === DESIGN_RENDERER_RM_J002_SKU) {
      const hooked = await invokeRmJ002DispatchHook({
        repoRoot,
        campaign: input.campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath,
      });

      if (hooked.ok) {
        const avatar = hooked.identity.members.find(
          (m) => m.memberId === "profile_image",
        );
        const png = avatar?.artifacts.find((a) => a.role === "png");
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: true,
          invocationOutcome: hooked.invocationOutcome,
          renderVersion: hooked.identity.kitRenderVersion,
          pngContentSha256: png?.contentSha256,
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

    if (record.skuId === DESIGN_RENDERER_RM_J008_SKU) {
      const hooked = await invokeRmJ008DispatchHook({
        repoRoot,
        campaign: input.campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath,
      });

      if (hooked.ok) {
        const avatar = hooked.identity.members.find(
          (m) => m.memberId === "profile_image",
        );
        const png = avatar?.artifacts.find((a) => a.role === "png");
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: true,
          invocationOutcome: hooked.invocationOutcome,
          renderVersion: hooked.identity.kitRenderVersion,
          pngContentSha256: png?.contentSha256,
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

    if (record.skuId === DESIGN_RENDERER_BF_001_SKU) {
      const hooked = await invokeBf001DispatchHook({
        repoRoot,
        campaign: input.campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath,
      });

      if (hooked.ok) {
        const graphic = hooked.identity.members.find(
          (m) => m.memberId === "profile_or_cover_graphic",
        );
        const png = graphic?.artifacts.find(
          (a) => a.role === "avatar_png" || a.role === "cover_png",
        );
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: true,
          invocationOutcome: hooked.invocationOutcome,
          renderVersion: hooked.identity.packageRenderVersion,
          pngContentSha256: png?.contentSha256,
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

    if (record.skuId === DESIGN_RENDERER_RM_J007_SKU) {
      const hooked = await invokeRmJ007DispatchHook({
        repoRoot,
        campaign: input.campaign,
        dispatchRecord: record,
        materials,
        stagedReferenceRelativePath: stagedLogoRelativePath,
      });

      if (hooked.ok) {
        const member = hooked.identity.members.find(
          (m) => m.memberId === "updated_promotion",
        );
        const png = member?.artifacts.find((a) => a.role === "update_png");
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: true,
          invocationOutcome: hooked.invocationOutcome,
          renderVersion: hooked.identity.packageRenderVersion,
          pngContentSha256: png?.contentSha256,
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
