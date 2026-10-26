/**
 * Final Delivery for Campaign Launch Kit binds the approved four-channel set.
 * The usage guide is included. It is not an extra channel.
 */

import { fileRoomFileAccessPath } from "@/lib/file-storage/routes";
import {
  addJobFileReference,
  isApprovedReviewProofReference,
} from "@/lib/file-registry/job-files";
import type { StudioFileReference } from "@/lib/file-registry/types";
import type {
  JobActivityActor,
  JobActivityEvent,
  JobClientDeliveryFile,
  PurchasedJobRecord,
} from "@/lib/job-control/types";
import {
  CAMPAIGN_LAUNCH_KIT_DELIVERY_FILES,
  campaignLaunchKitDeliveryFileForFilename,
  campaignLaunchKitDeliveryKey,
  isCampaignLaunchKitParentSku,
} from "@/lib/studio-review-revision/campaign-launch-kit-purchase-delivery-truth";
import { normalizeContentSha256, sameContentSha256 } from "@/lib/studio-review-revision/hash";

function proofChecksum(ref: StudioFileReference): string | undefined {
  return ref.storageRef.provider === "supabase_storage" ? ref.storageRef.checksumSha256 : undefined;
}

function pinHashMatching(pinHashes: readonly string[], checksum: string | undefined): string | undefined {
  if (!checksum) return undefined;
  return pinHashes.find((hash) => sameContentSha256(checksum, hash));
}

function appendCdf(
  files: JobClientDeliveryFile[],
  input: {
    job: PurchasedJobRecord;
    def: { key: string; label: string };
    source: StudioFileReference;
    pinHash: string;
    occurredAt: string;
    actor: JobActivityActor;
    approval: NonNullable<PurchasedJobRecord["customerApprovedArtifactAuthorization"]>;
    registryFileId: string;
    storageRef: StudioFileReference["storageRef"];
  },
): JobClientDeliveryFile[] {
  if (
    files.some(
      (file) =>
        file.deliverableKey === input.def.key && sameContentSha256(file.contentSha256, input.pinHash),
    )
  ) {
    return files;
  }
  return [
    ...files,
    {
      id: `cdf:${input.job.jobId}:${input.def.key}:${input.occurredAt}`,
      registryFileId: input.registryFileId,
      deliverableKey: input.def.key,
      deliverableLabel: input.def.label,
      fileName: input.source.filename,
      fileType: input.source.fileType,
      url: fileRoomFileAccessPath(input.registryFileId, "download"),
      storageRef: input.storageRef,
      versionLabel: input.source.versionLabel,
      visibility: "client_visible",
      releaseStatus: "pending_release",
      addedAt: input.occurredAt,
      addedBy: input.actor,
      contentSha256: input.pinHash,
      artifactId: input.approval.artifactIds[0],
      approvedWorkVersionId: input.approval.workVersionId ?? undefined,
      approvedAuthorizationDecisionId: input.approval.decisionId,
    },
  ];
}

export function assembleApprovedCampaignLaunchKitClientDelivery(input: {
  job: PurchasedJobRecord;
  events: readonly JobActivityEvent[];
  actor: JobActivityActor;
  occurredAt?: string;
}): { job: PurchasedJobRecord; events: JobActivityEvent[]; assembled: boolean } {
  if (!isCampaignLaunchKitParentSku(input.job.skuId)) {
    return { job: input.job, events: [...input.events], assembled: false };
  }
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const pinHashes = approval.contentSha256s.map(normalizeContentSha256);
  const proofs = (input.job.fileRegistry ?? []).filter(isApprovedReviewProofReference);
  const defs = CAMPAIGN_LAUNCH_KIT_DELIVERY_FILES.map((file) => {
    const source = [...proofs].reverse().find(
      (ref) =>
        campaignLaunchKitDeliveryFileForFilename(ref.filename)?.member === file.member &&
        Boolean(pinHashMatching(pinHashes, proofChecksum(ref))),
    );
    const pinHash = source ? pinHashMatching(pinHashes, proofChecksum(source)) : undefined;
    return { file, source, pinHash };
  });
  if (defs.some((def) => !def.source || !def.pinHash)) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const existing = input.job.clientDeliveryFiles ?? [];
  const pending = defs.filter(
    (def) =>
      !existing.some(
        (file) =>
          file.deliverableKey === campaignLaunchKitDeliveryKey(def.file.member) &&
          sameContentSha256(file.contentSha256, def.pinHash),
      ),
  );
  if (pending.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  let job = input.job;
  let events = [...input.events];
  let nextFiles = [...existing];
  for (const def of pending) {
    const source = def.source!;
    const key = campaignLaunchKitDeliveryKey(def.file.member);
    const registry = addJobFileReference(job, events, {
      clientId: source.clientId,
      category: "final_delivery",
      filename: source.filename,
      fileType: source.fileType,
      storageRef:
        source.storageRef.provider === "supabase_storage"
          ? { ...source.storageRef, visibilityState: "client-final" }
          : source.storageRef,
      visibility: "client_visible",
      status: "approved_for_release",
      versionLabel: source.versionLabel,
      actor: input.actor,
      occurredAt,
      deliverableKey: key,
      deliverableLabel: def.file.fileLabel,
      idPrefix: "final-file",
    });
    job = registry.job;
    events = registry.events;
    nextFiles = appendCdf(nextFiles, {
      job,
      def: { key, label: def.file.fileLabel },
      source,
      pinHash: def.pinHash!,
      occurredAt,
      actor: input.actor,
      approval,
      registryFileId: registry.file.id,
      storageRef: registry.file.storageRef,
    });
  }

  return {
    assembled: nextFiles.length > existing.length,
    events,
    job: { ...job, clientDeliveryFiles: nextFiles, updatedAt: occurredAt },
  };
}
