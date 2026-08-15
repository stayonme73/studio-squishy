/**
 * Bind the exact approved Review identity into customer Final Delivery files.
 * Flyer: PNG + PDF of Version N. Approval of the creative authorizes coordinated
 * exports from that render identity. Wrong-version or missing promised files fail closed.
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

import {
  classifyFlyerIncludedSlot,
  customerPromisedFileLabels,
} from "./flyer-purchase-delivery-truth";
import { normalizeContentSha256, sameContentSha256 } from "./hash";

function proofChecksum(ref: StudioFileReference): string | undefined {
  return ref.storageRef.provider === "supabase_storage"
    ? ref.storageRef.checksumSha256
    : undefined;
}

function isInternalPrintPdf(ref: StudioFileReference): boolean {
  return (
    ref.category === "internal_draft" &&
    /pdf/i.test(ref.fileType) &&
    Boolean(proofChecksum(ref))
  );
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
        file.deliverableKey === input.def.key &&
        sameContentSha256(file.contentSha256, input.pinHash),
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

  const pinHashes = approval.contentSha256s.map(normalizeContentSha256);
  const proofs = (input.job.fileRegistry ?? []).filter(isApprovedReviewProofReference);
  const pngSource = proofs.find((ref) => pinHashMatching(pinHashes, proofChecksum(ref)));
  const pngPinHash = pngSource
    ? pinHashMatching(pinHashes, proofChecksum(pngSource))
    : undefined;
  const pdfSource = (input.job.fileRegistry ?? []).find(
    (ref) =>
      isInternalPrintPdf(ref) && Boolean(pinHashMatching(pinHashes, proofChecksum(ref))),
  );
  const pdfPinHash = pdfSource
    ? pinHashMatching(pinHashes, proofChecksum(pdfSource))
    : undefined;

  const allDefs = resolveRequiredDeliverableKeys(input.requiredDeliverables ?? []);
  const fileLabels = customerPromisedFileLabels(input.requiredDeliverables ?? []);
  const fileDefs =
    fileLabels.length > 0
      ? allDefs.filter((def) => fileLabels.includes(def.label))
      : [];

  if (fileDefs.length > 0) {
    const pngDef = fileDefs.find(
      (def) => classifyFlyerIncludedSlot(def.label)?.format === "png",
    );
    const pdfDef = fileDefs.find(
      (def) => classifyFlyerIncludedSlot(def.label)?.format === "pdf",
    );
    if (!pngSource || !pngPinHash || (pdfDef && (!pdfSource || !pdfPinHash))) {
      return { job: input.job, events: [...input.events], assembled: false };
    }

    const existing = input.job.clientDeliveryFiles ?? [];
    const missing = fileDefs.filter(
      (def) =>
        !existing.some((file) => {
          const expected =
            classifyFlyerIncludedSlot(def.label)?.format === "pdf" ? pdfPinHash : pngPinHash;
          return (
            file.deliverableKey === def.key &&
            sameContentSha256(file.contentSha256, expected)
          );
        }),
    );
    if (missing.length === 0) {
      return { job: input.job, events: [...input.events], assembled: false };
    }

    let job = input.job;
    let events = [...input.events];
    let nextFiles = [...existing];

    for (const def of missing) {
      const format = classifyFlyerIncludedSlot(def.label)?.format;
      const source = format === "pdf" ? pdfSource : pngSource;
      const pinHash = format === "pdf" ? pdfPinHash : pngPinHash;
      if (!source || !pinHash) {
        return { job: input.job, events: [...input.events], assembled: false };
      }
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
        deliverableKey: def.key,
        deliverableLabel: def.label,
        idPrefix: "final-file",
      });
      job = registry.job;
      events = registry.events;
      nextFiles = appendCdf(nextFiles, {
        job,
        def,
        source,
        pinHash,
        occurredAt,
        actor: input.actor,
        approval,
        registryFileId: registry.file.id,
        storageRef: registry.file.storageRef,
      });
    }

    return {
      assembled: true,
      events,
      job: {
        ...job,
        clientDeliveryFiles: nextFiles,
        updatedAt: occurredAt,
      },
    };
  }

  if (!pngSource || !pngPinHash) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const fallbackKey =
    pngSource.deliverableKey ?? studioReviewRevisionFullLoopV1.deliverableKey;
  const fallbackLabel =
    pngSource.deliverableLabel ??
    input.requiredDeliverableLabel ??
    studioReviewRevisionFullLoopV1.serviceName;
  const defs = allDefs.length > 0 ? allDefs : [{ key: fallbackKey, label: fallbackLabel }];
  const existing = input.job.clientDeliveryFiles ?? [];
  const missing = defs.filter(
    (def) =>
      !existing.some(
        (file) =>
          file.deliverableKey === def.key &&
          sameContentSha256(file.contentSha256, pngPinHash),
      ),
  );
  if (missing.length === 0) {
    return { job: input.job, events: [...input.events], assembled: false };
  }

  const registry = addJobFileReference(input.job, input.events, {
    clientId: pngSource.clientId,
    category: "final_delivery",
    filename: pngSource.filename,
    fileType: pngSource.fileType,
    storageRef:
      pngSource.storageRef.provider === "supabase_storage"
        ? { ...pngSource.storageRef, visibilityState: "client-final" }
        : pngSource.storageRef,
    visibility: "client_visible",
    status: "approved_for_release",
    versionLabel: pngSource.versionLabel,
    actor: input.actor,
    occurredAt,
    deliverableKey: missing[0]!.key,
    deliverableLabel: missing[0]!.label,
    idPrefix: "final-file",
  });

  let nextFiles: JobClientDeliveryFile[] = [...(registry.job.clientDeliveryFiles ?? [])];
  for (const def of missing) {
    nextFiles = appendCdf(nextFiles, {
      job: registry.job,
      def,
      source: pngSource,
      pinHash: pngPinHash,
      occurredAt,
      actor: input.actor,
      approval,
      registryFileId: registry.file.id,
      storageRef: registry.file.storageRef,
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
