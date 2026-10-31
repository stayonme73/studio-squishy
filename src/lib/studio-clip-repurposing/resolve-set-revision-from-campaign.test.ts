import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";

import { resolveClipRepurposingSetRevisionFromCampaign } from "./resolve-set-revision-from-campaign";

function campaign(instruction: string): CampaignRecord {
  return {
    campaignId: "camp-test",
    campaignName: "Test",
    machineFlyerRevisionEmphasis: {
      packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
      instruction,
      emphasizeExistingCtaAsHeadline: false,
      sourceRevisionPackageId: "pkg:1",
      priorWorkVersionId: "clip-set-v1",
      recordedAt: new Date().toISOString(),
    },
  } as CampaignRecord;
}

describe("resolveClipRepurposingSetRevisionFromCampaign", () => {
  it("maps end-card hold language", () => {
    const rev = resolveClipRepurposingSetRevisionFromCampaign({
      campaign: campaign("Please tighten the end-card hold by one beat."),
    });
    expect(rev?.kind).toBe("end_card_hold");
    if (rev?.kind === "end_card_hold") expect(rev.holdSeconds).toBe(0.9);
  });

  it("returns null without instruction", () => {
    expect(
      resolveClipRepurposingSetRevisionFromCampaign({
        campaign: { campaignId: "x", campaignName: "x" } as CampaignRecord,
      }),
    ).toBeNull();
  });
});
