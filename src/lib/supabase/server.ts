import type { SupabaseStorageClientLike, SupabaseStorageEnv } from "@/lib/file-storage/supabase";
import type { FileRoomStorageDownloadResult, FileRoomStorageUploadRequest } from "@/lib/file-storage/types";

import {
  assertSupabaseStorageConfigured,
  resolveSupabaseStorageEnv,
} from "@/lib/file-storage/supabase";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeSupabaseProjectUrl(value: string): string {
  const trimmed = trimTrailingSlash(value);
  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return trimmed.replace(/\/storage\/v1$/i, "");
  }
}

function encodeStoragePath(objectPath: string): string {
  return objectPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function bodyForUpload(body: FileRoomStorageUploadRequest["body"]): BodyInit {
  return body as BodyInit;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const parsed = (await response.json()) as { error?: string; message?: string };
    return parsed.message ?? parsed.error ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export type ServerSupabaseStorageClient = SupabaseStorageClientLike & {
  objectExists(request: { bucket: string; objectPath: string }): Promise<boolean>;
  deletePrivateObject(request: { bucket: string; objectPath: string }): Promise<void>;
  getBucketVisibility(bucket: string): Promise<{ public: boolean | null }>;
};

export function createServerSupabaseStorageClient(
  env: SupabaseStorageEnv = resolveSupabaseStorageEnv(),
): ServerSupabaseStorageClient {
  assertSupabaseStorageConfigured(env);

  const baseUrl = normalizeSupabaseProjectUrl(env.supabaseUrl);
  const serviceRoleKey = env.supabaseServiceRoleKey;
  const headers = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
  };

  async function requestStorage(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${baseUrl}/storage/v1${path}`, {
      ...init,
      headers: {
        ...headers,
        ...init.headers,
      },
    });
  }

  return {
    async uploadPrivateObject(request) {
      const response = await requestStorage(
        `/object/${encodeURIComponent(request.bucket)}/${encodeStoragePath(request.objectPath)}`,
        {
          method: "POST",
          body: bodyForUpload(request.body),
          headers: {
            "content-type": request.contentType,
            "x-upsert": "false",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Supabase private upload failed: ${await errorMessage(response)}`);
      }

      return { objectVersion: response.headers.get("etag") ?? undefined };
    },

    async downloadPrivateObject(request): Promise<FileRoomStorageDownloadResult> {
      const response = await requestStorage(
        `/object/authenticated/${encodeURIComponent(request.bucket)}/${encodeStoragePath(request.objectPath)}`,
        { method: "GET" },
      );

      if (!response.ok || !response.body) {
        throw new Error(`Supabase private download failed: ${await errorMessage(response)}`);
      }

      const sizeHeader = response.headers.get("content-length");
      return {
        body: response.body,
        contentType: response.headers.get("content-type") ?? undefined,
        sizeBytes: sizeHeader ? Number(sizeHeader) : undefined,
      };
    },

    async objectExists(request) {
      const response = await requestStorage(
        `/object/info/${encodeURIComponent(request.bucket)}/${encodeStoragePath(request.objectPath)}`,
        { method: "GET" },
      );
      if (response.status === 404) return false;
      if (!response.ok) {
        throw new Error(`Supabase private object check failed: ${await errorMessage(response)}`);
      }
      return true;
    },

    async deletePrivateObject(request) {
      const response = await requestStorage(`/object/${encodeURIComponent(request.bucket)}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prefixes: [request.objectPath] }),
      });
      if (!response.ok) {
        throw new Error(`Supabase private delete failed: ${await errorMessage(response)}`);
      }
    },

    async getBucketVisibility(bucket) {
      const response = await requestStorage(`/bucket/${encodeURIComponent(bucket)}`, { method: "GET" });
      if (!response.ok) {
        throw new Error(`Supabase bucket check failed: ${await errorMessage(response)}`);
      }
      const data = (await response.json()) as { public?: boolean };
      return { public: data.public ?? null };
    },
  };
}
