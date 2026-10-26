import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/campaigns/[campaignId]/materials/[itemId]/content/route";
import { createStoredMaterialContentResponse } from "./stored-material-content-response";

describe("stored material content response", () => {
  it("returns the exact bytes, including a view with a non-zero byteOffset", async () => {
    const source = Uint8Array.from([9, 1, 2, 3, 4, 8]);
    const view = source.subarray(1, 5);
    const response = createStoredMaterialContentResponse({
      body: view,
      contentType: "image/png",
      checksumSha256: "abc123",
      fileName: 'logo "a".png',
    });
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
    expect(bytes.byteOffset).toBe(0);
    expect(bytes.byteLength).toBe(4);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBe("4");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-studio-material-checksum")).toBe("abc123");
    const filename = 'logo _a_.png';
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
  });

  it("keeps the material filename when the stored name is absent", async () => {
    const response = createStoredMaterialContentResponse({
      body: Uint8Array.from([7]),
      contentType: "application/octet-stream",
      checksumSha256: "one",
      fileName: null,
    });
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(Uint8Array.from([7]));
    expect(response.headers.get("content-disposition")).toContain('filename="material"');
  });
});

describe("materials content route gates", () => {
  it("still requires a session before any material bytes are read", async () => {
    const response = await GET(new Request("http://localhost/materials"), {
      params: Promise.resolve({ campaignId: "camp", itemId: "item" }),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
  });
});
