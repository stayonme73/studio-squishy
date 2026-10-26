import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";
import { createMockFileRoomStorageAdapter } from "@/lib/file-storage/mock";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  storeAndAttachCustomerMaterialFile,
  validateCustomerMaterialFile,
} from "@/lib/materials/client-file-store";
import { minimalSyntheticPngBytes, validateImageFileBytes } from "@/lib/materials/image-file-bytes";
import {
  mapSocialPromoOfferLedPromoTruth,
  mapSocialPromoOfferLedSocialTruth,
} from "@/lib/studio-dispatch/map-social-promo-offer-led-truth";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import { reasonSocialPostCaptionsDeterministic } from "./social-posts-captions";
import { reasonPromoCampaignSetDeterministic } from "./promo-reason";
import { reasonSocialPostsSetDeterministic } from "./social-posts-reason";
import { declaredTextFromSocialPostAsset } from "./social-posts-render-html";
import { evaluateSocialPostsSetConsistency } from "./social-posts-set-qa";
import { validatePromoCampaignSetSpec } from "./promo-validate";
import { validateSocialPostsSetSpec } from "./social-posts-validate";

const repoRoot = process.cwd();

const CERT3_FACTS =
  "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.";

function cert3Campaign(): CampaignRecord {
  return {
    campaignId: "repair-proof-cert-3-shape",
    campaignName: "Spruce Line Studio",
    routeMapIntake: {
      submittedAt: "2026-10-24T12:00:00.000Z",
      answers: {
        "shared:businessName": "Spruce Line Studio",
        "shared:phone": "(555) 010-8820",
        "shared:webOrSocial": "spruceline.example/open-house",
        "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
        "social_and_promo_graphics:facts": CERT3_FACTS,
        "social_and_promo_graphics:cta": "Reserve your spot",
        "social_and_promo_graphics:rights":
          "I have permission to use the materials I am supplying (disposable cert-3 synthetic project only).",
      },
    },
  } as unknown as CampaignRecord;
}

function dispatch(branch: "social_posts" | "campaign_graphics"): JobDispatchRecord {
  const sku = branch === "social_posts" ? "v2-rtu-social-posts" : "v2-rtu-promotion-graphics";
  return {
    dispatchId: `dd:repair:social_and_promo_graphics:branch:${branch}`,
    jobId: `repair:social_and_promo_graphics:branch:${branch}`,
    skuId: sku,
    executionIdentityReady: true,
    status: "EXECUTION_IDENTITY_READY",
  } as unknown as JobDispatchRecord;
}

function pendingLogoMaterial(): CampaignMaterialItem {
  return {
    id: "logo-pending-spruce",
    category: "logo-brand",
    uploadStatus: "stored",
    reviewStatus: "submitted",
    relatedServiceIds: ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"],
    storageRef: {
      provider: "supabase_storage",
      connectionStatus: "private_object",
      objectPath: "repair/logo-pending.png",
      checksumSha256: "sha256:deadbeef",
    },
    sizeBytes: 64,
  } as unknown as CampaignMaterialItem;
}

describe("Social & Promo production quality repair", () => {
  it("layouts cert-3-shaped offer-led social posts without text collision", () => {
    const mapped = mapSocialPromoOfferLedSocialTruth({
      repoRoot,
      campaign: cert3Campaign(),
      dispatchRecord: dispatch("social_posts"),
      materials: [],
    });
    if (!mapped.ok) throw new Error(mapped.message);
    expect(mapped.truth.priceDisplay).toBe("$49");
    expect(mapped.truth.approvedLogoVariantId).toBe("wordmark-only");

    const spec = reasonSocialPostsSetDeterministic(mapped.truth);
    expect(validateSocialPostsSetSpec(repoRoot, spec, mapped.truth)).toEqual({ ok: true });

    const post1 = spec.assets.find((a) => a.assetId === "social-post-1");
    expect(post1?.layers.some((l) => l.type === "text" && l.role === "body")).toBe(false);

    const declaredTextByAsset = Object.fromEntries(
      spec.assets.map((a) => [a.assetId, declaredTextFromSocialPostAsset(a)]),
    );
    const captions = reasonSocialPostCaptionsDeterministic(mapped.truth, spec.assets);
    const postingOrder = captions.map((c) => ({
      position: c.orderIndex,
      assetId: c.assetId,
      captionId: c.captionId,
    }));
    expect(
      evaluateSocialPostsSetConsistency({
        truth: mapped.truth,
        spec,
        declaredTextByAsset,
        captions,
        postingOrder,
      }).ok,
    ).toBe(true);
    expect(captions.map((c) => c.text).join(" ")).toMatch(/\$49/);
    expect(captions.map((c) => c.text).join(" ")).toMatch(/complimentary beverage/i);
  });

  it("reasons wordmark-only promo graphics without logo material references", () => {
    const mapped = mapSocialPromoOfferLedPromoTruth({
      repoRoot,
      campaign: cert3Campaign(),
      dispatchRecord: dispatch("campaign_graphics"),
      materials: [],
    });
    if (!mapped.ok) throw new Error(mapped.message);
    expect(mapped.truth.materials).toHaveLength(0);

    const spec = reasonPromoCampaignSetDeterministic(mapped.truth);
    expect(validatePromoCampaignSetSpec(repoRoot, spec, mapped.truth)).toEqual({ ok: true });
    for (const asset of spec.assets) {
      expect(asset.layers.some((l) => l.type === "image" && l.role === "logo")).toBe(false);
    }
  });

  it("blocks mapping when a logo upload is stored but not approved for production", () => {
    const blocked = mapSocialPromoOfferLedSocialTruth({
      repoRoot,
      campaign: cert3Campaign(),
      dispatchRecord: dispatch("social_posts"),
      materials: [pendingLogoMaterial()],
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.code).toBe("MISSING_REQUIRED_MATERIAL");
    expect(blocked.message).toMatch(/not yet approved/i);
  });

  it("rejects fake PNG bytes at store time", async () => {
    const adapter = createMockFileRoomStorageAdapter();
    const fake = new File(["plain-text-not-png"], "spruce-line-logo.png", { type: "image/png" });
    const result = await storeAndAttachCustomerMaterialFile({
      adapter,
      campaign: cert3Campaign(),
      campaignClientUserId: "repair-user",
      tasks: { tasks: [], updatedAt: "2026-10-24T12:00:00.000Z" },
      materials: {
        campaignId: "repair-proof-cert-3-shape",
        items: [
          {
            id: "logo-item",
            category: "logo-brand",
            uploadStatus: "awaiting_client",
            reviewStatus: "awaiting_submission",
            relatedServiceIds: ["v2-rtu-social-posts"],
          },
        ],
        qaRecords: [],
      },
      user: { id: "repair-user", email: "repair@local.dev" } as never,
      file: fake,
      itemId: "logo-item",
      useAuthorizationBasis: "customer_owns",
      rightsInput: {
        attestation: "customer_owns",
        attestationConfirmed: true,
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not a readable PNG/i);
  });

  it("accepts minimal synthetic PNG bytes at the upload gate", () => {
    const bytes = minimalSyntheticPngBytes();
    const file = new File([bytes], "spruce-line-logo.png", { type: "image/png" });
    expect(validateCustomerMaterialFile(file).ok).toBe(true);
    expect(validateImageFileBytes(file.name, file.type, bytes)).toEqual({ ok: true });
  });

  it("preserves Harbor & Oak offer-led mapping and validation", () => {
    const LOGO =
      "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/materials/harbor-oak-anchor-oak-oval-v1.svg";
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
      campaignId: "harbor-oak-repair-regression",
      campaignName: harborOakIdentityLock.businessName,
      routeMapIntake: { submittedAt: "2026-10-17T22:00:00.000Z", answers: HARBOR },
    } as unknown as CampaignRecord;
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
      repoRoot,
      campaign,
      dispatchRecord: dispatch("social_posts"),
      materials,
    });
    if (!social.ok) throw new Error(social.message);
    const socialSpec = reasonSocialPostsSetDeterministic(social.truth);
    expect(validateSocialPostsSetSpec(repoRoot, socialSpec, social.truth)).toEqual({ ok: true });

    const promo = mapSocialPromoOfferLedPromoTruth({
      repoRoot,
      campaign,
      dispatchRecord: dispatch("campaign_graphics"),
      materials,
    });
    if (!promo.ok) throw new Error(promo.message);
    const promoSpec = reasonPromoCampaignSetDeterministic(promo.truth);
    expect(validatePromoCampaignSetSpec(repoRoot, promoSpec, promo.truth)).toEqual({ ok: true });
  });
});
