import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { buildServiceScopeSnapshot } from "@/lib/plan-pricing";
import {
  hasCampaignCreativeBrief,
  resolveCampaignCreativeBrief,
  resolveConceptGenerationStamp,
} from "@/lib/campaign-brief-source";
import {
  generateCampaignConceptsFromBrief,
  hasCampaignBrief,
  resolveCampaignConcepts,
} from "@/lib/campaign-concepts";
import { readCurrentCampaign, saveCurrentCampaign } from "@/lib/studio-board-campaign";
import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";

const BUSINESS_DELIM = "\n---\n";
const GREEN_PLAN_IDS = ["bf-001", "sm-001", "ma-001"] as const;

function buildApprovedPlan() {
  const lineItems = buildServiceScopeSnapshot(GREEN_PLAN_IDS);
  const oneTimeTotalCents = lineItems.reduce((sum, line) => sum + line.exactPriceCents, 0);
  return {
    selectedServiceIds: [...GREEN_PLAN_IDS],
    includedServiceIds: [...GREEN_PLAN_IDS],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents,
    monthlyTotalCents: 0,
    amountDueTodayCents: oneTimeTotalCents,
    lineItems,
    approvedAt: "2026-06-27T12:00:00.000Z",
  };
}

function discoveryFirstCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = "2026-06-28T10:00:00.000Z";
  return {
    campaignId: "brief-test",
    campaignName: "Tagia Bakery Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Building",
    estimatedCompletion: "Soon",
    packageId: "momentum",
    packageLabel: "Momentum Plan",
    discoveryAnswers: {
      "your-business": `Tagia Bakery${BUSINESS_DELIM}Fresh pastries daily`,
      "your-focus": "Promote an offer, event, or launch",
      "success-looks-like": "Grow local awareness",
    },
    discoverySubmittedAt: now,
    approvedStudioPlan: buildApprovedPlan(),
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: {
        ...EMPTY_PROJECT_DETAILS_FORM,
        workingOn: "Summer launch",
        mainOffer: "Seasonal pastries",
        conceptAudience: "Local families",
        callToAction: "Visit us",
        marketingPieces: "Flyer, social, email",
        primaryApproverName: "Tagia",
        primaryApproverEmail: "tagia@example.com",
      },
      files: [],
      submittedAt: now,
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("campaign-brief-source", () => {
  it("builds brief from project details with discovery fallback", () => {
    const campaign = discoveryFirstCampaign();
    const brief = resolveCampaignCreativeBrief(campaign);

    expect(brief).not.toBeNull();
    expect(brief!.projectName).toBe("Summer launch");
    expect(brief!.business).toBe("Seasonal pastries");
    expect(brief!.audience).toBe("Local families");
    expect(brief!.goals).toBe("Grow local awareness");
    expect(brief!.approvedServiceNames).toEqual([
      "Brand Identity Refresh",
      "Social Media Launch Set",
      "Promotion Pack",
    ]);
    expect(brief!.scopeDeliverables.length).toBeGreaterThan(0);
  });

  it("prefers project details over discovery for overlapping narrative", () => {
    const campaign = discoveryFirstCampaign({
      discoveryAnswers: {
        "your-focus": "Everyone online",
        "success-looks-like": "Reach everyone",
      },
      projectDetails: {
        form: {
          ...EMPTY_PROJECT_DETAILS_FORM,
          workingOn: "Holiday promo",
          mainOffer: "Gift boxes",
          conceptAudience: "Gift buyers",
          primaryApproverName: "Tagia",
          primaryApproverEmail: "tagia@example.com",
        },
        files: [],
        submittedAt: "2026-06-28T10:00:00.000Z",
      },
    });

    const brief = resolveCampaignCreativeBrief(campaign);
    expect(brief!.audience).toBe("Gift buyers");
    expect(brief!.projectName).toBe("Holiday promo");
  });

  it("uses project details submit stamp for concept regeneration", () => {
    const campaign = discoveryFirstCampaign();
    expect(resolveConceptGenerationStamp(campaign)).toBe("2026-06-28T10:00:00.000Z");
    expect(hasCampaignCreativeBrief(campaign)).toBe(true);
    expect(hasCampaignBrief(campaign)).toBe(true);
  });

  it("tolerates incomplete project details form without throwing", () => {
    const campaign = discoveryFirstCampaign({
      projectDetails: {
        form: {
          ...EMPTY_PROJECT_DETAILS_FORM,
          workingOn: "Partial project",
          primaryApproverName: "Tagia",
          primaryApproverEmail: "tagia@example.com",
        },
        files: [],
        submittedAt: "2026-06-28T10:00:00.000Z",
      },
    });
    delete (campaign.projectDetails!.form as Partial<typeof EMPTY_PROJECT_DETAILS_FORM>).mainOffer;

    expect(() => resolveCampaignCreativeBrief(campaign)).not.toThrow();
    const brief = resolveCampaignCreativeBrief(campaign);
    expect(brief).not.toBeNull();
    expect(brief!.projectName).toBe("Partial project");
    expect(brief!.business).toBe("Fresh pastries daily");
    expect(hasCampaignCreativeBrief(campaign)).toBe(true);
  });
});

describe("campaign-concepts", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: {
        store: {} as Record<string, string>,
        getItem(key: string) {
          return this.store[key] ?? null;
        },
        setItem(key: string, value: string) {
          this.store[key] = value;
        },
        removeItem(key: string) {
          delete this.store[key];
        },
      },
      dispatchEvent: vi.fn(),
    });
  });

  it("generates three concepts from discovery-first brief without visionData", () => {
    const campaign = discoveryFirstCampaign();
    const concepts = generateCampaignConceptsFromBrief(campaign);

    expect(concepts).toHaveLength(3);
    expect(concepts![0].summary).toContain("Summer launch");
    expect(concepts![1].hero.headline).toContain("SUMMER LAUNCH");
  });

  it("regenerates when concepts stamp does not match project details submit", () => {
    const campaign = discoveryFirstCampaign({
      concepts: [
        { id: "A", directionLabel: "A", tagline: "old", summary: "old", whyChosen: "old", hero: { headline: "old", subhead: "old", accent: "warm" }, social: { platform: "X", body: "old", cta: "old" }, email: { subject: "old", preheader: "old", body: "old" }, sms: { body: "old" } },
        { id: "B", directionLabel: "B", tagline: "old", summary: "old", whyChosen: "old", hero: { headline: "old", subhead: "old", accent: "bold" }, social: { platform: "X", body: "old", cta: "old" }, email: { subject: "old", preheader: "old", body: "old" }, sms: { body: "old" } },
        { id: "C", directionLabel: "C", tagline: "old", summary: "old", whyChosen: "old", hero: { headline: "old", subhead: "old", accent: "premium" }, social: { platform: "X", body: "old", cta: "old" }, email: { subject: "old", preheader: "old", body: "old" }, sms: { body: "old" } },
      ],
      conceptsGeneratedAt: "2026-01-01T00:00:00.000Z",
    });
    saveCurrentCampaign(campaign);

    const resolved = resolveCampaignConcepts(campaign);
    expect(resolved[0].summary).toContain("Summer launch");
    expect(resolved[0].summary).not.toBe("old");
    expect(readCurrentCampaign()?.conceptsGeneratedAt).toBe(campaign.projectDetailsSubmittedAt);
  });
});
