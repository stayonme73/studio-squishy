import { describe, expect, it } from "vitest";

import { isBlockingMaterialItem } from "@/lib/materials/materials-view";
import type { CampaignMaterialItem } from "@/lib/materials/types";

function item(reviewStatus: CampaignMaterialItem["reviewStatus"]): CampaignMaterialItem {
  return {
    id: "logo-1",
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus,
    contentKind: "file-metadata",
    label: "Logo",
    reason: "Brand",
    relatedServiceIds: [],
    uploadStatus: "stored",
  };
}

describe("blocking material campaign id", () => {
  it("does not change the blocking boolean when the campaign id changes", () => {
    const missing = item("missing");
    const approved = item("approved_for_use");
    expect(isBlockingMaterialItem(missing, "campaign-a")).toBe(true);
    expect(isBlockingMaterialItem(missing, "0")).toBe(true);
    expect(isBlockingMaterialItem(approved, "campaign-a")).toBe(
      isBlockingMaterialItem(approved, "0"),
    );
  });
});
