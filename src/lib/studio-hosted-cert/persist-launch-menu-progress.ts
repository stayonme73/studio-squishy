import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import type { CampaignRecord } from "@/config/studio-board";
import {
  LAUNCH_MENU_PRODUCTION_OBSERVER_PACKAGE_ID,
  type LaunchMenuObserverResult,
} from "@/lib/studio-dispatch/launch-menu-production-observer";
import type { DispatchExecutionRecord } from "@/lib/studio-dispatch/types";

/** Mid-run Postgres stamp so long async clip jobs are observable before maxDuration ends. */
export async function persistHostedLaunchMenuProgress(input: {
  campaignId: string;
  result: LaunchMenuObserverResult;
}): Promise<CampaignRecord | null> {
  const envelope = await readCampaignEnvelope(input.campaignId);
  if (!envelope?.record?.dispatchExecution) return null;
  const dispatch: DispatchExecutionRecord = envelope.record.dispatchExecution;
  const observedAt = new Date().toISOString();
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID?.trim() || "unknown";
  const result: LaunchMenuObserverResult = {
    ...input.result,
    message:
      input.result.message ??
      `Launch-menu production in progress (deployment ${deploymentId}).`,
  };
  const launchMenu = {
    packageId: LAUNCH_MENU_PRODUCTION_OBSERVER_PACKAGE_ID,
    observedAt,
    campaignId: input.campaignId,
    results: [result],
    ownerRoutineProduction: "NONE" as const,
  };
  const saved = await upsertCampaignRecord(
    {
      ...envelope.record,
      dispatchExecution: {
        ...dispatch,
        launchMenuProductionObserver: launchMenu,
        lastAttemptAt: observedAt,
      },
      updatedAt: observedAt,
    },
    envelope.clientUserId,
  );
  return saved.record;
}

/** Terminal failure when launch-menu chain throws or async after() aborts mid-hook. */
export async function persistHostedLaunchMenuFailure(input: {
  campaignId: string;
  failureCode: string;
  message: string;
  dispatchId?: string;
  skuId?: string;
}): Promise<CampaignRecord | null> {
  return persistHostedLaunchMenuProgress({
    campaignId: input.campaignId,
    result: {
      dispatchId: input.dispatchId ?? "launch-menu-chain",
      skuId: input.skuId ?? "unknown",
      action: "invoked",
      ok: false,
      failureCode: input.failureCode,
      message: input.message,
      ownerRoutineProduction: "NONE",
    },
  });
}
