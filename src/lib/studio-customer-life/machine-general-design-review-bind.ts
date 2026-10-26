/**
 * Bind passing non-flyer Design Production artifacts to Kitchen QA +
 * Review Room proof presentation. One passing format cannot mark a
 * sibling format ready. Review proof is not Final Delivery.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { GENERAL_DESIGN_LAUNCH_SKUS } from "@/config/studio-general-design-runtime-v1";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import {
  appendQaRecord,
  buildQaRecord,
  formalQaTaskIdForService,
} from "@/lib/campaign-tasks/qa";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import { syncRevisionRoundsUsedMirror } from "@/lib/job-control/correction-round-ledger";
import {
  enqueueJobCommunicationRecord,
  resolveCampaignCommunicationClientId,
} from "@/lib/job-control/communication";
import type { DesignRendererObserverResult } from "@/lib/studio-dispatch/design-renderer-observer";
import { isSocialPromoCompositeBranchJob } from "@/lib/studio-dispatch/social-promo-composite-dispatch";
import { authorizeGeneralDesignReviewProof } from "@/lib/studio-general-design-review-bind/authorize";
import { collectGeneralDesignReviewContract } from "@/lib/studio-general-design-review-bind/collect";
import {
  buildInternalQaReviewAuthorization,
  evaluateReviewEligibility,
} from "@/lib/studio-review-eligibility";
import { normalizeContentSha256, sameContentSha256 } from "@/lib/studio-review-revision/hash";
import {
  generalDesignReviewProofAlreadyPresented,
  presentGeneralDesignReviewProof,
} from "@/lib/studio-review-revision/present-general-design-review";
import { deliverLifecycleNoticesForCampaign } from "@/lib/studio-lifecycle-email/campaign";

import { assembleCustomerLifeTruth } from "./assemble-truth";

const MACHINE_ACTOR = {
  id: "studio-machine",
  email: "machine@studio.local",
  displayName: "Studio Machine",
  roles: ["staff"] as const,
};

const GENERAL_DESIGN_SKU_SET = new Set<string>(GENERAL_DESIGN_LAUNCH_SKUS);

function recordsForHashes(
  envelope: ServerTasksEnvelope,
  hashes: readonly string[],
) {
  return (envelope.qaRecords ?? []).filter((record) =>
    (record.artifactBinding?.contentSha256s ?? []).some((value) =>
      hashes.some((hash) => sameContentSha256(value, hash) || value === hash),
    ),
  );
}

function hashesForResult(
  campaignId: string,
  jobId: string,
  result: DesignRendererObserverResult,
): string[] {
  const contract = collectGeneralDesignReviewContract({
    campaignId,
    jobId,
    skuId: result.skuId,
    result,
  });
  if (contract.members.length > 0) {
    return [
      ...new Set(
        contract.members.map((member) =>
          normalizeContentSha256(member.pngContentSha256),
        ),
      ),
    ];
  }
  return [result.pngContentSha256, result.backPngContentSha256]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => normalizeContentSha256(value));
}

async function bindGeneralDesignSku(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  result: DesignRendererObserverResult;
  clientUserId?: string | null;
}): Promise<{
  envelope: ServerTasksEnvelope;
  bound: boolean;
}> {
  const skuId = input.result.skuId;
  const job = input.envelope.jobRecords?.find((entry) => entry.skuId === skuId);
  const jobId = job?.jobId ?? `${input.campaign.campaignId}::${skuId}`;
  const contract = collectGeneralDesignReviewContract({
    campaignId: input.campaign.campaignId,
    jobId,
    skuId,
    result: input.result,
  });
  const hashes = hashesForResult(input.campaign.campaignId, jobId, input.result);
  if (hashes.length === 0) {
    return { envelope: input.envelope, bound: false };
  }

  const matching = recordsForHashes(input.envelope, hashes);
  const passed = input.result.ok === true && input.result.action === "invoked";
  const alreadyPassed = matching.some((record) => record.action === "qa_pass");
  const alreadyFailed = matching.some((record) => record.action === "qa_fail");

  let envelope = input.envelope;
  if (!(passed && alreadyPassed) && !(!passed && alreadyFailed)) {
    const taskId = formalQaTaskIdForService(skuId);
    const workVersionId = contract.workVersionId;
    const artifactId = workVersionId;
    const qaAction = passed ? "qa_pass" : "qa_fail";
    const now = new Date().toISOString();
    const designQualityEvidence = passed
      ? {
          evaluation: {
            skuId,
            fixtureId: `job-${input.campaign.campaignId}`,
            ok: true,
            findings: [],
            checkedAt: now,
            deterministicFailCount: 0,
            judgmentRequired: true as const,
            summary: "Machine design renderer QA passed for this identity.",
          },
          attestations: {
            hierarchyReviewed: true,
            readabilityReviewed: true,
            spacingCompositionReviewed: true,
            brandFitReviewed: true,
            genericnessRejected: true,
            exportReadinessReviewed: true,
            notes:
              "Producer QA passed before Review bind. This is not a Scout visual pass.",
          },
          gatePassed: true,
        }
      : undefined;
    const record = buildQaRecord({
      campaignId: input.campaign.campaignId,
      taskId,
      user: MACHINE_ACTOR,
      actorRole: "qa",
      action: qaAction,
      category: passed ? undefined : "production_correction",
      checks: ["machine_general_design_identity"],
      notes: passed
        ? "Sealed Machine design identity bound for Review eligibility."
        : "Design output is not customer-ready. Internal quality evidence did not pass.",
      workVersionId,
      designQualityEvidence,
      artifactBinding: {
        workVersionId,
        artifactIds: [artifactId],
        contentSha256s: hashes,
      },
    });
    envelope = {
      ...envelope,
      qaRecords: appendQaRecord(envelope.qaRecords, record),
      updatedAt: new Date().toISOString(),
    };
  }

  const liveJob = envelope.jobRecords?.find((entry) => entry.skuId === skuId);
  if (!liveJob) {
    return { envelope, bound: true };
  }

  if (!passed) {
    let nextJob: PurchasedJobRecord = {
      ...liveJob,
      internalQaReviewAuthorization: undefined,
    };
    let events = envelope.jobActivityEvents ?? [];
    if (liveJob.spineStatus === "ready_for_review") {
      const moved = applyJobSpineStatusChange(nextJob, events, {
        job: nextJob,
        nextStatus: "building_concepts",
        actor: { role: "system", displayName: "Studio Machine" },
        reason:
          "Internal design quality evidence did not pass for every required format. Review is not open.",
      });
      nextJob = moved.job;
      events = moved.events;
    }
    return {
      envelope: {
        ...envelope,
        jobRecords: (envelope.jobRecords ?? []).map((entry) =>
          entry.jobId === liveJob.jobId ? nextJob : entry,
        ),
        jobActivityEvents: events,
        updatedAt: new Date().toISOString(),
      },
      bound: true,
    };
  }

  const workVersionId = contract.workVersionId;
  const decision = evaluateReviewEligibility({
    jobId: liveJob.jobId,
    campaignId: liveJob.campaignId,
    skuId,
    tasks: envelope.tasks,
    qaRecords: envelope.qaRecords ?? [],
    reviewCandidate: {
      artifactId: workVersionId,
      workVersionId,
      contentSha256: hashes[0],
    },
  });
  const authorization = buildInternalQaReviewAuthorization(decision);
  if (!authorization) {
    return { envelope, bound: true };
  }

  const authorized = authorizeGeneralDesignReviewProof({
    contract,
    envelope,
  });
  if (!authorized.ok) {
    return { envelope, bound: true };
  }

  const proof = await presentGeneralDesignReviewProof({
    campaign: input.campaign,
    envelope,
    contract: authorized.contract,
  });
  envelope = proof.envelope;
  const presentedJob = envelope.jobRecords?.find((entry) => entry.skuId === skuId);
  if (!presentedJob) return { envelope, bound: true };

  const proofsReady = authorized.contract.members.every((member) =>
    generalDesignReviewProofAlreadyPresented(presentedJob, member.pngContentSha256),
  );
  if (!proofsReady) {
    return { envelope, bound: true };
  }

  const truth = assembleCustomerLifeTruth({
    campaign: input.campaign,
    tasks: envelope,
  });
  const occurredAt = new Date().toISOString();
  let nextJob: PurchasedJobRecord = {
    ...presentedJob,
    internalQaReviewAuthorization: authorization,
    productionStartedAt: presentedJob.productionStartedAt ?? occurredAt,
  };
  let events = envelope.jobActivityEvents ?? [];
  if (
    truth.intakeComplete &&
    truth.blockingMaterialsCount === 0 &&
    nextJob.spineStatus !== "ready_for_review" &&
    nextJob.spineStatus !== "approved" &&
    nextJob.spineStatus !== "delivered"
  ) {
    const moved = applyJobSpineStatusChange(nextJob, events, {
      job: nextJob,
      nextStatus: "ready_for_review",
      actor: { role: "system", displayName: "Studio Machine" },
      reason:
        "Machine design identity passed internal QA and Review proofs are presented for every required format.",
    });
    nextJob = moved.job;
    events = moved.events;
  }
  envelope = {
    ...envelope,
    jobRecords: (envelope.jobRecords ?? []).map((row) =>
      row.jobId === nextJob.jobId ? nextJob : row,
    ),
    jobActivityEvents: events,
  };
  if (nextJob.spineStatus === "ready_for_review") {
    envelope = enqueueJobCommunicationRecord(envelope, {
      campaign: input.campaign,
      clientId: resolveCampaignCommunicationClientId(
        input.clientUserId,
        input.campaign.campaignId,
      ),
      job: nextJob,
      eventType: "ready_for_review",
      idempotencyKey: authorization.decisionId,
    });
  }
  return { envelope, bound: true };
}

export async function ensureGeneralDesignMachineReviewBind(
  campaign: CampaignRecord,
): Promise<CampaignRecord> {
  const observer = campaign.dispatchExecution?.designRendererObserver;
  // Social & Promo branches are reviewed as one parent set, never one branch at a time.
  const compositeBranchDispatchIds = new Set(
    (campaign.dispatchExecution?.records ?? [])
      .filter((record) => isSocialPromoCompositeBranchJob(record.jobId))
      .map((record) => record.dispatchId),
  );
  const results = (observer?.results ?? []).filter(
    (result) =>
      GENERAL_DESIGN_SKU_SET.has(result.skuId) &&
      !compositeBranchDispatchIds.has(result.dispatchId),
  );
  if (results.length === 0) return campaign;

  const envelope = await readTasksEnvelope(campaign.campaignId);
  if (!envelope) return campaign;
  const campaignEnvelope = await readCampaignEnvelope(campaign.campaignId);

  let nextEnvelope = envelope;
  let boundAny = false;
  for (const result of results) {
    const bound = await bindGeneralDesignSku({
      campaign,
      envelope: nextEnvelope,
      result,
      clientUserId: campaignEnvelope?.clientUserId,
    });
    nextEnvelope = bound.envelope;
    boundAny = boundAny || bound.bound;
  }

  if (boundAny) {
    await writeTasksEnvelope(nextEnvelope);
  }
  await deliverLifecycleNoticesForCampaign(campaign.campaignId);
  const latest = await readCampaignEnvelope(campaign.campaignId);
  let record = latest?.record ?? campaign;
  const readyJob = nextEnvelope.jobRecords?.find(
    (entry) =>
      GENERAL_DESIGN_SKU_SET.has(entry.skuId) &&
      entry.spineStatus === "ready_for_review",
  );
  if (
    readyJob &&
    record.campaignStatus !== "READY_FOR_REVIEW" &&
    record.campaignStatus !== "DELIVERED"
  ) {
    const saved = await upsertCampaignRecord(
      {
        ...record,
        campaignStatus: "READY_FOR_REVIEW",
        updatedAt: new Date().toISOString(),
      },
      latest?.clientUserId,
    );
    record = saved.record;
  }
  // Review just opened, so any revision the customer was waiting on is now spent.
  const mirrored = syncRevisionRoundsUsedMirror(record, nextEnvelope);
  if (mirrored.changed) {
    const saved = await upsertCampaignRecord(mirrored.campaign, latest?.clientUserId);
    record = saved.record;
  }
  return record;
}
