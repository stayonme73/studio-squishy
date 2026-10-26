import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";
import {
  mapSocialPromoOfferLedPromoTruth,
} from "@/lib/studio-dispatch/map-social-promo-offer-led-truth";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";

import { reasonPromoCampaignSetDeterministic } from "./promo-reason";
import { evaluatePromoSetConsistency } from "./promo-set-qa";
import { declaredTextFromPromoAsset } from "./promo-render-html";
import {
  evaluateTextLayerCollisions,
  textLayersForCollisionCheck,
} from "./text-layer-collision";
import { validatePromoCampaignSetSpec } from "./promo-validate";

const repoRoot = process.cwd();

const CERT6_FACTS =
  "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.";

function cert6Campaign(bodyOverride?: string): CampaignRecord {
  return {
    campaignId: "promo-layout-repair-cert6-shape",
    campaignName: "Spruce Line Studio",
    routeMapIntake: {
      submittedAt: "2026-10-25T00:28:19.907Z",
      answers: {
        "shared:businessName": "Spruce Line Studio",
        "shared:phone": "(555) 010-8820",
        "shared:webOrSocial": "spruceline.example/open-house",
        "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
        "social_and_promo_graphics:facts": bodyOverride ?? CERT6_FACTS,
        "social_and_promo_graphics:cta": "Reserve your spot",
        "social_and_promo_graphics:rights": "I have permission to use the materials I am supplying.",
      },
    },
  } as unknown as CampaignRecord;
}

function promoDispatch(): JobDispatchRecord {
  return {
    dispatchId: "dd:layout-repair:social_and_promo_graphics:branch:campaign_graphics",
    jobId: "layout-repair:social_and_promo_graphics:branch:campaign_graphics",
    skuId: "v2-rtu-promotion-graphics",
    executionIdentityReady: true,
    status: "EXECUTION_IDENTITY_READY",
  } as unknown as JobDispatchRecord;
}

const cert6LogoMaterial = {
  id: "condensed-social-logo",
  category: "logo-brand",
  reviewStatus: "approved_for_use",
  relatedServiceIds: ["v2-rtu-promotion-graphics"],
  preparedLocalPath: "data/disposable-social-promo-machine-cert-6/materials/spruce-line-logo.png",
  storageRef: {
    provider: "supabase_storage",
    objectPath: "clients/client-sp-cert-disposable-6/campaigns/disposable-social-promo-machine-cert-6/jobs/disposable-social-promo-machine-cert-6-social_and_promo_graphics/client_material/v1/spruce-line-logo.png",
    checksumSha256: "c414cd0e204de974f73753c7e28d7638e7b3691bb8b1a2bab6b25bb7fed7ce77",
  },
} as never;

describe("promotion-graphics compact square footer stack (Cert-6 repair)", () => {
  it("does not repeat offer theme as both headline and offer band when mustKeep is absent", () => {
    const mapped = mapSocialPromoOfferLedPromoTruth({
      repoRoot,
      campaign: cert6Campaign(),
      dispatchRecord: promoDispatch(),
      materials: [],
    });
    if (!mapped.ok) throw new Error(mapped.message);
    const purpose = "Spring open-house weekend for the studio lounge";
    expect(mapped.truth.offerName).toBe(purpose);
    expect(mapped.truth.headline).toBe("");

    const spec = reasonPromoCampaignSetDeterministic(mapped.truth);
    for (const asset of spec.assets) {
      const headlineLayers = asset.layers.filter(
        (l) => l.type === "text" && l.role === "headline",
      );
      expect(headlineLayers).toHaveLength(0);
      const offerLayers = asset.layers.filter((l) => l.type === "text" && l.role === "offer");
      expect(offerLayers).toHaveLength(1);
      expect(offerLayers[0]?.type === "text" && offerLayers[0].content).toBe(purpose);
      const declared = declaredTextFromPromoAsset(asset);
      const matches = declared.match(/Spring open-house weekend for the studio lounge/g);
      expect(matches?.length).toBe(1);
    }
  });

  it("passes set QA for Cert-6 facts with approved logo (square + portrait)", () => {
    const mapped = mapSocialPromoOfferLedPromoTruth({
      repoRoot,
      campaign: cert6Campaign(),
      dispatchRecord: promoDispatch(),
      materials: [cert6LogoMaterial],
    });
    if (!mapped.ok) throw new Error(mapped.message);
    expect(mapped.truth.materials.some((m) => m.role === "logo")).toBe(true);

    const spec = reasonPromoCampaignSetDeterministic(mapped.truth);
    expect(validatePromoCampaignSetSpec(repoRoot, spec, mapped.truth)).toEqual({ ok: true });

    const square = spec.assets.find((a) => a.assetId === "campaign-graphic-square");
    expect(square).toBeDefined();
    const body = square!.layers.find((l) => l.type === "text" && l.role === "body");
    const cta = square!.layers.find((l) => l.type === "text" && l.role === "cta");
    expect(body?.type).toBe("text");
    expect(cta?.type).toBe("text");
    if (body?.type === "text" && cta?.type === "text") {
      expect(cta.y).toBeGreaterThanOrEqual(body.y);
    }

    const declared = Object.fromEntries(
      spec.assets.map((a) => [a.assetId, declaredTextFromPromoAsset(a)]),
    );
    expect(
      evaluatePromoSetConsistency({
        truth: mapped.truth,
        spec,
        declaredTextByAsset: declared,
      }).ok,
    ).toBe(true);
  });

  it("passes wordmark-only Cert-6 density without body/cta collision", () => {
    const mapped = mapSocialPromoOfferLedPromoTruth({
      repoRoot,
      campaign: cert6Campaign(),
      dispatchRecord: promoDispatch(),
      materials: [],
    });
    if (!mapped.ok) throw new Error(mapped.message);
    const spec = reasonPromoCampaignSetDeterministic(mapped.truth);
    const square = spec.assets.find((a) => a.assetId === "campaign-graphic-square")!;
    const collision = evaluateTextLayerCollisions(textLayersForCollisionCheck(square.layers));
    expect(collision.ok).toBe(true);
    expect(validatePromoCampaignSetSpec(repoRoot, spec, mapped.truth)).toEqual({ ok: true });
  });

  it("stacks CTA below a long but valid disclosure body on square", () => {
    const longBody = `${CERT6_FACTS} ${CERT6_FACTS}`.trim();
    const mapped = mapSocialPromoOfferLedPromoTruth({
      repoRoot,
      campaign: cert6Campaign(longBody),
      dispatchRecord: promoDispatch(),
      materials: [],
    });
    if (!mapped.ok) throw new Error(mapped.message);
    const spec = reasonPromoCampaignSetDeterministic(mapped.truth);
    const square = spec.assets.find((a) => a.assetId === "campaign-graphic-square")!;
    expect(evaluateTextLayerCollisions(textLayersForCollisionCheck(square.layers)).ok).toBe(true);
  });

  it("still fails closed when two text layers genuinely overlap", () => {
    const collision = evaluateTextLayerCollisions([
      {
        id: "a",
        x: 100,
        y: 100,
        width: 400,
        fontSizePx: 32,
        lineHeight: 1.2,
        content: "Line one",
        maxLines: 1,
      },
      {
        id: "b",
        x: 100,
        y: 110,
        width: 400,
        fontSizePx: 32,
        lineHeight: 1.2,
        content: "Line two",
        maxLines: 1,
      },
    ]);
    expect(collision.ok).toBe(false);
    if (collision.ok) return;
    expect(collision.code).toBe("COLLISION");
  });

  it("preserves Harbor & Oak promo validation regression", () => {
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
    const campaign = {
      campaignId: "harbor-promo-layout-repair",
      campaignName: harborOakIdentityLock.businessName,
      routeMapIntake: { submittedAt: "2026-10-17T22:00:00.000Z", answers: HARBOR },
    } as unknown as CampaignRecord;
    const LOGO =
      "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/materials/harbor-oak-anchor-oak-oval-v1.svg";
    const mapped = mapSocialPromoOfferLedPromoTruth({
      repoRoot,
      campaign,
      dispatchRecord: promoDispatch(),
      materials: [
        {
          id: "logo-harbor",
          category: "logo-brand",
          reviewStatus: "approved_for_use",
          relatedServiceIds: ["v2-rtu-promotion-graphics"],
          url: LOGO,
        },
      ] as never,
    });
    if (!mapped.ok) throw new Error(mapped.message);
    const spec = reasonPromoCampaignSetDeterministic(mapped.truth);
    expect(validatePromoCampaignSetSpec(repoRoot, spec, mapped.truth)).toEqual({ ok: true });
    for (const asset of spec.assets) {
      expect(evaluateTextLayerCollisions(textLayersForCollisionCheck(asset.layers)).ok).toBe(true);
    }
  });

  it("loads frozen Cert-6 campaign intake from disk for shape parity", () => {
    const campaignPath = path.join(
      repoRoot,
      "data/campaigns/disposable-social-promo-machine-cert-6.json",
    );
    const envelope = JSON.parse(readFileSync(campaignPath, "utf8"));
    const mapped = mapSocialPromoOfferLedPromoTruth({
      repoRoot,
      campaign: envelope.record as CampaignRecord,
      dispatchRecord: promoDispatch(),
      materials: JSON.parse(
        readFileSync(
          path.join(repoRoot, "data/campaign-materials/disposable-social-promo-machine-cert-6.json"),
          "utf8",
        ),
      ).items,
    });
    if (!mapped.ok) throw new Error(mapped.message);
    const spec = reasonPromoCampaignSetDeterministic(mapped.truth);
    const square = spec.assets.find((a) => a.assetId === "campaign-graphic-square")!;
    expect(evaluateTextLayerCollisions(textLayersForCollisionCheck(square.layers)).ok).toBe(true);
  });
});
