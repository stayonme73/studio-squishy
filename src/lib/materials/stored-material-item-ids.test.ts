import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/campaigns/[campaignId]/materials/route";
import type { CampaignMaterialItem } from "./types";
import { storedMaterialIdsMatchingChecksum } from "./stored-material-item-ids";

function item(overrides: Partial<CampaignMaterialItem>): CampaignMaterialItem {
  return {
    id: "logo",
    category: "logo-brand",
    requirementLevel: "optional",
    reviewStatus: "submitted",
    contentKind: "file-metadata",
    label: "Logo",
    reason: "Flyer",
    relatedServiceIds: ["v2-rtu-flyer"],
    uploadStatus: "stored",
    ...overrides,
  };
}

const supabaseRef = {
  provider: "supabase_storage" as const,
  connectionStatus: "private_object" as const,
  bucket: "materials",
  objectPath: "campaigns/c/logo.png",
  visibilityState: "internal-only" as const,
  originalFilename: "logo.png",
  contentType: "image/png",
};

describe("stored material checksum match", () => {
  it("returns the item when the Supabase checksum matches", () => {
    const ids = storedMaterialIdsMatchingChecksum(
      [item({ storageRef: { ...supabaseRef, checksumSha256: "abc" } })],
      "abc",
    );
    expect(ids).toEqual(["logo"]);
  });

  it("does not invent a checksum when the stored file has none", () => {
    const ids = storedMaterialIdsMatchingChecksum(
      [item({ id: "plain", storageRef: { ...supabaseRef } })],
      "abc",
    );
    expect(ids).toEqual([]);
  });

  it("does not treat a reference-only link as a checksum match", () => {
    const ids = storedMaterialIdsMatchingChecksum(
      [
        item({
          id: "drive",
          storageRef: {
            provider: "google_shared_drive",
            connectionStatus: "reference_only",
            referenceKind: "manual_link",
            reference: "https://drive.example/file",
          },
        }),
      ],
      "abc",
    );
    expect(ids).toEqual([]);
  });

  it("ignores a matching checksum that is not a stored upload", () => {
    const ids = storedMaterialIdsMatchingChecksum(
      [
        item({
          uploadStatus: "pending_upload",
          storageRef: { ...supabaseRef, checksumSha256: "abc" },
        }),
      ],
      "abc",
    );
    expect(ids).toEqual([]);
  });
});

describe("materials route session gate", () => {
  it("still requires a session before material records are read", async () => {
    const response = await GET(new Request("http://localhost/materials"), {
      params: Promise.resolve({ campaignId: "camp" }),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
  });
});
