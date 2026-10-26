import { createHash } from "crypto";
import { describe, expect, it } from "vitest";

import { buildShortFormCustomerSourceItem } from "./short-form-current-door-production";

function minimalMp4(): Buffer {
  const bytes = Buffer.alloc(32);
  bytes[4] = 0x66;
  bytes[5] = 0x74;
  bytes[6] = 0x79;
  bytes[7] = 0x70;
  return bytes;
}

describe("short-form customer source certification", () => {
  it("does not clear a customer clip from the ownership sentence alone", () => {
    const bytes = minimalMp4();
    const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
    const objectPath = "campaign-short/materials/short-form-production-proof-01.mp4";
    const built = buildShortFormCustomerSourceItem({
      campaignId: "campaign-short",
      rightsSentence: "I own these clips, or I have permission from everyone who appears in them.",
      bytes,
      checksumSha256,
      objectPath,
      evaluatedAt: "2026-10-17T00:00:00.000Z",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.productionCleared).toBe(false);
    expect(built.item.relatedServiceIds).toEqual(["short_form_video_editing"]);
    expect(built.item.id).toBe("condensed-short-source-1");
    expect(built.item.storageRef?.provider).toBe("supabase_storage");
    if (built.item.storageRef?.provider !== "supabase_storage") return;
    expect(built.item.storageRef.objectPath).toBe(objectPath);
    expect(built.item.storageRef.checksumSha256).toBe(checksumSha256);
    expect(built.item.storageRef.sizeBytes).toBe(bytes.byteLength);
    expect(built.item.contentCertification?.productionCleared).toBe(false);
    expect(built.item.contentCertification?.rights.recognizablePeoplePresent).toBeNull();
    expect(built.item.contentCertification?.rights.thirdPartyMaterialPresent).toBeNull();
    expect(built.item.contentCertification?.rights.commercialUsePermitted).toBeNull();
    expect(built.item.contentCertification?.rights.cropAdaptPermitted).toBeNull();
    expect(built.item.contentCertification?.rights.ownershipBasis).toBe("customer_owns");
  });
});
