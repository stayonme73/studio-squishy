/**
 * Room 4B — Nia paid campaign fixture tests.
 */

import { describe, expect, it } from "vitest";

import { studioRoom4bLaunchToolboxCertificationV1 as cfg } from "@/config/studio-room-4b-launch-toolbox-certification-v1";

import {
  NIA_BUSINESS_NAME,
  NIA_CAMPAIGN_NAME,
  NIA_CUSTOMER_NAME,
  NIA_HONEST_SELLABLE_SKUS,
  NIA_VOICE_BRIEF_EXACT,
  buildNiaPaidCampaign,
} from "./nia-fixture";

describe("Room 4B Nia fixture", () => {
  it("builds a paid multi-SKU campaign without inventing a carousel SKU", () => {
    const campaign = buildNiaPaidCampaign("nia-r4b-test-1", {
      withIntake: true,
      includeCarouselAsk: true,
      bookingMethodFilled: true,
    });

    expect(campaign.campaignId).toBe("nia-r4b-test-1");
    expect(campaign.campaignName).toContain(NIA_BUSINESS_NAME);
    expect(campaign.campaignName).toContain(NIA_CAMPAIGN_NAME);
    expect(campaign.paymentTruth?.status).toBe("confirmed");
    expect(campaign.approvedStudioPlan?.selectedServiceIds).toEqual(
      NIA_HONEST_SELLABLE_SKUS,
    );
    expect(campaign.paymentTruth?.selectedServiceIds).toEqual(
      NIA_HONEST_SELLABLE_SKUS,
    );
    expect(
      (campaign.approvedStudioPlan?.selectedServiceIds ?? []).some((id) =>
        /carousel/i.test(id),
      ),
    ).toBe(false);
    expect(campaign.campaignDescription).toMatch(/carousel/i);
    expect(NIA_CUSTOMER_NAME).toBe(cfg.customer.customerName);
  });

  it("keeps the exact Voice brief and omits booking CTA when fact is missing", () => {
    const missing = buildNiaPaidCampaign("nia-r4b-test-missing", {
      withIntake: true,
      includeCarouselAsk: false,
      bookingMethodFilled: false,
    });
    const answers = missing.routeMapIntake?.answers ?? {};
    expect(answers.voiceBriefExact).toBe(NIA_VOICE_BRIEF_EXACT);
    expect(answers.studioVoiceBrief).toBe(NIA_VOICE_BRIEF_EXACT);
    // Dual-channel: brief stays on dedicated keys — never dumped into mustInclude body.
    expect(answers.mustInclude).not.toContain(NIA_VOICE_BRIEF_EXACT);
    expect(answers.mustInclude).toMatch(/MISSING FACT/i);
    expect(answers.mustInclude).toMatch(/^Style:/m);
    expect(answers.mustInclude).not.toMatch(/rootedandready\.example\/fall-reset/i);
    expect(answers.callToAction).not.toMatch(/Destination:/i);

    const filled = buildNiaPaidCampaign("nia-r4b-test-filled", {
      withIntake: true,
      includeCarouselAsk: false,
      bookingMethodFilled: true,
    });
    const filledAnswers = filled.routeMapIntake?.answers ?? {};
    expect(filledAnswers.mustInclude).toMatch(/rootedandready\.example\/fall-reset/i);
    expect(filledAnswers.mustInclude).not.toMatch(/MISSING FACT/i);
    expect(filledAnswers.mustInclude).not.toContain(NIA_VOICE_BRIEF_EXACT);
    expect(filledAnswers.callToAction).toMatch(/Enroll in Fall Reset/i);
    expect(filledAnswers.callToAction).not.toMatch(/Destination:/i);
  });

  it("uses only the honest sellable SKUs from Room 4B config", () => {
    expect(NIA_HONEST_SELLABLE_SKUS).toEqual([
      ...cfg.honestSellableSkusTowardCampaign,
    ]);
    expect(NIA_VOICE_BRIEF_EXACT).toBe(cfg.voiceBriefExact);
  });
});
