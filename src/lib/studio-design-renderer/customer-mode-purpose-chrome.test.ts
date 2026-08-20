/**
 * Customer-mode purpose chrome + collision gates (no Playwright).
 */

import { describe, expect, it } from "vitest";

import { reasonPromoCampaignSetDeterministic } from "./promo-reason";
import { evaluatePromoSetConsistency } from "./promo-set-qa";
import { buildHarborOakPromoCampaignSetTruth } from "./promo-fixtures";
import { reasonSocialPostsSetDeterministic } from "./social-posts-reason";
import { evaluateSocialPostsSetConsistency } from "./social-posts-set-qa";
import { buildHarborOakSocialPostsSetTruth } from "./social-posts-fixtures";
import { reasonSocialPostCaptionsDeterministic } from "./social-posts-captions";
import { declaredTextFromPromoAsset } from "./promo-render-html";
import { declaredTextFromSocialPostAsset } from "./social-posts-render-html";
import path from "path";

const repoRoot = path.resolve(__dirname, "../../..");

describe("customer-mode purpose chrome inversion", () => {
  it("omits purpose_label on customer promo and fails set QA if chrome is forced onto PNG text", () => {
    const cert = buildHarborOakPromoCampaignSetTruth({
      repoRoot,
      campaignId: "camp-customer-purpose-promo",
    });
    const customer = {
      ...cert,
      outputMode: "customer" as const,
      label: "CUSTOMER JOB — purpose chrome gate",
      disclaimer: "Appointment required. Limited openings.",
      body: "Professional tune-up service for the season ahead.",
      prohibitedClaimPatterns: ["Best in Richmond", "#1 rated"],
    };
    const spec = reasonPromoCampaignSetDeterministic(customer);
    for (const asset of spec.assets) {
      expect(
        asset.layers.some((l) => l.type === "text" && l.role === "purpose_label"),
      ).toBe(false);
    }
    const declaredTextByAsset: Record<string, string> = {};
    for (const asset of spec.assets) {
      declaredTextByAsset[asset.assetId] = declaredTextFromPromoAsset(asset);
      expect(declaredTextByAsset[asset.assetId]).not.toContain(
        asset.authorizedPurpose,
      );
    }
    const ok = evaluatePromoSetConsistency({
      truth: customer,
      spec,
      declaredTextByAsset,
    });
    expect(ok.ok).toBe(true);

    // Force chrome into declared text → fail closed.
    const leaked = evaluatePromoSetConsistency({
      truth: customer,
      spec,
      declaredTextByAsset: {
        [spec.assets[0]!.assetId]:
          `${declaredTextByAsset[spec.assets[0]!.assetId]} ${spec.assets[0]!.authorizedPurpose}`,
        [spec.assets[1]!.assetId]: declaredTextByAsset[spec.assets[1]!.assetId]!,
      },
    });
    expect(leaked.ok).toBe(false);
    if (!leaked.ok) expect(leaked.code).toBe("FIXTURE_LEAKAGE");
  });

  it("keeps purpose_label on certification_fixture promo (Harbor CERT)", () => {
    const truth = buildHarborOakPromoCampaignSetTruth({
      repoRoot,
      campaignId: "camp-cert-purpose-promo",
    });
    expect(truth.outputMode).toBe("certification_fixture");
    const spec = reasonPromoCampaignSetDeterministic(truth);
    for (const asset of spec.assets) {
      expect(
        asset.layers.some((l) => l.type === "text" && l.role === "purpose_label"),
      ).toBe(true);
    }
    const declaredTextByAsset: Record<string, string> = {};
    for (const asset of spec.assets) {
      declaredTextByAsset[asset.assetId] = declaredTextFromPromoAsset(asset);
    }
    const ok = evaluatePromoSetConsistency({
      truth,
      spec,
      declaredTextByAsset,
    });
    expect(ok.ok).toBe(true);
  });

  it("omits purpose_label / roleAngle paint on customer social posts", () => {
    const cert = buildHarborOakSocialPostsSetTruth({
      repoRoot,
      campaignId: "camp-customer-purpose-social",
    });
    const customer = {
      ...cert,
      outputMode: "customer" as const,
      label: "CUSTOMER JOB — purpose chrome gate",
      platformLabel: "Instagram Post",
      disclaimer: "",
      body: "Plain, steady service for homeowners who want clear help.",
      prohibitedClaimPatterns: ["Best in Richmond", "#1 rated"],
    };
    const spec = reasonSocialPostsSetDeterministic(customer);
    for (const asset of spec.assets) {
      expect(
        asset.layers.some((l) => l.type === "text" && l.role === "purpose_label"),
      ).toBe(false);
    }
    const declaredTextByAsset: Record<string, string> = {};
    for (const asset of spec.assets) {
      const text = declaredTextFromSocialPostAsset(asset);
      declaredTextByAsset[asset.assetId] = text;
      expect(text).not.toContain(asset.roleAngle);
      expect(text).not.toContain(asset.authorizedPurpose);
      expect(text).not.toMatch(/Post \d+ of 4/i);
    }
    const captions = reasonSocialPostCaptionsDeterministic(customer, spec.assets);
    const postingOrder = captions.map((c) => ({
      position: c.orderIndex,
      assetId: c.assetId,
      captionId: c.captionId,
    }));
    const ok = evaluateSocialPostsSetConsistency({
      truth: customer,
      spec,
      declaredTextByAsset,
      captions,
      postingOrder,
    });
    expect(ok.ok).toBe(true);
  });
});
