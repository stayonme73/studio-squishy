import { describe, expect, it } from "vitest";
import { studioCampaignLaunchKitCurrentDoorContractV1 } from "@/config/studio-campaign-launch-kit-current-door-contract-v1";
import {
  campaignLaunchKitPackageDetail,
  CONDENSED_PACKAGE_IDS,
  CONDENSED_SUPPORT_OPTIONS,
  supportOptionsForPackage,
} from "@/config/studio-customer-journey-condense-v1";
import {
  STUDIO_EXTRA_IDS,
  studioExtraDefinitions,
  studioExtraEligibilitySentence,
  studioExtrasCourtesyAdjustmentCents,
  studioExtrasEligibilityByPackage,
  studioExtrasExplainer,
  studioExtrasPackageIncludedLine,
  studioExtrasV1,
} from "@/config/studio-extras-v1";
import {
  chooseStudioExtra,
  emptyCondensedJourneyDraft,
  selectedStudioExtras,
} from "@/lib/studio-customer-journey-condense/draft";
import { initialStudioExtrasTruth } from "@/lib/studio-extras/machine";
import { validateStudioExtrasSelection } from "@/lib/studio-extras/selection";

describe("Studio Extras V1 canonical truth", () => {
  it("offers up to 2 package-appropriate Extras, with Campaign Launch Kit limited to the two that are not already in the package", () => {
    expect(studioExtrasV1.maxSelectionsPerOrder).toBe(2);
    expect(studioExtrasEligibilityByPackage.clip_repurposing).toEqual([
      "review_request_kit",
      "email_and_text",
      "ad_creative",
      "flyer",
    ]);
    expect(studioExtrasEligibilityByPackage.short_form_video_editing).toEqual([
      "review_request_kit",
      "email_and_text",
      "ad_creative",
      "flyer",
    ]);
    expect(studioExtrasEligibilityByPackage.social_and_promo_graphics).toEqual([
      "review_request_kit",
      "email_and_text",
      "flyer",
      "menu_price_list",
    ]);
    expect(studioExtrasEligibilityByPackage.creative_qa_finish).toEqual([
      "review_request_kit",
      "email_and_text",
      "flyer",
      "menu_price_list",
    ]);
    expect(studioExtrasEligibilityByPackage.campaign_launch_kit).toEqual([
      "review_request_kit",
      "menu_price_list",
    ]);
  });

  it("keeps Ad Creative off Social and Menu / Price List off the video packages", () => {
    expect(studioExtrasEligibilityByPackage.social_and_promo_graphics).not.toContain("ad_creative");
    expect(studioExtrasEligibilityByPackage.clip_repurposing).not.toContain("menu_price_list");
    expect(studioExtrasEligibilityByPackage.short_form_video_editing).not.toContain("menu_price_list");
  });

  it("removes Local AI Visibility and replaces it with Flyer", () => {
    expect(STUDIO_EXTRA_IDS).not.toContain("ai_local_visibility" as never);
    expect(STUDIO_EXTRA_IDS).toContain("flyer");
    expect(studioExtraDefinitions.review_request_kit.name).toBe("Review Request Kit");
  });

  it("computes the Courtesy Adjustment from the amount actually paid", () => {
    expect(studioExtrasCourtesyAdjustmentCents(29900, 1)).toBe(1495);
    expect(studioExtrasCourtesyAdjustmentCents(29900, 2)).toBe(2990);
    expect(studioExtrasCourtesyAdjustmentCents(19920, 1)).toBe(996);
    expect(studioExtrasCourtesyAdjustmentCents(19920, 2)).toBe(1992);
    expect(studioExtrasCourtesyAdjustmentCents(15920, 1)).toBe(796);
    expect(studioExtrasCourtesyAdjustmentCents(15920, 2)).toBe(1592);
    expect(studioExtrasCourtesyAdjustmentCents(15920, 0)).toBe(0);
    expect(studioExtrasCourtesyAdjustmentCents(15920, 5)).toBe(1592);
  });

  it("serves the live customer promise from canonical Extras only", () => {
    expect(studioExtrasV1.liveCustomerPromiseSwitched).toBe(true);
    expect(CONDENSED_SUPPORT_OPTIONS.map((option) => option.id)).toEqual([...STUDIO_EXTRA_IDS]);
    for (const pkg of CONDENSED_PACKAGE_IDS) {
      expect(supportOptionsForPackage(pkg).map((option) => option.id)).toEqual([
        ...studioExtrasEligibilityByPackage[pkg],
      ]);
    }
  });

  it("states scope in complete sentences on every customer surface source", () => {
    for (const id of STUDIO_EXTRA_IDS) {
      expect(studioExtraDefinitions[id].customerSummary).toMatch(/\.$/);
      expect(studioExtraDefinitions[id].customerNotIncluded).toMatch(/\.$/);
      expect(studioExtraDefinitions[id].customerSummary).not.toMatch(/\.\.\./);
    }
    expect(studioExtrasPackageIncludedLine("social_and_promo_graphics")).toContain("Menu / Price List");
    expect(studioExtrasPackageIncludedLine("social_and_promo_graphics")).not.toContain("Ad Creative");
    expect(studioExtrasPackageIncludedLine("clip_repurposing")).toContain("Ad Creative");
    const campaignLine = studioExtrasPackageIncludedLine("campaign_launch_kit");
    expect(campaignLine).toContain("Review Request Kit");
    expect(campaignLine).toContain("Menu / Price List");
    expect(campaignLine).not.toContain("Flyer");
    expect(campaignLine).not.toContain("Email");
    const explainer = studioExtrasExplainer();
    expect(explainer.whatYouCanAdd).toContain("Campaign Launch Kit can add Review Request Kit, or Menu / Price List");
    expect(explainer.whatYouCanAdd).not.toContain("Creative QA");
    expect(explainer.whatYouCanAdd).toContain("already included in Campaign Launch Kit");
    expect(explainer.whatYouCanAdd).toContain("no additional charge");
    expect(explainer.promise).toContain("5% of what you paid");
    expect(explainer.promise).toContain("separate from the Studio Thank-You");
    expect(explainer.revisions).toContain("There is no separate count for Extras.");
  });

  it("keeps Campaign Launch Kit from offering Flyer or Email + Text as Extras", () => {
    expect(supportOptionsForPackage("campaign_launch_kit").map((option) => option.id)).toEqual([
      "review_request_kit",
      "menu_price_list",
    ]);
    const included = campaignLaunchKitPackageDetail.sections.find((section) => section.id === "includes");
    const items = included?.items ?? [];
    const extrasLine = items.find((item) => item.startsWith("Up to two Studio Extras"));
    expect(extrasLine).toContain("Review Request Kit");
    expect(extrasLine).toContain("Menu / Price List");
    expect(extrasLine).not.toContain("Flyer");
    expect(extrasLine).not.toContain("Email");
    expect(items.join(" ")).toContain("digital promotional flyer");
    expect(items.join(" ")).toContain("paste-ready promotional email");
    expect(items.join(" ")).toContain("text messages");
    expect(campaignLaunchKitPackageDetail.priceDisplay).toBe("$349");
    expect(campaignLaunchKitPackageDetail.priceCents).toBe(34900);
    expect(studioCampaignLaunchKitCurrentDoorContractV1.listPriceCents).toBe(34900);
    expect(studioCampaignLaunchKitCurrentDoorContractV1.amountDueCents).toBe(27920);
    expect(studioCampaignLaunchKitCurrentDoorContractV1.amountDueDisplay).toBe("$279.20");
    expect(studioCampaignLaunchKitCurrentDoorContractV1.revisionRounds).toBe(3);

    const draft = emptyCondensedJourneyDraft("campaign_launch_kit");
    expect(chooseStudioExtra(draft, "flyer", "SELECT")).toEqual(draft);
    expect(chooseStudioExtra(draft, "email_and_text", "SELECT")).toEqual(draft);
    const chosen = chooseStudioExtra(
      chooseStudioExtra(draft, "review_request_kit", "SELECT"),
      "menu_price_list",
      "SELECT",
    );
    expect(selectedStudioExtras(chosen)).toEqual(["review_request_kit", "menu_price_list"]);

    expect(validateStudioExtrasSelection("campaign_launch_kit", ["flyer"])).toMatchObject({
      ok: false,
      code: "EXTRA_NOT_ELIGIBLE_FOR_PACKAGE",
    });
    expect(validateStudioExtrasSelection("campaign_launch_kit", ["email_and_text"])).toMatchObject({
      ok: false,
      code: "EXTRA_NOT_ELIGIBLE_FOR_PACKAGE",
    });
    expect(validateStudioExtrasSelection("campaign_launch_kit", ["review_request_kit", "menu_price_list"]).ok).toBe(
      true,
    );
    expect(
      validateStudioExtrasSelection("campaign_launch_kit", ["review_request_kit", "menu_price_list", "flyer"]).ok,
    ).toBe(false);
    expect(validateStudioExtrasSelection("clip_repurposing", ["flyer", "email_and_text"]).ok).toBe(true);
    expect(validateStudioExtrasSelection("social_and_promo_graphics", ["email_and_text", "flyer"]).ok).toBe(true);
    expect(validateStudioExtrasSelection("creative_qa_finish", ["flyer"]).ok).toBe(true);

    const truth = initialStudioExtrasTruth(
      "campaign_launch_kit",
      ["review_request_kit", "menu_price_list"],
      "2026-10-18T00:00:00.000Z",
    );
    expect(truth.eligibleAtSelection).toEqual(["review_request_kit", "menu_price_list"]);
    expect(studioExtraEligibilitySentence("review_request_kit")).toBe("It is a Studio Extra on every package.");
    expect(studioExtraEligibilitySentence("flyer")).toContain("not a separate Extra on that package");
    expect(studioExtraEligibilitySentence("email_and_text")).toContain("not a separate Extra on that package");
    expect(studioExtraEligibilitySentence("menu_price_list")).toContain("Campaign Launch Kit");
    expect(studioExtraEligibilitySentence("flyer")).not.toContain("every package");
  });
});