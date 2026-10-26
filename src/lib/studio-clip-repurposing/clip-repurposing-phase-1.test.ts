import { describe, expect, it } from "vitest";

import {
  CLIP_REPURPOSING_SKU,
  isClipRepurposingSku,
  studioClipRepurposingBuildV1,
} from "@/config/studio-clip-repurposing-build-v1";
import {
  SHORT_FORM_VIDEO_EDITING_SKU,
  studioShortFormVideoEditingBuildV1,
} from "@/config/studio-short-form-video-editing-build-v1";
import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";

describe("Clip Repurposing Phase 1 locks carried into Phase 2", () => {
  it("does not publish, wire Launch Now, or reopen the certified editing SKU", () => {
    expect(CLIP_REPURPOSING_SKU).toBe("v2-rtu-clip-repurposing");
    expect(isClipRepurposingSku(SHORT_FORM_VIDEO_EDITING_SKU)).toBe(false);
    expect(studioClipRepurposingBuildV1.phaseKind).toBe("set_level_factory_build");
    expect(studioClipRepurposingBuildV1.doNotImplementPhase2).toBe(false);
    expect(studioClipRepurposingBuildV1.doNotPublish).toBe(false);
    expect(studioClipRepurposingBuildV1.doNotWireLaunchNow).toBe(false);
    expect(studioClipRepurposingBuildV1.doNotRunPaidProduction).toBe(true);
    expect(studioClipRepurposingBuildV1.doNotPurchaseVendor).toBe(true);
    expect(studioClipRepurposingBuildV1.onLaunchMenu).toBe(true);
    expect(studioClipRepurposingBuildV1.hitchhikesSku).toBe(
      SHORT_FORM_VIDEO_EDITING_SKU,
    );
    expect(studioClipRepurposingBuildV1.verdict).toBe("SELL_NOW");
    expect(studioClipRepurposingBuildV1.sku.priceFrozen).toBe(true);
    expect(studioClipRepurposingBuildV1.sku.priceCents).toBe(54900);
    expect(studioShortFormVideoEditingBuildV1.classification).toBe("SELL_NOW");
    expect(studioShortFormVideoEditingBuildV1.onLaunchMenu).toBe(true);
    expect(studioInternalSellNowRegisterV1.internalSellNowCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
  });

  it("keeps native vertical mandatory and refuses a filler third clip", () => {
    expect(studioClipRepurposingBuildV1.proposedOffer.nativeVerticalMandatory).toBe(
      true,
    );
    expect(
      studioClipRepurposingBuildV1.proposedOffer.landscapeBelongsOutsideFirstLane,
    ).toBe(true);
    expect(
      studioClipRepurposingBuildV1.failClose.fewerThanThreeDistinctSellableClips,
    ).toBe("do_not_manufacture_filler");
    expect(studioClipRepurposingBuildV1.revision.model).toBe("one_set_revision");
    expect(studioClipRepurposingBuildV1.revision.notPerClipRedesignDesk).toBe(true);
  });
});
