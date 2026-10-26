/**
 * Bind passing email-kit / SMS-kit copy to Kitchen QA + Review Room proof
 * presentation. Copy existence alone does not open Review. Review proof
 * is not Final Delivery.
 */

import { createHash } from "crypto";

import type { CampaignRecord } from "@/config/studio-board";
import { COPY_REVIEW_BIND_SKUS } from "@/config/studio-copy-review-bind-v1";
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
import {
  enqueueJobCommunicationRecord,
  resolveCampaignCommunicationClientId,
} from "@/lib/job-control/communication";
import { authorizeCopyReviewProof } from "@/lib/studio-copy-review-bind/authorize";
import { collectCopyReviewContract } from "@/lib/studio-copy-review-bind/collect";
import { renderCustomerCopyProofHtml } from "@/lib/studio-copy-review-bind/customer-facing";
import {
  buildInternalQaReviewAuthorization,
  evaluateReviewEligibility,
} from "@/lib/studio-review-eligibility";
import { normalizeContentSha256, sameContentSha256 } from "@/lib/studio-review-revision/hash";
import {
  copyReviewProofAlreadyPresented,
  presentCopyReviewProof,
} from "@/lib/studio-review-revision/present-copy-review";
import { deliverLifecycleNoticesForCampaign } from "@/lib/studio-lifecycle-email/campaign";

import { assembleCustomerLifeTruth } from "./assemble-truth";

const MACHINE_ACTOR = {
  id: "studio-machine",
  email: "machine@studio.local",
  displayName: "Studio Machine",
  roles: ["staff"] as const,
};

const COPY_SKU_SET = new Set<string>(COPY_REVIEW_BIND_SKUS);

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

function htmlHashForMember(html: string): string {
  return createHash("sha256").update(html, "utf8").digest("hex");
}

async function bindCopySku(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  skuId: string;
  clientUserId?: string | null;
}): Promise<{
  envelope: ServerTasksEnvelope;
  bound: boolean;
}> {
  const job = input.envelope.jobRecords?.find((entry) => entry.skuId === input.skuId);
  const jobId = job?.jobId ?? `${input.campaign.campaignId}::${input.skuId}`;
  const contract = collectCopyReviewContract({
    campaign: input.campaign,
    jobId,
    skuId: input.skuId,
  });
  const kitHash = normalizeContentSha256(contract.copySha256);
  if (!kitHash) {
    return { envelope: input.envelope, bound: false };
  }

  const matching = recordsForHashes(input.envelope, [kitHash, contract.copySha256]);
  const passed =
    contract.observerOk &&
    Boolean(contract.copyQualityEvidence?.gatePassed) &&
    contract.members.length >= contract.requiredMemberCount;
  const alreadyPassed = matching.some((record) => record.action === "qa_pass");
  const alreadyFailed = matching.some((record) => record.action === "qa_fail");

  let envelope = input.envelope;
  if (!(passed && alreadyPassed) && !(!passed && alreadyFailed)) {
    const taskId = formalQaTaskIdForService(input.skuId);
    const workVersionId = contract.workVersionId;
    const qaAction = passed ? "qa_pass" : "qa_fail";
    const record = buildQaRecord({
      campaignId: input.campaign.campaignId,
      taskId,
      user: MACHINE_ACTOR,
      actorRole: "qa",
      action: qaAction,
      category: passed ? undefined : "production_correction",
      checks: ["machine_copy_identity"],
      notes: passed
        ? "Sealed Machine copy identity bound for Review eligibility."
        : "Copy output is not customer-ready. Internal copy quality evidence did not pass.",
      workVersionId,
      copyQualityEvidence: passed ? contract.copyQualityEvidence : undefined,
      artifactBinding: {
        workVersionId,
        artifactIds: [workVersionId],
        contentSha256s: [kitHash],
      },
    });
    envelope = {
      ...envelope,
      qaRecords: appendQaRecord(envelope.qaRecords, record),
      updatedAt: new Date().toISOString(),
    };
  }

  const liveJob = envelope.jobRecords?.find((entry) => entry.skuId === input.skuId);
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
          "Internal copy quality evidence did not pass. Review is not open.",
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

  const decision = evaluateReviewEligibility({
    jobId: liveJob.jobId,
    campaignId: liveJob.campaignId,
    skuId: input.skuId,
    tasks: envelope.tasks,
    qaRecords: envelope.qaRecords ?? [],
    reviewCandidate: {
      artifactId: contract.workVersionId,
      workVersionId: contract.workVersionId,
      contentSha256: kitHash,
    },
  });
  const authorization = buildInternalQaReviewAuthorization(decision);
  if (!authorization) {
    return { envelope, bound: true };
  }

  const authorized = authorizeCopyReviewProof({
    contract,
    envelope,
  });
  if (!authorized.ok) {
    return { envelope, bound: true };
  }

  const proof = await presentCopyReviewProof({
    campaign: input.campaign,
    envelope,
    contract: authorized.contract,
  });
  envelope = proof.envelope;
  const presentedJob = envelope.jobRecords?.find((entry) => entry.skuId === input.skuId);
  if (!presentedJob) return { envelope, bound: true };

  const proofsReady = authorized.contract.members.every((member) => {
    const html = renderCustomerCopyProofHtml(member);
    return copyReviewProofAlreadyPresented(presentedJob, htmlHashForMember(html));
  });
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
        "Machine copy identity passed internal QA and Review proofs are presented for every required item.",
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

export async function ensureCopyMachineReviewBind(
  campaign: CampaignRecord,
): Promise<CampaignRecord> {
  const observer = campaign.dispatchExecution?.launchMenuProductionObserver;
  const results = (observer?.results ?? []).filter((result) =>
    COPY_SKU_SET.has(result.skuId),
  );
  if (results.length === 0) return campaign;

  const envelope = await readTasksEnvelope(campaign.campaignId);
  if (!envelope) return campaign;
  const campaignEnvelope = await readCampaignEnvelope(campaign.campaignId);

  let nextEnvelope = envelope;
  let boundAny = false;
  for (const result of results) {
    const bound = await bindCopySku({
      campaign,
      envelope: nextEnvelope,
      skuId: result.skuId,
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
      COPY_SKU_SET.has(entry.skuId) &&
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
  return record;
}
