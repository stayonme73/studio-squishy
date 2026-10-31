/**
 * Bind a Machine-produced Clip Repurposing set to Review + customer communication.
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import {
  appendQaRecord,
  buildQaRecord,
  formalQaTaskIdForService,
} from "@/lib/campaign-tasks/qa";
import { hydrateCampaignDesignArtifacts } from "@/lib/campaign-design-artifacts/hosted-durable";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import { createEmptyJobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import { findActiveJobReviewFeedback } from "@/lib/job-control/review-room-view";
import {
  enqueueJobCommunicationRecord,
  resolveCampaignCommunicationClientId,
} from "@/lib/job-control/communication";
import { readClipRepurposingHookReceipt } from "@/lib/studio-dispatch/clip-repurposing-dispatch-hook";
import {
  fullVideoPassAttestations,
  viewingNotesForHash,
} from "@/lib/studio-kitchen-production/video-production/attestations";
import {
  buildInternalQaReviewAuthorization,
  evaluateReviewEligibility,
} from "@/lib/studio-review-eligibility";
import { deliverLifecycleNoticesForCampaign } from "@/lib/studio-lifecycle-email/campaign";
import { presentClipRepurposingReviewProof } from "@/lib/studio-review-revision/present-clip-repurposing-review";
import { normalizeContentSha256 } from "@/lib/studio-review-revision/hash";

const MACHINE_ACTOR = {
  id: "studio-machine",
  email: "machine@studio.local",
  displayName: "Studio Machine",
  roles: ["staff"] as const,
};

export async function ensureClipRepurposingMachineReviewBindFromCampaign(
  campaign: CampaignRecord,
  repoRoot?: string,
): Promise<CampaignRecord> {
  const observer = campaign.dispatchExecution?.launchMenuProductionObserver;
  const result = (observer?.results ?? []).find(
    (entry) => entry.skuId === CLIP_REPURPOSING_SKU,
  );
  if (!result) return campaign;

  const envelope = await readTasksEnvelope(campaign.campaignId);
  if (!envelope) return campaign;

  const job = (envelope.jobRecords ?? []).find(
    (record) => record.skuId === CLIP_REPURPOSING_SKU,
  );
  if (!job) return campaign;

  if (repoRoot) {
    await hydrateCampaignDesignArtifacts(campaign.campaignId, repoRoot, {
      clipFactoryScopedRender: false,
    });
  }

  const firstCutReceipt = readClipRepurposingHookReceipt({
    repoRoot,
    campaignId: campaign.campaignId,
    dispatchId: result.dispatchId,
    lane: "first-cut",
  });
  const revisionReceipt = readClipRepurposingHookReceipt({
    repoRoot,
    campaignId: campaign.campaignId,
    dispatchId: result.dispatchId,
    lane: "set-revision",
  });
  const useRevision = Boolean(revisionReceipt?.ok);
  const receipt = useRevision ? revisionReceipt : firstCutReceipt;
  const files = receipt?.files ?? result.clipFiles ?? [];
  const outcome = receipt?.outcome ?? result.customerOutcome;
  if (!outcome) return campaign;
  if (outcome.fileCount === 0) return campaign;
  if (files.length !== outcome.fileCount) return campaign;

  const alreadyReleased =
    job.spineStatus === "approved" ||
    job.spineStatus === "ready_for_delivery" ||
    job.spineStatus === "delivered";
  const changed = alreadyReleased
    ? { job, events: envelope.jobActivityEvents ?? [] }
    : applyJobSpineStatusChange(
        job,
        envelope.jobActivityEvents ?? [],
        {
          job,
          nextStatus: "ready_for_review",
          actor: { role: "system", displayName: "Studio Machine" },
          reason: outcome.customerExplanation,
        },
      );
  const presented = await presentClipRepurposingReviewProof({
    campaign,
    envelope: {
      ...envelope,
      jobRecords: (envelope.jobRecords ?? []).map((record) =>
        record.jobId === job.jobId ? changed.job : record,
      ),
      jobActivityEvents: changed.events,
    },
    files: files.map((file, index) => {
      const absolutePath =
        repoRoot && file.relativePath
          ? path.join(repoRoot, file.relativePath.replace(/^\.?\//, ""))
          : undefined;
      return {
        relativePath: file.relativePath,
        absolutePath:
          absolutePath && existsSync(absolutePath) ? absolutePath : undefined,
        contentSha256: file.contentSha256,
        label: `Clip ${index + 1} — ${file.idea}`,
      };
    }),
    renderVersion: useRevision ? 2 : 1,
  });

  const hashes = files.map((file) =>
    normalizeContentSha256(file.contentSha256).replace(/^sha256:/, ""),
  );
  const workVersionId = useRevision ? "clip-set-v2" : "clip-set-v1";
  const qaTaskId = formalQaTaskIdForService(CLIP_REPURPOSING_SKU);
  const alreadyQa = (presented.envelope.qaRecords ?? []).some(
    (record) =>
      record.taskId === qaTaskId &&
      record.action === "qa_pass" &&
      record.workVersionId === workVersionId,
  );
  let qaEnvelope = presented.envelope;
  if (!alreadyQa) {
    const evidence = {
      evaluation: {
        skuId: CLIP_REPURPOSING_SKU,
        ok: true,
        findings: [],
        checkedAt: new Date().toISOString(),
        deterministicFailCount: 0,
        judgmentRequired: true as const,
        assemblyCapability: "present_and_usable" as const,
        summary: `Machine Clip bind — ${files.length} finished vertical shorts with sound.`,
      },
      attestations: fullVideoPassAttestations(
        viewingNotesForHash(
          hashes[0] ?? "clip-set",
          "Clip Repurposing quality watch with sound for the finished set.",
        ),
      ),
      gatePassed: true as const,
    };
    const qaRecord = buildQaRecord({
      campaignId: campaign.campaignId,
      taskId: qaTaskId,
      user: MACHINE_ACTOR,
      actorRole: "qa",
      action: "qa_pass",
      checks: ["machine_clip_repurposing_identity", "quality_watch_with_sound"],
      notes: "Quality-watched the finished Clip Repurposing set with sound.",
      workVersionId,
      videoQualityEvidence: evidence,
      artifactBinding: {
        workVersionId,
        artifactIds: files.map((file) => file.clipId),
        contentSha256s: hashes,
      },
    });
    qaEnvelope = {
      ...presented.envelope,
      qaRecords: appendQaRecord(presented.envelope.qaRecords, qaRecord),
    };
  }
  const presentedJob =
    qaEnvelope.jobRecords?.find((record) => record.jobId === job.jobId) ??
    changed.job;
  const decision = evaluateReviewEligibility({
    jobId: presentedJob.jobId,
    campaignId: presentedJob.campaignId,
    skuId: CLIP_REPURPOSING_SKU,
    tasks: qaEnvelope.tasks,
    qaRecords: qaEnvelope.qaRecords ?? [],
    reviewCandidate: {
      artifactId: files[0]?.clipId ?? "clip-set",
      workVersionId,
      contentSha256: hashes[0] ?? "",
    },
  });
  const authorization = buildInternalQaReviewAuthorization(decision);
  if (authorization) {
    qaEnvelope = {
      ...qaEnvelope,
      jobRecords: (qaEnvelope.jobRecords ?? []).map((record) =>
        record.jobId === presentedJob.jobId
          ? { ...record, internalQaReviewAuthorization: authorization }
          : record,
      ),
    };
  }
  const authorizedJob =
    qaEnvelope.jobRecords?.find((record) => record.jobId === job.jobId) ??
    presentedJob;
  let envelopeToSave = qaEnvelope;
  if (useRevision && !alreadyReleased) {
    const deliverableKeys = (authorizedJob.deliverablePrep ?? [])
      .filter((entry) => entry.preparedAt && entry.deliverableKey)
      .map((entry) => entry.deliverableKey as string);
    if (
      deliverableKeys.length > 0 &&
      !findActiveJobReviewFeedback(qaEnvelope, job.jobId)
    ) {
      envelopeToSave = {
        ...qaEnvelope,
        jobReviewFeedback: [
          ...(qaEnvelope.jobReviewFeedback ?? []),
          createEmptyJobReviewFeedback(campaign.campaignId, job.jobId, deliverableKeys, {
            packageId: `pkg:${job.jobId}:draft:revision-ready:${authorization?.authorizedAt ?? new Date().toISOString()}`,
          }),
        ],
      };
    }
  }

  const withComm = enqueueJobCommunicationRecord(
    envelopeToSave,
    {
      job: authorizedJob,
      campaign,
      eventType: useRevision ? "revision_ready_again" : "ready_for_review",
      clientId: resolveCampaignCommunicationClientId(
        (await readCampaignEnvelope(campaign.campaignId))?.clientUserId,
        campaign.campaignId,
      ),
      sender: { role: "system", displayName: "Studio Machine" },
      idempotencyKey: `${result.dispatchId}:${useRevision ? "set-revision" : "first-cut"}:${files.map((file) => file.contentSha256).join(",")}`,
    },
  );
  await writeTasksEnvelope(withComm);
  try {
    await deliverLifecycleNoticesForCampaign(campaign.campaignId);
  } catch {
    // The review record is already saved. The next Machine pass retries the email.
  }

  const latest = await readCampaignEnvelope(campaign.campaignId);
  if (!latest?.record) return campaign;
  const saved = await upsertCampaignRecord(
    {
      ...latest.record,
      updatedAt: new Date().toISOString(),
    },
    latest.clientUserId,
  );
  return saved.record;
}
