/**
 * Bind the exact approved Review proof into client Final Delivery files.
 * Approval means this identity — not “whatever file is newest later.”
 */

import { studioReviewRevisionFullLoopV1 } from "@/config/studio-review-revision-full-loop-v1";
import {
  addJobFileReference,
  isApprovedReviewProofReference,
} from "@/lib/file-registry/job-files";
import { fileRoomFileAccessPath } from "@/lib/file-storage/routes";
import { resolveRequiredDeliverableKeys } from "@/lib/job-control/production-workspace-gates";
import type {
  JobActivityActor,
  JobActivityEvent,
  JobClientDeliveryFile,
  PurchasedJobRecord,
} from "@/lib/job-control/types";
import type { StudioFileReference } from "@/lib/file-registry/types";

import { sameContentSha256 } from "./hash";

function proofChecksum(ref: StudioFileReference): string | undefined {
  return ref.storageRef.provider === "supabase_storage"
    ? ref.storageRef.checksumSha256
    : undefined;
}

export function assembleApprovedFlyerClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
  requiredDeliverableLabel?: string;
  requiredDeliverables?: readonly string[];
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const proofs = (input.job.fileRegistry ?? []).filter(isApprovedReviewProofReference);
  const matching = proofs.filter((ref) =>
    approval.contentSha256s.some((hash) => sameContentSha256(proofChecksum(ref), hash)),
  );
  const chosen = matching[0];
  const pinHash = chosen
    ? approval.contentSha256s.find((hash) =>
        sameContentSha256(proofChecksum(chosen), hash),
      )
    : undefined;
  if (!chosen || !pinHash) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const contentSha256 = pinHash;

  const fallbackKey =
    chosen.deliverableKey ?? studioReviewRevisionFullLoopV1.deliverableKey;
  const fallbackLabel =
    chosen.deliverableLabel ??
    input.requiredDeliverableLabel ??
    studioReviewRevisionFullLoopV1.serviceName;
  const defs = resolveRequiredDeliverableKeys(input.requiredDeliverables ?? []).length
    ? resolveRequiredDeliverableKeys(input.requiredDeliverables ?? [])
    : [{ key: fallbackKey, label: fallbackLabel }];

  const existing = input.job.clientDeliveryFiles ?? [];
  const missing = defs.filter(
    (def) =>
      !existing.some(
        (file) =>
          file.deliverableKey === def.key &&
          sameContentSha256(file.contentSha256, contentSha256),
      ),
  );
  if (missing.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const registry = addJobFileReference(input.job, input.events, {
    clientId: chosen.clientId,
    category: "final_delivery",
    filename: chosen.filename,
    fileType: chosen.fileType,
    storageRef:
      chosen.storageRef.provider === "supabase_storage"
        ? { ...chosen.storageRef, visibilityState: "client-final" }
        : chosen.storageRef,
    visibility: "client_visible",
    status: "approved_for_release",
    versionLabel: chosen.versionLabel,
    actor: input.actor,
    occurredAt,
    deliverableKey: missing[0]!.key,
    deliverableLabel: missing[0]!.label,
    idPrefix: "final-file",
  });

  const nextFiles: JobClientDeliveryFile[] = [...(registry.job.clientDeliveryFiles ?? [])];
  for (const def of missing) {
    if (
      nextFiles.some(
        (file) =>
          file.deliverableKey === def.key &&
          sameContentSha256(file.contentSha256, contentSha256),
      )
    ) {
      continue;
    }
    nextFiles.push({
      id: `cdf:${input.job.jobId}:${def.key}:${occurredAt}`,
      registryFileId: registry.file.id,
      deliverableKey: def.key,
      deliverableLabel: def.label,
      fileName: chosen.filename,
      fileType: chosen.fileType,
      url: fileRoomFileAccessPath(registry.file.id, "download"),
      storageRef: registry.file.storageRef,
      versionLabel: chosen.versionLabel,
      visibility: "client_visible",
      releaseStatus: "pending_release",
      addedAt: occurredAt,
      addedBy: input.actor,
      contentSha256,
      artifactId: approval.artifactIds[0],
      approvedWorkVersionId: approval.workVersionId ?? undefined,
      approvedAuthorizationDecisionId: approval.decisionId,
    });
  }

  return {
    assembled: true,
    events: registry.events,
    job: {
      ...registry.job,
      clientDeliveryFiles: nextFiles,
      updatedAt: occurredAt,
    },
  };
}
