/**
 * Authorized File Room download verification for released client delivery files.
 * Uses persisted `url` (API route) — not legacy `downloadPath`.
 */

import { createHash } from "node:crypto";

import type { JobClientDeliveryFile } from "@/lib/job-control/types";
import { contentSha256Hex, sameContentSha256 } from "@/lib/studio-review-revision/hash";

export type ClientDeliveryDownloadSource = Pick<
  JobClientDeliveryFile,
  "url" | "releaseStatus" | "contentSha256" | "fileName" | "storageRef"
> & {
  accessHref?: string | null;
};

/** Resolve pathname for GET against app base URL (authorized session required). */
export function clientDeliveryFileDownloadPath(
  file: ClientDeliveryDownloadSource | null | undefined,
): string | null {
  if (!file) return null;
  const href = file.url?.trim() || file.accessHref?.trim() || null;
  if (!href) return null;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      return new URL(href).pathname;
    } catch {
      return null;
    }
  }
  return href.startsWith("/") ? href : `/${href}`;
}

export function sha256BufferPrefixed(bytes: Buffer): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function releasedClientDeliveryFiles(
  files: readonly ClientDeliveryDownloadSource[] | undefined,
): ClientDeliveryDownloadSource[] {
  return (files ?? []).filter((file) => file.releaseStatus === "released");
}

export type FetchAuthorizedDeliveryResult =
  | { ok: true; status: number; bytes: Buffer }
  | { ok: false; status: number; bytes: Buffer; error: string };

/** Download bytes through the authorized customer File Room route. */
export async function fetchAuthorizedDeliveryBytes(input: {
  baseUrl: string;
  sessionCookie: string;
  downloadPath: string;
  fetchImpl?: typeof fetch;
}): Promise<FetchAuthorizedDeliveryResult> {
  const fetchFn = input.fetchImpl ?? fetch;
  const path = input.downloadPath.startsWith("/")
    ? input.downloadPath
    : `/${input.downloadPath}`;
  const url = `${input.baseUrl.replace(/\/$/, "")}${path}`;
  const response = await fetchFn(url, {
    headers: { Cookie: `studio_session=${input.sessionCookie}` },
  });
  const bytes = response.ok ? Buffer.from(await response.arrayBuffer()) : Buffer.alloc(0);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      bytes,
      error: `HTTP ${response.status}`,
    };
  }
  return { ok: true, status: response.status, bytes };
}

export type VerifyExactByteMatchResult =
  | { ok: true; computedSha256: string; expectedSha256: string }
  | { ok: false; reason: string; computedSha256?: string; expectedSha256?: string };

export function verifyDownloadMatchesContentSha256(
  bytes: Buffer,
  expectedContentSha256: string | undefined,
): VerifyExactByteMatchResult {
  if (!expectedContentSha256?.trim()) {
    return { ok: false, reason: "missing expected contentSha256 on delivery file" };
  }
  const computed = sha256BufferPrefixed(bytes);
  if (!sameContentSha256(computed, expectedContentSha256)) {
    return {
      ok: false,
      reason: "byte hash mismatch",
      computedSha256: computed,
      expectedSha256: normalizeDisplaySha(expectedContentSha256),
    };
  }
  return {
    ok: true,
    computedSha256: computed,
    expectedSha256: normalizeDisplaySha(expectedContentSha256),
  };
}

export function verifyDownloadMatchesStorageRef(
  bytes: Buffer,
  storageRef: ClientDeliveryDownloadSource["storageRef"],
): VerifyExactByteMatchResult {
  const expected = storageRef?.checksumSha256;
  if (!expected?.trim()) {
    return { ok: false, reason: "missing storageRef.checksumSha256" };
  }
  const computed = sha256BufferPrefixed(bytes);
  const storageHex = contentSha256Hex(expected);
  const computedHex = contentSha256Hex(computed);
  if (storageHex !== computedHex) {
    return {
      ok: false,
      reason: "byte hash mismatch vs storageRef",
      computedSha256: computed,
      expectedSha256: normalizeDisplaySha(expected),
    };
  }
  return {
    ok: true,
    computedSha256: computed,
    expectedSha256: normalizeDisplaySha(expected),
  };
}

function normalizeDisplaySha(value: string): string {
  const hex = contentSha256Hex(value);
  return hex ? `sha256:${hex}` : value;
}
