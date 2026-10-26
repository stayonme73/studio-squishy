/**
 * Present the Clip Repurposing set as one purchased Review, not three projects.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { studioReviewRevisionFullLoopV1 } from "@/config/studio-review-revision-full-loop-v1";
import { requiredDeliverablesForJob } from "@/lib/approved-plan-line";
import { resolveCampaignCommunicationClientId } from "@/lib/job-control/communication";
import {
  mergeDeliverablePrep,
  resolveRequiredDeliverableKeys,
} from "@/lib/job-control/production-workspace-gates";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { addJobFileReference } from "@/lib/file-registry/job-files";
import type { StudioFileCategory, StudioFileVisibility } from "@/lib/file-registry/types";
import { createServerFileRoomStorageAdapter } from "@/lib/file-storage/server";

import { contentSha256Hex, sameContentSha256 } from "./hash";

const MACHINE_ACTOR = {
  role: "system" as const,
  displayName: "Studio Machine",
};

export type ClipReviewFile = {
  relativePath?: string;
  absolutePath?: string;
  contentSha256: string;
  label: string;
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

function resolveAbsolutePath(relativeOrAbsolute: string | undefined): string | null {
  if (!relativeOrAbsolute?.trim()) return null;
  const raw = relativeOrAbsolute.replace(/\\/g, "/");
  if (path.isAbsolute(raw) && existsSync(raw)) return raw;
  const abs = path.join(process.cwd(), raw.replace(/^\.?\//, ""));
  return existsSync(abs) ? abs : null;
}

function alreadyPresented(job: PurchasedJobRecord, sha: string): boolean {
  return (job.fileRegistry ?? []).some(
    (ref) =>
      ref.category === "review_proof" &&
      sameContentSha256(
        ref.storageRef.provider === "supabase_storage"
          ? ref.storageRef.checksumSha256
          : undefined,
        sha,
      ),
  );
}

export async function presentClipRepurposingReviewProof(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  files: readonly ClipReviewFile[];
  renderVersion?: number;
  versionLabel?: string;
}): Promise<{ envelope: ServerTasksEnvelope; presented: boolean }> {
  const job = input.envelope.jobRecords?.find(
    (entry) => entry.skuId === CLIP_REPURPOSING_SKU,
  );
  if (!job) return { envelope: input.envelope, presented: false };
  if (input.files.length === 0) return { envelope: input.envelope, presented: false };

  const versionLabel =
    input.versionLabel?.trim() || `Set version ${input.renderVersion ?? 1}`;
  const occurredAt = new Date().toISOString();
  const required = requiredDeliverablesForJob(input.campaign, job);
  const requiredDefs = resolveRequiredDeliverableKeys([...required]);
  const clientId = resolveCampaignCommunicationClientId(
    undefined,
    input.campaign.campaignId,
  );
  const adapter = createServerFileRoomStorageAdapter();

  let workingJob = job;
  let events = input.envelope.jobActivityEvents ?? [];
  let presentedAny = false;

  for (const [index, file] of input.files.entries()) {
    const abs =
      resolveAbsolutePath(file.absolutePath) ?? resolveAbsolutePath(file.relativePath);
    if (!abs || alreadyPresented(workingJob, file.contentSha256)) continue;
    const bytes = readFileSync(abs);
    const hex = contentSha256Hex(file.contentSha256);
    const filename = `clip-repurposing-${index + 1}-${versionLabel.replace(/\s+/g, "-").toLowerCase()}.mp4`;
    const metadata = {
      filename,
      contentType: "video/mp4",
      sizeBytes: bytes.byteLength,
      checksumSha256: hex,
      versionLabel,
      uploadedAt: occurredAt,
    };
    const scope = {
      clientId,
      campaignId: workingJob.campaignId,
      jobId: workingJob.jobId,
      category: "review_proof" as StudioFileCategory,
    };
    const stored = await adapter.uploadObject({
      scope,
      metadata,
      body: bytes,
    });
    const storageRef = adapter.createStorageRef(scope, {
      ...metadata,
      uploadedAt: occurredAt,
    });
    const storedStorageRef =
      storageRef.provider === "supabase_storage"
        ? { ...storageRef, objectVersion: stored.objectVersion, checksumSha256: hex }
        : storageRef;
    const deliverableLabel = file.label;
    const deliverableKey =
      requiredDefs[index]?.key ??
      `${studioReviewRevisionFullLoopV1.deliverableKey}-clip-${index + 1}`;
    const registry = addJobFileReference(workingJob, events, {
      clientId,
      category: "review_proof",
      filename,
      fileType: "video/mp4",
      storageRef: storedStorageRef,
      visibility: "client_visible" as StudioFileVisibility,
      status: "approved_for_review",
      versionLabel,
      actor: MACHINE_ACTOR,
      occurredAt,
      deliverableKey,
      deliverableLabel,
      idPrefix: "proof",
    });
    workingJob = registry.job;
    events = registry.events;
    presentedAny = true;
  }

  if (!presentedAny) return { envelope: input.envelope, presented: false };

  let prep = workingJob.deliverablePrep;
  for (const def of requiredDefs.length > 0
    ? requiredDefs
    : [{ key: studioReviewRevisionFullLoopV1.deliverableKey, label: "Clip Repurposing set" }]) {
    prep = mergeDeliverablePrep(prep, def.key, def.label, true, MACHINE_ACTOR, occurredAt);
  }

  return {
    envelope: {
      ...updateJobInEnvelope(input.envelope, {
        ...workingJob,
        deliverablePrep: prep,
      }),
      jobActivityEvents: events,
    },
    presented: true,
  };
}
