import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";

import {
  mapSocialPromoOfferLedPromoTruth,
  mapSocialPromoOfferLedSocialTruth,
  offerLedHeadlineFromIntake,
} from "./map-social-promo-offer-led-truth";
import { mapSocialPromoThemeLedSocialTruth } from "./map-social-promo-theme-led-truth";
import type { JobDispatchRecord } from "./types";

const LOGO =
  "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/materials/harbor-oak-anchor-oak-oval-v1.svg";

function campaign(answers: Record<string, string>): CampaignRecord {
  return {
    campaignId: "harbor-oak-offer-map",
    campaignName: harborOakIdentityLock.businessName,
    routeMapIntake: { submittedAt: "2026-10-17T22:00:00.000Z", answers },
  } as unknown as CampaignRecord;
}

function dispatch(branch: "social_posts" | "campaign_graphics"): JobDispatchRecord {
  const sku = branch === "social_posts" ? "v2-rtu-social-posts" : "v2-rtu-promotion-graphics";
  return {
    dispatchId: `dd:harbor-oak-offer-map:social_and_promo_graphics:branch:${branch}`,
    jobId: `harbor-oak-offer-map:social_and_promo_graphics:branch:${branch}`,
    skuId: sku,
    executionIdentityReady: true,
    status: "EXECUTION_IDENTITY_READY",
  } as unknown as JobDispatchRecord;
}

const HARBOR = {
  "shared:businessName": harborOakIdentityLock.businessName,
  "social_and_promo_graphics:purpose": harborOakIdentityLock.campaign.offerName,
  "social_and_promo_graphics:facts":
    "HVAC tune-up and drain clear for homeowners who want plain, steady service.",
  "social_and_promo_graphics:prices": "$189 (was $249)",
  "social_and_promo_graphics:dates": "March 10 – April 15, 2026",
  "social_and_promo_graphics:cta": "Book online or call",
  "social_and_promo_graphics:phone": harborOakIdentityLock.campaign.phone,
  "social_and_promo_graphics:website": "harborandoak.example/book-tuneup",
  "social_and_promo_graphics:mustKeep": "Spring service you can trust",
  "social_and_promo_graphics:rights": "I have permission to use the materials I am supplying.",
};

describe("Social & Promo offer-led parent intake", () => {
  it("maps distinct mustKeep to headline without duplicating purpose", () => {
    expect(
      offerLedHeadlineFromIntake("Spring open-house weekend", "Warm, welcoming tone"),
    ).toBe("Warm, welcoming tone");
    expect(
      offerLedHeadlineFromIntake("Spring open-house weekend", "Spring open-house weekend"),
    ).toBe("");
    expect(offerLedHeadlineFromIntake("Spring open-house weekend", undefined)).toBe("");
  });

  it("keeps Harbor & Oak prices, dates, and logo, and leaves certification labels off", () => {
    const materials = [
      {
        id: "logo-harbor",
        category: "logo-brand",
        reviewStatus: "approved_for_use",
        relatedServiceIds: ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"],
        url: LOGO,
      },
    ] as never;
    const social = mapSocialPromoOfferLedSocialTruth({
      repoRoot: process.cwd(),
      campaign: campaign(HARBOR),
      dispatchRecord: dispatch("social_posts"),
      materials,
    });
    if (!social.ok) throw new Error(social.message);
    expect(social.truth.outputMode).toBe("customer");
    expect(social.truth.priceDisplay).toBe("$189");
    expect(social.truth.wasPriceDisplay).toBe("was $249");
    expect(social.truth.dateWindow).toBe("March 10 – April 15, 2026");
    expect(social.truth.disclaimer).toBe("");
    expect(social.truth.platformLabel).not.toMatch(/CERT/);
    expect(social.truth.wordmark).toBe("Harbor & Oak");
    expect(social.truth.materials[0]?.relativePath).toBe(LOGO);
    expect(social.truth.label).not.toMatch(/CERT/);

    const promo = mapSocialPromoOfferLedPromoTruth({
      repoRoot: process.cwd(),
      campaign: campaign(HARBOR),
      dispatchRecord: dispatch("campaign_graphics"),
      materials,
    });
    if (!promo.ok) throw new Error(promo.message);
    expect(promo.truth.assets.map((asset) => [asset.canvas.widthPx, asset.canvas.heightPx])).toEqual([
      [1024, 1024],
      [1024, 1536],
    ]);
    expect(promo.truth.disclaimer).toBe("");
  });

  it("maps live Social intake (facts + shared contact) without kit-only fields", () => {
    const live = campaign({
      "shared:businessName": "Spruce Line Studio",
      "shared:phone": "(555) 010-8820",
      "shared:webOrSocial": "spruceline.example/open-house",
      "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
      "social_and_promo_graphics:facts":
        "Free mini-consultations Saturday 10–4. One complimentary beverage per guest. No purchase required for consultation.",
      "social_and_promo_graphics:cta": "Reserve your spot",
      "social_and_promo_graphics:mustKeep": "Warm, welcoming, not loud or salesy",
      "social_and_promo_graphics:rights": "I have permission to use the materials I am supplying.",
    });
    const offer = mapSocialPromoOfferLedSocialTruth({
      repoRoot: process.cwd(),
      campaign: live,
      dispatchRecord: dispatch("social_posts"),
      materials: [],
    });
    expect(offer.ok).toBe(false);
    if (!offer.ok) expect(offer.code).toBe("THEME_LED_PATH");
  });

  it("allows offer-led graphics with logo and no dollar price", () => {
    const LOGO =
      "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/materials/harbor-oak-anchor-oak-oval-v1.svg";
    const live = campaign({
      "shared:businessName": "Spruce Line Studio",
      "social_and_promo_graphics:purpose": "Spring open-house weekend",
      "social_and_promo_graphics:facts": "Free mini-consultations Saturday 10–4.",
      "social_and_promo_graphics:cta": "Reserve your spot",
      "social_and_promo_graphics:rights": "I have permission to use the materials I am supplying.",
    });
    const materials = [
      {
        id: "logo-spruce",
        category: "logo-brand",
        reviewStatus: "approved_for_use",
        relatedServiceIds: ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"],
        url: LOGO,
      },
    ] as never;
    const mapped = mapSocialPromoOfferLedSocialTruth({
      repoRoot: process.cwd(),
      campaign: live,
      dispatchRecord: dispatch("social_posts"),
      materials,
    });
    if (!mapped.ok) throw new Error(mapped.message);
    expect(mapped.truth.priceDisplay).toBe("");
    expect(mapped.truth.materials).toHaveLength(1);
  });

  it("leaves a theme with no price on the theme-led path", () => {
    const theme = campaign({
      "shared:businessName": "The Studio",
      "social_and_promo_graphics:purpose": "Promote The Studio as an easy creative-production partner.",
      "social_and_promo_graphics:mustKeep":
        "Choose what you need, provide the information, and let The Studio handle the production.",
      "social_and_promo_graphics:rights": "I have permission to use the materials I am supplying.",
    });
    const offer = mapSocialPromoOfferLedSocialTruth({
      repoRoot: process.cwd(),
      campaign: theme,
      dispatchRecord: dispatch("social_posts"),
      materials: [],
    });
    expect(offer.ok).toBe(false);
    if (!offer.ok) expect(offer.code).toBe("THEME_LED_PATH");
    const mapped = mapSocialPromoThemeLedSocialTruth({
      repoRoot: process.cwd(),
      campaign: theme,
      dispatchRecord: dispatch("social_posts"),
      materials: [],
    });
    expect(mapped.ok).toBe(true);
  });
});
