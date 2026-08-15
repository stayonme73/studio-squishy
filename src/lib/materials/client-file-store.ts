import { createHash } from "crypto";

import { studioMaterialsUploadV1 } from "@/config/studio-materials-upload-v1";
import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import { addJobFileReference } from "@/lib/file-registry/job-files";
import type { FileRoomStorageAdapter } from "@/lib/file-storage/types";
import { buildJobId } from "@/lib/job-control/lane-map";
import { resolveCampaignCommunicationClientId } from "@/lib/job-control/communication";
import { appendJobActivityEvent } from "@/lib/job-control/activity-log";
import type { JobActivityActor, PurchasedJobRecord } from "@/lib/job-control/types";

import { parseConsolidatedRequestId } from "./client-requests";
import { applyClientSubmitConsolidated, applyClientSubmitItem } from "./actions";
import type { CampaignMaterialItem, ServerMaterialsEnvelope } from "./types";

function extensionOf(fileName: string): string {
  const match = fileName.trim().toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function validateCustomerMaterialFile(file: File): { ok: true } | { ok: false; error: string } {
  const copy = studioMaterialsUploadV1.customerCopy;
  if (!file || !file.name.trim()) {
    return { ok: false, error: copy.missingFile };
  }
  if (file.size <= 0) {
    return { ok: false, error: copy.emptyFile };
  }
  if (file.size > studioMaterialsUploadV1.maxFileBytes) {
    return { ok: false, error: copy.tooLarge };
  }
  const mime = file.type.trim().toLowerCase();
  const ext = extensionOf(file.name);
  const mimeOk =
    mime.length > 0 &&
    (studioMaterialsUploadV1.allowedMimeTypes as readonly string[]).includes(mime);
  const extOk = (studioMaterialsUploadV1.allowedExtensions as readonly string[]).includes(ext);
  if (!mimeOk && !extOk) {
    return { ok: false, error: copy.unsupportedType };
  }
  return { ok: true };
}

export function isPrivateStoredMaterial(item: CampaignMaterialItem): boolean {
  return (
    item.uploadStatus === "stored" &&
    item.storageRef?.provider === "supabase_storage" &&
    item.storageRef.connectionStatus === "private_object" &&
    Boolean(item.storageRef.objectPath) &&
    Boolean(item.storageRef.checksumSha256)
  );
}

export function customerStoredReceiptMessage(duplicate: boolean): string {
  return duplicate
    ? studioMaterialsUploadV1.customerCopy.duplicateKept
    : studioMaterialsUploadV1.customerCopy.receivedStored;
}

function clientActor(user: StudioUser): JobActivityActor {
  return {
    role: "client",
    userId: user.id,
    displayName: user.displayName ?? user.email,
  };
}

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function retrievedByteLength(body: unknown, fallback: number): number {
  if (body instanceof Uint8Array) return body.byteLength;
  if (Buffer.isBuffer(body)) return body.byteLength;
  if (body instanceof ArrayBuffer) return body.byteLength;
  return fallback;
}

function bucketItems(
  envelope: ServerMaterialsEnvelope,
  input: { itemId?: string; consolidatedItemId?: string },
): CampaignMaterialItem[] {
  if (input.itemId) {
    const item = envelope.items.find((entry) => entry.id === input.itemId);
    return item ? [item] : [];
  }
  if (!input.consolidatedItemId) return [];
  const parsed = parseConsolidatedRequestId(input.consolidatedItemId);
  if (!parsed) return [];
  return envelope.items.filter(
    (item) => item.category === parsed.category && item.contentKind === parsed.contentKind,
  );
}

function canAttachStoredFile(item: CampaignMaterialItem): boolean {
  if (item.contentKind !== "file-metadata") return false;
  if (item.reviewStatus === "approved_for_use" || item.reviewStatus === "not_needed") return false;
  if (item.reviewStatus === "blocked_from_use" || item.reviewStatus === "owner_policy_review") {
    return false;
  }
  if (isPrivateStoredMaterial(item)) return false;
  return (
    item.reviewStatus === "missing" ||
    item.reviewStatus === "requested" ||
    item.reviewStatus === "needs_clarification" ||
    item.reviewStatus === "submitted"
  );
}

function needsLedgerSubmit(item: CampaignMaterialItem): boolean {
  return (
    item.reviewStatus === "missing" ||
    item.reviewStatus === "requested" ||
    item.reviewStatus === "needs_clarification"
  );
}

function resolveJobForItem(
  tasks: ServerTasksEnvelope,
  campaignId: string,
  item: CampaignMaterialItem,
): PurchasedJobRecord | undefined {
  const jobs = tasks.jobRecords ?? [];
  const bySku = jobs.find((job) => item.relatedServiceIds.includes(job.skuId));
  if (bySku) return bySku;
  const skuId = item.relatedServiceIds[0];
  if (!skuId) return jobs[0];
  const jobId = buildJobId(campaignId, skuId);
  return jobs.find((job) => job.jobId === jobId);
}

/**
 * Store customer file bytes on the File Room adapter and bind the materials ledger.
 * Filename-only submit is not a receipt.
 */
export async function storeAndAttachCustomerMaterialFile(input: {
  adapter: FileRoomStorageAdapter;
  campaign: CampaignRecord;
  campaignClientUserId?: string | null;
  tasks: ServerTasksEnvelope;
  materials: ServerMaterialsEnvelope;
  user: StudioUser;
  file: File;
  itemId?: string;
  consolidatedItemId?: string;
  useAuthorizationBasis?:
    | "customer_owns"
    | "customer_has_permission"
    | "studio_generated"
    | "studio_controlled_licensed"
    | "provider_licensed";
}): Promise<
  | {
      ok: true;
      materials: ServerMaterialsEnvelope;
      tasks: ServerTasksEnvelope;
      checksumSha256: string;
      duplicate: boolean;
      retrievedBytes: number;
    }
  | { ok: false; error: string; status: number }
> {
  const copy = studioMaterialsUploadV1.customerCopy;
  const fileCheck = validateCustomerMaterialFile(input.file);
  if (!fileCheck.ok) {
    return { ok: false, error: fileCheck.error, status: 400 };
  }

  const targets = bucketItems(input.materials, input);
  if (targets.length === 0) {
    return { ok: false, error: "No outstanding material request matches that upload.", status: 404 };
  }

  const bytes = Buffer.from(await input.file.arrayBuffer());
  const checksum = sha256Hex(bytes);
  const already = targets.find(
    (item) => isPrivateStoredMaterial(item) && item.storageRef?.checksumSha256 === checksum,
  );
  if (already) {
    return {
      ok: true,
      materials: input.materials,
      tasks: input.tasks,
      checksumSha256: checksum,
      duplicate: true,
      retrievedBytes: already.sizeBytes ?? bytes.byteLength,
    };
  }

  const attachable = targets.filter(canAttachStoredFile);
  if (attachable.length === 0) {
    if (targets.some(isPrivateStoredMaterial)) {
      return {
        ok: false,
        error: copy.duplicateKept,
        status: 409,
      };
    }
    return { ok: false, error: "This item is not open for client submission.", status: 400 };
  }

  const ids = attachable.map((item) => item.id);
  const firstItem = attachable[0]!;
  const payload = {
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    availability: "available" as const,
    useAuthorizationBasis: input.useAuthorizationBasis,
  };

  let workingMaterials = input.materials;
  const openForSubmit = attachable.filter(needsLedgerSubmit);
  if (openForSubmit.length > 0) {
    const submitted =
      input.consolidatedItemId && parseConsolidatedRequestId(input.consolidatedItemId)
        ? applyClientSubmitConsolidated(
            workingMaterials,
            input.consolidatedItemId,
            payload,
            input.user,
          )
        : applyClientSubmitItem(workingMaterials, openForSubmit[0]!.id, payload, input.user);
    if (!submitted.ok) {
      return submitted;
    }
    workingMaterials = submitted.envelope;
  }

  const job = resolveJobForItem(input.tasks, input.campaign.campaignId, firstItem);
  if (!job) {
    return { ok: false, error: copy.storageFailed, status: 409 };
  }

  const clientId = resolveCampaignCommunicationClientId(
    input.campaignClientUserId ?? undefined,
    input.campaign.campaignId,
  );
  const occurredAt = new Date().toISOString();
  const scope = {
    clientId,
    campaignId: input.campaign.campaignId,
    jobId: job.jobId,
    category: "client_material" as const,
  };
  const metadata = {
    filename: input.file.name,
    contentType: input.file.type || "application/octet-stream",
    sizeBytes: bytes.byteLength,
    checksumSha256: checksum,
    versionLabel: "v1",
    uploadedAt: occurredAt,
  };

  let stored;
  try {
    stored = await input.adapter.uploadObject({
      scope,
      metadata,
      body: bytes,
    });
  } catch {
    return { ok: false, error: copy.storageFailed, status: 502 };
  }

  const storageRef = input.adapter.createStorageRef(scope, metadata);
  const boundRef =
    storageRef.provider === "supabase_storage"
      ? { ...storageRef, objectVersion: stored.objectVersion, checksumSha256: checksum }
      : storageRef;

  let download;
  try {
    download = await input.adapter.downloadObject({ storageRef: boundRef });
  } catch {
    return { ok: false, error: copy.storageFailed, status: 502 };
  }
  const retrieved = retrievedByteLength(download.body, stored.sizeBytes ?? bytes.byteLength);
  if (!retrieved || retrieved <= 0) {
    return { ok: false, error: copy.storageFailed, status: 502 };
  }

  const actor = clientActor(input.user);
  let events = [...(input.tasks.jobActivityEvents ?? [])];
  const registry = addJobFileReference(job, events, {
    clientId,
    category: "client_material",
    filename: input.file.name,
    fileType: metadata.contentType,
    storageRef: boundRef,
    visibility: "internal_only",
    status: "draft",
    versionLabel: "v1",
    actor,
    occurredAt,
    sourceMaterialId: firstItem.id,
    idPrefix: "material-file",
  });
  let nextJob: PurchasedJobRecord = {
    ...registry.job,
    lastClientResponseAt: occurredAt,
  };
  events = appendJobActivityEvent(registry.events, {
    campaignId: nextJob.campaignId,
    jobId: nextJob.jobId,
    kind: "client_upload",
    occurredAt,
    actor,
    reason: `Customer file stored: ${input.file.name}`,
    messageRef: registry.file.id,
  });

  const items = workingMaterials.items.map((item) =>
    ids.includes(item.id)
      ? {
          ...item,
          uploadStatus: "stored" as const,
          fileName: input.file.name,
          mimeType: metadata.contentType,
          sizeBytes: retrieved,
          storageRef: boundRef,
          fileRegistryRefs: [registry.file],
        }
      : item,
  );

  const nextJobs = (input.tasks.jobRecords ?? []).map((row) =>
    row.jobId === nextJob.jobId ? nextJob : row,
  );

  return {
    ok: true,
    materials: {
      ...workingMaterials,
      items,
      updatedAt: occurredAt,
      syncedAt: occurredAt,
    },
    tasks: {
      ...input.tasks,
      jobRecords: nextJobs,
      jobActivityEvents: events,
      updatedAt: occurredAt,
    },
    checksumSha256: checksum,
    duplicate: false,
    retrievedBytes: retrieved,
  };
}

export async function downloadStoredCustomerMaterialBytes(input: {
  adapter: FileRoomStorageAdapter;
  item: CampaignMaterialItem;
}): Promise<{ ok: true; body: Uint8Array; contentType: string; checksumSha256: string } | { ok: false; error: string; status: number }> {
  if (!isPrivateStoredMaterial(input.item) || !input.item.storageRef) {
    return { ok: false, error: "Stored file is not available.", status: 404 };
  }
  try {
    const download = await input.adapter.downloadObject({ storageRef: input.item.storageRef });
    const bytes = Buffer.from(
      download.body instanceof ArrayBuffer
        ? download.body
        : download.body instanceof Uint8Array
          ? download.body
          : Buffer.isBuffer(download.body)
            ? download.body
            : await new Response(download.body as BodyInit).arrayBuffer(),
    );
    if (bytes.byteLength <= 0) {
      return { ok: false, error: "Stored file is not available.", status: 404 };
    }
    return {
      ok: true,
      body: bytes,
      contentType: download.contentType ?? input.item.mimeType ?? "application/octet-stream",
      checksumSha256: input.item.storageRef.checksumSha256!,
    };
  } catch {
    return { ok: false, error: "Stored file is not available.", status: 502 };
  }
}
