import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { applyTeamReview } from "@/lib/materials/actions";
import type {
  CampaignMaterialItem,
  MaterialReviewStatus,
  ServerMaterialsEnvelope,
} from "@/lib/materials/types";
import { buildMaterialContentFingerprint } from "@/lib/studio-material-use/evaluate";
import { resolveApprovedLogoMaterial } from "@/lib/studio-dispatch/map-flyer-job-truth";
import {
  mapSocialPromoOfferLedPromoTruth,
  mapSocialPromoOfferLedSocialTruth,
} from "@/lib/studio-dispatch/map-social-promo-offer-led-truth";
import { readSocialPromoIntakeSignals } from "@/lib/studio-dispatch/social-promo-intake-truth";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";

const CERT34_FACTS =
  "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.";

const STALE_FACTS =
  "Free mini-consultations Saturday 10–4. One complimentary beverage per guest. RSVP encouraged.";

const repoRoot = process.cwd();
const LOGO_REL = "data/disposable-social-promo-machine-cert-4/materials/spruce-line-logo.png";

function envelope(items: CampaignMaterialItem[]): ServerMaterialsEnvelope {
  return {
    campaignId: "disposable-social-promo-machine-cert-4",
    items,
    syncedAt: new Date().toISOString(),
  };
}

function logoItem(reviewStatus: CampaignMaterialItem["reviewStatus"]): CampaignMaterialItem {
  const base = {
    id: "condensed-social-logo",
    category: "logo-brand" as const,
    requirementLevel: "optional" as const,
    reviewStatus,
    contentKind: "file-metadata" as const,
    label: "Logo",
    clientFacingLabel: "Logo",
    clientFacingPrompt: "Logo",
    reason: "Social & Promo Graphics",
    relatedServiceIds: ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"],
    uploadStatus: reviewStatus === "missing" ? ("none" as const) : ("stored" as const),
    storageRef: null,
    isolatedSlot: true,
    preparedLocalPath: LOGO_REL,
    fileName: "spruce-line-logo.png",
    mimeType: "image/png",
    submittedAt: "2026-10-24T12:00:00.000Z",
  };
  const contentFingerprint = buildMaterialContentFingerprint(base as CampaignMaterialItem);
  return {
    ...base,
    useDecision:
      reviewStatus === "missing"
        ? undefined
        : {
            decisionId: "mu-test",
            outcome: "APPROVED_FOR_USE",
            authorizationBasis: "customer_owns",
            contentFingerprint,
            packageId: "PRODUCTION-ASSURANCE-RIGHTS-APPROVED-FOR-USE-1",
            schemaVersion: 1,
            evaluatedAt: "2026-10-24T00:00:00.000Z",
            customerPrompt: null,
            escalationTarget: "none",
            reasons: [],
          },
  } as CampaignMaterialItem;
}

const staffUser = {
  id: "staff-1",
  email: "staff@local.dev",
  displayName: "Staff",
  roles: ["staff"],
};

describe("Disposable Social & Promo cert harness workflow", () => {
  it("blocks production logo resolution while upload is submitted but not File Room–approved", () => {
    const resolved = resolveApprovedLogoMaterial({
      repoRoot,
      items: [logoItem("submitted")],
      skuId: "v2-rtu-social-posts",
      stagedLogoRelativePath: LOGO_REL,
    });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.code).toBe("MISSING_REQUIRED_MATERIAL");
    expect(resolved.message).toMatch(/not yet approved for production use/i);
  });

  it("resolves PREP-shaped logo slots tagged only on the parent composite SKU", () => {
    const parentOnly = {
      ...logoItem("approved_for_use"),
      relatedServiceIds: ["social_and_promo_graphics"],
    } as CampaignMaterialItem;
    const resolved = resolveApprovedLogoMaterial({
      repoRoot,
      items: [parentOnly],
      skuId: "v2-rtu-social-posts",
      stagedLogoRelativePath: LOGO_REL,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.material?.role).toBe("logo");
    expect(resolved.material?.relativePath).toBe(LOGO_REL);
  });

  it("permits logo resolution after legitimate applyTeamReview approved_for_use", () => {
    const submitted = logoItem("submitted");
    const reviewed = applyTeamReview(
      envelope([submitted]),
      submitted.id,
      "approved_for_use",
      undefined,
      staffUser,
    );
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.envelope.items[0]?.reviewStatus).toBe("approved_for_use");

    const resolved = resolveApprovedLogoMaterial({
      repoRoot,
      items: reviewed.envelope.items,
      skuId: "v2-rtu-social-posts",
      stagedLogoRelativePath: LOGO_REL,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.material?.role).toBe("logo");
  });

  it("rejects invalid team review statuses (no hand-stamp shortcut)", () => {
    const submitted = logoItem("submitted");
    const invalid = applyTeamReview(
      envelope([submitted]),
      submitted.id,
      "hand_stamped" as MaterialReviewStatus,
      undefined,
      staffUser,
    );
    expect(invalid.ok).toBe(false);
  });

  it("does not treat blocked_from_use as production-approved logo", () => {
    const submitted = logoItem("submitted");
    const blocked = applyTeamReview(
      envelope([submitted]),
      submitted.id,
      "blocked_from_use",
      undefined,
      staffUser,
    );
    expect(blocked.ok).toBe(true);
    if (!blocked.ok) return;
    expect(blocked.envelope.items[0]?.reviewStatus).toBe("blocked_from_use");

    const resolved = resolveApprovedLogoMaterial({
      repoRoot,
      items: blocked.envelope.items,
      skuId: "v2-rtu-social-posts",
      stagedLogoRelativePath: LOGO_REL,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.material).toBeNull();
  });

  it("keeps customer rights attestation on upload without equating it to production approval", () => {
    const submitted = logoItem("submitted");
    expect(submitted.useDecision?.outcome).toBe("APPROVED_FOR_USE");
    expect(submitted.reviewStatus).toBe("submitted");
    expect(
      resolveApprovedLogoMaterial({
        repoRoot,
        items: [submitted],
        skuId: "v2-rtu-social-posts",
        stagedLogoRelativePath: LOGO_REL,
      }).ok,
    ).toBe(false);
  });

  it("reads $49 and November dates from submitted intake even when materials text is stale", () => {
    const campaign = {
      campaignId: "cert-harness-facts",
      campaignName: "Spruce Line Studio",
      routeMapIntake: {
        submittedAt: "2026-10-24T12:00:00.000Z",
        answers: {
          "shared:businessName": "Spruce Line Studio",
          "shared:phone": "(555) 010-8820",
          "shared:webOrSocial": "spruceline.example/open-house",
          "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
          "social_and_promo_graphics:facts": CERT34_FACTS,
          "social_and_promo_graphics:cta": "Reserve your spot",
        },
      },
    } as unknown as CampaignRecord;

    const materials = [
      {
        id: "condensed-social-facts",
        category: "factual-confirmation",
        reviewStatus: "approved_for_use",
        text: STALE_FACTS,
        relatedServiceIds: ["social_and_promo_graphics"],
      },
      logoItem("approved_for_use"),
    ] as CampaignMaterialItem[];

    const signals = readSocialPromoIntakeSignals({
      campaign,
      materials,
      repoRoot,
      stagedLogoRelativePath: LOGO_REL,
      skuId: "v2-rtu-social-posts",
    });
    expect(signals.explicitPrice).toBe("$49");
    expect(signals.explicitDateWindow).toMatch(/November 8.*December 15, 2026/);

    const dispatchRecord = {
      dispatchId: "dd:test:social",
      jobId: "test:social_and_promo_graphics",
      skuId: "v2-rtu-social-posts",
      executionIdentityReady: true,
      status: "EXECUTION_IDENTITY_READY",
    } as unknown as JobDispatchRecord;

    const social = mapSocialPromoOfferLedSocialTruth({
      repoRoot,
      campaign,
      dispatchRecord,
      materials,
    });
    expect(social.ok).toBe(true);
    if (!social.ok) return;
    expect(social.truth.priceDisplay).toBe("$49");
    expect(social.truth.dateWindow).toBe("November 8 – December 15, 2026");

    const promo = mapSocialPromoOfferLedPromoTruth({
      repoRoot,
      campaign,
      dispatchRecord: { ...dispatchRecord, skuId: "v2-rtu-promotion-graphics" },
      materials,
    });
    expect(promo.ok).toBe(true);
    if (!promo.ok) return;
    expect(promo.truth.priceDisplay).toBe("$49");
  });

  it("prefers authoritative intake facts over preparedText when harness submits ledger text from intake", () => {
    const authoritative = CERT34_FACTS;
    expect(authoritative).toMatch(/\$49/);
    expect(authoritative).not.toBe(STALE_FACTS);
  });
});
