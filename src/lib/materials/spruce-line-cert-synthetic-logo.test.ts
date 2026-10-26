import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

import { validateImageFileBytes, isPngImageBytes } from "./image-file-bytes";
import {
  mergeCustomerFactsText,
  readSocialPromoIntakeSignals,
} from "@/lib/studio-dispatch/social-promo-intake-truth";
import {
  mapSocialPromoOfferLedPromoTruth,
  mapSocialPromoOfferLedSocialTruth,
} from "@/lib/studio-dispatch/map-social-promo-offer-led-truth";
import { reasonPromoCampaignSetDeterministic } from "@/lib/studio-design-renderer/promo-reason";
import { reasonSocialPostsSetDeterministic } from "@/lib/studio-design-renderer/social-posts-reason";
import { validatePromoCampaignSetSpec } from "@/lib/studio-design-renderer/promo-validate";
import { validateSocialPostsSetSpec } from "@/lib/studio-design-renderer/social-posts-validate";
import { renderSocialPostAssetHtml } from "@/lib/studio-design-renderer/social-posts-render-html";

const CANONICAL_REL =
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/cert-7-synthetic-logo/spruce-line-studio-test-logo-v1.png";

describe("Spruce Line cert synthetic logo + offer-led layouts", () => {
  it("canonical logo is valid PNG with useful dimensions (not 1×1 placeholder)", () => {
    const repoRoot = process.cwd();
    const abs = path.join(repoRoot, CANONICAL_REL);
    const bytes = new Uint8Array(readFileSync(abs));
    expect(isPngImageBytes(bytes)).toBe(true);
    expect(validateImageFileBytes("spruce-line-logo.png", "image/png", bytes).ok).toBe(true);
    expect(bytes.length).toBeGreaterThan(500);
    // PNG IHDR width/height at bytes 16–23 (big-endian)
    const w = bytes[16]! * 2 ** 24 + bytes[17]! * 2 ** 16 + bytes[18]! * 2 ** 8 + bytes[19]!;
    const h = bytes[20]! * 2 ** 24 + bytes[21]! * 2 ** 16 + bytes[22]! * 2 ** 8 + bytes[23]!;
    expect(w).toBeGreaterThanOrEqual(256);
    expect(h).toBeGreaterThanOrEqual(256);
  });

  it("maps branch SKUs when File Room logo is scoped to parent social_and_promo_graphics only", () => {
    const repoRoot = process.cwd();
    const campaign = {
      campaignId: "cert7-parent-logo-scope",
      campaignName: "Spruce Line Studio",
      routeMapIntake: {
        submittedAt: "2026-10-25T12:00:00.000Z",
        answers: {
          "shared:businessName": "Spruce Line Studio",
          "social_and_promo_graphics:purpose": "Spring open-house weekend",
          "social_and_promo_graphics:facts":
            "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot.",
          "social_and_promo_graphics:cta": "Reserve your spot",
        },
      },
    } as never;
    const materials = [
      {
        id: "condensed-social-logo",
        category: "logo-brand",
        reviewStatus: "approved_for_use",
        uploadStatus: "stored",
        relatedServiceIds: ["social_and_promo_graphics"],
        preparedLocalPath: CANONICAL_REL,
      },
    ] as never;
    const dispatch = {
      dispatchId: "dd:cert7-parent",
      jobId: "cert7:parent",
      skuId: "v2-rtu-social-posts",
      executionIdentityReady: true,
    } as never;
    const social = mapSocialPromoOfferLedSocialTruth({ repoRoot, campaign, materials, dispatchRecord: dispatch });
    expect(social.ok).toBe(true);
    if (!social.ok) return;
    expect(social.truth.materials.some((m) => m.role === "logo")).toBe(true);
    const spec = reasonSocialPostsSetDeterministic(social.truth);
    const html = renderSocialPostAssetHtml(repoRoot, spec, spec.assets[0]!);
    expect(html).toMatch(/logo-plate|role=.logo|"logo"/);
  });

  it("maps social + promo with approved logo path and passes layout QA", () => {
    const repoRoot = process.cwd();
    const facts =
      "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.";
    const campaign = {
      campaignId: "cert7-layout-shape",
      campaignName: "Spruce Line Studio",
      routeMapIntake: {
        submittedAt: "2026-10-25T12:00:00.000Z",
        answers: {
          "shared:businessName": "Spruce Line Studio",
          "shared:phone": "(555) 010-8820",
          "shared:webOrSocial": "spruceline.example/open-house",
          "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
          "social_and_promo_graphics:facts": facts,
          "social_and_promo_graphics:cta": "Reserve your spot",
          "social_and_promo_graphics:rights": "ok",
        },
      },
    } as never;
    const materials = [
      {
        id: "condensed-social-facts",
        category: "factual-confirmation",
        reviewStatus: "approved_for_use",
        text: facts,
      },
      {
        id: "condensed-social-logo",
        category: "logo-brand",
        reviewStatus: "approved_for_use",
        relatedServiceIds: ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"],
        preparedLocalPath: CANONICAL_REL,
      },
    ] as never;

    expect(mergeCustomerFactsText(facts, facts)).toBe(facts);
    const signals = readSocialPromoIntakeSignals({
      repoRoot,
      campaign,
      materials,
      skuId: "v2-rtu-social-posts",
    });
    expect(signals.facts).toBe(facts);

    const dispatch = {
      dispatchId: "dd:cert7:preview",
      jobId: "cert7:preview",
      skuId: "v2-rtu-social-posts",
      executionIdentityReady: true,
      status: "EXECUTION_IDENTITY_READY",
    } as never;

    const social = mapSocialPromoOfferLedSocialTruth({ repoRoot, campaign, materials, dispatchRecord: dispatch });
    if (!social.ok) throw new Error(social.message);
    expect(social.truth.approvedLogoVariantId).not.toBe("wordmark-only");
    const socialSpec = reasonSocialPostsSetDeterministic(social.truth);
    expect(validateSocialPostsSetSpec(repoRoot, socialSpec, social.truth)).toEqual({ ok: true });
    const post1Html = renderSocialPostAssetHtml(repoRoot, socialSpec, socialSpec.assets[0]!);
    expect(post1Html).not.toContain("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ");
    expect(post1Html.length).toBeGreaterThan(20_000);

    const promo = mapSocialPromoOfferLedPromoTruth({
      repoRoot,
      campaign,
      materials,
      dispatchRecord: { ...dispatch, skuId: "v2-rtu-promotion-graphics" },
    });
    if (!promo.ok) throw new Error(promo.message);
    expect(promo.truth.headline).toBe("");
    const promoSpec = reasonPromoCampaignSetDeterministic(promo.truth);
    expect(validatePromoCampaignSetSpec(repoRoot, promoSpec, promo.truth)).toEqual({ ok: true });
    for (const asset of promoSpec.assets) {
      expect(asset.layers.some((l) => l.type === "text" && l.role === "headline")).toBe(false);
    }
  });
});
