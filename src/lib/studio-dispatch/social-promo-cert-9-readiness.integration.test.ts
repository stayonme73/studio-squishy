/**
 * Cert-9 readiness — validates repair stack together without seeding or E2E.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { canReadCampaign } from "@/lib/campaign-store/access";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import { applyTeamReview } from "@/lib/materials/actions";
import type { CampaignMaterialItem, ServerMaterialsEnvelope } from "@/lib/materials/types";
import {
  offerLedHeadlineFromIntake,
  mapSocialPromoOfferLedPromoTruth,
  mapSocialPromoOfferLedSocialTruth,
} from "@/lib/studio-dispatch/map-social-promo-offer-led-truth";
import { resolveApprovedLogoMaterial } from "@/lib/studio-dispatch/map-flyer-job-truth";
import { reasonPromoCampaignSetDeterministic } from "@/lib/studio-design-renderer/promo-reason";
import { reasonSocialPostsSetDeterministic } from "@/lib/studio-design-renderer/social-posts-reason";
import { renderSocialPostAssetHtml } from "@/lib/studio-design-renderer/social-posts-render-html";
import { renderPromoAssetHtml } from "@/lib/studio-design-renderer/promo-render-html";
import {
  SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS,
  awaitSocialPromoParentCustomerReviewReady,
  isSocialPromoParentReadyForCustomerReview,
} from "@/lib/studio-customer-life/social-promo-review-readiness";

const CANONICAL_REL =
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/cert-7-synthetic-logo/spruce-line-studio-test-logo-v1.png";

const CERT9_FACTS =
  "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.";

const CAMPAIGN_ID = "disposable-social-promo-machine-cert-9";
const JOB_ID = `${CAMPAIGN_ID}:social_and_promo_graphics`;

const repoRoot = process.cwd();

function campaignEnvelope(ownerId: string): ServerCampaignEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    clientUserId: ownerId,
    syncVersion: 1,
    syncedAt: new Date().toISOString(),
    record: {
      campaignId: CAMPAIGN_ID,
      campaignName: "Spruce Line Studio",
    } as ServerCampaignEnvelope["record"],
  };
}

describe("Social & Promo Cert-9 readiness (repairs + isolation)", () => {
  it("denies cross-customer campaign read (API layer gate)", () => {
    const owner = {
      id: "client-sp-cert-disposable-9",
      email: "sp-cert-9@local.dev",
      displayName: "Cert 9",
      roles: ["client"] as const,
    };
    const other = {
      id: "client-unrelated",
      email: "client@local.dev",
      displayName: "Other",
      roles: ["client"] as const,
    };
    const env = campaignEnvelope(owner.id);
    expect(canReadCampaign(owner, env.campaignId, env, null)).toBe(true);
    expect(canReadCampaign(other, env.campaignId, env, null)).toBe(false);
  });

  it("resolves PREP parent-scoped logo for both branch SKUs with canonical SHA", () => {
    const logoItem: CampaignMaterialItem = {
      id: "condensed-social-logo",
      category: "logo-brand",
      requirementLevel: "optional",
      reviewStatus: "submitted",
      contentKind: "file-metadata",
      label: "Logo",
      clientFacingLabel: "Logo",
      clientFacingPrompt: "Logo",
      reason: "Social & Promo",
      relatedServiceIds: ["social_and_promo_graphics"],
      uploadStatus: "stored",
      storageRef: null,
      isolatedSlot: true,
      preparedLocalPath: CANONICAL_REL,
      fileName: "spruce-line-logo.png",
      mimeType: "image/png",
      submittedAt: "2026-10-25T12:00:00.000Z",
    } as CampaignMaterialItem;
    const reviewed = applyTeamReview(
      {
        campaignId: "prep-shape",
        items: [logoItem],
        syncedAt: new Date().toISOString(),
      } satisfies ServerMaterialsEnvelope,
      logoItem.id,
      "approved_for_use",
      undefined,
      { id: "staff-1", email: "staff@local.dev", displayName: "Staff", roles: ["staff"] },
    );
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;

    const expectedSha = createHash("sha256")
      .update(readFileSync(path.join(repoRoot, CANONICAL_REL)))
      .digest("hex");

    for (const skuId of ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"] as const) {
      const resolved = resolveApprovedLogoMaterial({
        repoRoot,
        items: reviewed.envelope.items,
        skuId,
      });
      expect(resolved.ok).toBe(true);
      if (!resolved.ok || !resolved.material) return;
      expect(resolved.material.contentSha256).toBe(expectedSha);
    }
  });

  it("maps offer-led truth with logo layers, facts, and no duplicate promo headline", () => {
    const campaign = {
      campaignId: "cert9-readiness-shape",
      campaignName: "Spruce Line Studio",
      routeMapIntake: {
        submittedAt: "2026-10-25T12:00:00.000Z",
        answers: {
          "shared:businessName": "Spruce Line Studio",
          "shared:phone": "(555) 010-8820",
          "shared:webOrSocial": "spruceline.example/open-house",
          "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
          "social_and_promo_graphics:facts": CERT9_FACTS,
          "social_and_promo_graphics:cta": "Reserve your spot",
          "social_and_promo_graphics:mustKeep": "Warm, welcoming, not loud or salesy",
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

    expect(offerLedHeadlineFromIntake("Spring open-house weekend for the studio lounge", "Warm, welcoming, not loud or salesy")).toBe(
      "Warm, welcoming, not loud or salesy",
    );

    const social = mapSocialPromoOfferLedSocialTruth({
      repoRoot,
      campaign,
      materials,
      dispatchRecord: {
        dispatchId: "dd:cert9:social",
        jobId: "cert9:social",
        skuId: "v2-rtu-social-posts",
        executionIdentityReady: true,
      } as never,
    });
    expect(social.ok).toBe(true);
    if (!social.ok) return;
    expect(social.truth.priceDisplay).toContain("$49");
    expect(social.truth.dateWindow).toMatch(/November 8/i);
    expect(social.truth.materials.some((m) => m.role === "logo")).toBe(true);

    const socialSpec = reasonSocialPostsSetDeterministic(social.truth);
    const post3 = socialSpec.assets.find((a) => a.assetId === "social-post-3")!;
    const post3Html = renderSocialPostAssetHtml(repoRoot, socialSpec, post3);
    const bodyMatches = post3Html.match(/Book a \$49 mini-consultation/g) ?? [];
    expect(bodyMatches.length).toBeLessThanOrEqual(2);

    const promo = mapSocialPromoOfferLedPromoTruth({
      repoRoot,
      campaign,
      materials,
      dispatchRecord: {
        dispatchId: "dd:cert9:promo",
        jobId: "cert9:promo",
        skuId: "v2-rtu-promotion-graphics",
        executionIdentityReady: true,
      } as never,
    });
    expect(promo.ok).toBe(true);
    if (!promo.ok) return;
    expect(promo.truth.headline).toBe("Warm, welcoming, not loud or salesy");
    expect(promo.truth.headline).not.toBe(promo.truth.offerName);
    const promoSpec = reasonPromoCampaignSetDeterministic(promo.truth);
    for (const asset of promoSpec.assets) {
      const html = renderPromoAssetHtml(repoRoot, promoSpec, asset);
      expect(html).toMatch(/logo-plate|materialId|logo/);
      const headlineLayers = asset.layers.filter((l) => l.type === "text" && l.role === "headline");
      const offerLayers = asset.layers.filter(
        (l) => l.type === "text" && (l.role === "offer" || l.content === promo.truth.offerName),
      );
      expect(headlineLayers.every((l) => l.content !== promo.truth.offerName)).toBe(true);
      expect(offerLayers.length).toBeGreaterThan(0);
    }
  });

  it("review readiness await honors persisted ready_for_review without forced spine", async () => {
    const keys = [...SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS];
    const job = {
      jobId: JOB_ID,
      skuId: "social_and_promo_graphics",
      spineStatus: "ready_for_review",
      internalQaReviewAuthorization: { status: "ELIGIBLE_FOR_REVIEW" },
      deliverablePrep: keys.map((deliverableKey) => ({
        deliverableKey,
        preparedAt: new Date().toISOString(),
      })),
    };
    expect(isSocialPromoParentReadyForCustomerReview(job as never)).toBe(true);

    const blocked = await awaitSocialPromoParentCustomerReviewReady({
      campaignId: CAMPAIGN_ID,
      parentJobId: JOB_ID,
      campaign: { campaignId: CAMPAIGN_ID } as never,
      maxWaitMs: 50,
      pollIntervalMs: 1,
      sleep: async () => {},
      bindReview: async (c) => c,
      readTasks: async () => ({
        campaignId: CAMPAIGN_ID,
        syncedAt: new Date().toISOString(),
        tasks: [],
        jobRecords: [{ ...job, spineStatus: "ready_for_queue" }],
        jobActivityEvents: [],
      }),
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.code).toBe("TIMEOUT");
  });
});
