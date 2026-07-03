import type {
  StudioFileCategory,
  StudioFileStorageReference,
  StudioFileStorageVisibilityState,
} from "@/lib/file-registry/types";

export type FileRoomStorageProvider = "mock_storage" | "supabase_storage";

export type FileRoomObjectScope = {
  clientId: string;
  campaignId: string;
  jobId: string;
  category: StudioFileCategory;
};

export type FileRoomObjectMetadata = {
  filename: string;
  contentType: string;
  sizeBytes?: number;
  checksumSha256?: string;
  versionLabel?: string;
  uploadedAt?: string;
};

export type FileRoomStorageObject = FileRoomObjectScope &
  FileRoomObjectMetadata & {
    provider: FileRoomStorageProvider;
    bucket: string;
    objectPath: string;
    visibilityState: StudioFileStorageVisibilityState;
    objectVersion?: string;
  };

export type FileRoomStorageUploadBody =
  | ReadableStream<Uint8Array>
  | NodeJS.ReadableStream
  | Blob
  | ArrayBuffer
  | Uint8Array;

export type FileRoomStorageUploadRequest = {
  scope: FileRoomObjectScope;
  metadata: FileRoomObjectMetadata;
  body: FileRoomStorageUploadBody;
};

export type FileRoomStorageDownloadRequest = {
  storageRef: StudioFileStorageReference;
};

export type FileRoomStorageDownloadResult = {
  body: ReadableStream<Uint8Array> | NodeJS.ReadableStream | Blob | ArrayBuffer | Uint8Array;
  contentType?: string;
  sizeBytes?: number;
};

export type FileRoomStorageAdapter = {
  provider: FileRoomStorageProvider;
  bucket: string;
  buildObjectPath(scope: FileRoomObjectScope, metadata: FileRoomObjectMetadata): string;
  createStorageRef(scope: FileRoomObjectScope, metadata: FileRoomObjectMetadata): StudioFileStorageReference;
  uploadObject(request: FileRoomStorageUploadRequest): Promise<FileRoomStorageObject>;
  downloadObject(request: FileRoomStorageDownloadRequest): Promise<FileRoomStorageDownloadResult>;
};
