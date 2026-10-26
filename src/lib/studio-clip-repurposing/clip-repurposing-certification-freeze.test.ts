import { describe, expect, it } from "vitest";

import {
  CLIP_REPURPOSING_SKU,
  studioClipRepurposingBuildV1,
} from "@/config/studio-clip-repurposing-build-v1";
import {
  ELEVENTH_SELL_NOW_SKU,
  TENTH_SELL_NOW_SKU,
  isInternalSellNowSku,
  studioInternalSellNowRegisterV1,
} from "@/config/studio-internal-sell-now-register-v1";
import {
  SHORT_FORM_VIDEO_EDITING_SKU,
  studioShortFormVideoEditingBuildV1,
} from "@/config/studio-short-form-video-editing-build-v1";

describe("Clip Repurposing certification freeze", () => {
  it("freezes the unpublished $549 set contract and moves internal SELL NOW to 11", () => {
    expect(CLIP_REPURPOSING_SKU).toBe("v2-rtu-clip-repurposing");
    expect(studioClipRepurposingBuildV1.classification).toBe("SELL_NOW");
    expect(studioClipRepurposingBuildV1.verdict).toBe("SELL_NOW");
    expect(studioClipRepurposingBuildV1.sku.priceCents).toBe(54900);
    expect(studioClipRepurposingBuildV1.sku.priceFrozen).toBe(true);
    expect(studioClipRepurposingBuildV1.doNotPublish).toBe(false);
    expect(studioClipRepurposingBuildV1.doNotWireLaunchNow).toBe(false);
    expect(studioClipRepurposingBuildV1.onLaunchMenu).toBe(true);
    expect(studioClipRepurposingBuildV1.revision.model).toBe("one_set_revision");
    expect(studioClipRepurposingBuildV1.revision.frozen).toBe(true);
    expect(studioClipRepurposingBuildV1.failClose.customerRemediesFrozen).toBe(true);
    expect(studioClipRepurposingBuildV1.failClose.customerRemedies[0]).toBe(
      "cannot_complete_as_sold",
    );
    expect(studioClipRepurposingBuildV1.failClose.customerRemedies[1]).toBe(
      "convert_to_frozen_349_short_form_video_editing",
    );
    expect(studioClipRepurposingBuildV1.failClose.customerRemedies[2]).toBe(
      "two_clip_outcome_at_449",
    );
    expect(studioClipRepurposingBuildV1.failClose.customerRemedies["3+"]).toBe(
      "fulfill_clip_repurposing_at_549",
    );
    expect(studioClipRepurposingBuildV1.liveGates.captionBaselineAcceptedByOwner).toBe(
      true,
    );
    expect(studioClipRepurposingBuildV1.liveGates.exactGap).toBe("none");
    expect(studioClipRepurposingBuildV1.economics.frozen).toBe(true);
    expect(studioClipRepurposingBuildV1.economics.priceUsd).toBe(549);
    expect(studioClipRepurposingBuildV1.launchNowDependencies.length).toBeGreaterThan(0);
    expect(studioClipRepurposingBuildV1.doNotModifyCertifiedShortFormEditing).toBe(
      true,
    );

    expect(studioShortFormVideoEditingBuildV1.classification).toBe("SELL_NOW");
    expect(studioShortFormVideoEditingBuildV1.sku.priceCents).toBe(34900);
    expect(TENTH_SELL_NOW_SKU).toBe(SHORT_FORM_VIDEO_EDITING_SKU);
    expect(ELEVENTH_SELL_NOW_SKU).toBe(CLIP_REPURPOSING_SKU);
    expect(isInternalSellNowSku(CLIP_REPURPOSING_SKU)).toBe(true);
    expect(studioInternalSellNowRegisterV1.internalSellNowCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.originalNineUntouched).toBe(true);
    expect(studioInternalSellNowRegisterV1.tenthPublicMenuPublished).toBe(true);
    expect(studioInternalSellNowRegisterV1.eleventhPublicMenuPublished).toBe(true);
    expect(studioInternalSellNowRegisterV1.clipRepurposingPhase).toBe(
      "certified_sell_now_published",
    );
  });
});
