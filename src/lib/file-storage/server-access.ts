import type { StudioUser } from "@/lib/campaign-store/types";
import { isSupabasePrivateStorageRef } from "@/lib/file-registry/job-files";
import type { StudioFileReference } from "@/lib/file-registry/types";
import type { JobClientDeliveryFile, PurchasedJobRecord } from "@/lib/job-control/types";

import {
  canClientAccessFinalDeliveryFile,
  canClientAccessReviewProofFile,
  canInternalAccessFileRoomFile,
  canStaffAccessInternalFile,
} from "./access";
import type { FileRoomStorageAdapter, FileRoomStorageDownloadResult } from "./types";

export type FileRoomDownloadResult =
  | { ok: true; file: StudioFileReference; download: FileRoomStorageDownloadResult }
  | { ok: false; status: 400 | 403 | 404; error: string };

export async function downloadClientFinalFile(input: {
  adapter: FileRoomStorageAdapter;
  user: StudioUser | null;
  job: PurchasedJobRecord;
  file: StudioFileReference;
  clientDeliveryFile?: JobClientDeliveryFile;
}): Promise<FileRoomDownloadResult> {
  const decision = canClientAccessFinalDeliveryFile(input);
  if (!decision.allowed) return { ok: false, status: 403, error: decision.reason };
  if (!isSupabasePrivateStorageRef(input.file.storageRef)) {
    return { ok: false, status: 400, error: "File is not stored in private File Room storage." };
  }

  return {
    ok: true,
    file: input.file,
    download: await input.adapter.downloadObject({ storageRef: input.file.storageRef }),
  };
}

export async function downloadClientReviewProofFile(input: {
  adapter: FileRoomStorageAdapter;
  user: StudioUser | null;
  job: PurchasedJobRecord;
  file: StudioFileReference;
}): Promise<FileRoomDownloadResult> {
  const decision = canClientAccessReviewProofFile(input);
  if (!decision.allowed) return { ok: false, status: 403, error: decision.reason };
  if (!isSupabasePrivateStorageRef(input.file.storageRef)) {
    return { ok: false, status: 400, error: "File is not stored in private File Room storage." };
  }

  return {
    ok: true,
    file: input.file,
    download: await input.adapter.downloadObject({ storageRef: input.file.storageRef }),
  };
}

export async function downloadInternalFileRoomFile(input: {
  adapter: FileRoomStorageAdapter;
  user: StudioUser | null;
  job: PurchasedJobRecord;
  file: StudioFileReference;
  campaignAccessAllowed?: boolean;
}): Promise<FileRoomDownloadResult> {
  const decision = canInternalAccessFileRoomFile(input);
  if (!decision.allowed) return { ok: false, status: 403, error: decision.reason };
  if (!isSupabasePrivateStorageRef(input.file.storageRef)) {
    return { ok: false, status: 400, error: "File is not stored in private File Room storage." };
  }

  return {
    ok: true,
    file: input.file,
    download: await input.adapter.downloadObject({ storageRef: input.file.storageRef }),
  };
}

export async function downloadStaffInternalFile(input: {
  adapter: FileRoomStorageAdapter;
  user: StudioUser | null;
  job: PurchasedJobRecord;
  file: StudioFileReference;
  campaignAccessAllowed?: boolean;
}): Promise<FileRoomDownloadResult> {
  const decision = canStaffAccessInternalFile(input);
  if (!decision.allowed) return { ok: false, status: 403, error: decision.reason };
  if (!isSupabasePrivateStorageRef(input.file.storageRef)) {
    return { ok: false, status: 400, error: "File is not stored in private File Room storage." };
  }

  return {
    ok: true,
    file: input.file,
    download: await input.adapter.downloadObject({ storageRef: input.file.storageRef }),
  };
}
