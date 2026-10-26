import { describe, expect, it } from "vitest";

import type { CampaignMaterialItem } from "@/lib/materials/types";

import { assembleCustomerLifeTruth } from "./assemble-truth";

function item(reviewStatus: CampaignMaterialItem["reviewStatus"]): CampaignMaterialItem {
  return {
    id: "photo-1",
    category: "photo-video",
    requirementLevel: "optional",
    reviewStatus,
    contentKind: "file-metadata",
    label: "Photo",
    reason: "Optional photo.",
    relatedServiceIds: ["v2-rtu-flyer"],
    uploadStatus: "stored",
  };
}

describe("customer life unusable materials", () => {
  it("counts needs_clarification and does not treat blocked_from_use as that same count", () => {
    const clarification = assembleCustomerLifeTruth({
      campaign: null,
      materials: [item("needs_clarification")],
    });
    const blocked = assembleCustomerLifeTruth({
      campaign: null,
      materials: [item("blocked_from_use")],
    });
    const submitted = assembleCustomerLifeTruth({
      campaign: null,
      materials: [item("submitted")],
    });
    expect(clarification.unusableMaterialCount).toBe(1);
    expect(blocked.unusableMaterialCount).toBe(0);
    expect(submitted.unusableMaterialCount).toBe(0);
  });
});
