/**
 * Launch-menu production observer — copy + short-video.
 * Design SKUs remain on DESIGN-DISPATCH-OBSERVER-1.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import type { ShotstackFetch } from "@/lib/studio-kitchen-production/video-integration";

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { CLIP_REPURPOSING_PRIMARY_TOOL_ID } from "@/config/studio-clip-repurposing-launch-integration-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import { FOOTAGE_EDITING_PRIMARY_TOOL_ID } from "@/config/studio-short-form-video-editing-launch-integration-v1";
import type { ClipCustomerOutcome } from "@/lib/studio-clip-repurposing/customer-outcome";
import type { ClipCustomerPipelineInput, ClipProducedFile } from "@/lib/studio-clip-repurposing/customer-pipeline";
import type { LongSourceSentences } from "@/lib/studio-clip-repurposing/types";

import {
  LIVE_LANE_CAPACITY_SKIP_REASON,
  acquireHeavyOccupancyLock,
  admitQuickLaneProduction,
  createLiveLaneCapacityTracker,
  liveLaneForDispatchRecord,
  releaseHeavyOccupancyLock,
  releaseQuickLaneReservation,
  type ProductionLaneView,
} from "@/lib/job-control";
import { invokeClipRepurposingDispatchHook } from "./clip-repurposing-dispatch-hook";
import { mapClipRepurposingJobTruthFromJob } from "./map-clip-repurposing-job-truth";
import { invokeCopyDispatchHook } from "./copy-dispatch-hook";
import { invokeFootageEditingDispatchHook } from "./footage-editing-dispatch-hook";
import type { runFootageEditingPipeline } from "@/lib/studio-short-form-video-editing/footage-pipeline";
import { invokeShortVideoDispatchHook } from "./short-video-dispatch-hook";
import type { DispatchExecutionRecord, JobDispatchRecord } from "./types";

export const LAUNCH_MENU_PRODUCTION_OBSERVER_PACKAGE_ID =
  "STUDIO-OPERATING-LAUNCH-MENU-PRODUCTION-RUNTIME-1" as const;

export type LaunchMenuObserverResult = {
  dispatchId: string;
  skuId: string;
  action: "invoked" | "skipped";
  skipReason?: string;
  ok: boolean;
  failureCode?: string;
  message?: string;
  invocationOutcome?: string;
  copySha256?: string;
  artifactRelativePath?: string;
  mp4RelativePath?: string;
  mp4ContentSha256?: string;
  providerRenderId?: string;
  attempts?: number;
  clipFiles?: readonly ClipProducedFile[];
  customerOutcome?: ClipCustomerOutcome;
  ownerRoutineProduction: "NONE";
};

export type LaunchMenuObserverPass = {
  packageId: typeof LAUNCH_MENU_PRODUCTION_OBSERVER_PACKAGE_ID;
  observedAt: string;
  campaignId: string;
  results: readonly LaunchMenuObserverResult[];
  ownerRoutineProduction: "NONE";
};

function skip(record: JobDispatchRecord, skipReason: string): LaunchMenuObserverResult {
  return {
    dispatchId: record.dispatchId,
    skuId: record.skuId,
    action: "skipped",
    skipReason,
    ok: true,
    ownerRoutineProduction: "NONE",
  };
}

export async function runLaunchMenuProductionObserver(input: {
  campaign: CampaignRecord;
  dispatch: DispatchExecutionRecord;
  repoRoot?: string;
  fetchImpl?: ShotstackFetch;
  videoApiKey?: string;
  videoAssetUrlsOverride?: Map<string, string>;
  footageRunPipeline?: typeof runFootageEditingPipeline;
  clipSourceDurationSeconds?: number;
  clipSentences?: LongSourceSentences["sentences"];
  clipDiscover?: ClipCustomerPipelineInput["discover"];
  clipProduce?: ClipCustomerPipelineInput["produce"];
  laneViews?: readonly ProductionLaneView[];
  /** Tests opt in. Machine (non-test) always reserves Quick slots here. */
  enforceQuickAdmission?: boolean;
}): Promise<LaunchMenuObserverPass> {
  const repoRoot = input.repoRoot ?? process.cwd();
  const tracker = input.laneViews
    ? createLiveLaneCapacityTracker(input.laneViews)
    : null;
  const enforceQuickAdmission =
    input.enforceQuickAdmission ?? process.env.NODE_ENV !== "test";
  const quickEvidenceJobIds =
    input.laneViews?.find((view) => view.lane === "quick")?.activeJobs.map((job) => job.jobId) ??
    [];
  const hasLaunchSku = input.dispatch.records.some(
    (record) =>
      record.skuId === "v2-rtu-short-video" ||
      record.skuId === SHORT_FORM_VIDEO_EDITING_SKU ||
      record.skuId === CLIP_REPURPOSING_SKU ||
      record.skuId === "v2-rtu-email-kit" ||
      record.skuId === "v2-rtu-sms-kit",
  );
  if (!hasLaunchSku) {
    return {
      packageId: LAUNCH_MENU_PRODUCTION_OBSERVER_PACKAGE_ID,
      observedAt: new Date().toISOString(),
      campaignId: input.campaign.campaignId,
      results: [],
      ownerRoutineProduction: "NONE",
    };
  }
  const materials =
    (await readMaterialsEnvelope(input.campaign.campaignId))?.items ?? [];
  const results: LaunchMenuObserverResult[] = [];
  const heavyView = input.laneViews?.find((lane) => lane.lane === "heavy");
  const occupyingJobIds = heavyView?.activeJobs.map((job) => job.jobId) ?? [];
  const viewsAuthoritative = Boolean(input.laneViews) && process.env.NODE_ENV !== "test";

  for (const record of input.dispatch.records) {
    if (!record.executionIdentityReady) continue;
    const laneJob = liveLaneForDispatchRecord(record);
    if (tracker) {
      if (!tracker.allows(laneJob)) {
        results.push(skip(record, LIVE_LANE_CAPACITY_SKIP_REASON));
        continue;
      }
    }

    let heavyLockHeld = false;
    if (laneJob.productionLane === "heavy") {
      const claimed = acquireHeavyOccupancyLock({
        repoRoot,
        jobId: record.jobId,
        campaignId: input.campaign.campaignId,
        occupyingJobIds,
        viewsAuthoritative,
      });
      if (!claimed.ok) {
        results.push(skip(record, LIVE_LANE_CAPACITY_SKIP_REASON));
        continue;
      }
      heavyLockHeld = true;
    }

    let quickHeldJobId: string | null = null;
    const lane = laneJob.returnLane ?? laneJob.productionLane;
    if (enforceQuickAdmission && lane === "quick") {
      const admitted = admitQuickLaneProduction({
        repoRoot,
        jobId: laneJob.jobId,
        campaignId: input.campaign.campaignId,
        evidenceJobIds: quickEvidenceJobIds,
        capacity: input.laneViews?.find((view) => view.lane === "quick")?.capacity,
      });
      if (!admitted.ok) {
        if (heavyLockHeld) releaseHeavyOccupancyLock({ repoRoot, jobId: record.jobId });
        results.push(skip(record, LIVE_LANE_CAPACITY_SKIP_REASON));
        continue;
      }
      quickHeldJobId = laneJob.jobId;
    }

    if (tracker) {
      tracker.occupy(laneJob);
    }

    let invokedOk = false;
    try {
      if (record.skuId === CLIP_REPURPOSING_SKU) {
        if (record.requirements?.primaryTool.toolId !== CLIP_REPURPOSING_PRIMARY_TOOL_ID) {
          results.push(skip(record, "primary_tool_not_clip_factory"));
          continue;
        }
        const acceptance = mapClipRepurposingJobTruthFromJob({
          repoRoot,
          campaign: input.campaign,
          materials,
        });
        if (!acceptance.ok) {
          results.push({
            dispatchId: record.dispatchId,
            skuId: record.skuId,
            action: "skipped",
            skipReason: "factory_not_accepted",
            ok: false,
            failureCode: acceptance.code,
            message: acceptance.message,
            ownerRoutineProduction: "NONE",
          });
          continue;
        }
        const hooked = await invokeClipRepurposingDispatchHook({
          repoRoot,
          campaign: input.campaign,
          dispatchRecord: record,
          materials,
          sourceDurationSeconds: input.clipSourceDurationSeconds,
          sentences: input.clipSentences,
          discover: input.clipDiscover,
          produce: input.clipProduce,
        });
        invokedOk = hooked.ok;
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: hooked.ok,
          failureCode: hooked.ok ? undefined : hooked.failureCode,
          message: hooked.ok ? hooked.outcome.customerExplanation : hooked.message,
          invocationOutcome: hooked.ok ? hooked.invocationOutcome : undefined,
          mp4RelativePath: hooked.ok ? hooked.mp4RelativePath : undefined,
          mp4ContentSha256: hooked.ok ? hooked.mp4ContentSha256 : undefined,
          clipFiles: hooked.ok ? hooked.files : undefined,
          customerOutcome: hooked.ok ? hooked.outcome : undefined,
          attempts: hooked.ok ? hooked.attempts : hooked.attempts,
          ownerRoutineProduction: "NONE",
        });
        continue;
      }

      if (record.skuId === SHORT_FORM_VIDEO_EDITING_SKU) {
        if (record.requirements?.primaryTool.toolId !== FOOTAGE_EDITING_PRIMARY_TOOL_ID) {
          results.push(skip(record, "primary_tool_not_footage_factory"));
          continue;
        }
        const hooked = await invokeFootageEditingDispatchHook({
          repoRoot,
          campaign: input.campaign,
          dispatchRecord: record,
          materials,
          runPipeline: input.footageRunPipeline,
        });
        invokedOk = hooked.ok;
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: hooked.ok,
          failureCode: hooked.ok ? undefined : hooked.failureCode,
          message: hooked.ok ? undefined : hooked.message,
          invocationOutcome: hooked.ok ? hooked.invocationOutcome : undefined,
          mp4RelativePath: hooked.ok ? hooked.mp4RelativePath : undefined,
          mp4ContentSha256: hooked.ok ? hooked.mp4ContentSha256 : undefined,
          providerRenderId: hooked.ok ? hooked.providerRenderId : undefined,
          attempts: hooked.ok ? hooked.attempts : hooked.attempts,
          ownerRoutineProduction: "NONE",
        });
        continue;
      }

      if (record.skuId === "v2-rtu-short-video") {
        if (record.requirements?.primaryTool.toolId !== "shotstack") {
          results.push(skip(record, "primary_tool_not_shotstack"));
          continue;
        }
        const hooked = await invokeShortVideoDispatchHook({
          repoRoot,
          campaign: input.campaign,
          dispatchRecord: record,
          materials,
          fetchImpl: input.fetchImpl,
          apiKey: input.videoApiKey,
          assetUrlsOverride: input.videoAssetUrlsOverride,
        });
        invokedOk = hooked.ok;
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: hooked.ok,
          failureCode: hooked.ok ? undefined : hooked.failureCode,
          message: hooked.ok ? undefined : hooked.message,
          invocationOutcome: hooked.ok ? hooked.invocationOutcome : undefined,
          mp4RelativePath: hooked.ok ? hooked.mp4RelativePath : undefined,
          mp4ContentSha256: hooked.ok ? hooked.mp4ContentSha256 : undefined,
          providerRenderId: hooked.ok
            ? hooked.providerRenderId
            : hooked.providerRenderId,
          attempts: hooked.ok ? hooked.attempts : hooked.attempts,
          ownerRoutineProduction: "NONE",
        });
        continue;
      }

      if (record.skuId === "v2-rtu-email-kit" || record.skuId === "v2-rtu-sms-kit") {
        if (record.requirements?.primaryTool.toolId !== "studio_copy_producer") {
          results.push(skip(record, "primary_tool_not_copy_producer"));
          continue;
        }
        const hooked = await invokeCopyDispatchHook({
          repoRoot,
          campaign: input.campaign,
          dispatchRecord: record,
        });
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "invoked",
          ok: hooked.ok,
          failureCode: hooked.ok ? undefined : hooked.failureCode,
          message: hooked.ok ? undefined : hooked.message,
          invocationOutcome: hooked.ok ? hooked.invocationOutcome : undefined,
          copySha256: hooked.ok ? hooked.copySha256 : undefined,
          artifactRelativePath: hooked.ok ? hooked.artifactRelativePath : undefined,
          attempts: hooked.ok ? hooked.attempts : undefined,
          ownerRoutineProduction: "NONE",
        });
      }
    } finally {
      if (heavyLockHeld && (process.env.NODE_ENV === "test" || !invokedOk)) {
        releaseHeavyOccupancyLock({ repoRoot, jobId: record.jobId });
      }
      if (quickHeldJobId && !invokedOk) {
        releaseQuickLaneReservation({ repoRoot, jobId: quickHeldJobId });
      }
    }
  }

  return {
    packageId: LAUNCH_MENU_PRODUCTION_OBSERVER_PACKAGE_ID,
    observedAt: new Date().toISOString(),
    campaignId: input.campaign.campaignId,
    results,
    ownerRoutineProduction: "NONE",
  };
}
