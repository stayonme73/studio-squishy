import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import {
  socialPromoCurrentDoorCustomerFacingText,
  socialPromoCustomerDeliverableLabels,
  studioSocialPromoCurrentDoorContractV1,
  studioSocialPromoObsoleteFactoriesIsolatedV1,
} from "@/config/studio-social-promo-current-door-contract-v1";
import { studioCampaignGraphicsLightHardenV1 } from "@/config/studio-campaign-graphics-light-harden-v1";
import { studioSocialPostsStandardHardenV1 } from "@/config/studio-social-posts-standard-harden-v1";
import { buildCondensedCheckoutCampaign } from "@/lib/studio-payment/condensed-offer";
import { resolveCondensedCheckoutOffer } from "@/lib/studio-payment/condensed-offer";
import type { CheckoutSessionCreateRequest } from "@/lib/studio-payment/types";

import {
  buildSocialPromoCurrentDoorJob,
  evaluateSocialPromoRevision,
  emptySocialPromoRevisionLedger,
} from "./social-promo-current-door-job";
import { planSocialPromoCurrentDoorExecution } from "./social-promo-current-door-route";

const THEME = "Spring open house for Cedar Lane.";
const RIGHTS = "I have permission to use the materials I am supplying.";
const CTA = "Visit cedarlane.example — bring this note.";

function built(ctaText = "") {
  return buildSocialPromoCurrentDoorJob({
    campaignId: "social-promo-contract-proof",
    purpose: THEME,
    rights: RIGHTS,
    ctaText,
  });
}

describe("current-door Social & Promo Graphics contract", () => {
  it("keeps the sold package off the obsolete $99 and $79 shelves", () => {
    const facing = socialPromoCurrentDoorCustomerFacingText();
    expect(facing).toContain("Social & Promo Graphics");
    expect(facing).toContain("$199");
    expect(facing).toContain("$39.80");
    expect(facing).toContain("$159.20");
    expect(facing).toContain("Three revision rounds");
    expect(facing).not.toMatch(/\$99|\$79|one revision|Make My Social Media Posts|Make My Campaign Graphics/i);
    expect(studioSocialPromoCurrentDoorContractV1.listPriceCents).toBe(19900);
    expect(studioSocialPromoCurrentDoorContractV1.thankYouDiscountCents).toBe(3980);
    expect(studioSocialPromoCurrentDoorContractV1.amountDueCents).toBe(15920);
    expect(studioSocialPromoCurrentDoorContractV1.revisionRounds).toBe(3);
    expect(studioSocialPromoObsoleteFactoriesIsolatedV1.socialPosts.priceCents).toBe(9900);
    expect(studioSocialPromoObsoleteFactoriesIsolatedV1.socialPosts.includedRevisions).toBe(1);
    expect(studioSocialPromoObsoleteFactoriesIsolatedV1.promotionGraphics.priceCents).toBe(7900);
    expect(studioSocialPromoObsoleteFactoriesIsolatedV1.promotionGraphics.includedRevisions).toBe(1);
    expect(studioSocialPostsStandardHardenV1.offer.priceCents).toBe(9900);
    expect(studioSocialPostsStandardHardenV1.offer.includedRevisions).toBe(1);
    expect(studioCampaignGraphicsLightHardenV1.offer.priceCents).toBe(7900);
    expect(studioCampaignGraphicsLightHardenV1.offer.includedRevisions).toBe(1);
    expect(getServiceById("v2-rtu-social-posts")?.priceCents).toBe(9900);
    expect(getServiceById("v2-rtu-promotion-graphics")?.priceCents).toBe(7900);
  });

  it("represents the full purchased set under one job when the call to action is blank", () => {
    const result = built();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.jobId).toBe("social-promo-contract-proof:social_and_promo_graphics");
    expect(result.job.packageId).toBe("social_and_promo_graphics");
    expect(result.job.cta).toEqual({ supplied: false, text: null, treatment: "none" });
    expect(result.job.outputs.posts).toHaveLength(4);
    expect(result.job.outputs.captions).toHaveLength(4);
    expect(result.job.outputs.postingOrder.count).toBe(1);
    expect(result.job.outputs.campaignGraphics).toEqual([
      {
        id: "square",
        file: "png",
        width: 1024,
        height: 1024,
        branchId: "campaign_graphics",
      },
      {
        id: "portrait",
        file: "png",
        width: 1024,
        height: 1536,
        branchId: "campaign_graphics",
      },
    ]);
    expect(result.job.revisionLedger).toEqual(emptySocialPromoRevisionLedger());
    expect(result.job.branches.map((branch) => branch.customerOrder)).toEqual([false, false]);
    expect(result.job.productionStarted).toBe(false);
    expect(result.job.paymentStarted).toBe(false);
    expect(
      `${result.job.customerFacingName} ${result.job.completionLanguage} ${result.job.listPriceCents} ${result.job.amountDueCents}`,
    ).not.toMatch(/\$99|\$79|one revision|Make My Social Media Posts|Make My Campaign Graphics/);
    expect(result.job.listPriceCents).not.toBe(9900);
    expect(result.job.amountDueCents).not.toBe(7900);
  });

  it("preserves supplied call-to-action wording and still does not charge the old shelves", () => {
    const result = built(CTA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.cta).toEqual({
      supplied: true,
      text: CTA,
      treatment: "customer_words",
    });
    expect(result.job.listPriceCents).toBe(19900);
    expect(result.job.amountDueCents).toBe(15920);
  });

  it("refuses a job that is missing the theme or permission", () => {
    expect(
      buildSocialPromoCurrentDoorJob({
        campaignId: "social-promo-missing",
        purpose: "",
        rights: RIGHTS,
      }).ok,
    ).toBe(false);
    expect(
      buildSocialPromoCurrentDoorJob({
        campaignId: "social-promo-missing",
        purpose: THEME,
        rights: "   ",
      }).ok,
    ).toBe(false);
  });

  it("uses one package revision ledger for the whole set", () => {
    let ledger = emptySocialPromoRevisionLedger();
    for (const note of ["Soften the headline.", "Use the supplied date.", "Drop the extra line."]) {
      const next = evaluateSocialPromoRevision(ledger, { note });
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      ledger = next.nextLedger;
    }
    expect(ledger).toEqual({
      included: 3,
      used: 3,
      remaining: 0,
      exhausted: true,
      scope: "purchased_package",
    });
    const blocked = evaluateSocialPromoRevision(ledger, { note: "Another pass." });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.code).toBe("REVISION_EXHAUSTED");
  });

  it("routes both capabilities under the parent job and does not start production", () => {
    const result = built();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const planned = planSocialPromoCurrentDoorExecution(result.job);
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.plan.state).toBe("CONTRACT_READY_NOT_STARTED");
    expect(planned.plan.packageJobId).toBe(result.job.jobId);
    expect(planned.plan.customerOrderCount).toBe(1);
    expect(planned.plan.revisionLedgerCount).toBe(1);
    expect(planned.plan.lane).toBe("standard");
    expect(planned.plan.paymentStarted).toBe(false);
    expect(planned.plan.productionStarted).toBe(false);
    expect(planned.plan.branches).toEqual([
      {
        branchId: "social_posts",
        capabilitySku: "v2-rtu-social-posts",
        role: "production_capability",
        family: "social",
        catalogFamilyId: "social_media",
        lane: "standard",
        toolId: "studio_design_renderer",
        readiness: "contract_ready",
        customerOrder: false,
      },
      {
        branchId: "campaign_graphics",
        capabilitySku: "v2-rtu-promotion-graphics",
        role: "production_capability",
        family: "marketing_assets",
        catalogFamilyId: "marketing_assets",
        lane: "standard",
        toolId: "studio_design_renderer",
        readiness: "contract_ready",
        customerOrder: false,
      },
    ]);
    expect(planned.plan.packageJobId.endsWith(":v2-rtu-social-posts")).toBe(false);
    expect(planned.plan.packageJobId.endsWith(":v2-rtu-promotion-graphics")).toBe(false);
  });

  it("stamps the checkout line as the combined package, not the $99 social-posts sku", () => {
    const offer = resolveCondensedCheckoutOffer("social_and_promo_graphics");
    expect(offer).not.toBeNull();
    if (!offer) return;
    const request: CheckoutSessionCreateRequest = {
      campaignId: "social-promo-line-proof",
      returnOrigin: "http://localhost:3000",
      customerEmail: "ada@example.com",
      purchaseKind: "condensed_offer",
      facts: {
        draftRevision: 1,
        routeId: null,
        selectedServiceIds: ["social_and_promo_graphics"],
        projectNeed: THEME,
        businessName: "Cedar Lane",
        requestedDeadline: "",
        deadlineStatus: "not_requested",
        existingMaterialsNote: "",
      },
      condensedOffer: {
        packageId: "social_and_promo_graphics",
        customerName: "Ada Stone",
        company: "Cedar Lane",
        projectNeed: THEME,
        materialsNote: "",
      },
    };
    const campaign = buildCondensedCheckoutCampaign({
      campaignId: request.campaignId,
      existing: null,
      offer,
      facts: request.facts,
      request,
    });
    const line = campaign.approvedStudioPlan?.lineItems[0];
    expect(campaign.approvedStudioPlan?.lineItems).toHaveLength(1);
    expect(line?.skuId).toBe("social_and_promo_graphics");
    expect(line?.serviceName).toBe("Social & Promo Graphics");
    expect(line?.exactPriceCents).toBe(19900);
    expect(line?.deliverables).toEqual([...socialPromoCustomerDeliverableLabels()]);
    expect(campaign.approvedStudioPlan?.amountDueTodayCents).toBe(15920);
    expect(campaign.revisionRoundsIncluded).toBe(3);
    expect(campaign.paymentReceivedAt).toBeNull();
  });
});
