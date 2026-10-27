import type { CampaignRecord } from "@/config/studio-board";
import { studioDispatchV1 } from "@/config/studio-dispatch-v1";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import { applySm001MonthlyDispatchTargetMirror } from "@/lib/studio-monthly-production-cycle";
import { ensureRoutingHandoff } from "@/lib/studio-routing-handoff";

import { ensureFlyerMachineReviewBind } from "@/lib/studio-customer-life/machine-review-bind";
import { ensureGeneralDesignMachineReviewBind } from "@/lib/studio-customer-life/machine-general-design-review-bind";
import { ensureSocialPromoCompositeReviewBind } from "@/lib/studio-customer-life/machine-social-promo-review-bind";
import { ensureCampaignLaunchKitReviewBind } from "@/lib/studio-customer-life/machine-campaign-launch-kit-review-bind";
import { ensureCopyMachineReviewBind } from "@/lib/studio-customer-life/machine-copy-review-bind";
import { ensureShortVideoMachineReviewBindFromCampaign } from "@/lib/studio-customer-life/machine-short-video-review-bind";
import { ensureClipRepurposingMachineReviewBindFromCampaign } from "@/lib/studio-customer-life/machine-clip-repurposing-review-bind";
import { ensureFootageEditingMachineReviewBindFromCampaign } from "@/lib/studio-customer-life/machine-footage-editing-review-bind";
import { recordMachineProductionPass } from "@/lib/studio-production-team-workforce";
import { advanceStudioExtras } from "@/lib/studio-extras/advance";
import { loadStudioLaneViews, resolveProductionLaneViews } from "@/lib/job-control";
import { runDesignRendererDispatchObserver } from "./design-renderer-observer";
import {
  LAUNCH_MENU_PRODUCTION_OBSERVER_PACKAGE_ID,
  runLaunchMenuProductionObserver,
} from "./launch-menu-production-observer";
import { CREATIVE_QA_FINISH_SKU } from "@/lib/studio-creative-qa-finish/contract";
import {
  CREATIVE_QA_FINISH_OBSERVER_PACKAGE_ID,
  runCreativeQaFinishObserver,
} from "./creative-qa-finish-observer";
import { evaluateJobDispatch } from "./evaluate";
import type {
  DispatchExecutionRecord,
  DispatchExecutionResult,
  JobDispatchRecord,
} from "./types";
import {
  collectCustomerIdentityDispatchContext,
} from "@/lib/studio-customer-identity-safety-gate/collect";
import { applyCustomerIdentityFailClosed } from "@/lib/studio-customer-identity-safety-gate/apply";
import {
  evaluateCustomerIdentitySafetyGate,
  type CustomerIdentityDispatchSession,
} from "@/lib/studio-customer-identity-safety-gate";
import { studioCustomerIdentitySafetyGateV1 } from "@/config/studio-customer-identity-safety-gate-v1";
import { resolveDispatchExecutionIsolationBlock } from "@/lib/studio-payment/disposable-test-isolation-guards";
import { withCampaignArtifactProductionWorkspace } from "@/lib/campaign-design-artifacts";

function recordsEqual(
  a: readonly JobDispatchRecord[],
  b: readonly JobDispatchRecord[],
): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((r) => [r.dispatchId, r]));
  return a.every((record) => {
    const other = byId.get(record.dispatchId);
    if (!other) return false;
    return (
      other.status === record.status &&
      other.routingFactFingerprint === record.routingFactFingerprint &&
      other.executionIdentityReady === record.executionIdentityReady &&
      other.blocker === record.blocker &&
      other.productionCycleId === record.productionCycleId &&
      JSON.stringify(other.requirements) === JSON.stringify(record.requirements)
    );
  });
}

async function writePendingRetry(
  campaign: CampaignRecord,
  message: string,
): Promise<CampaignRecord> {
  const now = new Date().toISOString();
  const prior = campaign.dispatchExecution;
  const pending: DispatchExecutionRecord = {
    schemaVersion: studioDispatchV1.schemaVersion,
    status: studioDispatchV1.envelopeStatuses.pendingRetry,
    evaluatedAt: prior?.evaluatedAt ?? now,
    lastAttemptAt: now,
    activationCheckoutSessionId:
      campaign.paymentTruth?.checkoutSessionId ??
      prior?.activationCheckoutSessionId ??
      "",
    records: prior?.records ?? [],
    ownerActionRequired: false,
    lastError: message,
  };
  const envelope = await readCampaignEnvelope(campaign.campaignId);
  const saved = await upsertCampaignRecord(
    { ...campaign, dispatchExecution: pending, updatedAt: now },
    envelope?.clientUserId,
  );
  return saved.record;
}

/**
 * After durable dispatch identity exists, observe design-renderer-ready records
 * (v2-rtu-flyer and v2-rtu-business-card). Hook failures are recorded — they do
 * not fail dispatch identity itself.
 */
async function attachDesignRendererObserver(input: {
  campaign: CampaignRecord;
  dispatch: DispatchExecutionRecord;
  alreadyEvaluated: boolean;
  repoRoot: string;
}): Promise<Extract<DispatchExecutionResult, { ok: true }>> {
  const laneViews =
    process.env.NODE_ENV === "test"
      ? resolveProductionLaneViews([])
      : await loadStudioLaneViews();
  const observer = await runDesignRendererDispatchObserver({
    campaign: input.campaign,
    dispatch: input.dispatch,
    laneViews,
    repoRoot: input.repoRoot,
  });
  let launchMenu: Awaited<ReturnType<typeof runLaunchMenuProductionObserver>>;
  try {
    launchMenu = await runLaunchMenuProductionObserver({
      campaign: input.campaign,
      dispatch: input.dispatch,
      laneViews,
      repoRoot: input.repoRoot,
    });
  } catch (error) {
    launchMenu = {
      packageId: LAUNCH_MENU_PRODUCTION_OBSERVER_PACKAGE_ID,
      observedAt: new Date().toISOString(),
      campaignId: input.campaign.campaignId,
      results: [
        {
          dispatchId: "observer",
          skuId: "unknown",
          action: "skipped",
          skipReason: "observer_threw",
          ok: false,
          failureCode: "OBSERVER_THREW",
          message: error instanceof Error ? error.message : "Launch-menu observer failed.",
          ownerRoutineProduction: "NONE",
        },
      ],
      ownerRoutineProduction: "NONE",
    };
  }

  let creativeQa: Awaited<ReturnType<typeof runCreativeQaFinishObserver>>;
  try {
    creativeQa = await runCreativeQaFinishObserver({
      campaign: input.campaign,
      dispatch: input.dispatch,
      repoRoot: input.repoRoot,
    });
  } catch (error) {
    creativeQa = {
      packageId: CREATIVE_QA_FINISH_OBSERVER_PACKAGE_ID,
      observedAt: new Date().toISOString(),
      campaignId: input.campaign.campaignId,
      results: [
        {
          dispatchId: "observer",
          skuId: CREATIVE_QA_FINISH_SKU,
          action: "failed",
          ok: false,
          failureCode: "OBSERVER_THREW",
          message: error instanceof Error ? error.message : "Creative QA observer failed.",
        },
      ],
    };
  }

  recordMachineProductionPass({
    repoRoot: input.repoRoot,
    campaign: input.campaign,
    records: input.dispatch.records,
    designResults: observer.results,
    launchResults: launchMenu.results,
  });

  const flyerLoop = observer.results.find(
    (result) => result.skuId === "v2-rtu-flyer" && result.internalLoop,
  )?.internalLoop;

  const dispatchWithObserver: DispatchExecutionRecord = {
    ...input.dispatch,
    designRendererObserver: observer,
    launchMenuProductionObserver: launchMenu,
    creativeQaFinishObserver: creativeQa,
  };

  const envelope = await readCampaignEnvelope(input.campaign.campaignId);
  const saved = await upsertCampaignRecord(
    {
      ...input.campaign,
      routeMapIntake:
        envelope?.record.routeMapIntake ?? input.campaign.routeMapIntake,
      routeMapIntakeDraft:
        envelope?.record.routeMapIntakeDraft ?? input.campaign.routeMapIntakeDraft,
      routeMapIntakeSubmittedAt:
        envelope?.record.routeMapIntakeSubmittedAt ??
        input.campaign.routeMapIntakeSubmittedAt,
      studioExtras: envelope?.record.studioExtras ?? input.campaign.studioExtras,
      dispatchExecution: dispatchWithObserver,
      ...(flyerLoop ? { internalProductionLoop: flyerLoop } : {}),
      updatedAt: new Date().toISOString(),
    },
    envelope?.clientUserId,
  );

  const boundFlyer = await ensureFlyerMachineReviewBind(saved.record);
  const boundGeneralDesign = await ensureGeneralDesignMachineReviewBind(boundFlyer);
  const boundDesign = await ensureSocialPromoCompositeReviewBind(boundGeneralDesign, {
    repoRoot: input.repoRoot,
  });
  const boundCampaignKit = await ensureCampaignLaunchKitReviewBind(boundDesign);
  const boundCopy = await ensureCopyMachineReviewBind(boundCampaignKit);
  const boundStills = await ensureShortVideoMachineReviewBindFromCampaign(
    boundCopy,
  );
  const boundFootage = await ensureFootageEditingMachineReviewBindFromCampaign(
    boundStills,
  );
  const boundClip = await ensureClipRepurposingMachineReviewBindFromCampaign(
    boundFootage,
  );
  const boundCampaign = await advanceStudioExtras(boundClip);
  const boundObserver =
    boundCampaign.dispatchExecution?.designRendererObserver ?? observer;

  return {
    ok: true,
    campaign: boundCampaign,
    dispatch: boundCampaign.dispatchExecution ?? dispatchWithObserver,
    alreadyEvaluated: input.alreadyEvaluated,
    designRendererObserver: boundObserver,
  };
}

async function failClosedIdentity(
  campaign: CampaignRecord,
  session?: CustomerIdentityDispatchSession,
): Promise<DispatchExecutionResult | null> {
  const context = await collectCustomerIdentityDispatchContext(campaign, session);
  const verdict = evaluateCustomerIdentitySafetyGate(context);
  if (verdict.ok) return null;
  const blocked = await applyCustomerIdentityFailClosed(campaign, verdict);
  return {
    ok: false,
    campaign: blocked,
    dispatch: blocked.dispatchExecution ?? null,
    error: "customer_context_mismatch",
    message: studioCustomerIdentitySafetyGateV1.customerCopy.lead,
  };
}

/**
 * Server-driven dispatch execution identity.
 * Refreshes routing first. Identity evaluation does not invoke tools.
 * After durable identity, STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1 may
 * auto-invoke studio_design_renderer for v2-rtu-flyer, v2-rtu-business-card,
 * v2-rtu-menu, v2-rtu-service-sheet, v2-rtu-promotion-graphics, and
 * v2-rtu-social-posts.
 *
 * STUDIO-OPERATING-MACHINE-CUSTOMER-IDENTITY-SAFETY-GATE-1 runs after
 * routing and before any Production observer/hook.
 */
export async function ensureDispatchExecution(
  campaign: CampaignRecord,
  identitySession?: CustomerIdentityDispatchSession,
): Promise<DispatchExecutionResult> {
  const routed = await ensureRoutingHandoff(campaign);
  const working = routed.campaign;

  if (
    !working.paymentReceivedAt ||
    working.paymentTruth?.status !== "confirmed"
  ) {
    return {
      ok: false,
      campaign: working,
      dispatch: working.dispatchExecution ?? null,
      error: "payment_not_confirmed",
      message: "Dispatch requires processor-confirmed payment.",
    };
  }

  const isolationBlock = resolveDispatchExecutionIsolationBlock(working, process.env);
  if (isolationBlock) {
    return {
      ok: false,
      campaign: working,
      dispatch: working.dispatchExecution ?? null,
      error: isolationBlock.error,
      message: isolationBlock.message,
    };
  }

  const identityBlock = await failClosedIdentity(working, identitySession);
  if (identityBlock) return identityBlock;

  if (!working.routingHandoff) {
    return {
      ok: false,
      campaign: working,
      dispatch: working.dispatchExecution ?? null,
      error: "routing_incomplete",
      message: "Dispatch requires durable routing handoff.",
    };
  }

  const now = new Date().toISOString();
  const checkoutSessionId =
    working.paymentTruth?.checkoutSessionId ??
    working.routingHandoff.activationCheckoutSessionId;

  try {
    const evaluatedRecords = working.routingHandoff.decisions.map((decision) =>
      evaluateJobDispatch({
        campaignId: working.campaignId,
        routing: decision,
        jobId: decision.jobId,
        skuId: decision.skuId,
        evaluatedAt: now,
      }),
    );
    // Preserve explicit monthly cycle target mirror — never invent from newest/month.
    const records = applySm001MonthlyDispatchTargetMirror(
      working,
      evaluatedRecords,
    );

    const anyReady = records.some((r) => r.executionIdentityReady);
    const envelope: DispatchExecutionRecord = {
      schemaVersion: studioDispatchV1.schemaVersion,
      status: anyReady
        ? studioDispatchV1.envelopeStatuses.evaluated
        : studioDispatchV1.envelopeStatuses.deferred,
      evaluatedAt:
        working.dispatchExecution?.status === "evaluated" ||
        working.dispatchExecution?.status === "deferred"
          ? working.dispatchExecution.evaluatedAt
          : now,
      lastAttemptAt: now,
      activationCheckoutSessionId: checkoutSessionId,
      records,
      ownerActionRequired: false,
      lastError: null,
    };

    const prior = working.dispatchExecution;
    if (
      prior &&
      prior.status === envelope.status &&
      prior.activationCheckoutSessionId === envelope.activationCheckoutSessionId &&
      recordsEqual(prior.records, envelope.records)
    ) {
      return withCampaignArtifactProductionWorkspace(working.campaignId, (repoRoot) =>
        attachDesignRendererObserver({
          campaign: working,
          dispatch: prior,
          alreadyEvaluated: true,
          repoRoot,
        }),
      );
    }

    const campaignEnvelope = await readCampaignEnvelope(working.campaignId);
    const saved = await upsertCampaignRecord(
      {
        ...working,
        dispatchExecution: envelope,
        updatedAt: now,
      },
      campaignEnvelope?.clientUserId,
    );

    return withCampaignArtifactProductionWorkspace(saved.record.campaignId, (repoRoot) =>
      attachDesignRendererObserver({
        campaign: saved.record,
        dispatch: envelope,
        alreadyEvaluated: false,
        repoRoot,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Dispatch execution failed.";
    try {
      const failed = await writePendingRetry(working, message);
      return {
        ok: false,
        campaign: failed,
        dispatch: failed.dispatchExecution ?? null,
        error: "dispatch_failed",
        message,
      };
    } catch {
      return {
        ok: false,
        campaign: working,
        dispatch: working.dispatchExecution ?? null,
        error: "dispatch_failed",
        message,
      };
    }
  }
}
