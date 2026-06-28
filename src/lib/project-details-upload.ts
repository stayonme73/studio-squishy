import type {
  ProjectDetailsFileCategory,
  ProjectDetailsUploadedFile,
} from "@/config/project-details";

const FILE_STORE_PREFIX = "studio-squishy:project-details-files:";

type StoredFilePayload = {
  campaignId: string;
  dataUrl: string;
  meta: ProjectDetailsUploadedFile;
};

type FileStore = Record<string, StoredFilePayload>;

function fileStoreKey(campaignId: string) {
  return `${FILE_STORE_PREFIX}${campaignId}`;
}

function readStore(campaignId: string): FileStore {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(fileStoreKey(campaignId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as FileStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(campaignId: string, store: FileStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(fileStoreKey(campaignId), JSON.stringify(store));
}

export const PROJECT_DETAILS_MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("FILE_READ_FAILED"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

export async function uploadProjectDetailsFile(
  campaignId: string,
  file: File,
  category: ProjectDetailsFileCategory,
): Promise<ProjectDetailsUploadedFile> {
  if (file.size > PROJECT_DETAILS_MAX_FILE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const meta: ProjectDetailsUploadedFile = {
    id: crypto.randomUUID(),
    category,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
  };

  const store = readStore(campaignId);
  store[meta.id] = { campaignId, dataUrl, meta };
  writeStore(campaignId, store);
  return meta;
}

export function listProjectDetailsFileDataUrls(
  campaignId: string,
  fileIds: readonly string[],
): Record<string, string> {
  const store = readStore(campaignId);
  const result: Record<string, string> = {};
  for (const id of fileIds) {
    const entry = store[id];
    if (entry?.campaignId === campaignId) {
      result[id] = entry.dataUrl;
    }
  }
  return result;
}

export function removeProjectDetailsFile(campaignId: string, fileId: string) {
  const store = readStore(campaignId);
  const entry = store[fileId];
  if (!entry || entry.campaignId !== campaignId) return;
  delete store[fileId];
  writeStore(campaignId, store);
}

export function clearProjectDetailsFiles(campaignId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(fileStoreKey(campaignId));
}

export function projectDetailsFileStoreKey(campaignId: string) {
  return fileStoreKey(campaignId);
}
