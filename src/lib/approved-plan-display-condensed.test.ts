import { describe, expect, it } from "vitest";

import type { ApprovedStudioPlan, CampaignRecord } from "@/config/studio-board";
import {
  resolveCampaignPlanIncludes,
  resolveCampaignPlanLabel,
} from "@/lib/approved-plan-display";

function condensedCampaign(
  packageId: CampaignRecord["condensedOffer"] extends infer T
    ? T extends { packageId: infer Id }
      ? Id
      : never
    : never,
  name: string,
  priceCents: number,
): CampaignRecord {
  const plan: ApprovedStudioPlan = {
    selectedServiceIds: [],
    includedServiceIds: [],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: priceCents,
    monthlyTotalCents: 0,
    amountDueTodayCents: priceCents,
    lineItems: [
      {
        skuId: packageId as ApprovedStudioPlan["lineItems"][number]["skuId"],
        serviceName: name,
        name,
        revisionRule: `${name} includes three revision rounds.`,
      } as ApprovedStudioPlan["lineItems"][number],
    ],
    approvedAt: "2026-10-05T00:00:00.000Z",
  };
  return {
    campaignId: `plan-line-${packageId}`,
    campaignName: name,
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Payment confirmed.",
    estimatedCompletion: "After payment",
    packageId: "custom-studio-plan",
    packageLabel: name,
    paymentReceivedAt: "2026-10-05T00:00:00.000Z",
    revisionRoundsIncluded: 3,
    createdAt: "2026-10-05T00:00:00.000Z",
    updatedAt: "2026-10-05T00:00:00.000Z",
    deliverablesDelivered: {},
    approvedStudioPlan: plan,
    condensedOffer: {
      packageId,
      name,
      priceCents,
      revisionRounds: 3,
      customerName: "Ada Stone",
      customerEmail: "ada@example.com",
      company: "Cedar Lane",
      projectNeed: "Open house",
      materialsNote: "",
      support: {},
    },
  } as CampaignRecord;
}

describe("condensed My Studio plan line", () => {
  it.each([
    ["clip_repurposing", "Clip Repurposing", 37375],
    ["short_form_video_editing", "Short-Form Video Editing", 18625],
    ["social_and_promo_graphics", "Social & Promo Graphics", 19900],
  ] as const)("uses %s instead of a catalog social-posts fallback", (packageId, name) => {
    const campaign = condensedCampaign(packageId, name, 0);
    expect(resolveCampaignPlanLabel(campaign)).toBe(name);
    expect(resolveCampaignPlanIncludes(campaign)).toEqual([name]);
    expect(resolveCampaignPlanIncludes(campaign).join(" ")).not.toMatch(
      /Make My Social Media Posts/,
    );
  });

  it("keeps a catalog custom plan on its selected service names", () => {
    const campaign = {
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      approvedStudioPlan: {
        selectedServiceIds: ["v2-rtu-flyer"],
        includedServiceIds: [],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 100,
        monthlyTotalCents: 0,
        amountDueTodayCents: 100,
        lineItems: [],
        approvedAt: "2026-10-05T00:00:00.000Z",
      },
    } as unknown as CampaignRecord;
    expect(resolveCampaignPlanLabel(campaign)).toBe("Custom Studio Plan");
    expect(resolveCampaignPlanIncludes(campaign).join(" ")).not.toMatch(
      /Make My Social Media Posts/,
    );
  });
});
