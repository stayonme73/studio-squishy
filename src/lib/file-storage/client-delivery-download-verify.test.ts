import { describe, expect, it } from "vitest";

import {
  clientDeliveryFileDownloadPath,
  fetchAuthorizedDeliveryBytes,
  releasedClientDeliveryFiles,
  sha256BufferPrefixed,
  verifyDownloadMatchesContentSha256,
  verifyDownloadMatchesStorageRef,
} from "./client-delivery-download-verify";

describe("client delivery download verify", () => {
  it("resolves download path from url or accessHref", () => {
    expect(
      clientDeliveryFileDownloadPath({
        url: "/api/file-room/files/final-file%3Aabc/download",
        releaseStatus: "released",
        fileName: "a.png",
        deliverableKey: "k",
        deliverableLabel: "l",
        fileType: "image/png",
        addedAt: "",
        addedBy: { role: "system" },
      }),
    ).toBe("/api/file-room/files/final-file%3Aabc/download");
    expect(
      clientDeliveryFileDownloadPath({
        url: "http://127.0.0.1:3475/api/file-room/files/x/download",
        releaseStatus: "released",
        fileName: "a.png",
        deliverableKey: "k",
        deliverableLabel: "l",
        fileType: "image/png",
        addedAt: "",
        addedBy: { role: "system" },
      }),
    ).toBe("/api/file-room/files/x/download");
  });

  it("filters released delivery files only", () => {
    const released = releasedClientDeliveryFiles([
      {
        url: "/a",
        releaseStatus: "released",
        fileName: "1",
        deliverableKey: "k",
        deliverableLabel: "l",
        fileType: "image/png",
        addedAt: "",
        addedBy: { role: "system" },
      },
      {
        url: "/b",
        releaseStatus: "pending_release",
        fileName: "2",
        deliverableKey: "k",
        deliverableLabel: "l",
        fileType: "image/png",
        addedAt: "",
        addedBy: { role: "system" },
      },
    ]);
    expect(released).toHaveLength(1);
    expect(released[0]?.fileName).toBe("1");
  });

  it("verifies exact bytes against contentSha256 and storageRef", () => {
    const bytes = Buffer.from("cert-download-bytes");
    const sha = sha256BufferPrefixed(bytes);
    expect(verifyDownloadMatchesContentSha256(bytes, sha).ok).toBe(true);
    expect(
      verifyDownloadMatchesStorageRef(bytes, {
        provider: "supabase_storage",
        connectionStatus: "private_object",
        bucket: "b",
        objectPath: "o",
        visibilityState: "client-final",
        originalFilename: "f.png",
        contentType: "image/png",
        sizeBytes: bytes.length,
        checksumSha256: sha,
        uploadedAt: new Date().toISOString(),
        displayLabel: "f.png",
      }).ok,
    ).toBe(true);
  });

  it("fetchAuthorizedDeliveryBytes uses session cookie", async () => {
    let seenCookie = "";
    const body = Buffer.from("ok");
    const result = await fetchAuthorizedDeliveryBytes({
      baseUrl: "http://127.0.0.1:3475",
      sessionCookie: "sess-abc",
      downloadPath: "/api/file-room/files/x/download",
      fetchImpl: async (url, init) => {
        seenCookie = String(init?.headers && (init.headers as Record<string, string>).Cookie);
        return new Response(body, { status: 200 });
      },
    });
    expect(result.ok).toBe(true);
    expect(seenCookie).toBe("studio_session=sess-abc");
    expect(result.ok && result.bytes.equals(body)).toBe(true);
  });
});
