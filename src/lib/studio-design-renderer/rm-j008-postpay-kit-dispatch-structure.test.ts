/**
 * STUDIO-OPERATING-DESIGN-RM-J008-POSTPAY-KIT-DISPATCH-STRUCTURE-1
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { computePlanPricingTotals } from "@/lib/plan-pricing";
import { createCheckoutSession } from "@/lib/studio-payment/create-session";
import { confirmSandboxCheckoutSession } from "@/lib/studio-payment/sandbox-confirm";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";

import {
  mapRmJ008KitLockFromLiveTruth,
  type RmJ008LiveKitLockInput,
} from "./rm-j008-intake-truth";
import { sealRmJ008KitForPayment } from "./rm-j008-kit-payment-gate";
import {
  assertRmJ008PostPayStructureDispatchReady,
  assertRmJ008PostPayStructureMatchesPaymentSeal,
  assertRmJ008PostPayStructureNoSilentKitMutation,
  buildRmJ008PostPayDispatchStructureFromCampaign,
  buildRmJ008PostPayDispatchStructureFromPaymentSeal,
  ensureRmJ008PostPayDispatchStructureOnCampaign,
} from "./rm-j008-postpay-kit-dispatch-structure";
import {
  DESIGN_RENDERER_RM_J008_SKU,
  RM_J002_AVATAR_PLATE,
  RM_J002_FACEBOOK_COVER_PLATE,
} from "./rm-j008-types";

function harborUpdateLock(
  overrides: Partial<RmJ008LiveKitLockInput> = {},
): RmJ008LiveKitLockInput {
  return {
    platform: "Facebook",
    businessName: "Harbor & Oak Studio",
    customerControlsExistingProfile: "Yes",
    beforeDisplayName: "Harbor & Oak Studio",
    beforeBioOrAbout: "Old bio: weekend snapshots and unclear booking link.",
    beforeWebsite: "https://old-harbor.example",
    beforePhone: "(555) 000-0000",
    beforeProfileImageNote: "Current default platform avatar — low contrast",
    beforePageCoverNote: "Current cover: busy collage with expired promo",
    afterDisplayName: "Harbor & Oak Studio",
    profileGoal:
      "Show a calm portrait photography studio that books discovery calls.",
    updateIntentNotes:
      "Rewrite About and fix website/phone. Keep current avatar and cover look.",
    afterWebsite: "https://harbor-and-oak.example",
    afterPhone: "(555) 014-2200",
    brandNotes: "Logo harbor-oak-anchor.svg — warm oak + soft harbor blue.",
    avatarAction: "Keep current look",
    coverAction: "Keep current look",
    ...overrides,
  };
}

function clearFacts(
  overrides: Partial<PreAcceptanceProjectFacts> = {},
): PreAcceptanceProjectFacts {
  return {
    draftRevision: 1,
    routeId: "update",
    selectedServiceIds: [DESIGN_RENDERER_RM_J008_SKU],
    projectNeed: "Need a Social Profile Update Kit",
    businessName: "Harbor & Oak Studio",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a Social Profile Update Kit",
    ...overrides,
  };
}

function unpaidCampaign(
  campaignId: string,
  skuIds: string[] = [DESIGN_RENDERER_RM_J008_SKU],
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

function sealFor(platform: "Facebook" | "Instagram" | "TikTok") {
  const mapped = mapRmJ008KitLockFromLiveTruth(
    harborUpdateLock({
      platform,
      ...(platform === "Facebook"
        ? {}
        : {
            beforePageCoverNote: undefined,
            coverAction: "Not applicable",
          }),
    }),
  );
  if (!mapped.ok) throw new Error(mapped.message);
  return sealRmJ008KitForPayment(mapped.truth);
}

describe("STUDIO-OPERATING-DESIGN-RM-J008-POSTPAY-KIT-DISPATCH-STRUCTURE-1", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_MODE;
  });

  afterEach(() => {
    /* no-op */
  });

  it("maps paid Facebook seal → 5 durable members with change sheet + avatar + cover", () => {
    const seal = sealFor("Facebook");
    const built = buildRmJ008PostPayDispatchStructureFromPaymentSeal(seal);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.rendererInvoked).toBe(false);
    expect(built.structure.status).toBe("paid_kit_dispatch_structure_ready");
    expect(built.structure.platform).toBe("facebook");
    expect(built.structure.lockedKitMemberCount).toBe(5);
    expect(built.structure.beforeStateSource).toBe("customer_supplied");
    expect(built.structure.replacementKitScope).toBe(
      "full_platform_replacement_kit",
    );
    expect(built.structure.beforeStateIdentity.bioOrAbout).toContain(
      "weekend snapshots",
    );
    expect(built.structure.afterStateIntent.updateIntentNotes).toContain(
      "Rewrite About",
    );
    expect(built.structure.members.map((m) => m.memberId)).toEqual([
      "bio_about_copy",
      "field_map_checklist",
      "profile_image",
      "page_cover",
      "before_after_change_sheet",
    ]);
    expect(built.structure.members.map((m) => m.productionRole)).toEqual([
      "copy",
      "field_map",
      "avatar",
      "page_cover",
      "change_sheet",
    ]);
    const avatar = built.structure.members.find(
      (m) => m.memberId === "profile_image",
    )!;
    expect(avatar.agreedPlateId).toBe(RM_J002_AVATAR_PLATE.plateId);
    expect(avatar.avatarAlwaysReissued).toBe(true);
    const cover = built.structure.members.find((m) => m.memberId === "page_cover")!;
    expect(cover.agreedPlateId).toBe(RM_J002_FACEBOOK_COVER_PLATE.plateId);
    expect(built.structure.credentialsPresent).toBe(false);
    expect(built.structure.customerApplies).toBe(true);
    expect(built.structure.partialKitRequested).toBe(false);
    expect(built.structure.remapAuthorized).toBe(false);
    expect(built.structure.dispatchHookAuthorized).toBe(false);
    expect(built.structure.composerInvoked).toBe(false);
    expect(assertRmJ008PostPayStructureDispatchReady(built.structure).ok).toBe(
      true,
    );
  });

  it("maps Instagram / TikTok → 4 members · change sheet · no cover", () => {
    for (const platform of ["Instagram", "TikTok"] as const) {
      const seal = sealFor(platform);
      const built = buildRmJ008PostPayDispatchStructureFromPaymentSeal(seal);
      expect(built.ok).toBe(true);
      if (!built.ok) return;
      expect(built.structure.lockedKitMemberCount).toBe(4);
      expect(
        built.structure.members.some((m) => m.memberId === "page_cover"),
      ).toBe(false);
      expect(
        built.structure.members.some((m) => m.memberId === "before_after_change_sheet"),
      ).toBe(true);
      expect(
        built.structure.members.some((m) => m.productionRole === "change_sheet"),
      ).toBe(true);
      expect(built.structure.afterStateIntent.coverAction).toBe("not_applicable");
    }
  });

  it("missing seal / unpaid fail closed", () => {
    expect(buildRmJ008PostPayDispatchStructureFromPaymentSeal(null).ok).toBe(
      false,
    );
    const unpaid = unpaidCampaign(`rmj008-postpay-unpaid-${Date.now()}`);
    const fromCampaign = buildRmJ008PostPayDispatchStructureFromCampaign(unpaid);
    expect(fromCampaign.ok).toBe(false);
    if (!fromCampaign.ok) expect(fromCampaign.code).toBe("RM_J008_NOT_PAID");
  });

  it("sandbox payment attaches durable structure from seal — preserves before-state", async () => {
    const campaignId = `rmj008-postpay-ok-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      rmj008KitLock: harborUpdateLock(),
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const confirmed = await confirmSandboxCheckoutSession(
      started.checkoutSessionId,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    const structure = confirmed.campaign.rmJ008PostPayDispatchStructure;
    expect(structure).toBeTruthy();
    expect(structure?.platform).toBe("facebook");
    expect(structure?.lockedKitMemberCount).toBe(5);
    expect(structure?.kitFingerprint).toBe(
      confirmed.campaign.paymentTruth?.rmj008KitSeal?.kitFingerprint,
    );
    expect(structure?.beforeStateIdentity.bioOrAbout).toContain(
      "weekend snapshots",
    );
    expect(structure?.members.map((m) => m.memberId)).toEqual([
      "bio_about_copy",
      "field_map_checklist",
      "profile_image",
      "page_cover",
      "before_after_change_sheet",
    ]);
    // Payment seal remains immutable / present
    expect(confirmed.campaign.paymentTruth?.rmj008KitSeal?.kitFingerprint).toBe(
      structure?.kitFingerprint,
    );
  });

  it("fail closed: change sheet drop, cover wrong, before-state drift, kind/plate/platform", () => {
    const seal = sealFor("Facebook");
    const built = buildRmJ008PostPayDispatchStructureFromPaymentSeal(seal);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const noChangeSheet = {
      ...built.structure,
      lockedKitMemberCount: 4 as const,
      members: built.structure.members.filter(
        (m) => m.memberId !== "before_after_change_sheet",
      ),
    };
    const changeSheetCheck = assertRmJ008PostPayStructureMatchesPaymentSeal(
      noChangeSheet,
      seal,
    );
    expect(changeSheetCheck.ok).toBe(false);
    if (!changeSheetCheck.ok) {
      expect(changeSheetCheck.code).toMatch(
        /CHANGE_SHEET_MISSING|MEMBER_DROPPED|MEMBER_COUNT/,
      );
    }

    const noCover = {
      ...built.structure,
      lockedKitMemberCount: 4 as const,
      members: built.structure.members.filter((m) => m.memberId !== "page_cover"),
    };
    expect(
      assertRmJ008PostPayStructureMatchesPaymentSeal(noCover, seal).ok,
    ).toBe(false);

    const igSeal = sealFor("Instagram");
    const igBuilt = buildRmJ008PostPayDispatchStructureFromPaymentSeal(igSeal);
    expect(igBuilt.ok).toBe(true);
    if (!igBuilt.ok) return;
    const withCover = {
      ...igBuilt.structure,
      lockedKitMemberCount: 5 as const,
      members: [
        ...igBuilt.structure.members,
        {
          memberId: "page_cover",
          order: 5,
          kind: "design_page_cover" as const,
          memberPurpose: "illegal",
          productionRole: "page_cover" as const,
          agreedPlateId: RM_J002_FACEBOOK_COVER_PLATE.plateId,
          plateRequired: true,
          customerApplies: true as const,
          accountMutation: false as const,
        },
      ],
    };
    expect(
      assertRmJ008PostPayStructureMatchesPaymentSeal(withCover, igSeal).ok,
    ).toBe(false);

    const beforeDrift = {
      ...built.structure,
      beforeStateIdentity: {
        ...built.structure.beforeStateIdentity,
        bioOrAbout: "tampered before-state",
      },
    };
    const beforeCheck = assertRmJ008PostPayStructureMatchesPaymentSeal(
      beforeDrift,
      seal,
    );
    expect(beforeCheck.ok).toBe(false);
    if (!beforeCheck.ok) expect(beforeCheck.code).toBe("BEFORE_STATE_MISMATCH");

    const kindSwap = {
      ...built.structure,
      members: built.structure.members.map((m, i) =>
        i === 0 ? { ...m, kind: "field_map_package" as const } : m,
      ),
    };
    expect(
      assertRmJ008PostPayStructureMatchesPaymentSeal(kindSwap, seal).ok,
    ).toBe(false);

    const plateTamper = {
      ...built.structure,
      members: built.structure.members.map((m) =>
        m.memberId === "profile_image"
          ? { ...m, agreedPlateId: "tampered-plate" }
          : m,
      ),
    };
    const plateCheck = assertRmJ008PostPayStructureMatchesPaymentSeal(
      plateTamper,
      seal,
    );
    expect(plateCheck.ok).toBe(false);
    if (!plateCheck.ok) expect(plateCheck.code).toBe("PLATE_TAMPER");

    const platformChange = assertRmJ008PostPayStructureNoSilentKitMutation({
      seal,
      attempted: { ...built.structure, platform: "tiktok" },
    });
    expect(platformChange.ok).toBe(false);
    if (!platformChange.ok) {
      expect(platformChange.code).toBe("POST_PAYMENT_PLATFORM_MUTATION");
    }

    const withMutation = {
      ...built.structure,
      mutationRequested: true,
    } as typeof built.structure;
    expect(
      assertRmJ008PostPayStructureMatchesPaymentSeal(withMutation, seal).ok,
    ).toBe(false);

    const withPartial = {
      ...built.structure,
      partialKitRequested: true,
    } as typeof built.structure;
    expect(
      assertRmJ008PostPayStructureMatchesPaymentSeal(withPartial, seal).ok,
    ).toBe(false);
  });

  it("ensure is idempotent; never mutates paymentTruth", async () => {
    const campaignId = `rmj008-postpay-idem-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      rmj008KitLock: harborUpdateLock({
        platform: "Instagram",
        beforePageCoverNote: undefined,
        coverAction: "Not applicable",
      }),
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const confirmed = await confirmSandboxCheckoutSession(
      started.checkoutSessionId,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;

    const first = ensureRmJ008PostPayDispatchStructureOnCampaign(
      confirmed.campaign,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.alreadyPresent).toBe(true);
    const sealFp = confirmed.campaign.paymentTruth?.rmj008KitSeal?.kitFingerprint;
    const second = ensureRmJ008PostPayDispatchStructureOnCampaign(first.campaign);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyPresent).toBe(true);
    expect(second.campaign.paymentTruth?.rmj008KitSeal?.kitFingerprint).toBe(
      sealFp,
    );
    expect(second.structure.platform).toBe("instagram");
    expect(second.structure.lockedKitMemberCount).toBe(4);
  });

  it("non-rm-j008 paid campaign does not invent Update Kit structure", async () => {
    const campaignId = `rmj008-postpay-skip-${Date.now()}`;
    const campaign: CampaignRecord = {
      ...unpaidCampaign(campaignId, ["bf-001"]),
      paymentReceivedAt: new Date().toISOString(),
      paymentTruth: {
        processor: "stripe",
        status: "confirmed",
        currency: "usd",
        expectedAmountCents: 9900,
        selectedServiceIds: ["bf-001"],
        decisionId: "d1",
        factFingerprint: "f1",
        draftRevision: 1,
        confirmedAt: new Date().toISOString(),
      },
    };
    const built = buildRmJ008PostPayDispatchStructureFromCampaign(campaign);
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.code).toBe("RM_J008_NOT_PAID");
    expect(campaign.rmJ008PostPayDispatchStructure).toBeUndefined();
  });
});
