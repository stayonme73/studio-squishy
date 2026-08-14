/**
 * STUDIO-OPERATING-DESIGN-RM-J008-INTAKE-PAYMENT-LOCK-1
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog";
import { getRouteMapIntakeSchema } from "@/catalog/intake";
import type { CampaignRecord } from "@/config/studio-board";
import {
  readRmJ008KitLock,
  writeRmJ008KitLock,
} from "@/lib/conversation-room-draft/rm-j008-kit";
import { computePlanPricingTotals } from "@/lib/plan-pricing";
import { createCheckoutSession } from "@/lib/studio-payment/create-session";
import { confirmSandboxCheckoutSession } from "@/lib/studio-payment/sandbox-confirm";
import { confirmPaymentFromProcessor } from "@/lib/studio-payment/confirm";
import { readCheckoutSessionBinding } from "@/lib/studio-payment/events-store";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";
import type { WorkingDraftRecord } from "@/lib/studio-working-draft/types";
import { WORKING_DRAFT_PERSISTED_FIELDS } from "@/config/studio-working-draft-v1";

import {
  assertRmJ008KitUnchangedAfterCheckoutAuthority,
  evaluateRmJ008KitPaymentGate,
  fingerprintRmJ008KitLiveTruth,
  sealRmJ008KitForPayment,
} from "./rm-j008-kit-payment-gate";
import {
  RM_J008_FORBIDDEN_CREDENTIAL_INTAKE_FIELDS,
  assertRmJ008KitReadyForPayment,
  mapRmJ008KitLockFromLiveTruth,
  type RmJ008LiveKitLockInput,
} from "./rm-j008-intake-truth";
import { DESIGN_RENDERER_RM_J008_SKU } from "./rm-j008-types";

function harborFacebookUpdateLock(
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
    projectNeed: "Need a Social Profile Update Kit for Facebook",
    businessName: "Harbor & Oak Studio",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a Social Profile Update Kit for Facebook",
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

function editableDraft(
  kitLock?: RmJ008LiveKitLockInput | null,
): WorkingDraftRecord {
  return {
    version: 1,
    status: "working_draft",
    editable: true,
    updatedAt: new Date().toISOString(),
    revision: 1,
    cursor: {},
    attribution: [],
    slices: kitLock ? { rmj008KitLock: kitLock } : {},
  };
}

describe("STUDIO-OPERATING-DESIGN-RM-J008-INTAKE-PAYMENT-LOCK-1", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_MODE;
  });

  afterEach(() => {
    /* no-op */
  });

  it("working draft persists rmj008KitLock field", () => {
    expect(WORKING_DRAFT_PERSISTED_FIELDS).toContain("rmj008KitLock");
  });

  it("maps Facebook → 5 members; Instagram/TikTok → 4; change sheet always; no cover on IG/TT", () => {
    const fb = mapRmJ008KitLockFromLiveTruth(harborFacebookUpdateLock());
    expect(fb.ok).toBe(true);
    if (!fb.ok) return;
    expect(fb.truth.platform).toBe("facebook");
    expect(fb.truth.lockedKitMemberCount).toBe(5);
    expect(fb.truth.plannedKitMembers.map((m) => m.memberId)).toEqual([
      "bio_about_copy",
      "field_map_checklist",
      "profile_image",
      "page_cover",
      "before_after_change_sheet",
    ]);
    expect(fb.manifestSeed.status).toBe("kit_locked_pre_payment");
    expect(fb.truth.beforeStateSource).toBe("customer_supplied");
    expect(fb.truth.replacementKitScope).toBe("full_platform_replacement_kit");
    expect(fb.truth.credentialsPresent).toBe(false);
    expect(fb.truth.ownerRoutine).toBe("NONE");
    expect(fb.truth.customerApplies).toBe(true);

    const ig = mapRmJ008KitLockFromLiveTruth(
      harborFacebookUpdateLock({
        platform: "Instagram",
        beforePageCoverNote: undefined,
        coverAction: "Not applicable",
      }),
    );
    expect(ig.ok).toBe(true);
    if (!ig.ok) return;
    expect(ig.truth.lockedKitMemberCount).toBe(4);
    expect(ig.truth.plannedKitMembers.map((m) => m.memberId)).toEqual([
      "bio_profile_copy",
      "field_map_checklist",
      "profile_image",
      "before_after_change_sheet",
    ]);
    expect(ig.truth.plannedKitMembers.some((m) => m.memberId === "page_cover")).toBe(
      false,
    );

    const tt = mapRmJ008KitLockFromLiveTruth(
      harborFacebookUpdateLock({
        platform: "TikTok",
        beforePageCoverNote: undefined,
        coverAction: "Not applicable",
      }),
    );
    expect(tt.ok).toBe(true);
    if (!tt.ok) return;
    expect(tt.truth.lockedKitMemberCount).toBe(4);
  });

  it("sku-only insufficient; missing before-state; live-inspect; partial kit; credentials fail closed", () => {
    const skuOnly = assertRmJ008KitReadyForPayment({
      selectedServiceIds: [DESIGN_RENDERER_RM_J008_SKU],
      kitLock: null,
    });
    expect(skuOnly.ok).toBe(false);
    if (!skuOnly.ok) {
      expect(skuOnly.code).toBe("SKU_ONLY_INSUFFICIENT");
      expect(skuOnly.blockCheckout).toBe(true);
    }

    const missingBefore = mapRmJ008KitLockFromLiveTruth(
      harborFacebookUpdateLock({ beforeBioOrAbout: "" }),
    );
    expect(missingBefore.ok).toBe(false);
    if (!missingBefore.ok) expect(missingBefore.code).toBe("MISSING_BEFORE_STATE");

    const liveInspect = mapRmJ008KitLockFromLiveTruth(
      harborFacebookUpdateLock({ beforeStateSource: "platform_readback" }),
    );
    expect(liveInspect.ok).toBe(false);
    if (!liveInspect.ok) {
      expect(liveInspect.code).toBe("BEFORE_STATE_NOT_CUSTOMER_SUPPLIED");
    }

    const inspectFlag = mapRmJ008KitLockFromLiveTruth(
      harborFacebookUpdateLock({ inspectLiveProfile: true }),
    );
    expect(inspectFlag.ok).toBe(false);
    if (!inspectFlag.ok) expect(inspectFlag.code).toBe("AMBIGUOUS_LEGACY_TRUTH");

    const bioOnly = mapRmJ008KitLockFromLiveTruth(
      harborFacebookUpdateLock({ bioOnly: true }),
    );
    expect(bioOnly.ok).toBe(false);
    if (!bioOnly.ok) expect(bioOnly.code).toBe("PARTIAL_KIT_FORBIDDEN");

    const badPlatform = mapRmJ008KitLockFromLiveTruth(
      harborFacebookUpdateLock({ platform: "LinkedIn" }),
    );
    expect(badPlatform.ok).toBe(false);
    if (!badPlatform.ok) expect(badPlatform.code).toBe("UNSUPPORTED_PLATFORM");

    const withCreds = mapRmJ008KitLockFromLiveTruth(
      harborFacebookUpdateLock({ adminInvite: "please-invite-studio@x.com" }),
    );
    expect(withCreds.ok).toBe(false);
    if (!withCreds.ok) {
      expect(withCreds.code).toBe("FORBIDDEN_CREDENTIAL_INTAKE");
    }

    const igCover = mapRmJ008KitLockFromLiveTruth(
      harborFacebookUpdateLock({
        platform: "Instagram",
        beforePageCoverNote: undefined,
        coverAction: "Not applicable",
        coverRequested: true,
      }),
    );
    expect(igCover.ok).toBe(false);
    if (!igCover.ok) expect(igCover.code).toBe("COVER_FORBIDDEN");
  });

  it("client-side membership tampering fails closed", () => {
    const mapped = mapRmJ008KitLockFromLiveTruth(harborFacebookUpdateLock());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const tampered = {
      ...mapped.truth,
      lockedKitMemberCount: 2 as const,
      plannedKitMembers: mapped.truth.plannedKitMembers.slice(0, 2),
    };
    const gate = evaluateRmJ008KitPaymentGate({
      selectedServiceIds: [DESIGN_RENDERER_RM_J008_SKU],
      kitLock: tampered as typeof mapped.truth,
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toMatch(/MEMBERSHIP_TAMPER|INVALID/);
  });

  it("checkout rejects rm-j008 without kit lock; accepts locked Facebook update kit (sandbox)", async () => {
    const campaignId = `rmj008-lock-sku-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const rejected = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      rmj008KitLock: null,
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error).toBe("rmj008_kit_lock_required");
    }

    const campaignId2 = `rmj008-lock-ok-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId2));
    const lock = harborFacebookUpdateLock();
    const started = await createCheckoutSession({
      campaignId: campaignId2,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      rmj008KitLock: lock,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.mode).toBe("sandbox");

    const binding = await readCheckoutSessionBinding(started.checkoutSessionId);
    expect(binding?.rmj008KitSeal?.platform).toBe("facebook");
    expect(binding?.rmj008KitSeal?.lockedKitMemberCount).toBe(5);
    expect(binding?.rmj008KitSeal?.memberIds).toEqual([
      "bio_about_copy",
      "field_map_checklist",
      "profile_image",
      "page_cover",
      "before_after_change_sheet",
    ]);
    expect(binding?.rmj008KitSeal?.beforeStateSource).toBe("customer_supplied");
    expect(binding?.rmj008KitSeal?.replacementKitScope).toBe(
      "full_platform_replacement_kit",
    );
    expect(binding?.rmj008KitSeal?.beforeStateIdentity.bioOrAbout).toContain(
      "weekend snapshots",
    );
    expect(binding?.rmj008KitSeal?.ownerRoutine).toBe("NONE");
    expect(binding?.rmj008KitSeal?.credentialsPresent).toBe(false);
    expect(binding?.rmj008KitSeal?.customerApplies).toBe(true);

    const confirmed = await confirmSandboxCheckoutSession(
      started.checkoutSessionId,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.paymentTruth?.rmj008KitSeal?.platform).toBe(
      "facebook",
    );
    expect(
      confirmed.campaign.paymentTruth?.rmj008KitSeal?.lockedKitMemberCount,
    ).toBe(5);
  });

  it("forged kit seal on confirm fails; post-payment platform/member swap fails closed", async () => {
    const campaignId = `rmj008-lock-forge-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      rmj008KitLock: harborFacebookUpdateLock(),
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const binding = await readCheckoutSessionBinding(started.checkoutSessionId);
    expect(binding?.rmj008KitSeal).toBeTruthy();
    const ig = mapRmJ008KitLockFromLiveTruth(
      harborFacebookUpdateLock({
        platform: "Instagram",
        beforePageCoverNote: undefined,
        coverAction: "Not applicable",
      }),
    );
    expect(ig.ok).toBe(true);
    if (!ig.ok || !binding?.rmj008KitSeal) return;
    const forged = sealRmJ008KitForPayment(ig.truth);

    const authorization = {
      decisionId: binding.decisionId,
      outcome: "CLEAR_TO_ACCEPT" as const,
      paymentAuthorized: true as const,
      evaluatedDraftRevision: binding.draftRevision,
      selectedServiceIds: [...binding.selectedServiceIds],
      factFingerprint: binding.factFingerprint,
      decisionSchemaVersion: 1,
      evaluatedAt: binding.createdAt,
      authorizedAt: new Date().toISOString(),
      packageId: "custom-studio-plan",
    };

    const forgedConfirm = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: started.checkoutSessionId,
      expectedAmountCents: binding.expectedAmountCents,
      confirmedAmountCents: binding.expectedAmountCents,
      currency: "usd",
      selectedServiceIds: [...binding.selectedServiceIds],
      decisionId: binding.decisionId,
      factFingerprint: binding.factFingerprint,
      draftRevision: binding.draftRevision,
      authorization,
      sandbox: true,
      rmj008KitSeal: forged,
    });
    expect(forgedConfirm.ok).toBe(false);
    if (!forgedConfirm.ok) expect(forgedConfirm.error).toBe("sku_mismatch");

    const postPay = assertRmJ008KitUnchangedAfterCheckoutAuthority({
      sealed: binding.rmj008KitSeal,
      attempted: harborFacebookUpdateLock({
        platform: "TikTok",
        beforePageCoverNote: undefined,
        coverAction: "Not applicable",
      }),
    });
    expect(postPay.ok).toBe(false);
    if (!postPay.ok) {
      expect(postPay.code).toBe("POST_PAYMENT_PLATFORM_MUTATION");
    }

    const memberSwap = assertRmJ008KitUnchangedAfterCheckoutAuthority({
      sealed: binding.rmj008KitSeal,
      attempted: {
        ...binding.rmj008KitSeal.truth,
        lockedKitMemberCount: 4 as const,
        plannedKitMembers: binding.rmj008KitSeal.truth.plannedKitMembers.filter(
          (m) => m.memberId !== "page_cover",
        ),
      },
    });
    expect(memberSwap.ok).toBe(false);
    if (!memberSwap.ok) {
      expect(memberSwap.code).toMatch(
        /POST_PAYMENT_MEMBER_SWAP|POST_CHECKOUT_KIT_MUTATION|MEMBERSHIP/,
      );
    }

    const same = assertRmJ008KitUnchangedAfterCheckoutAuthority({
      sealed: binding.rmj008KitSeal,
      attempted: harborFacebookUpdateLock(),
    });
    expect(same.ok).toBe(true);
  });

  it("draft write blocked after purchase; working draft stores normalized truth", () => {
    const draft = editableDraft();
    const written = writeRmJ008KitLock(draft, harborFacebookUpdateLock());
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const read = readRmJ008KitLock(written.draft);
    expect(read && "lockedBeforePayment" in read && read.platform).toBe(
      "facebook",
    );
    expect(read && "beforeStateSource" in read && read.beforeStateSource).toBe(
      "customer_supplied",
    );

    const purchased: WorkingDraftRecord = {
      ...written.draft,
      status: "purchased",
      editable: false,
    };
    const blocked = writeRmJ008KitLock(
      purchased,
      harborFacebookUpdateLock({
        platform: "Instagram",
        beforePageCoverNote: undefined,
        coverAction: "Not applicable",
      }),
    );
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("NOT_EDITABLE");
  });

  it("live catalog + intake language: no login/admin-invite; customer-supplied before-state", () => {
    const service = getServiceById(DESIGN_RENDERER_RM_J008_SKU)!;
    expect(service.requiresClientAccess).toBe(false);
    const responsibilities = (service.clientResponsibilities ?? []).join(" ");
    expect(responsibilities).not.toMatch(/admin invite/i);
    expect(responsibilities).not.toMatch(/password/i);
    expect(responsibilities).toMatch(/apply the delivered update kit/i);
    expect(responsibilities).toMatch(/does not log in or inspect/i);

    const schema = getRouteMapIntakeSchema("social-update");
    expect(schema.lead).toMatch(/never asks for your platform login/i);
    expect(schema.lead).toMatch(/does not inspect your live profile later/i);
    const fieldIds = schema.fields.map((f) => f.id);
    for (const forbidden of RM_J008_FORBIDDEN_CREDENTIAL_INTAKE_FIELDS) {
      expect(fieldIds).not.toContain(forbidden);
    }
    expect(fieldIds).toContain("platform");
    expect(fieldIds).toContain("beforeDisplayName");
    expect(fieldIds).toContain("beforeBioOrAbout");
    expect(fieldIds).toContain("beforeProfileImageNote");
    expect(fieldIds).toContain("updateIntentNotes");
    expect(fieldIds).toContain("avatarAction");
    expect(service.intakeTemplate).toBe("social-update");
  });

  it("non-rm-j008 checkout unaffected", async () => {
    const gate = evaluateRmJ008KitPaymentGate({
      selectedServiceIds: ["ma-001"],
      kitLock: null,
    });
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(gate.applicable).toBe(false);

    const fp = fingerprintRmJ008KitLiveTruth(
      (mapRmJ008KitLockFromLiveTruth(harborFacebookUpdateLock()) as Extract<
        ReturnType<typeof mapRmJ008KitLockFromLiveTruth>,
        { ok: true }
      >).truth,
    );
    expect(fp).toHaveLength(64);
  });
});
