import { describe, expect, it } from "vitest";

import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";
import { studioClipRepurposingPriceCorrectionV1 } from "@/config/studio-clip-repurposing-price-correction-v1";
import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";

describe("Clip Repurposing price correction", () => {
  it("corrects unpublished economics without changing scope or publication", () => {
    expect(studioClipRepurposingPriceCorrectionV1.fullPackageCents).toBe(54900);
    expect(studioClipRepurposingPriceCorrectionV1.twoClipOutcomeCents).toBe(44900);
    expect(
      studioClipRepurposingPriceCorrectionV1.oneClipConvertsToShortFormVideoEditingCents,
    ).toBe(34900);
    expect(studioClipRepurposingBuildV1.sku.priceCents).toBe(54900);
    expect(studioClipRepurposingBuildV1.economics.priceUsd).toBe(549);
    expect(studioClipRepurposingBuildV1.failClose.customerRemedyPriceCents[1]).toBe(
      34900,
    );
    expect(studioClipRepurposingBuildV1.failClose.customerRemedyPriceCents[2]).toBe(
      44900,
    );
    expect(studioClipRepurposingBuildV1.failClose.customerRemedyPriceCents["3+"]).toBe(
      54900,
    );
    expect(studioClipRepurposingBuildV1.failClose.customerRemedies[0]).toBe(
      "cannot_complete_as_sold",
    );
    expect(studioClipRepurposingBuildV1.failClose.detectCounts).toEqual([
      0,
      1,
      2,
      "3+",
    ]);
    expect(studioClipRepurposingBuildV1.proposedOffer.finishedClipCount).toBe(3);
    expect(studioClipRepurposingBuildV1.certifiedScope.finishedVerticalShorts).toBe(3);
    expect(studioClipRepurposingBuildV1.certifiedScope.includedSetRevision).toBe(1);
    expect(studioClipRepurposingBuildV1.revision.model).toBe("one_set_revision");
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.internalSellNowCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.eleventhPublicMenuPublished).toBe(true);
    expect(studioClipRepurposingPriceCorrectionV1.doNotIncreaseClipCount).toBe(true);
    expect(studioClipRepurposingPriceCorrectionV1.doNotReduceQuality).toBe(true);
  });
});
