/**
 * Present the QA-passed $349 footage MP4 as a customer Review proof.
 * Parallel to stills present-short-video-review. Does not use that SKU.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
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

const DELIVERABLE_LABEL =
  "Final vertical MP4 1080×1920 — edited talking-head with speech captions and CTA";

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

export function footageEditingReviewProofAlreadyPresented(
  job: PurchasedJobRecord,
  mp4ContentSha256: string,
): boolean {
  return (job.fileRegistry ?? []).some(
    (ref) =>
      ref.category === "review_proof" &&
      sameContentSha256(
        ref.storageRef.provider === "supabase_storage"
          ? ref.storageRef.checksumSha256
          : undefined,
        mp4ContentSha256,
      ),
  );
}

export async function presentFootageEditingReviewProof(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  mp4RelativePath?: string;
  mp4AbsolutePath?: string;
  mp4ContentSha256: string;
  renderVersion?: number;
  artifactId?: string;
  versionLabel?: string;
}): Promise<{ envelope: ServerTasksEnvelope; presented: boolean }> {
  const job = input.envelope.jobRecords?.find(
    (entry) => entry.skuId === SHORT_FORM_VIDEO_EDITING_SKU,
  );
  if (!job) return { envelope: input.envelope, presented: false };

  const mp4Abs =
    resolveAbsolutePath(input.mp4AbsolutePath) ??
    resolveAbsolutePath(input.mp4RelativePath);
  if (footageEditingReviewProofAlreadyPresented(job, input.mp4ContentSha256)) {
    return { envelope: input.envelope, presented: false };
  }
  if (!mp4Abs) return { envelope: input.envelope, presented: false };

  const versionLabel =
    input.versionLabel?.trim() || `Version ${input.renderVersion ?? 1}`;
  const occurredAt = new Date().toISOString();
  const required = requiredDeliverablesForJob(input.campaign, job);
  const requiredDefs = resolveRequiredDeliverableKeys([...required]);
  const videoDef =
    requiredDefs.find((def) => /mp4|video|talking-head|short-form/i.test(def.label)) ??
    requiredDefs[0];
  const deliverableLabel = videoDef?.label ?? DELIVERABLE_LABEL;
  const deliverableKey =
    videoDef?.key ?? studioReviewRevisionFullLoopV1.deliverableKey;

  const bytes = readFileSync(mp4Abs);
  const clientId = resolveCampaignCommunicationClientId(
    undefined,
    input.campaign.campaignId,
  );
  const adapter = createServerFileRoomStorageAdapter();
  const hex = contentSha256Hex(input.mp4ContentSha256);
  const metadata = {
    filename: `short-form-edit-${versionLabel.replace(/\s+/g, "-").toLowerCase()}.mp4`,
    contentType: "video/mp4",
    sizeBytes: bytes.byteLength,
    checksumSha256: hex,
    versionLabel,
    uploadedAt: occurredAt,
  };
  const scope = {
    clientId,
    campaignId: job.campaignId,
    jobId: job.jobId,
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

  const events = input.envelope.jobActivityEvents ?? [];
  const registry = addJobFileReference(job, events, {
    clientId,
    category: "review_proof",
    filename: metadata.filename,
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

  let prep = registry.job.deliverablePrep;
  for (const def of requiredDefs.length > 0
    ? requiredDefs
    : [{ key: deliverableKey, label: deliverableLabel }]) {
    prep = mergeDeliverablePrep(prep, def.key, def.label, true, MACHINE_ACTOR, occurredAt);
  }

  return {
    envelope: {
      ...updateJobInEnvelope(input.envelope, {
        ...registry.job,
        deliverablePrep: prep,
      }),
      jobActivityEvents: registry.events,
    },
    presented: true,
  };
}
