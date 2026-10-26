import { describe, expect, it } from "vitest";

import { createSupabasePrivateStorageRef } from "@/lib/file-storage/supabase";

describe("private storage object path", () => {
  it("keeps the supplied object path on the supabase reference", () => {
    const storageRef = createSupabasePrivateStorageRef({
      bucket: "studio-files-local",
      scope: {
        clientId: "client-1",
        campaignId: "campaign-1",
        jobId: "job-1",
        category: "final_delivery",
      },
      metadata: {
        filename: "short.mp4",
        contentType: "video/mp4",
        sizeBytes: 12,
        checksumSha256: "abc",
        uploadedAt: "2026-10-17T00:00:00.000Z",
      },
      objectPath: "campaign-1/final/short.mp4",
    });
    expect(storageRef.provider).toBe("supabase_storage");
    expect(storageRef.objectPath).toBe("campaign-1/final/short.mp4");
  });
});
