/**
 * Preview hosted cert — run launch-menu production only (clip/SFV/copy hooks).
 * Skips design-renderer observer and post-bind fan-out so maxDuration goes to production.
 */
import type { CampaignRecord } from "@/config/studio-board";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { withCampaignArtifactProductionWorkspace } from "@/lib/campaign-design-artifacts";
import { ensureClipRepurposingMachineReviewBindFromCampaign } from "@/lib/studio-customer-life/machine-clip-repurposing-review-bind";
import { advanceStudioExtras } from "@/lib/studio-extras/advance";
import { loadStudioLaneViews } from "@/lib/job-control";
import {
  LAUNCH_MENU_PRODUCTION_OBSERVER_PACKAGE_ID,
  runLaunchMenuProductionObserver,
} from "@/lib/studio-dispatch/launch-menu-production-observer";
import { persistHostedLaunchMenuFailure } from "@/lib/studio-hosted-cert/persist-launch-menu-progress";

export async function continueHostedCertLaunchMenuChain(
  campaignId: string,
): Promise<CampaignRecord | null> {
  const envelope = await readCampaignEnvelope(campaignId);
  if (!envelope?.record.routeMapIntakeSubmittedAt) return null;

  const dispatch = envelope.record.dispatchExecution;
  if (!dispatch?.records?.some((r) => r.executionIdentityReady)) {
    return envelope.record;
  }

  const priorObserver = dispatch.launchMenuProductionObserver;
  const priorHit = priorObserver?.results?.find(
    (r) => r.action === "invoked" && r.skuId === "v2-rtu-clip-repurposing",
  );
  if (
    priorHit?.failureCode === "PRODUCTION_IN_PROGRESS" &&
    priorObserver?.observedAt &&
    Date.now() - Date.parse(priorObserver.observedAt) > 810_000
  ) {
    await persistHostedLaunchMenuFailure({
      campaignId,
      failureCode: "PRIOR_RUN_VERCEL_TIMEOUT",
      message:
        "Previous Preview launch-menu run likely hit maxDuration (800s) without terminal observer.",
      dispatchId: priorHit.dispatchId,
      skuId: priorHit.skuId,
    });
  }

  const chainStartedAt = new Date().toISOString();
  await upsertCampaignRecord(
    {
      ...envelope.record,
      dispatchExecution: {
        ...dispatch,
        lastAttemptAt: chainStartedAt,
      },
      updatedAt: chainStartedAt,
    },
    envelope.clientUserId,
  );

  return withCampaignArtifactProductionWorkspace(campaignId, async (repoRoot) => {
    const tasks = await readTasksEnvelope(campaignId);
    const clipJob = tasks?.jobRecords?.find((record) => record.skuId === CLIP_REPURPOSING_SKU);
    const priorClip = priorObserver?.results?.find(
      (r) => r.skuId === CLIP_REPURPOSING_SKU && r.action === "invoked" && r.ok,
    );
    const productionComplete =
      Boolean(priorClip?.customerOutcome?.fileCount) &&
      (priorClip?.clipFiles?.length ?? 0) >= (priorClip?.customerOutcome?.fileCount ?? 0);
    const needsSetRevision = clipJob?.spineStatus === "revision_requested";
    const bindOnly =
      productionComplete &&
      !needsSetRevision &&
      clipJob?.internalQaReviewAuthorization?.status === "ELIGIBLE_FOR_REVIEW" &&
      (clipJob.spineStatus === "ready_for_review" ||
        clipJob.spineStatus === "approved" ||
        clipJob.spineStatus === "ready_for_delivery" ||
        clipJob.spineStatus === "delivered");

    if (bindOnly) {
      let campaign = await ensureClipRepurposingMachineReviewBindFromCampaign(
        envelope.record,
        repoRoot,
      );
      campaign = await advanceStudioExtras(campaign);
      return campaign;
    }

    const laneViews = await loadStudioLaneViews();
    let launchMenu: Awaited<ReturnType<typeof runLaunchMenuProductionObserver>>;
    try {
      launchMenu = await runLaunchMenuProductionObserver({
        campaign: envelope.record,
        dispatch,
        laneViews,
        repoRoot,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Launch-menu observer failed.";
      await persistHostedLaunchMenuFailure({
        campaignId,
        failureCode: "OBSERVER_THREW",
        message,
      });
      launchMenu = {
        packageId: LAUNCH_MENU_PRODUCTION_OBSERVER_PACKAGE_ID,
        observedAt: new Date().toISOString(),
        campaignId,
        results: [
          {
            dispatchId: "observer",
            skuId: "unknown",
            action: "invoked",
            ok: false,
            failureCode: "OBSERVER_THREW",
            message,
            ownerRoutineProduction: "NONE",
          },
        ],
        ownerRoutineProduction: "NONE",
      };
    }

    const dispatchWithLaunch = {
      ...dispatch,
      launchMenuProductionObserver: launchMenu,
      lastAttemptAt: new Date().toISOString(),
    };

    const saved = await upsertCampaignRecord(
      {
        ...envelope.record,
        dispatchExecution: dispatchWithLaunch,
        updatedAt: new Date().toISOString(),
      },
      envelope.clientUserId,
    );

    let campaign = await ensureClipRepurposingMachineReviewBindFromCampaign(
      saved.record,
      repoRoot,
    );
    campaign = await advanceStudioExtras(campaign);
    return campaign;
  });
}
