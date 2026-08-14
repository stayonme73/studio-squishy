/**
 * STUDIO-OPERATING-DESIGN-RM-J002-INTAKE-PAYMENT-LOCK-1
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog";
import { getRouteMapIntakeSchema } from "@/catalog/intake";
import type { CampaignRecord } from "@/config/studio-board";
import {
  readRmJ002KitLock,
  writeRmJ002KitLock,
} from "@/lib/conversation-room-draft/rm-j002-kit";
import { computePlanPricingTotals } from "@/lib/plan-pricing";
import { createCheckoutSession } from "@/lib/studio-payment/create-session";
import { confirmSandboxCheckoutSession } from "@/lib/studio-payment/sandbox-confirm";
import { confirmPaymentFromProcessor } from "@/lib/studio-payment/confirm";
import {
  readCheckoutSessionBinding,
} from "@/lib/studio-payment/events-store";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";
import type { WorkingDraftRecord } from "@/lib/studio-working-draft/types";
import { WORKING_DRAFT_PERSISTED_FIELDS } from "@/config/studio-working-draft-v1";

import {
  assertRmJ002KitUnchangedAfterCheckoutAuthority,
  evaluateRmJ002KitPaymentGate,
  fingerprintRmJ002KitLiveTruth,
  sealRmJ002KitForPayment,
} from "./rm-j002-kit-payment-gate";
import {
  RM_J002_FORBIDDEN_CREDENTIAL_INTAKE_FIELDS,
  assertRmJ002KitReadyForPayment,
  mapRmJ002KitLockFromLiveTruth,
  type RmJ002LiveKitLockInput,
} from "./rm-j002-intake-truth";
import { DESIGN_RENDERER_RM_J002_SKU } from "./rm-j002-types";

function harborFacebookLock(
  overrides: Partial<RmJ002LiveKitLockInput> = {},
): RmJ002LiveKitLockInput {
  return {
    platform: "Facebook",
    businessName: "Harbor & Oak Studio",
    displayName: "Harbor & Oak Studio",
    profileGoal:
      "Show a calm portrait photography studio that books discovery calls.",
    currentProfileNotes:
      "New professional profile. Emphasize downtown sessions and clear booking link.",
    website: "https://harbor-and-oak.example",
    phone: "(555) 014-2200",
    brandNotes: "Logo harbor-oak-anchor.svg — warm oak + soft harbor blue.",
    ...overrides,
  };
}

function clearFacts(
  overrides: Partial<PreAcceptanceProjectFacts> = {},
): PreAcceptanceProjectFacts {
  return {
    draftRevision: 1,
    routeId: "i75",
    selectedServiceIds: [DESIGN_RENDERER_RM_J002_SKU],
    projectNeed: "Need a Social Profile Setup Kit for Facebook",
    businessName: "Harbor & Oak Studio",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a Social Profile Setup Kit for Facebook",
    ...overrides,
  };
}

function unpaidCampaign(
  campaignId: string,
  skuIds: string[] = [DESIGN_RENDERER_RM_J002_SKU],
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
  kitLock?: RmJ002LiveKitLockInput | null,
): WorkingDraftRecord {
  return {
    version: 1,
    status: "working_draft",
    editable: true,
    updatedAt: new Date().toISOString(),
    revision: 1,
    cursor: {},
    attribution: [],
    slices: kitLock ? { rmj002KitLock: kitLock } : {},
  };
}

describe("STUDIO-OPERATING-DESIGN-RM-J002-INTAKE-PAYMENT-LOCK-1", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_MODE;
  });

  afterEach(() => {
    /* no-op */
  });

  it("working draft persists rmj002KitLock field", () => {
    expect(WORKING_DRAFT_PERSISTED_FIELDS).toContain("rmj002KitLock");
  });

  it("maps Facebook → 4 members; Instagram/TikTok → 3; no cover on IG/TT", () => {
    const fb = mapRmJ002KitLockFromLiveTruth(harborFacebookLock());
    expect(fb.ok).toBe(true);
    if (!fb.ok) return;
    expect(fb.truth.platform).toBe("facebook");
    expect(fb.truth.lockedKitMemberCount).toBe(4);
    expect(fb.truth.plannedKitMembers.map((m) => m.memberId)).toEqual([
      "bio_about_copy",
      "field_map_checklist",
      "profile_image",
      "page_cover",
    ]);
    expect(fb.manifestSeed.status).toBe("kit_locked_pre_payment");
    expect(fb.truth.credentialsPresent).toBe(false);
    expect(fb.truth.ownerRoutine).toBe("NONE");

    const ig = mapRmJ002KitLockFromLiveTruth(
      harborFacebookLock({ platform: "Instagram" }),
    );
    expect(ig.ok).toBe(true);
    if (!ig.ok) return;
    expect(ig.truth.lockedKitMemberCount).toBe(3);
    expect(ig.truth.plannedKitMembers.some((m) => m.memberId === "page_cover")).toBe(
      false,
    );

    const tt = mapRmJ002KitLockFromLiveTruth(
      harborFacebookLock({ platform: "TikTok" }),
    );
    expect(tt.ok).toBe(true);
    if (!tt.ok) return;
    expect(tt.truth.lockedKitMemberCount).toBe(3);
  });

  it("sku-only insufficient; unsupported platform / credential intake fail closed", () => {
    const skuOnly = assertRmJ002KitReadyForPayment({
      selectedServiceIds: [DESIGN_RENDERER_RM_J002_SKU],
      kitLock: null,
    });
    expect(skuOnly.ok).toBe(false);
    if (!skuOnly.ok) {
      expect(skuOnly.code).toBe("SKU_ONLY_INSUFFICIENT");
      expect(skuOnly.blockCheckout).toBe(true);
    }

    const badPlatform = mapRmJ002KitLockFromLiveTruth(
      harborFacebookLock({ platform: "LinkedIn" }),
    );
    expect(badPlatform.ok).toBe(false);
    if (!badPlatform.ok) expect(badPlatform.code).toBe("UNSUPPORTED_PLATFORM");

    const withCreds = mapRmJ002KitLockFromLiveTruth(
      harborFacebookLock({ adminInvite: "please-invite-studio@x.com" }),
    );
    expect(withCreds.ok).toBe(false);
    if (!withCreds.ok) {
      expect(withCreds.code).toBe("FORBIDDEN_CREDENTIAL_INTAKE");
    }

    const igCover = mapRmJ002KitLockFromLiveTruth(
      harborFacebookLock({
        platform: "Instagram",
        coverRequested: true,
      }),
    );
    expect(igCover.ok).toBe(false);
    if (!igCover.ok) expect(igCover.code).toBe("COVER_FORBIDDEN");
  });

  it("client-side membership tampering fails closed", () => {
    const mapped = mapRmJ002KitLockFromLiveTruth(harborFacebookLock());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    const tampered = {
      ...mapped.truth,
      lockedKitMemberCount: 3 as const,
      plannedKitMembers: mapped.truth.plannedKitMembers.slice(0, 3),
    };
    const gate = evaluateRmJ002KitPaymentGate({
      selectedServiceIds: [DESIGN_RENDERER_RM_J002_SKU],
      kitLock: tampered,
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toMatch(/MEMBERSHIP_TAMPER|INVALID/);
  });

  it("checkout rejects rm-j002 without kit lock; accepts locked Facebook kit (sandbox)", async () => {
    const campaignId = `rmj002-lock-sku-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const rejected = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      rmj002KitLock: null,
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error).toBe("rmj002_kit_lock_required");
    }

    const campaignId2 = `rmj002-lock-ok-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId2));
    const lock = harborFacebookLock();
    const started = await createCheckoutSession({
      campaignId: campaignId2,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      rmj002KitLock: lock,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.mode).toBe("sandbox");

    const binding = await readCheckoutSessionBinding(started.checkoutSessionId);
    expect(binding?.rmj002KitSeal?.platform).toBe("facebook");
    expect(binding?.rmj002KitSeal?.lockedKitMemberCount).toBe(4);
    expect(binding?.rmj002KitSeal?.memberIds).toEqual([
      "bio_about_copy",
      "field_map_checklist",
      "profile_image",
      "page_cover",
    ]);
    expect(binding?.rmj002KitSeal?.ownerRoutine).toBe("NONE");
    expect(binding?.rmj002KitSeal?.credentialsPresent).toBe(false);

    const confirmed = await confirmSandboxCheckoutSession(
      started.checkoutSessionId,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.paymentTruth?.rmj002KitSeal?.platform).toBe(
      "facebook",
    );
    expect(
      confirmed.campaign.paymentTruth?.rmj002KitSeal?.lockedKitMemberCount,
    ).toBe(4);
  });

  it("forged kit seal on confirm fails; post-payment platform change fails closed", async () => {
    const campaignId = `rmj002-lock-forge-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const started = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      rmj002KitLock: harborFacebookLock(),
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const binding = await readCheckoutSessionBinding(started.checkoutSessionId);
    expect(binding?.rmj002KitSeal).toBeTruthy();
    const ig = mapRmJ002KitLockFromLiveTruth(
      harborFacebookLock({ platform: "Instagram" }),
    );
    expect(ig.ok).toBe(true);
    if (!ig.ok || !binding?.rmj002KitSeal) return;
    const forged = sealRmJ002KitForPayment(ig.truth);

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
      rmj002KitSeal: forged,
    });
    expect(forgedConfirm.ok).toBe(false);
    if (!forgedConfirm.ok) expect(forgedConfirm.error).toBe("sku_mismatch");

    const postPay = assertRmJ002KitUnchangedAfterCheckoutAuthority({
      sealed: binding.rmj002KitSeal,
      attempted: harborFacebookLock({ platform: "TikTok" }),
    });
    expect(postPay.ok).toBe(false);
    if (!postPay.ok) {
      expect(postPay.code).toBe("POST_PAYMENT_PLATFORM_MUTATION");
    }

    const same = assertRmJ002KitUnchangedAfterCheckoutAuthority({
      sealed: binding.rmj002KitSeal,
      attempted: harborFacebookLock(),
    });
    expect(same.ok).toBe(true);
  });

  it("draft write blocked after purchase; working draft stores normalized truth", () => {
    const draft = editableDraft();
    const written = writeRmJ002KitLock(draft, harborFacebookLock());
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const read = readRmJ002KitLock(written.draft);
    expect(read && "lockedBeforePayment" in read && read.platform).toBe(
      "facebook",
    );

    const purchased: WorkingDraftRecord = {
      ...written.draft,
      status: "purchased",
      editable: false,
    };
    const blocked = writeRmJ002KitLock(purchased, harborFacebookLock({
      platform: "Instagram",
    }));
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("NOT_EDITABLE");
  });

  it("live catalog + intake language: no login/admin-invite request for rm-j002", () => {
    const service = getServiceById(DESIGN_RENDERER_RM_J002_SKU)!;
    expect(service.requiresClientAccess).toBe(false);
    const responsibilities = (service.clientResponsibilities ?? []).join(" ");
    expect(responsibilities).not.toMatch(/admin invite/i);
    expect(responsibilities).not.toMatch(/password/i);
    expect(responsibilities).not.toMatch(/platform-required login/i);
    expect(responsibilities).toMatch(/apply the delivered kit/i);

    const schema = getRouteMapIntakeSchema("social-setup");
    expect(schema.lead).toMatch(/never asks for your platform login/i);
    const fieldIds = schema.fields.map((f) => f.id);
    for (const forbidden of RM_J002_FORBIDDEN_CREDENTIAL_INTAKE_FIELDS) {
      expect(fieldIds).not.toContain(forbidden);
    }
    expect(fieldIds).toContain("platform");
    expect(fieldIds).toContain("displayName");
    expect(fieldIds).toContain("brandNotes");
    expect(schema.fields.find((f) => f.id === "brandNotes")?.required).toBe(
      true,
    );
  });

  it("non-rm-j002 checkout unaffected", async () => {
    const gate = evaluateRmJ002KitPaymentGate({
      selectedServiceIds: ["ma-001"],
      kitLock: null,
    });
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(gate.applicable).toBe(false);

    const fp = fingerprintRmJ002KitLiveTruth(
      (mapRmJ002KitLockFromLiveTruth(harborFacebookLock()) as Extract<
        ReturnType<typeof mapRmJ002KitLockFromLiveTruth>,
        { ok: true }
      >).truth,
    );
    expect(fp).toHaveLength(64);
  });
});
