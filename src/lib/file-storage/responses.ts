import { Readable } from "stream";

import { isSupabasePrivateStorageRef } from "@/lib/file-registry/job-files";
import type { StudioFileReference } from "@/lib/file-registry/types";

import { fileRoomFileAccessPath, type FileRoomClientAccessPurpose } from "./routes";
import type { FileRoomStorageDownloadResult } from "./types";

export type SafeFileRoomFileResponse = {
  id: string;
  clientId: string;
  campaignId: string;
  jobId: string;
  category: StudioFileReference["category"];
  filename: string;
  fileType: string;
  visibility: StudioFileReference["visibility"];
  versionLabel: string;
  status: StudioFileReference["status"];
  deliverableKey?: string;
  deliverableLabel?: string;
  accessHref: string | null;
  addedAt: string;
};

export function safeFileRoomFileResponse(
  file: StudioFileReference,
  purpose: FileRoomClientAccessPurpose = "download",
): SafeFileRoomFileResponse {
  return {
    id: file.id,
    clientId: file.clientId,
    campaignId: file.campaignId,
    jobId: file.jobId,
    category: file.category,
    filename: file.filename,
    fileType: file.fileType,
    visibility: file.visibility,
    versionLabel: file.versionLabel,
    status: file.status,
    deliverableKey: file.deliverableKey,
    deliverableLabel: file.deliverableLabel,
    accessHref: isSupabasePrivateStorageRef(file.storageRef)
      ? fileRoomFileAccessPath(file.id, purpose)
      : null,
    addedAt: file.addedAt,
  };
}

function contentDisposition(filename: string, disposition: "attachment" | "inline"): string {
  const safeFilename = filename.replace(/[\r\n"\\]/g, "_") || "file";
  return `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`;
}

function isNodeReadable(value: unknown): value is NodeJS.ReadableStream {
  return Boolean(
    value &&
      typeof value === "object" &&
      "pipe" in value &&
      typeof (value as { pipe?: unknown }).pipe === "function",
  );
}

export function fileRoomDownloadResponse(
  file: StudioFileReference,
  download: FileRoomStorageDownloadResult,
  disposition: "attachment" | "inline" = "attachment",
): Response {
  const body = isNodeReadable(download.body)
    ? (Readable.toWeb(download.body as Readable) as unknown as BodyInit)
    : (download.body as BodyInit);
  const headers = new Headers({
    "cache-control": "private, no-store",
    "content-disposition": contentDisposition(file.filename, disposition),
    "content-type": download.contentType ?? file.fileType ?? "application/octet-stream",
    "x-content-type-options": "nosniff",
  });
  if (download.sizeBytes !== undefined && Number.isFinite(download.sizeBytes)) {
    headers.set("content-length", String(download.sizeBytes));
  }

  return new Response(body, { status: 200, headers });
}
