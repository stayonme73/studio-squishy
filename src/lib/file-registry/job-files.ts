import type { JobActivityActor, JobActivityEvent, JobClientDeliveryFile, PurchasedJobRecord } from "@/lib/job-control/types";
import { appendJobActivityEvent } from "@/lib/job-control/activity-log";

import type {
  StudioFileCategory,
  StudioFileClientScope,
  StudioFileReference,
  StudioFileReferenceOnlyStorageReference,
  StudioFileStatus,
  StudioFileStorageReference,
  StudioFileSupabaseStorageReference,
  StudioFileVisibility,
} from "./types";

export function createReferenceOnlyStorageRef(input: {
  reference: string;
  displayLabel?: string;
  referenceKind?: StudioFileReferenceOnlyStorageReference["referenceKind"];
}): StudioFileStorageReference {
  const reference = input.reference.trim();
  const looksLikeLink = /^https?:\/\//i.test(reference);
  return {
    provider: "google_shared_drive",
    connectionStatus: "reference_only",
    referenceKind: input.referenceKind ?? (looksLikeLink ? "manual_link" : "manual_reference"),
    reference,
    displayLabel: input.displayLabel?.trim() || undefined,
  };
}

export function isReferenceOnlyStorageRef(
  storageRef: StudioFileStorageReference,
): storageRef is StudioFileReferenceOnlyStorageReference {
  return storageRef.provider === "google_shared_drive";
}

export function isSupabasePrivateStorageRef(
  storageRef: StudioFileStorageReference,
): storageRef is StudioFileSupabaseStorageReference {
  return storageRef.provider === "supabase_storage" && storageRef.connectionStatus === "private_object";
}

export function isApprovedReviewProofReference(ref: StudioFileReference): boolean {
  return (
    ref.category === "review_proof" &&
    ref.visibility === "client_visible" &&
    ref.status === "approved_for_review"
  );
}

export function isReleasedFinalDeliveryReference(ref: StudioFileReference): boolean {
  return (
    ref.category === "final_delivery" &&
    ref.visibility === "client_visible" &&
    ref.status === "released"
  );
}

export function isClientMaterialReferenceVisible(
  ref: StudioFileReference,
  scope: StudioFileClientScope,
): boolean {
  if (ref.category !== "client_material") return false;
  if (ref.visibility !== "client_visible") return false;
  if (ref.clientId !== scope.clientId) return false;
  if (ref.campaignId !== scope.campaignId) return false;
  if (scope.jobId && ref.jobId !== scope.jobId) return false;
  return true;
}

function appendFileEvent(
  events: readonly JobActivityEvent[],
  ref: StudioFileReference,
  kind:
    | "file_reference_added"
    | "file_visibility_changed"
    | "file_version_updated"
    | "file_released"
    | "file_download_available",
  actor: JobActivityActor,
  occurredAt: string,
  reason: string,
): JobActivityEvent[] {
  return appendJobActivityEvent(events, {
    campaignId: ref.campaignId,
    jobId: ref.jobId,
    kind,
    occurredAt,
    actor,
    reason,
    messageRef: ref.id,
  });
}

export function addJobFileReference(
  job: PurchasedJobRecord,
  events: readonly JobActivityEvent[],
  input: {
    clientId: string;
    category: StudioFileCategory;
    filename: string;
    fileType: string;
    storageRef: StudioFileStorageReference;
    visibility: StudioFileVisibility;
    status: StudioFileStatus;
    versionLabel?: string;
    actor: JobActivityActor;
    occurredAt?: string;
    deliverableKey?: string;
    deliverableLabel?: string;
    sourceMaterialId?: string;
    idPrefix?: string;
  },
): { job: PurchasedJobRecord; events: JobActivityEvent[]; file: StudioFileReference } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const file: StudioFileReference = {
    id: `${input.idPrefix ?? "file"}:${job.jobId}:${input.category}:${occurredAt}`,
    clientId: input.clientId,
    campaignId: job.campaignId,
    jobId: job.jobId,
    category: input.category,
    filename: input.filename.trim(),
    fileType: input.fileType.trim(),
    storageRef: input.storageRef,
    visibility: input.visibility,
    versionLabel: input.versionLabel?.trim() || "v1",
    status: input.status,
    addedBy: input.actor,
    addedAt: occurredAt,
    deliverableKey: input.deliverableKey,
    deliverableLabel: input.deliverableLabel,
    sourceMaterialId: input.sourceMaterialId,
  };

  return {
    file,
    job: {
      ...job,
      fileRegistry: [...(job.fileRegistry ?? []), file],
      updatedAt: occurredAt,
    },
    events: appendFileEvent(
      events,
      file,
      "file_reference_added",
      input.actor,
      occurredAt,
      `File reference added: ${file.filename}`,
    ),
  };
}

export function updateJobFileVisibility(
  job: PurchasedJobRecord,
  events: readonly JobActivityEvent[],
  input: {
    fileId: string;
    visibility: StudioFileVisibility;
    actor: JobActivityActor;
    occurredAt?: string;
  },
): { job: PurchasedJobRecord; events: JobActivityEvent[]; file: StudioFileReference | null } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const existing = job.fileRegistry ?? [];
  const fileIndex = existing.findIndex((ref) => ref.id === input.fileId);

  if (fileIndex === -1) return { job, events: [...events], file: null };

  const changed: StudioFileReference = {
    ...existing[fileIndex]!,
    visibility: input.visibility,
    visibilityChangedAt: occurredAt,
    updatedAt: occurredAt,
  };
  const fileRegistry = existing.map((ref, index) => (index === fileIndex ? changed : ref));

  return {
    job: { ...job, fileRegistry, updatedAt: occurredAt },
    events: appendFileEvent(
      events,
      changed,
      "file_visibility_changed",
      input.actor,
      occurredAt,
      `File visibility changed to ${input.visibility}: ${changed.filename}`,
    ),
    file: changed,
  };
}

export function updateJobFileVersion(
  job: PurchasedJobRecord,
  events: readonly JobActivityEvent[],
  input: {
    fileId: string;
    versionLabel: string;
    status?: StudioFileStatus;
    actor: JobActivityActor;
    occurredAt?: string;
  },
): { job: PurchasedJobRecord; events: JobActivityEvent[]; file: StudioFileReference | null } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const existing = job.fileRegistry ?? [];
  const fileIndex = existing.findIndex((ref) => ref.id === input.fileId);

  if (fileIndex === -1) return { job, events: [...events], file: null };

  const changed: StudioFileReference = {
    ...existing[fileIndex]!,
    versionLabel: input.versionLabel.trim(),
    status: input.status ?? existing[fileIndex]!.status,
    versionUpdatedAt: occurredAt,
    updatedAt: occurredAt,
  };
  const fileRegistry = existing.map((ref, index) => (index === fileIndex ? changed : ref));

  return {
    job: { ...job, fileRegistry, updatedAt: occurredAt },
    events: appendFileEvent(
      events,
      changed,
      "file_version_updated",
      input.actor,
      occurredAt,
      `File version updated to ${changed.versionLabel}: ${changed.filename}`,
    ),
    file: changed,
  };
}

export function releaseFinalDeliveryFiles(
  job: PurchasedJobRecord,
  events: readonly JobActivityEvent[],
  actor: JobActivityActor,
  occurredAt = new Date().toISOString(),
): { job: PurchasedJobRecord; events: JobActivityEvent[] } {
  let nextEvents = [...events];
  const releasedIds = new Set<string>();
  const fileRegistry = (job.fileRegistry ?? []).map((ref) => {
    if (ref.category !== "final_delivery" || ref.visibility !== "client_visible") return ref;
    if (ref.status === "released") return ref;
    const released = {
      ...ref,
      status: "released" as const,
      releasedAt: occurredAt,
      updatedAt: occurredAt,
    };
    releasedIds.add(released.id);
    nextEvents = appendFileEvent(
      nextEvents,
      released,
      "file_released",
      actor,
      occurredAt,
      `Final delivery file released: ${released.filename}`,
    );
    nextEvents = appendFileEvent(
      nextEvents,
      released,
      "file_download_available",
      actor,
      occurredAt,
      `Client download available: ${released.filename}`,
    );
    return released;
  });

  if (releasedIds.size === 0) return { job, events: nextEvents };

  const clientDeliveryFiles = (job.clientDeliveryFiles ?? []).map((file) =>
    file.registryFileId && releasedIds.has(file.registryFileId)
      ? { ...file, releaseStatus: "released" as const, releasedAt: occurredAt }
      : file,
  );

  return {
    job: {
      ...job,
      fileRegistry,
      clientDeliveryFiles,
      updatedAt: occurredAt,
    },
    events: nextEvents,
  };
}

export function clientDeliveryFileIsReleased(
  job: PurchasedJobRecord,
  file: JobClientDeliveryFile,
): boolean {
  if (file.releaseStatus) return file.releaseStatus === "released";
  if (!file.registryFileId) return true;
  const linked = (job.fileRegistry ?? []).find((ref) => ref.id === file.registryFileId);
  return linked ? isReleasedFinalDeliveryReference(linked) : false;
}
