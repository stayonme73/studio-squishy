/**
 * Present the QA-passed Machine flyer PNG as a customer Review proof.
 * Bytes live in File Room. Old proofs stay. Newest is current.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
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
import { DESIGN_RENDERER_PROOF_SKU } from "@/lib/studio-design-renderer";
import { createServerFileRoomStorageAdapter } from "@/lib/file-storage/server";

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

function resolvePngAbsolutePath(pngRelativePath: string | undefined): string | null {
  if (!pngRelativePath?.trim()) return null;
  const abs = path.join(process.cwd(), pngRelativePath.replace(/\\/g, "/"));
  return existsSync(abs) ? abs : null;
}

export function reviewProofAlreadyPresented(
  job: PurchasedJobRecord,
  pngContentSha256: string,
): boolean {
  return (job.fileRegistry ?? []).some(
    (ref) =>
      ref.category === "review_proof" &&
      sameContentSha256(
        ref.storageRef.provider === "supabase_storage"
          ? ref.storageRef.checksumSha256
          : undefined,
        pngContentSha256,
      ),
  );
}

export async function presentFlyerReviewProof(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  pngRelativePath?: string;
  pngContentSha256: string;
  renderVersion: number;
  artifactId: string;
}): Promise<{ envelope: ServerTasksEnvelope; presented: boolean }> {
  const job = input.envelope.jobRecords?.find(
    (entry) => entry.skuId === DESIGN_RENDERER_PROOF_SKU,
  );
  if (!job) return { envelope: input.envelope, presented: false };
  if (reviewProofAlreadyPresented(job, input.pngContentSha256)) {
    return { envelope: input.envelope, presented: false };
  }

  const pngAbs = resolvePngAbsolutePath(input.pngRelativePath);
  if (!pngAbs) return { envelope: input.envelope, presented: false };

  const bytes = readFileSync(pngAbs);
  const hex = contentSha256Hex(input.pngContentSha256);
  const versionLabel = `Version ${input.renderVersion}`;
  const filename = `flyer-${versionLabel.replace(/\s+/g, "-").toLowerCase()}.png`;
  const occurredAt = new Date().toISOString();
  const clientId = resolveCampaignCommunicationClientId(
    undefined,
    input.campaign.campaignId,
  );
  const required = requiredDeliverablesForJob(input.campaign, job);
  const requiredDefs = resolveRequiredDeliverableKeys([...required]);
  const deliverableLabel =
    requiredDefs[0]?.label ?? studioReviewRevisionFullLoopV1.serviceName;
  const deliverableKey =
    requiredDefs[0]?.key ?? studioReviewRevisionFullLoopV1.deliverableKey;

  const adapter = createServerFileRoomStorageAdapter();
  const metadata = {
    filename,
    contentType: "image/png",
    sizeBytes: bytes.byteLength,
    checksumSha256: hex,
    versionLabel,
    uploadedAt: occurredAt,
  };
  const scope = {
    clientId,
    campaignId: job.campaignId,
    jobId: job.jobId,
    category: "review_proof" as const,
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

  const registry = addJobFileReference(job, input.envelope.jobActivityEvents ?? [], {
    clientId,
    category: "review_proof",
    filename,
    fileType: "image/png",
    storageRef: storedStorageRef,
    visibility: "client_visible",
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
    prep = mergeDeliverablePrep(
      prep,
      def.key,
      def.label,
      true,
      MACHINE_ACTOR,
      occurredAt,
    );
  }

  let nextJob: PurchasedJobRecord = {
    ...registry.job,
    deliverablePrep: prep,
  };

  return {
    envelope: {
      ...updateJobInEnvelope(input.envelope, nextJob),
      jobActivityEvents: registry.events,
    },
    presented: true,
  };
}
