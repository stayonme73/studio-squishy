/**
 * STUDIO-OPERATING-DESIGN-RM-J008-DISPATCH-HOOK-1
 */

import { mkdirSync, writeFileSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  DESIGN_RENDERER_RM_J008_SKU,
  buildRmJ008PostPayDispatchStructureFromPaymentSeal,
  mapRmJ008KitLockFromLiveTruth,
  sealRmJ008KitForPayment,
  type RmJ008LiveKitLockInput,
} from "@/lib/studio-design-renderer";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";

import { evaluateJobDispatch } from "./evaluate";
import { invokeRmJ008DispatchHook } from "./rm-j008-dispatch-hook";
import { mapRmJ008KitProjectTruthFromJob } from "./map-rm-j008-job-truth";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");
const ARTIFACTS_DIR = path.join(REPO, "data", "campaign-design-artifacts");
const SKU = DESIGN_RENDERER_RM_J008_SKU;

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

function paidRmJ008Campaign(
  campaignId: string,
  platform: "Facebook" | "Instagram" | "TikTok" = "Facebook",
): CampaignRecord {
  const now = new Date().toISOString();
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
  const seal = sealRmJ008KitForPayment(mapped.truth);
  const built = buildRmJ008PostPayDispatchStructureFromPaymentSeal(seal);
  if (!built.ok) throw new Error(built.message);

  return {
    campaignId,
    campaignName: "Harbor Oak",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "rm-j008 dispatch hook",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 9900,
      confirmedAmountCents: 9900,
      checkoutSessionId: `cs_${campaignId}`,
      selectedServiceIds: [SKU],
      decisionId: `dec_${campaignId}`,
      factFingerprint: `fp_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
      rmj008KitSeal: seal,
    },
    rmJ008PostPayDispatchStructure: built.structure,
  };
}

function readyRmJ008Record(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::${SKU}`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: SKU,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "social_media" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-rm-j008",
    capabilityReadiness: "contract_ready" as const,
    evaluatedAt: new Date().toISOString(),
    reason: null,
    blocker: null,
    ownerActionRequired: false as const,
  };
  return evaluateJobDispatch({
    campaignId,
    routing,
    jobId,
    skuId: SKU,
  });
}

function approvedLogo(campaignId: string): CampaignMaterialItem {
  const now = new Date().toISOString();
  return {
    id: `logo-${campaignId}`,
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus: "approved_for_use",
    contentKind: "file-metadata",
    label: "Logo",
    reason: "Brand mark",
    relatedServiceIds: [SKU],
    uploadStatus: "stored",
    useAuthorization: { basis: "customer_owns", attestedAt: now },
  };
}

function stageLogo(campaignId: string): string {
  const logoRel = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
  const logoAbs = path.join(REPO, logoRel);
  mkdirSync(path.dirname(logoAbs), { recursive: true });
  writeFileSync(logoAbs, HARBOR_OAK_LOGO_SVG, "utf8");
  return logoRel;
}

describe("STUDIO-OPERATING-DESIGN-RM-J008-DISPATCH-HOOK-1", () => {
  const seeded: string[] = [];

  afterEach(async () => {
    await Promise.all(
      seeded.splice(0).map((id) =>
        Promise.all([
          fs.rm(path.join(MATERIALS_DIR, id), { recursive: true, force: true }),
          fs.rm(path.join(ARTIFACTS_DIR, id), { recursive: true, force: true }),
        ]).catch(() => undefined),
      ),
    );
  });

  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("remaps rm-j008 onto studio_design_renderer; rm-j007 stays Canva", () => {
    const kit = resolveServiceProductionContract(SKU);
    expect(kit.status).toBe("resolved");
    if (kit.status !== "resolved") return;
    expect(kit.contract.primaryTool.toolId).toBe("studio_design_renderer");
    expect(kit.contract.readinessNotes).toMatch(/Canva is not on the fulfillment spine/i);

    const sealed = [
      "v2-rtu-flyer",
      "v2-rtu-business-card",
      "v2-rtu-menu",
      "v2-rtu-service-sheet",
      "v2-rtu-promotion-graphics",
      "v2-rtu-social-posts",
      "sm-001",
      "sm-001-monthly",
      "ma-001",
      "rm-j002",
      "bf-001",
    ] as const;
    for (const skuId of sealed) {
      const resolved = resolveServiceProductionContract(skuId);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") continue;
      expect(resolved.contract.primaryTool.toolId).toBe("studio_design_renderer");
    }

    for (const skuId of ["rm-j007"] as const) {
      const resolved = resolveServiceProductionContract(skuId);
      if (resolved.status !== "resolved") continue;
      expect(resolved.contract.primaryTool.toolId).toBe("canva");
    }
  });

  it("maps paid Facebook structure → exact 5 members; Instagram → 4 with change sheet", () => {
    const campaignId = `rmj008-map-fb-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidRmJ008Campaign(campaignId, "Facebook");
    const logoRel = stageLogo(campaignId);
    const materials = [approvedLogo(campaignId)];
    const record = readyRmJ008Record(campaignId);
    const mapped = mapRmJ008KitProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials,
      stagedLogoRelativePath: logoRel,
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.platform).toBe("facebook");
    expect(mapped.truth.before.source).toBe("customer_supplied");
    expect(mapped.truth.before.bioOrAbout).toContain("weekend snapshots");
    expect(mapped.truth.plannedKitMembers.map((m) => m.memberId)).toEqual([
      "bio_about_copy",
      "field_map_checklist",
      "profile_image",
      "page_cover",
      "before_after_change_sheet",
    ]);
    expect(mapped.truth.credentialsPresent).toBe(false);
    expect(mapped.truth.partialKitRequested).toBe(false);

    const igId = `rmj008-map-ig-${Date.now()}`;
    seeded.push(igId);
    const igCampaign = paidRmJ008Campaign(igId, "Instagram");
    const igLogo = stageLogo(igId);
    const igMapped = mapRmJ008KitProjectTruthFromJob({
      repoRoot: REPO,
      campaign: igCampaign,
      dispatchRecord: readyRmJ008Record(igId),
      materials: [approvedLogo(igId)],
      stagedLogoRelativePath: igLogo,
    });
    expect(igMapped.ok).toBe(true);
    if (!igMapped.ok) return;
    expect(igMapped.truth.lockedKitMemberCount).toBe(4);
    expect(
      igMapped.truth.plannedKitMembers.some((m) => m.memberId === "page_cover"),
    ).toBe(false);
    expect(
      igMapped.truth.plannedKitMembers.some(
        (m) => m.memberId === "before_after_change_sheet",
      ),
    ).toBe(true);
  });

  it("fail closed: missing seal / missing structure", () => {
    const campaignId = `rmj008-miss-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidRmJ008Campaign(campaignId);
    const logoRel = stageLogo(campaignId);
    const materials = [approvedLogo(campaignId)];
    const record = readyRmJ008Record(campaignId);

    const noSeal = mapRmJ008KitProjectTruthFromJob({
      repoRoot: REPO,
      campaign: {
        ...campaign,
        paymentTruth: {
          ...campaign.paymentTruth!,
          rmj008KitSeal: undefined,
        },
      },
      dispatchRecord: record,
      materials,
      stagedLogoRelativePath: logoRel,
    });
    expect(noSeal.ok).toBe(false);
    if (!noSeal.ok) expect(noSeal.code).toBe("MISSING_PAYMENT_SEAL");

    const noStructure = mapRmJ008KitProjectTruthFromJob({
      repoRoot: REPO,
      campaign: { ...campaign, rmJ008PostPayDispatchStructure: undefined },
      dispatchRecord: record,
      materials,
      stagedLogoRelativePath: logoRel,
    });
    expect(noStructure.ok).toBe(false);
    if (!noStructure.ok) expect(noStructure.code).toBe("MISSING_POSTPAY_STRUCTURE");
  });

  it("dispatches Facebook Update Kit exactly; same truth → ALREADY_RENDERED", async () => {
    const campaignId = `rmj008-hook-fb-${Date.now()}`;
    seeded.push(campaignId);
    await writeMaterialsEnvelope({
      campaignId,
      items: [approvedLogo(campaignId)],
      updatedAt: new Date().toISOString(),
    });
    const campaign = paidRmJ008Campaign(campaignId, "Facebook");
    const logoRel = stageLogo(campaignId);
    const record = readyRmJ008Record(campaignId);

    const first = await invokeRmJ008DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.invocationOutcome).toBe("RENDERED");
    expect(first.platform).toBe("facebook");
    expect(first.lockedKitMemberCount).toBe(5);
    expect(first.identity.members.map((m) => m.memberId)).toEqual([
      "bio_about_copy",
      "field_map_checklist",
      "profile_image",
      "page_cover",
      "before_after_change_sheet",
    ]);
    expect(first.identity.kitQaOk).toBe(true);
    expect(first.identity.beforeStateSource).toBe("customer_supplied");
    expect(first.canvaRequired).toBe(false);
    expect(first.accountMutation).toBe(false);
    const v1 = first.identity.kitRenderVersion;

    const second = await invokeRmJ008DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.invocationOutcome).toBe("ALREADY_RENDERED");
    expect(second.identity.kitRenderVersion).toBe(v1);
  }, 180_000);

  it("material authorized after-intent change → immutable vN+1", async () => {
    const campaignId = `rmj008-hook-vnp1-${Date.now()}`;
    seeded.push(campaignId);
    await writeMaterialsEnvelope({
      campaignId,
      items: [approvedLogo(campaignId)],
      updatedAt: new Date().toISOString(),
    });
    const campaign = paidRmJ008Campaign(campaignId, "Instagram");
    const logoRel = stageLogo(campaignId);
    const record = readyRmJ008Record(campaignId);

    const first = await invokeRmJ008DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const v1 = first.identity.kitRenderVersion;

    const remapped = mapRmJ008KitLockFromLiveTruth(
      harborUpdateLock({
        platform: "Instagram",
        beforePageCoverNote: undefined,
        coverAction: "Not applicable",
        profileGoal: "Material change — new booking CTA emphasis.",
        updateIntentNotes: "Authorized material update — new profile goal.",
      }),
    );
    expect(remapped.ok).toBe(true);
    if (!remapped.ok) return;
    const newSeal = sealRmJ008KitForPayment(remapped.truth);
    const newStruct = buildRmJ008PostPayDispatchStructureFromPaymentSeal(newSeal);
    expect(newStruct.ok).toBe(true);
    if (!newStruct.ok) return;

    const changed: CampaignRecord = {
      ...campaign,
      paymentTruth: {
        ...campaign.paymentTruth!,
        rmj008KitSeal: newSeal,
      },
      rmJ008PostPayDispatchStructure: newStruct.structure,
    };

    const second = await invokeRmJ008DispatchHook({
      repoRoot: REPO,
      campaign: changed,
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.invocationOutcome).toBe("RENDERED");
    expect(second.identity.kitRenderVersion).toBe(v1 + 1);
    expect(second.identity.kitFingerprint).not.toBe(first.identity.kitFingerprint);
  }, 180_000);

  it("refuses wrong executor and missing logo", async () => {
    const campaignId = `rmj008-hook-refuse-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidRmJ008Campaign(campaignId);
    const record = readyRmJ008Record(campaignId);
    const badTool = {
      ...record,
      requirements: {
        ...record.requirements!,
        primaryTool: {
          ...record.requirements!.primaryTool,
          toolId: "canva",
        },
      },
    };
    const refused = await invokeRmJ008DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: badTool,
      materials: [approvedLogo(campaignId)],
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.failureCode).toBe("EXECUTOR_MISMATCH");

    const noLogo = await invokeRmJ008DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [],
    });
    expect(noLogo.ok).toBe(false);
    if (!noLogo.ok) expect(noLogo.failureCode).toBe("MISSING_REQUIRED_MATERIAL");
  });
});
