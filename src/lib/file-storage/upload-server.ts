import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { addJobFileReference } from "@/lib/file-registry/job-files";
import type {
  StudioFileCategory,
  StudioFileStatus,
  StudioFileVisibility,
} from "@/lib/file-registry/types";
import { appendJobActivityEvent } from "@/lib/job-control/activity-log";
import { resolveCampaignCommunicationClientId } from "@/lib/job-control/communication";
import type {
  JobActivityActor,
  JobActivityEvent,
  JobClientDeliveryFile,
  JobWorkingFileRef,
  PurchasedJobRecord,
} from "@/lib/job-control/types";
import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";

import { fileRoomFileAccessPath } from "./routes";
import type { FileRoomStorageAdapter } from "./types";
import { safeFileRoomFileResponse, type SafeFileRoomFileResponse } from "./responses";

const CATEGORY_DEFAULTS: Record<
  StudioFileCategory,
  { visibility: StudioFileVisibility; status: StudioFileStatus }
> = {
  client_material: { visibility: "internal_only", status: "draft" },
  internal_draft: { visibility: "internal_only", status: "draft" },
  internal_only_source: { visibility: "internal_only", status: "draft" },
  review_proof: { visibility: "client_visible", status: "approved_for_review" },
  final_delivery: { visibility: "client_visible", status: "approved_for_release" },
};

const FILE_ROOM_CATEGORIES = new Set<StudioFileCategory>([
  "client_material",
  "internal_draft",
  "internal_only_source",
  "review_proof",
  "final_delivery",
]);

export type ParsedFileRoomUploadFields =
  | {
      ok: true;
      file: File;
      category: StudioFileCategory;
      visibility: StudioFileVisibility;
      status: StudioFileStatus;
      versionLabel: string;
      deliverableKey?: string;
      deliverableLabel?: string;
    }
  | { ok: false; status: 400 | 422; error: string };

function stringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseCategory(value: string): StudioFileCategory | null {
  return FILE_ROOM_CATEGORIES.has(value as StudioFileCategory)
    ? (value as StudioFileCategory)
    : null;
}

function parseVisibility(value: string): StudioFileVisibility | null {
  if (value === "internal_only" || value === "client_visible") return value;
  return null;
}

function parseStatus(value: string): StudioFileStatus | null {
  if (
    value === "draft" ||
    value === "approved_for_review" ||
    value === "approved_for_release" ||
    value === "released" ||
    value === "superseded"
  ) {
    return value;
  }
  return null;
}

export function parseFileRoomUploadFields(formData: FormData): ParsedFileRoomUploadFields {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.trim()) {
    return { ok: false, status: 400, error: "A file upload is required." };
  }

  const category = parseCategory(stringField(formData, "category"));
  if (!category) return { ok: false, status: 400, error: "A valid File Room category is required." };

  const defaults = CATEGORY_DEFAULTS[category];
  const requestedVisibility = stringField(formData, "visibility");
  const requestedStatus = stringField(formData, "status");
  const visibility = requestedVisibility ? parseVisibility(requestedVisibility) : defaults.visibility;
  const status = requestedStatus ? parseStatus(requestedStatus) : defaults.status;
  if (!visibility || visibility !== defaults.visibility) {
    return { ok: false, status: 422, error: "Visibility does not match the selected file category." };
  }
  if (!status || status !== defaults.status) {
    return { ok: false, status: 422, error: "Status does not match the selected file category." };
  }

  const deliverableKey = stringField(formData, "deliverableKey") || undefined;
  const deliverableLabel = stringField(formData, "deliverableLabel") || deliverableKey;
  if ((category === "review_proof" || category === "final_delivery") && !deliverableKey) {
    return { ok: false, status: 422, error: "A deliverable key is required for client-visible files." };
  }

  return {
    ok: true,
    file,
    category,
    visibility,
    status,
    versionLabel: stringField(formData, "versionLabel") || "v1",
    deliverableKey,
    deliverableLabel,
  };
}

function actorFromUser(user: StudioUser): JobActivityActor {
  return {
    role: user.roles.includes("owner") ? "owner" : "staff",
    userId: user.id,
    displayName: user.displayName ?? user.email,
  };
}

function updateJobInEnvelope(
  envelope: ServerTasksEnvelope,
  job: PurchasedJobRecord,
  events: JobActivityEvent[],
): ServerTasksEnvelope {
  const jobRecords = [...(envelope.jobRecords ?? [])];
  const index = jobRecords.findIndex((entry) => entry.jobId === job.jobId);
  if (index >= 0) jobRecords[index] = job;
  else jobRecords.push(job);

  return {
    ...envelope,
    jobRecords,
    jobActivityEvents: events,
    updatedAt: new Date().toISOString(),
    version: Math.max(envelope.version ?? 10, 10),
  };
}

export async function uploadFileRoomFile(input: {
  adapter: FileRoomStorageAdapter;
  envelope: ServerTasksEnvelope;
  campaign: CampaignRecord;
  clientUserId?: string;
  job: PurchasedJobRecord;
  user: StudioUser;
  fields: Extract<ParsedFileRoomUploadFields, { ok: true }>;
}): Promise<{ envelope: ServerTasksEnvelope; job: PurchasedJobRecord; file: SafeFileRoomFileResponse }> {
  const { adapter, campaign, fields, user } = input;
  const occurredAt = new Date().toISOString();
  const actor = actorFromUser(user);
  const clientId = resolveCampaignCommunicationClientId(
    input.clientUserId,
    campaign.campaignId,
  );
  const metadata = {
    filename: fields.file.name,
    contentType: fields.file.type || "application/octet-stream",
    sizeBytes: fields.file.size,
    versionLabel: fields.versionLabel,
    uploadedAt: occurredAt,
  };
  const scope = {
    clientId,
    campaignId: input.job.campaignId,
    jobId: input.job.jobId,
    category: fields.category,
  };
  const stored = await adapter.uploadObject({ scope, metadata, body: fields.file });
  const storageRef = adapter.createStorageRef(scope, {
    ...metadata,
    uploadedAt: occurredAt,
  });
  const storedStorageRef =
    storageRef.provider === "supabase_storage"
      ? { ...storageRef, objectVersion: stored.objectVersion }
      : storageRef;
  let events = [...(input.envelope.jobActivityEvents ?? [])];
  const registryResult = addJobFileReference(input.job, events, {
    clientId,
    category: fields.category,
    filename: fields.file.name,
    fileType: metadata.contentType,
    storageRef: storedStorageRef,
    visibility: fields.visibility,
    status: fields.status,
    versionLabel: fields.versionLabel,
    actor,
    occurredAt,
    deliverableKey: fields.deliverableKey,
    deliverableLabel: fields.deliverableLabel,
    idPrefix: fields.category === "final_delivery" ? "final-file" : "file",
  });
  let job = registryResult.job;
  events = registryResult.events;
  const registryFile = registryResult.file;

  if (
    fields.category === "internal_draft" ||
    fields.category === "internal_only_source" ||
    fields.category === "client_material"
  ) {
    const workingRef: JobWorkingFileRef = {
      id: `ref:${job.jobId}:${occurredAt}`,
      label: registryFile.filename,
      url: fileRoomFileAccessPath(registryFile.id, "download"),
      addedAt: occurredAt,
      author: actor,
      registryFileId: registryFile.id,
      storageRef: registryFile.storageRef,
    };
    job = {
      ...job,
      workingFileRefs: [...(job.workingFileRefs ?? []), workingRef],
      updatedAt: occurredAt,
    };
    events = appendJobActivityEvent(events, {
      campaignId: job.campaignId,
      jobId: job.jobId,
      kind: "working_file_ref",
      occurredAt,
      actor,
      reason: `Working file uploaded: ${registryFile.filename}`,
      messageRef: registryFile.id,
    });
  }

  if (fields.category === "final_delivery") {
    const file: JobClientDeliveryFile = {
      id: `cdf:${job.jobId}:${fields.deliverableKey}:${occurredAt}`,
      registryFileId: registryFile.id,
      deliverableKey: fields.deliverableKey!,
      deliverableLabel: fields.deliverableLabel!,
      fileName: registryFile.filename,
      fileType: registryFile.fileType,
      url: fileRoomFileAccessPath(registryFile.id, "download"),
      storageRef: registryFile.storageRef,
      versionLabel: registryFile.versionLabel,
      visibility: "client_visible",
      releaseStatus: "pending_release",
      addedAt: occurredAt,
      addedBy: actor,
    };
    job = {
      ...job,
      clientDeliveryFiles: [...(job.clientDeliveryFiles ?? []), file],
      updatedAt: occurredAt,
    };
    events = appendJobActivityEvent(events, {
      campaignId: job.campaignId,
      jobId: job.jobId,
      kind: "client_delivery_file_added",
      occurredAt,
      actor,
      reason: `Client file uploaded: ${file.fileName}`,
      messageRef: registryFile.id,
    });
  }

  const envelope = await writeTasksEnvelope(updateJobInEnvelope(input.envelope, job, events));
  return {
    envelope,
    job,
    file: safeFileRoomFileResponse(
      registryFile,
      fields.category === "review_proof" ? "proof" : "download",
    ),
  };
}
