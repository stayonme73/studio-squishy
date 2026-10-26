/**
 * Present QA-authorized copy as customer Review proofs.
 * Bytes live in File Room as readable HTML. Old proofs stay. Newest per
 * email/message is current. Review proof is not Final Delivery.
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { studioCopyReviewBindV1 } from "@/config/studio-copy-review-bind-v1";
import { resolveCampaignCommunicationClientId } from "@/lib/job-control/communication";
import { mergeDeliverablePrep } from "@/lib/job-control/production-workspace-gates";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { addJobFileReference } from "@/lib/file-registry/job-files";
import type { StudioFileCategory, StudioFileVisibility } from "@/lib/file-registry/types";
import { createServerFileRoomStorageAdapter } from "@/lib/file-storage/server";
import {
  copyReviewDeliverableKey,
  copyReviewProofFilename,
  renderCustomerCopyProofHtml,
} from "@/lib/studio-copy-review-bind/customer-facing";
import type { CopyReviewArtifactContract } from "@/lib/studio-copy-review-bind/types";
import { COPY_EXPORT_DELIVERABLE_PREFIX } from "./copy-kit-purchase-delivery-truth";
import { contentSha256Hex, sameContentSha256 } from "./hash";

const MACHINE_ACTOR = {
  role: "system" as const,
  displayName: "Studio Machine",
};

function updateJobInEnvelope(
  envelope: ServerTasksEnvelope,
  job: PurchasedJobRecord,
): ServerTasksEnvelope {
  const jobRecords = [...(envelope.jobRecords ?? [])];
  const index = jobRecords.findIndex((entry) => entry.jobId === job.jobId);
  if (index >= 0) jobRecords[index] = job;
  else jobRecords.push(job);
  return {
    ...envelope,
    jobRecords,
    jobActivityEvents: envelope.jobActivityEvents,
    updatedAt: new Date().toISOString(),
  };
}

export function copyReviewProofAlreadyPresented(
  job: PurchasedJobRecord,
  htmlSha256: string,
): boolean {
  return (job.fileRegistry ?? []).some(
    (ref) =>
      ref.category === "review_proof" &&
      sameContentSha256(
        ref.storageRef.provider === "supabase_storage"
          ? ref.storageRef.checksumSha256
          : undefined,
        htmlSha256,
      ),
  );
}

function copyExportAlreadyStaged(job: PurchasedJobRecord, sha256: string): boolean {
  return (job.fileRegistry ?? []).some(
    (ref) =>
      ref.category === "internal_draft" &&
      ref.deliverableKey?.startsWith(`${COPY_EXPORT_DELIVERABLE_PREFIX}:`) &&
      sameContentSha256(
        ref.storageRef.provider === "supabase_storage"
          ? ref.storageRef.checksumSha256
          : undefined,
        sha256,
      ),
  );
}

async function uploadCopyProof(input: {
  job: PurchasedJobRecord;
  events: readonly import("@/lib/job-control/types").JobActivityEvent[];
  campaign: CampaignRecord;
  html?: string;
  bytes?: Buffer;
  contentType?: string;
  filename: string;
  hex: string;
  versionLabel: string;
  category: StudioFileCategory;
  visibility: StudioFileVisibility;
  status: "approved_for_review" | "draft";
  deliverableKey: string;
  deliverableLabel: string;
  idPrefix: string;
  occurredAt: string;
}): Promise<{
  job: PurchasedJobRecord;
  events: import("@/lib/job-control/types").JobActivityEvent[];
}> {
  const bytes = input.bytes ?? Buffer.from(input.html ?? "", "utf8");
  const clientId = resolveCampaignCommunicationClientId(
    undefined,
    input.campaign.campaignId,
  );
  const adapter = createServerFileRoomStorageAdapter();
  const metadata = {
    filename: input.filename,
    contentType: input.contentType ?? "text/html; charset=utf-8",
    sizeBytes: bytes.byteLength,
    checksumSha256: input.hex,
    versionLabel: input.versionLabel,
    uploadedAt: input.occurredAt,
  };
  const scope = {
    clientId,
    campaignId: input.job.campaignId,
    jobId: input.job.jobId,
    category: input.category,
  };
  const stored = await adapter.uploadObject({
    scope,
    metadata,
    body: bytes,
  });
  const storageRef = adapter.createStorageRef(scope, {
    ...metadata,
    uploadedAt: input.occurredAt,
  });
  const storedStorageRef =
    storageRef.provider === "supabase_storage"
      ? { ...storageRef, objectVersion: stored.objectVersion, checksumSha256: input.hex }
      : storageRef;

  const registry = addJobFileReference(input.job, input.events, {
    clientId,
    category: input.category,
    filename: input.filename,
    fileType: input.contentType?.split(";")[0] ?? "text/html",
    storageRef: storedStorageRef,
    visibility: input.visibility,
    status: input.status,
    versionLabel: input.versionLabel,
    actor: MACHINE_ACTOR,
    occurredAt: input.occurredAt,
    deliverableKey: input.deliverableKey,
    deliverableLabel: input.deliverableLabel,
    idPrefix: input.idPrefix,
  });
  return { job: registry.job, events: registry.events };
}

export async function presentCopyReviewProof(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  contract: CopyReviewArtifactContract;
}): Promise<{ envelope: ServerTasksEnvelope; presented: boolean }> {
  const job = input.envelope.jobRecords?.find(
    (entry) => entry.skuId === input.contract.skuId,
  );
  if (!job) return { envelope: input.envelope, presented: false };

  const versionLabel = `Version ${input.contract.renderVersion}`;
  const occurredAt = new Date().toISOString();
  let nextJob = job;
  let events = input.envelope.jobActivityEvents ?? [];
  let presentedAny = false;

  for (const member of input.contract.members) {
    const html = renderCustomerCopyProofHtml(member);
    const hex = contentSha256Hex(
      createHash("sha256").update(html, "utf8").digest("hex"),
    );
    const key = copyReviewDeliverableKey(member.memberId);
    if (copyReviewProofAlreadyPresented(nextJob, hex)) {
      nextJob = {
        ...nextJob,
        deliverablePrep: mergeDeliverablePrep(
          nextJob.deliverablePrep,
          key,
          member.customerFormatLabel,
          true,
          MACHINE_ACTOR,
          occurredAt,
        ),
      };
      continue;
    }

    const uploaded = await uploadCopyProof({
      job: nextJob,
      events,
      campaign: input.campaign,
      html,
      filename: copyReviewProofFilename({
        formatLabel: member.customerFormatLabel,
        renderVersion: input.contract.renderVersion,
      }),
      hex,
      versionLabel,
      category: "review_proof",
      visibility: "client_visible",
      status: "approved_for_review",
      deliverableKey: key,
      deliverableLabel: member.customerFormatLabel,
      idPrefix: `${studioCopyReviewBindV1.proofKeyPrefix}-${member.memberId}`,
      occurredAt,
    });
    nextJob = uploaded.job;
    events = uploaded.events;
    presentedAny = true;
    nextJob = {
      ...nextJob,
      deliverablePrep: mergeDeliverablePrep(
        nextJob.deliverablePrep,
        key,
        member.customerFormatLabel,
        true,
        MACHINE_ACTOR,
        occurredAt,
      ),
    };
  }

  for (const file of input.contract.pasteReadyFiles ?? []) {
    const abs = path.join(process.cwd(), file.relativePath.replace(/\\/g, "/"));
    if (!existsSync(abs)) continue;
    const bytes = readFileSync(abs);
    const hex = contentSha256Hex(file.sha256);
    if (copyExportAlreadyStaged(nextJob, hex)) continue;
    const filename = path.posix.basename(file.relativePath.replace(/\\/g, "/"));
    const uploaded = await uploadCopyProof({
      job: nextJob,
      events,
      campaign: input.campaign,
      bytes,
      contentType: file.format === "html" ? "text/html; charset=utf-8" : "text/plain; charset=utf-8",
      filename,
      hex,
      versionLabel,
      category: "internal_draft",
      visibility: "internal_only",
      status: "draft",
      deliverableKey: `${COPY_EXPORT_DELIVERABLE_PREFIX}:${filename}`,
      deliverableLabel: file.label,
      idPrefix: `${COPY_EXPORT_DELIVERABLE_PREFIX}-${filename}`,
      occurredAt,
    });
    nextJob = uploaded.job;
    events = uploaded.events;
    presentedAny = true;
  }

  if (!presentedAny && nextJob === job) {
    return { envelope: input.envelope, presented: false };
  }

  return {
    envelope: {
      ...updateJobInEnvelope(input.envelope, nextJob),
      jobActivityEvents: events,
    },
    presented: presentedAny,
  };
}
