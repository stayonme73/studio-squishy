/**
 * STUDIO-OPERATING-DESIGN-BF-001-INTAKE-PAYMENT-LOCK-1
 */

import { beforeEach, describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog";
import { getRouteMapIntakeSchema } from "@/catalog/intake";
import type { CampaignRecord } from "@/config/studio-board";
import {
  readBf001PackageLock,
  writeBf001PackageLock,
} from "@/lib/conversation-room-draft/bf-001-package";
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
  assertBf001PackageUnchangedAfterCheckoutAuthority,
  evaluateBf001PackagePaymentGate,
  fingerprintBf001PackageLiveTruth,
  sealBf001PackageForPayment,
} from "./bf-001-kit-payment-gate";
import {
  BF_001_FORBIDDEN_SCOPE_INTAKE_FIELDS,
  assertBf001PackageReadyForPayment,
  mapBf001PackageLockFromLiveTruth,
  type Bf001LivePackageLockInput,
} from "./bf-001-intake-truth";
import { DESIGN_RENDERER_BF_001_SKU } from "./bf-001-types";

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
    projectNeed: "Need a Brand Identity Refresh with a profile image",
    businessName: "Harbor & Oak Studio",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a Brand Identity Refresh with a profile image",
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

function editableDraft(
  packageLock?: Bf001LivePackageLockInput | null,
): WorkingDraftRecord {
  return {
    version: 1,
    status: "working_draft",
    editable: true,
    updatedAt: new Date().toISOString(),
    revision: 1,
    cursor: {},
    attribution: [],
    slices: packageLock ? { bf001PackageLock: packageLock } : {},
  };
}

describe("STUDIO-OPERATING-DESIGN-BF-001-INTAKE-PAYMENT-LOCK-1", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_MODE;
  });

  it("working draft persists bf001PackageLock field", () => {
    expect(WORKING_DRAFT_PERSISTED_FIELDS).toContain("bf001PackageLock");
  });

  it("maps profile / cover to exactly 2 members with the matching graphic plate", () => {
    const profile = mapBf001PackageLockFromLiveTruth(harborRefreshLock());
    expect(profile.ok).toBe(true);
    if (!profile.ok) return;
    expect(profile.truth.graphicKind).toBe("profile");
    expect(profile.truth.lockedPackageMemberCount).toBe(2);
    expect(profile.truth.plannedMembers.map((m) => m.memberId)).toEqual([
      "brand_direction_sheet",
      "profile_or_cover_graphic",
    ]);
    expect(profile.truth.plannedMembers.map((m) => m.kind)).toEqual([
      "strategy_document",
      "design_profile",
    ]);
    expect(profile.truth.startingPointSource).toBe("customer_supplied");
    expect(profile.truth.lockedBeforePayment).toBe(true);
    expect(profile.truth.newLogoRequested).toBe(false);
    expect(profile.truth.namingRequested).toBe(false);
    expect(profile.truth.messagingRequested).toBe(false);
    expect(profile.truth.fontSectionMode).toBe("recommendations_only");
    expect(profile.truth.graphicFontPolicy).toBe("studio_safe_only");
    expect(profile.truth.ownerRoutine).toBe("NONE");
    expect(profile.manifestSeed.status).toBe("package_locked_pre_payment");

    const cover = mapBf001PackageLockFromLiveTruth(
      harborRefreshLock({ graphicKind: "Cover graphic" }),
    );
    expect(cover.ok).toBe(true);
    if (!cover.ok) return;
    expect(cover.truth.graphicKind).toBe("cover");
    expect(cover.truth.lockedPackageMemberCount).toBe(2);
    expect(cover.truth.plannedMembers[1]!.kind).toBe("design_cover");
    expect(cover.truth.plannedMembers[1]!.agreedPlateId).not.toBe(
      profile.truth.plannedMembers[1]!.agreedPlateId,
    );
    // Sheet plate is identical for both graphic kinds.
    expect(cover.truth.plannedMembers[0]!.agreedPlateId).toBe(
      profile.truth.plannedMembers[0]!.agreedPlateId,
    );
  });

  it("sku-only insufficient; missing name / starting point / invent-from-nothing / partial / out-of-scope fail closed", () => {
    const skuOnly = assertBf001PackageReadyForPayment({
      selectedServiceIds: [DESIGN_RENDERER_BF_001_SKU],
      packageLock: null,
    });
    expect(skuOnly.ok).toBe(false);
    if (!skuOnly.ok) {
      expect(skuOnly.code).toBe("SKU_ONLY_INSUFFICIENT");
      expect(skuOnly.blockCheckout).toBe(true);
    }

    const noGraphic = mapBf001PackageLockFromLiveTruth(
      harborRefreshLock({ graphicKind: "" }),
    );
    expect(noGraphic.ok).toBe(false);
    if (!noGraphic.ok) expect(noGraphic.code).toBe("NO_GRAPHIC_SELECTED");

    const badGraphic = mapBf001PackageLockFromLiveTruth(
      harborRefreshLock({ graphicKind: "Banner" }),
    );
    expect(badGraphic.ok).toBe(false);
    if (!badGraphic.ok) {
      expect(badGraphic.code).toBe("UNSUPPORTED_GRAPHIC_KIND");
    }

    const bothGraphics = mapBf001PackageLockFromLiveTruth(
      harborRefreshLock({ bothProfileAndCover: true }),
    );
    expect(bothGraphics.ok).toBe(false);
    if (!bothGraphics.ok) {
      expect(bothGraphics.code).toBe("AMBIGUOUS_LEGACY_TRUTH");
    }

    const missingName = mapBf001PackageLockFromLiveTruth(
      harborRefreshLock({ businessName: "" }),
    );
    expect(missingName.ok).toBe(false);
    if (!missingName.ok) {
      expect(missingName.code).toBe("BUSINESS_NAME_MISSING");
    }

    const missingNotes = mapBf001PackageLockFromLiveTruth(
      harborRefreshLock({ visualStartingPointNotes: "" }),
    );
    expect(missingNotes.ok).toBe(false);
    if (!missingNotes.ok) {
      expect(missingNotes.code).toBe("STARTING_POINT_INSUFFICIENT");
    }

    const missingLogo = mapBf001PackageLockFromLiveTruth(
      harborRefreshLock({ logoMaterialNote: "" }),
    );
    expect(missingLogo.ok).toBe(false);
    if (!missingLogo.ok) {
      expect(missingLogo.code).toBe("STARTING_POINT_INSUFFICIENT");
    }

    const inventFromNothing = mapBf001PackageLockFromLiveTruth(
      harborRefreshLock({ startingPointSource: "studio_invented" }),
    );
    expect(inventFromNothing.ok).toBe(false);
    if (!inventFromNothing.ok) {
      expect(inventFromNothing.code).toBe(
        "STARTING_POINT_NOT_CUSTOMER_SUPPLIED",
      );
    }

    const sheetOnly = mapBf001PackageLockFromLiveTruth(
      harborRefreshLock({ sheetOnly: true }),
    );
    expect(sheetOnly.ok).toBe(false);
    if (!sheetOnly.ok) {
      expect(sheetOnly.code).toBe("PARTIAL_PACKAGE_FORBIDDEN");
    }

    for (const forbidden of [
      "namingRequested",
      "newLogoRequested",
      "messagingRequested",
      "taglineOptions",
    ] as const) {
      const outOfScope = mapBf001PackageLockFromLiveTruth(
        harborRefreshLock({ [forbidden]: "yes please" }),
      );
      expect(outOfScope.ok, forbidden).toBe(false);
      if (!outOfScope.ok) {
        expect(outOfScope.code).toBe("FORBIDDEN_SCOPE_INTAKE");
      }
    }
  });

  it("client-side membership tampering fails closed", () => {
    const mapped = mapBf001PackageLockFromLiveTruth(harborRefreshLock());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;

    const dropped = evaluateBf001PackagePaymentGate({
      selectedServiceIds: [DESIGN_RENDERER_BF_001_SKU],
      packageLock: {
        ...mapped.truth,
        plannedMembers: mapped.truth.plannedMembers.slice(0, 1),
      } as typeof mapped.truth,
    });
    expect(dropped.ok).toBe(false);
    if (!dropped.ok) expect(dropped.code).toMatch(/MEMBERSHIP_TAMPER|INVALID/);

    const dualGraphic = evaluateBf001PackagePaymentGate({
      selectedServiceIds: [DESIGN_RENDERER_BF_001_SKU],
      packageLock: {
        ...mapped.truth,
        plannedMembers: [
          mapped.truth.plannedMembers[0]!,
          mapped.truth.plannedMembers[1]!,
          { ...mapped.truth.plannedMembers[1]!, kind: "design_cover" as const },
        ],
      } as typeof mapped.truth,
    });
    expect(dualGraphic.ok).toBe(false);
    if (!dualGraphic.ok) expect(dualGraphic.code).toBe("PROFILE_AND_COVER");
  });

  it("checkout rejects bf-001 without package lock; accepts locked refresh (sandbox)", async () => {
    const campaignId = `bf001-lock-sku-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId));
    const rejected = await createCheckoutSession({
      campaignId,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      bf001PackageLock: null,
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error).toBe("bf001_package_lock_required");
    }

    const campaignId2 = `bf001-lock-ok-${Date.now()}`;
    await upsertCampaignRecord(unpaidCampaign(campaignId2));
    const started = await createCheckoutSession({
      campaignId: campaignId2,
      facts: clearFacts(),
      returnOrigin: "http://localhost:3000",
      preferSandbox: true,
      bf001PackageLock: harborRefreshLock(),
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.mode).toBe("sandbox");

    const binding = await readCheckoutSessionBinding(started.checkoutSessionId);
    expect(binding?.bf001PackageSeal?.graphicKind).toBe("profile");
    expect(binding?.bf001PackageSeal?.lockedPackageMemberCount).toBe(2);
    expect(binding?.bf001PackageSeal?.memberIds).toEqual([
      "brand_direction_sheet",
      "profile_or_cover_graphic",
    ]);
    expect(binding?.bf001PackageSeal?.memberPlateIds).toHaveLength(2);
    expect(binding?.bf001PackageSeal?.startingPointSource).toBe(
      "customer_supplied",
    );
    expect(
      binding?.bf001PackageSeal?.startingPointIdentity.logoMaterialNote,
    ).toContain("harbor-oak-anchor");
    expect(binding?.bf001PackageSeal?.newLogoRequested).toBe(false);
    expect(binding?.bf001PackageSeal?.namingRequested).toBe(false);
    expect(binding?.bf001PackageSeal?.ownerRoutine).toBe("NONE");

    const confirmed = await confirmSandboxCheckoutSession(
      started.checkoutSessionId,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.paymentTruth?.bf001PackageSeal?.graphicKind).toBe(
      "profile",
    );
    expect(
      confirmed.campaign.paymentTruth?.bf001PackageSeal
        ?.lockedPackageMemberCount,
    ).toBe(2);
  });

  it("forged seal on confirm fails; post-payment graphic-kind or starting-point change fails closed", async () => {
    const campaignId = `bf001-lock-forge-${Date.now()}`;
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

    const binding = await readCheckoutSessionBinding(started.checkoutSessionId);
    expect(binding?.bf001PackageSeal).toBeTruthy();
    const coverTruth = mapBf001PackageLockFromLiveTruth(
      harborRefreshLock({ graphicKind: "Cover graphic" }),
    );
    expect(coverTruth.ok).toBe(true);
    if (!coverTruth.ok || !binding?.bf001PackageSeal) return;
    const forged = sealBf001PackageForPayment(coverTruth.truth);

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
      bf001PackageSeal: forged,
    });
    expect(forgedConfirm.ok).toBe(false);
    if (!forgedConfirm.ok) expect(forgedConfirm.error).toBe("sku_mismatch");

    const kindSwap = assertBf001PackageUnchangedAfterCheckoutAuthority({
      sealed: binding.bf001PackageSeal,
      attempted: harborRefreshLock({ graphicKind: "Cover graphic" }),
    });
    expect(kindSwap.ok).toBe(false);
    if (!kindSwap.ok) {
      expect(kindSwap.code).toBe("POST_PAYMENT_GRAPHIC_KIND_MUTATION");
    }

    const startingPointSwap = assertBf001PackageUnchangedAfterCheckoutAuthority({
      sealed: binding.bf001PackageSeal,
      attempted: harborRefreshLock({
        logoMaterialNote: "Actually use a brand-new mark we have not sent yet.",
      }),
    });
    expect(startingPointSwap.ok).toBe(false);
    if (!startingPointSwap.ok) {
      expect(startingPointSwap.code).toBe("POST_CHECKOUT_PACKAGE_MUTATION");
    }

    const memberSwap = assertBf001PackageUnchangedAfterCheckoutAuthority({
      sealed: binding.bf001PackageSeal,
      attempted: {
        ...binding.bf001PackageSeal.truth,
        plannedMembers: binding.bf001PackageSeal.truth.plannedMembers.filter(
          (m) => m.memberId !== "profile_or_cover_graphic",
        ),
      },
    });
    expect(memberSwap.ok).toBe(false);
    if (!memberSwap.ok) {
      expect(memberSwap.code).toMatch(
        /POST_PAYMENT_MEMBER_SWAP|POST_CHECKOUT_PACKAGE_MUTATION/,
      );
    }

    const same = assertBf001PackageUnchangedAfterCheckoutAuthority({
      sealed: binding.bf001PackageSeal,
      attempted: harborRefreshLock(),
    });
    expect(same.ok).toBe(true);
  });

  it("draft write blocked after purchase; working draft stores normalized truth", () => {
    const draft = editableDraft();
    const written = writeBf001PackageLock(draft, harborRefreshLock());
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const read = readBf001PackageLock(written.draft);
    expect(read && "lockedBeforePayment" in read && read.graphicKind).toBe(
      "profile",
    );
    expect(read && "startingPointSource" in read && read.startingPointSource).toBe(
      "customer_supplied",
    );

    const purchased: WorkingDraftRecord = {
      ...written.draft,
      status: "purchased",
      editable: false,
    };
    const blocked = writeBf001PackageLock(
      purchased,
      harborRefreshLock({ graphicKind: "Cover graphic" }),
    );
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("NOT_EDITABLE");
  });

  it("live catalog + intake language: refresh not invent; no new logo; supplied mark required", () => {
    const service = getServiceById(DESIGN_RENDERER_BF_001_SKU)!;
    expect(service.requiresClientMaterials).toBe(true);
    expect(service.exclusions.join(" ")).toMatch(/new logo creation/i);
    expect(service.exclusions.join(" ")).toMatch(/naming/i);
    expect(service.intakeTemplate).toBe("brand-refresh");

    const schema = getRouteMapIntakeSchema("brand-refresh");
    expect(schema.lead).toMatch(/refreshes the brand you already have/i);
    expect(schema.lead).toMatch(/does not invent a new one/i);
    expect(schema.lead).toMatch(/does not draw a new logo/i);
    const fieldIds = schema.fields.map((f) => f.id);
    for (const forbidden of BF_001_FORBIDDEN_SCOPE_INTAKE_FIELDS) {
      expect(fieldIds).not.toContain(forbidden);
    }
    expect(fieldIds).toContain("businessName");
    expect(fieldIds).toContain("graphicKind");
    expect(fieldIds).toContain("visualStartingPointNotes");
    expect(fieldIds).toContain("logoMaterialNote");
    expect(fieldIds).toContain("likesDislikes");
    expect(fieldIds).toContain("businessFacts");

    const graphicField = schema.fields.find((f) => f.id === "graphicKind")!;
    expect(graphicField.options).toEqual(["Profile image", "Cover graphic"]);
    const logoField = schema.fields.find((f) => f.id === "logoMaterialNote")!;
    expect(logoField.role).toBe("materials");
    expect(logoField.required).toBe(true);
  });

  it("non-bf-001 checkout unaffected", () => {
    const gate = evaluateBf001PackagePaymentGate({
      selectedServiceIds: ["ma-001"],
      packageLock: null,
    });
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(gate.applicable).toBe(false);

    const mapped = mapBf001PackageLockFromLiveTruth(harborRefreshLock());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(fingerprintBf001PackageLiveTruth(mapped.truth)).toHaveLength(64);
  });
});
