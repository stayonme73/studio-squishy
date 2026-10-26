/**
 * Release the QA-approved Short-Form set into the existing customer delivery room.
 * Copies the four approved files. Does not rewrite the candidate video, cover, caption, or guide.
 */

import { createHash } from "crypto";
import { copyFileSync, mkdirSync, readFileSync, statSync } from "fs";
import path from "path";

import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { linkClientCampaign, listStudioUsers } from "@/lib/auth/users";
import { createSupabasePrivateStorageRef } from "@/lib/file-storage/supabase";
import { fileRoomFileAccessPath } from "@/lib/file-storage/routes";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import { applySystemFinalDeliveryAuthorization } from "@/lib/job-control/final-delivery-actions";
import { materialContextFromLedger } from "@/lib/job-control/final-delivery-gates";
import type { JobActivityActor, PurchasedJobRecord } from "@/lib/job-control/types";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import { studioApprovedDeliveryV1 } from "@/config/studio-approved-delivery-v1";
import {
  SHORT_FORM_CUSTOMER_DELIVERY_FILES,
  shortFormCustomerDeliveryFacts,
} from "@/lib/studio-dispatch/short-form-current-door-delivery-copy";

const CUSTOMER_EMAIL = "route-proof-short-form@local.dev";
const WORK_VERSION_ID = "short-form-set-v1";
const ARTIFACT_ID = "short-form-set-v1";
const ACTOR: JobActivityActor = { role: "system", displayName: "Studio" };

export { SHORT_FORM_CUSTOMER_DELIVERY_FILES, shortFormCustomerDeliveryFacts };

function sha256(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

export async function releaseShortFormCurrentDoorDelivery(input: {
  repoRoot: string;
  campaignId: string;
}): Promise<{ ok: true; paidLabel: string; files: string[] } | { ok: false; message: string }> {
  const candidateDir = path.join(
    input.repoRoot,
    "data",
    "campaign-design-artifacts",
    input.campaignId,
    "short-form-candidate",
  );
  const videoAbs = path.join(candidateDir, "production.mp4");
  const videoBefore = statSync(videoAbs);
  const videoHashBefore = sha256(videoAbs);

  const sources = SHORT_FORM_CUSTOMER_DELIVERY_FILES.map((file) => {
    const abs = path.join(candidateDir, file.sourceName);
    return { ...file, abs, hash: sha256(abs), size: statSync(abs).size };
  });
  const obsolete = /349|Content Pack|one revision/i;
  if (sources.some((file) => obsolete.test(`${file.label} ${file.filename}`))) {
    return { ok: false, message: "Customer delivery names used obsolete package language." };
  }

  const users = await listStudioUsers();
  const owner = users.find((user) => user.email === CUSTOMER_EMAIL);
  if (!owner) return { ok: false, message: "The Short-Form customer account was not found." };
  await linkClientCampaign(owner.id, input.campaignId);

  const campaignEnvelope = await readCampaignEnvelope(input.campaignId);
  if (!campaignEnvelope) return { ok: false, message: "The paid Short-Form project was not found." };
  const paidCents = campaignEnvelope.record.condensedOffer?.amountDueCents;
  if (paidCents !== 14900) {
    return { ok: false, message: "The paid amount is not $149.00." };
  }
  if (campaignEnvelope.record.revisionRoundsIncluded !== 3) {
    return { ok: false, message: "The project does not include three revision rounds." };
  }
  const facts = shortFormCustomerDeliveryFacts({
    paidAmountCents: paidCents,
    revisionRounds: 3,
  });
  const lineItems = campaignEnvelope.record.approvedStudioPlan?.lineItems.map((line) =>
    line.skuId === "v2-rtu-short-form-video-edit"
      ? { ...line, deliverables: sources.map((file) => file.label) }
      : line,
  );
  await upsertCampaignRecord(
    {
      ...campaignEnvelope.record,
      approvedStudioPlan: campaignEnvelope.record.approvedStudioPlan
        ? { ...campaignEnvelope.record.approvedStudioPlan, lineItems: lineItems ?? [] }
        : campaignEnvelope.record.approvedStudioPlan,
    },
    owner.id,
  );

  const occurredAt = new Date().toISOString();
  const tasks = await readTasksEnvelope(input.campaignId);
  if (!tasks) return { ok: false, message: "The Short-Form job record was not found." };
  const job = (tasks.jobRecords ?? []).find((entry) => entry.campaignId === input.campaignId);
  if (!job) return { ok: false, message: "The Short-Form job was not found." };

  const clientId = owner.id;
  let nextJob: PurchasedJobRecord = { ...job, clientDeliveryFiles: [], fileRegistry: job.fileRegistry ?? [] };
  const hashes = sources.map((file) => file.hash);
  const qaDecisionId = "re-short-form-current-door-qa";
  const approvalDecisionId = "caa-short-form-current-door";
  nextJob = {
    ...nextJob,
    serviceName: "Short-Form Video Editing",
    ownerApprovalPending: null,
    internalQaReviewAuthorization: {
      status: "ELIGIBLE_FOR_REVIEW",
      decisionId: qaDecisionId,
      packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
      skuId: job.skuId,
      qaRecordIds: ["short-form-presentation-revision-pass"],
      workVersionId: WORK_VERSION_ID,
      contentSha256s: hashes,
      artifactIds: [ARTIFACT_ID],
      authorizedAt: occurredAt,
    },
    customerApprovedArtifactAuthorization: {
      status: "CUSTOMER_APPROVED",
      decisionId: approvalDecisionId,
      schemaVersion: studioApprovedDeliveryV1.decisionSchemaVersion,
      packageId: studioApprovedDeliveryV1.packageId,
      jobId: job.jobId,
      campaignId: job.campaignId,
      skuId: job.skuId,
      workVersionId: WORK_VERSION_ID,
      artifactIds: [ARTIFACT_ID],
      contentSha256s: hashes,
      qaRecordIds: ["short-form-presentation-revision-pass"],
      reviewPackageId: `pkg:${job.jobId}:short-form-set-v1`,
      releaseActivityId: null,
      approvedAt: occurredAt,
      feedbackSubmissionType: "approved_for_delivery",
      sourceQaDecisionId: qaDecisionId,
    },
    clientDeliveryFiles: sources.map((file) => {
      const storageRef = createSupabasePrivateStorageRef({
        bucket: "studio-files-local",
        scope: {
          clientId,
          campaignId: job.campaignId,
          jobId: job.jobId,
          category: "final_delivery",
        },
        metadata: {
          filename: file.filename,
          contentType: file.fileType,
          sizeBytes: file.size,
          checksumSha256: file.hash,
          uploadedAt: occurredAt,
          versionLabel: "Set version 1",
        },
      });
      const dest = path.join(input.repoRoot, "data", "file-room-objects", ...storageRef.objectPath.split("/"));
      mkdirSync(path.dirname(dest), { recursive: true });
      copyFileSync(file.abs, dest);
      const registryFileId = `final-file:${job.jobId}:final_delivery:${file.key}:${WORK_VERSION_ID}`;
      return {
        id: `cdf:${job.jobId}:${file.key}:${WORK_VERSION_ID}`,
        registryFileId,
        deliverableKey: file.key,
        deliverableLabel: file.label,
        fileName: file.filename,
        fileType: file.fileType,
        url: fileRoomFileAccessPath(registryFileId, "download"),
        storageRef,
        versionLabel: "Set version 1",
        visibility: "client_visible" as const,
        releaseStatus: "pending_release" as const,
        addedAt: occurredAt,
        addedBy: ACTOR,
        contentSha256: `sha256:${file.hash}`,
        artifactId: ARTIFACT_ID,
        approvedWorkVersionId: WORK_VERSION_ID,
        approvedAuthorizationDecisionId: approvalDecisionId,
      };
    }),
    fileRegistry: sources.map((file) => {
      const storageRef = createSupabasePrivateStorageRef({
        bucket: "studio-files-local",
        scope: {
          clientId,
          campaignId: job.campaignId,
          jobId: job.jobId,
          category: "final_delivery",
        },
        metadata: {
          filename: file.filename,
          contentType: file.fileType,
          sizeBytes: file.size,
          checksumSha256: file.hash,
          uploadedAt: occurredAt,
          versionLabel: "Set version 1",
        },
      });
      return {
        id: `final-file:${job.jobId}:final_delivery:${file.key}:${WORK_VERSION_ID}`,
        clientId,
        campaignId: job.campaignId,
        jobId: job.jobId,
        category: "final_delivery" as const,
        filename: file.filename,
        fileType: file.fileType,
        storageRef,
        visibility: "client_visible" as const,
        versionLabel: "Set version 1",
        status: "draft" as const,
        addedBy: ACTOR,
        addedAt: occurredAt,
        deliverableKey: file.key,
        deliverableLabel: file.label,
      };
    }),
  };

  const approved = applyJobSpineStatusChange(nextJob, tasks.jobActivityEvents ?? [], {
    job: nextJob,
    nextStatus: "approved",
    actor: ACTOR,
    reason: "QA-approved Short-Form set is ready for customer delivery.",
    occurredAt,
  });
  const materials = await readMaterialsEnvelope(input.campaignId);
  const released = applySystemFinalDeliveryAuthorization(
    approved.job,
    approved.events,
    sources.map((file) => file.label),
    { occurredAt, materialUse: materialContextFromLedger(materials?.items ?? []) },
  );
  if (!released.applied) {
    return { ok: false, message: released.reason ?? "Final Delivery did not open." };
  }

  const videoAfter = statSync(videoAbs);
  if (videoAfter.size !== videoBefore.size || videoAfter.mtimeMs !== videoBefore.mtimeMs || sha256(videoAbs) !== videoHashBefore) {
    return { ok: false, message: "The approved video changed during delivery release." };
  }
  for (const file of sources) {
    if (sha256(file.abs) !== file.hash) {
      return { ok: false, message: "An approved delivery file changed during release." };
    }
  }

  await writeTasksEnvelope({
    ...tasks,
    jobRecords: (tasks.jobRecords ?? []).map((entry) =>
      entry.jobId === job.jobId ? released.job : entry,
    ),
    jobActivityEvents: released.events,
    updatedAt: occurredAt,
    syncedAt: occurredAt,
  });

  return {
    ok: true,
    paidLabel: facts.paidLabel,
    files: sources.map((file) => file.filename),
  };
}
