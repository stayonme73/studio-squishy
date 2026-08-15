/**
 * STUDIO-OPERATING-DESIGN-BF-001-POSTPAY-PACKAGE-DISPATCH-STRUCTURE-1
 */

import { beforeEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { computePlanPricingTotals } from "@/lib/plan-pricing";
import { createCheckoutSession } from "@/lib/studio-payment/create-session";
import { confirmSandboxCheckoutSession } from "@/lib/studio-payment/sandbox-confirm";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";

import { plateForGraphicKind } from "./bf-001-contracts";
import {
  mapBf001PackageLockFromLiveTruth,
  type Bf001LivePackageLockInput,
} from "./bf-001-intake-truth";
import { sealBf001PackageForPayment } from "./bf-001-kit-payment-gate";
import {
  assertBf001PostPayStructureDispatchReady,
  assertBf001PostPayStructureMatchesPaymentSeal,
  assertBf001PostPayStructureNoSilentPackageMutation,
  buildBf001PostPayDispatchStructureFromCampaign,
  buildBf001PostPayDispatchStructureFromPaymentSeal,
  ensureBf001PostPayDispatchStructureOnCampaign,
} from "./bf-001-postpay-kit-dispatch-structure";
import {
  BF_001_SHEET_PLATE,
  DESIGN_RENDERER_BF_001_SKU,
  type Bf001GraphicKind,
} from "./bf-001-types";

function harborRefreshLock(
  overrides: Partial<Bf001LivePackageLockInput> = {},
): Bf001LivePackageLockInput {
  return {
    businessName: "Harbor & Oak Studio",
    graphicKind: "Profile image",
    visualStartingPointNotes:
      "Existing oval oak-anchor mark on cream; warm oak + soft harbor blue already on our business cards.",
    logoMaterialNote:
      "Logo harbor-oak-anchor-oak-oval-v1.svg — warm oak on cream.",
    likesDislikes:
      "Like calm and timeless. Dislike neon accents and crowded layouts.",
    businessFacts:
      "Downtown portrait sessions. Discovery calls by appointment.",
    ...overrides,
  };
}

function clearFacts(
  overrides: Partial<PreAcceptanceProjectFacts> = {},
): PreAcceptanceProjectFacts {
  return {
    draftRevision: 1,
    routeId: "i75",
    selectedServiceIds: [DESIGN_RENDERER_BF_001_SKU],
    projectNeed: "Need a Brand Identity Refresh",
    businessName: "Harbor & Oak Studio",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a Brand Identity Refresh",
    ...overrides,
  };
}

function unpaidCampaign(
  campaignId: string,
  skuIds: string[] = [DESIGN_RENDERER_BF_001_SKU],
): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals(skuIds as never);
  return {
    campaignId,
    campaignName: "Harbor & Oak Studio",
    campaignStatus: "DRAFT_RECEIVED",
    campaignDescription: "Awaiting payment",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: null,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [...skuIds] as never,
      includedServiceIds: [...skuIds] as never,
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: [],
      approvedAt: now,
    },
  };
}

function sealFor(kind: Bf001GraphicKind) {
  const mapped = mapBf001PackageLockFromLiveTruth(
    harborRefreshLock({
      graphicKind: kind === "profile" ? "Profile image" : "Cover graphic",
    }),
  );
  if (!mapped.ok) throw new Error(mapped.message);
  return sealBf001PackageForPayment(mapped.truth);
}

describe("STUDIO-OPERATING-DESIGN-BF-001-POSTPAY-PACKAGE-DISPATCH-STRUCTURE-1", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_MODE;
  });

  it("maps paid profile seal → 2 durable members with sheet plate + profile plate", () => {
    const seal = sealFor("profile");
    const built = buildBf001PostPayDispatchStructureFromPaymentSeal(seal);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.rendererInvoked).toBe(false);
    expect(built.structure.status).toBe(
      "paid_package_dispatch_structure_ready",
    );
    expect(built.structure.graphicKind).toBe("profile");
    expect(built.structure.lockedPackageMemberCount).toBe(2);
    expect(built.structure.businessName).toBe("Harbor & Oak Studio");
    expect(built.structure.startingPointSource).toBe("customer_supplied");
    expect(
      built.structure.startingPointIdentity.visualStartingPointNotes,
    ).toContain("oak-anchor mark");
    expect(built.structure.startingPointIdentity.logoMaterialNote).toContain(
      "harbor-oak-anchor",
    );
    expect(built.structure.members.map((m) => m.memberId)).toEqual([
      "brand_direction_sheet",
      "profile_or_cover_graphic",
    ]);
    expect(built.structure.members.map((m) => m.productionRole)).toEqual([
      "brand_direction_sheet",
      "profile_graphic",
    ]);
    expect(built.structure.members.map((m) => m.agreedPlateId)).toEqual([
      BF_001_SHEET_PLATE.plateId,
      plateForGraphicKind("profile").plateId,
    ]);
    expect(built.structure.members.map((m) => m.fontMode)).toEqual([
      "recommendations_only",
      "studio_safe_only",
    ]);
    expect(built.structure.members.every((m) => m.plateRequired)).toBe(true);
    expect(built.structure.members.every((m) => m.logoRedrawForbidden)).toBe(
      true,
    );
    expect(built.structure.newLogoRequested).toBe(false);
    expect(built.structure.namingRequested).toBe(false);
    expect(built.structure.messagingRequested).toBe(false);
    expect(built.structure.remapAuthorized).toBe(false);
    expect(built.structure.dispatchHookAuthorized).toBe(false);
    expect(built.structure.composerInvoked).toBe(false);
    expect(assertBf001PostPayStructureDispatchReady(built.structure).ok).toBe(
      true,
    );
  });

  it("maps paid cover seal → 2 members on the cover plate", () => {
    const seal = sealFor("cover");
    const built = buildBf001PostPayDispatchStructureFromPaymentSeal(seal);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.structure.graphicKind).toBe("cover");
    expect(built.structure.lockedPackageMemberCount).toBe(2);
    expect(built.structure.members[1]!.productionRole).toBe("cover_graphic");
    expect(built.structure.members[1]!.agreedPlateId).toBe(
      plateForGraphicKind("cover").plateId,
    );
    expect(built.structure.members[0]!.agreedPlateId).toBe(
      BF_001_SHEET_PLATE.plateId,
    );
  });

  it("missing seal / unpaid fail closed", () => {
    expect(buildBf001PostPayDispatchStructureFromPaymentSeal(null).ok).toBe(
      false,
    );
    const unpaid = unpaidCampaign(`bf001-postpay-unpaid-${Date.now()}`);
    const fromCampaign = buildBf001PostPayDispatchStructureFromCampaign(unpaid);
    expect(fromCampaign.ok).toBe(false);
    if (!fromCampaign.ok) expect(fromCampaign.code).toBe("BF_001_NOT_PAID");

    // Paid, but the refresh package was never sealed at checkout.
    const paidNoSeal: CampaignRecord = {
      ...unpaid,
      paymentReceivedAt: new Date().toISOString(),
      paymentTruth: {
        processor: "stripe",
        status: "confirmed",
        currency: "usd",
        expectedAmountCents: 1,
        confirmedAmountCents: 1,
        checkoutSessionId: "cs_no_seal",
        selectedServiceIds: [DESIGN_RENDERER_BF_001_SKU],
        decisionId: "dec_no_seal",
        factFingerprint: "fp_no_seal",
        draftRevision: 1,
        confirmedAt: new Date().toISOString(),
      },
    };
    const sealless =
      buildBf001PostPayDispatchStructureFromCampaign(paidNoSeal);
    expect(sealless.ok).toBe(false);
    if (!sealless.ok) expect(sealless.code).toBe("MISSING_PAYMENT_SEAL");
  });

  it("sandbox payment attaches durable structure from seal — preserves starting point", async () => {
    const campaignId = `bf001-postpay-ok-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      bf001PackageLock: harborRefreshLock(),
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const confirmed = await confirmSandboxCheckoutSession(
      started.checkoutSessionId,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    const structure = confirmed.campaign.bf001PostPayDispatchStructure;
    expect(structure).toBeTruthy();
    expect(structure?.graphicKind).toBe("profile");
    expect(structure?.lockedPackageMemberCount).toBe(2);
    expect(structure?.packageFingerprint).toBe(
      confirmed.campaign.paymentTruth?.bf001PackageSeal?.packageFingerprint,
    );
    expect(structure?.startingPointIdentity.logoMaterialNote).toContain(
      "harbor-oak-anchor",
    );
    expect(structure?.members.map((m) => m.memberId)).toEqual([
      "brand_direction_sheet",
      "profile_or_cover_graphic",
    ]);
    // Payment seal remains immutable / present
    expect(
      confirmed.campaign.paymentTruth?.bf001PackageSeal?.packageFingerprint,
    ).toBe(structure?.packageFingerprint);
  });

  it("fail closed: sheet drop, dual graphic, starting-point drift, kind/plate/graphic-kind swap", () => {
    const seal = sealFor("profile");
    const built = buildBf001PostPayDispatchStructureFromPaymentSeal(seal);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const noSheet = {
      ...built.structure,
      members: built.structure.members.filter(
        (m) => m.memberId !== "brand_direction_sheet",
      ),
    };
    const sheetCheck = assertBf001PostPayStructureMatchesPaymentSeal(
      noSheet,
      seal,
    );
    expect(sheetCheck.ok).toBe(false);
    if (!sheetCheck.ok) {
      expect(sheetCheck.code).toMatch(
        /SHEET_MEMBER_MISSING|MEMBER_DROPPED|MEMBER_COUNT/,
      );
    }

    const noGraphic = {
      ...built.structure,
      members: built.structure.members.filter(
        (m) => m.memberId !== "profile_or_cover_graphic",
      ),
    };
    expect(
      assertBf001PostPayStructureMatchesPaymentSeal(noGraphic, seal).ok,
    ).toBe(false);

    const dualGraphic = {
      ...built.structure,
      members: [
        ...built.structure.members,
        {
          ...built.structure.members[1]!,
          order: 3,
          kind: "design_cover" as const,
          productionRole: "cover_graphic" as const,
          agreedPlateId: plateForGraphicKind("cover").plateId,
        },
      ],
    };
    const dualCheck = assertBf001PostPayStructureMatchesPaymentSeal(
      dualGraphic,
      seal,
    );
    expect(dualCheck.ok).toBe(false);
    if (!dualCheck.ok) {
      expect(dualCheck.code).toMatch(/PROFILE_AND_COVER|MEMBER_DROPPED/);
    }

    const startingDrift = {
      ...built.structure,
      startingPointIdentity: {
        ...built.structure.startingPointIdentity,
        logoMaterialNote: "tampered — draw us a brand-new mark",
      },
    };
    const startingCheck = assertBf001PostPayStructureMatchesPaymentSeal(
      startingDrift,
      seal,
    );
    expect(startingCheck.ok).toBe(false);
    if (!startingCheck.ok) {
      expect(startingCheck.code).toBe("STARTING_POINT_MISMATCH");
    }

    const kindSwap = {
      ...built.structure,
      members: built.structure.members.map((m, i) =>
        i === 0 ? { ...m, kind: "design_profile" as const } : m,
      ),
    };
    expect(
      assertBf001PostPayStructureMatchesPaymentSeal(kindSwap, seal).ok,
    ).toBe(false);

    const plateTamper = {
      ...built.structure,
      members: built.structure.members.map((m) =>
        m.memberId === "profile_or_cover_graphic"
          ? { ...m, agreedPlateId: "tampered-plate" }
          : m,
      ),
    };
    const plateCheck = assertBf001PostPayStructureMatchesPaymentSeal(
      plateTamper,
      seal,
    );
    expect(plateCheck.ok).toBe(false);
    if (!plateCheck.ok) expect(plateCheck.code).toBe("PLATE_TAMPER");

    const graphicKindChange = assertBf001PostPayStructureNoSilentPackageMutation(
      {
        seal,
        attempted: { ...built.structure, graphicKind: "cover" },
      },
    );
    expect(graphicKindChange.ok).toBe(false);
    if (!graphicKindChange.ok) {
      expect(graphicKindChange.code).toBe(
        "POST_PAYMENT_GRAPHIC_KIND_MUTATION",
      );
    }

    const withNewLogo = {
      ...built.structure,
      newLogoRequested: true,
    } as unknown as typeof built.structure;
    expect(
      assertBf001PostPayStructureMatchesPaymentSeal(withNewLogo, seal).ok,
    ).toBe(false);

    const withNaming = {
      ...built.structure,
      namingRequested: true,
    } as unknown as typeof built.structure;
    expect(
      assertBf001PostPayStructureMatchesPaymentSeal(withNaming, seal).ok,
    ).toBe(false);

    const renderFonts = {
      ...built.structure,
      fontSectionMode: "render_guarantee",
    } as unknown as typeof built.structure;
    const fontCheck = assertBf001PostPayStructureMatchesPaymentSeal(
      renderFonts,
      seal,
    );
    expect(fontCheck.ok).toBe(false);
    if (!fontCheck.ok) expect(fontCheck.code).toBe("FONT_MODE_FORBIDDEN");
  });

  it("ensure is idempotent; never mutates paymentTruth", async () => {
    const campaignId = `bf001-postpay-idem-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      bf001PackageLock: harborRefreshLock({ graphicKind: "Cover graphic" }),
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const confirmed = await confirmSandboxCheckoutSession(
      started.checkoutSessionId,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;

    const first = ensureBf001PostPayDispatchStructureOnCampaign(
      confirmed.campaign,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.alreadyPresent).toBe(true);
    const sealFp =
      confirmed.campaign.paymentTruth?.bf001PackageSeal?.packageFingerprint;
    const second = ensureBf001PostPayDispatchStructureOnCampaign(first.campaign);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyPresent).toBe(true);
    expect(
      second.campaign.paymentTruth?.bf001PackageSeal?.packageFingerprint,
    ).toBe(sealFp);
    expect(second.structure.graphicKind).toBe("cover");
    expect(second.structure.lockedPackageMemberCount).toBe(2);
  });

  it("non-bf-001 paid campaign does not invent a refresh structure", () => {
    const campaignId = `bf001-postpay-skip-${Date.now()}`;
    const campaign: CampaignRecord = {
      ...unpaidCampaign(campaignId, ["rm-j008"]),
      paymentReceivedAt: new Date().toISOString(),
      paymentTruth: {
        processor: "stripe",
        status: "confirmed",
        currency: "usd",
        expectedAmountCents: 9900,
        selectedServiceIds: ["rm-j008"],
        decisionId: "d1",
        factFingerprint: "f1",
        draftRevision: 1,
        confirmedAt: new Date().toISOString(),
      },
    };
    const built = buildBf001PostPayDispatchStructureFromCampaign(campaign);
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.code).toBe("BF_001_NOT_PAID");
    expect(campaign.bf001PostPayDispatchStructure).toBeUndefined();
  });
});
