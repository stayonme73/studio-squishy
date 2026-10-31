import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";

import { resolveVideoSkuForSourceAudioPreflight } from "./resolve-video-sku";

function minimalRecord(
  partial: Pick<CampaignRecord, "approvedStudioPlan" | "paymentTruth">,
): CampaignRecord {
  return {
    campaignId: "test-campaign",
    ...partial,
  } as CampaignRecord;
}

describe("resolveVideoSkuForSourceAudioPreflight", () => {
  it("reads factory SKU from approved studio plan", () => {
    expect(
      resolveVideoSkuForSourceAudioPreflight(
        minimalRecord({
          approvedStudioPlan: { selectedServiceIds: [SHORT_FORM_VIDEO_EDITING_SKU] },
        }),
      ),
    ).toBe(SHORT_FORM_VIDEO_EDITING_SKU);
  });

  it("maps condensed short-form offer id from payment truth", () => {
    expect(
      resolveVideoSkuForSourceAudioPreflight(
        minimalRecord({
          approvedStudioPlan: { selectedServiceIds: [] },
          paymentTruth: {
            status: "confirmed",
            selectedServiceIds: ["short_form_video_editing"],
          },
        }),
      ),
    ).toBe(SHORT_FORM_VIDEO_EDITING_SKU);
  });

  it("maps condensed clip offer id from payment truth", () => {
    expect(
      resolveVideoSkuForSourceAudioPreflight(
        minimalRecord({
          paymentTruth: {
            status: "confirmed",
            selectedServiceIds: ["clip_repurposing"],
          },
        }),
      ),
    ).toBe(CLIP_REPURPOSING_SKU);
  });
});
