/**
 * STUDIO-OPERATING-DESIGN-MA-001-DISPATCH-HOOK-1
 */

import { mkdirSync, writeFileSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioDispatchV1 } from "@/config/studio-dispatch-v1";
import {
  DESIGN_RENDERER_MA_001_SKU,
  buildMa001PostPayDispatchStructureFromPaymentSeal,
  mapMa001CompositionFromLiveTruth,
  sealMa001CompositionForPayment,
  type Ma001LiveCompositionInput,
} from "@/lib/studio-design-renderer";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";

import { evaluateJobDispatch } from "./evaluate";
import { invokeMa001DispatchHook } from "./ma-001-dispatch-hook";
import { mapMa001PackProjectTruthFromJob } from "./map-ma-001-job-truth";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");
const ARTIFACTS_DIR = path.join(REPO, "data", "campaign-design-artifacts");
const SKU = DESIGN_RENDERER_MA_001_SKU;

function fourMemberInput(): Ma001LiveCompositionInput {
  return {
    lockedPackMemberCount: 4,
    campaignFocus: "Spring Tune-Up + Drain Clear",
    members: [
      { kindLabel: "Flyer", purpose: "Launch flyer for the spring offer" },
      { kindLabel: "Business card", purpose: "Contact card for Jordan Hale" },
      { kindLabel: "Service sheet", purpose: "Service list handout" },
      {
        kindLabel: "Campaign graphic",
        purpose: "Social square campaign graphic",
        agreedFormatLabel: "Square (social / feed)",
      },
    ],
  };
}

function oneMemberInput(): Ma001LiveCompositionInput {
  return {
    lockedPackMemberCount: 1,
    campaignFocus: "Spring open house",
    members: [
      { kindLabel: "Flyer", purpose: "Launch flyer for the spring offer" },
    ],
  };
}

function paidMa001Campaign(
  campaignId: string,
  composition: Ma001LiveCompositionInput,
): CampaignRecord {
  const now = new Date().toISOString();
  const mapped = mapMa001CompositionFromLiveTruth(composition);
  if (!mapped.ok) throw new Error(mapped.message);
  const seal = sealMa001CompositionForPayment(mapped.truth);
  const built = buildMa001PostPayDispatchStructureFromPaymentSeal(seal);
  if (!built.ok) throw new Error(built.message);

  return {
    campaignId,
    campaignName: "Harbor Oak",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "ma-001 dispatch hook",
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
      expectedAmountCents: 49500,
      confirmedAmountCents: 49500,
      checkoutSessionId: `cs_${campaignId}`,
      selectedServiceIds: [SKU],
      decisionId: `dec_${campaignId}`,
      factFingerprint: `fp_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
      ma001CompositionSeal: seal,
    },
    ma001PostPayDispatchStructure: built.structure,
  };
}

function readyMa001Record(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::${SKU}`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: SKU,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "marketing_assets" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-ma-001",
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

describe("STUDIO-OPERATING-DESIGN-MA-001-DISPATCH-HOOK-1", () => {
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

  it("remaps only ma-001 onto studio_design_renderer; eight sealed lanes stay green", () => {
    const pack = resolveServiceProductionContract(SKU);
    expect(pack.status).toBe("resolved");
    if (pack.status !== "resolved") return;
    expect(pack.contract.primaryTool.toolId).toBe("studio_design_renderer");
    expect(pack.contract.readinessNotes).toMatch(/Canva is not on the fulfillment spine/i);

    const sealed = [
      "v2-rtu-flyer",
      "v2-rtu-business-card",
      "v2-rtu-menu",
      "v2-rtu-service-sheet",
      "v2-rtu-promotion-graphics",
      "v2-rtu-social-posts",
      "sm-001",
      "sm-001-monthly",
    ] as const;
    for (const skuId of sealed) {
      const resolved = resolveServiceProductionContract(skuId);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") continue;
      expect(resolved.contract.primaryTool.toolId).toBe("studio_design_renderer");
    }

    // Remaining Canva-dependent SKUs stay Canva (sample)
    for (const skuId of ["bf-001", "rm-j008"] as const) {
      const resolved = resolveServiceProductionContract(skuId);
      if (resolved.status !== "resolved") continue;
      expect(resolved.contract.primaryTool.toolId).toBe("canva");
    }
  });

  it("mapper consumes sealed composition exactly (no invent / reorder)", () => {
    const campaignId = `ma001-hook-map-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidMa001Campaign(campaignId, fourMemberInput());
    const logoRel = stageLogo(campaignId);
    const mapped = mapMa001PackProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyMa001Record(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.lockedPackMemberCount).toBe(4);
    expect(mapped.truth.plannedPackMembers.map((m) => m.memberId)).toEqual([
      ...campaign.ma001PostPayDispatchStructure!.members.map((m) => m.memberId),
    ]);
    expect(mapped.truth.plannedPackMembers.map((m) => m.kind)).toEqual([
      "flyer",
      "business_card",
      "service_sheet",
      "promotion_graphic",
    ]);
    expect(mapped.truth.plannedPackMembers.map((m) => m.order)).toEqual([1, 2, 3, 4]);
    expect(mapped.truth.plannedPackMembers.map((m) => m.producerFamily)).toEqual(
      campaign.ma001PostPayDispatchStructure!.members.map((m) => m.producerFamily),
    );
  });

  it("valid 1-member pack dispatches", async () => {
    const campaignId = `ma001-hook-1m-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidMa001Campaign(campaignId, oneMemberInput());
    const logoRel = stageLogo(campaignId);
    await writeMaterialsEnvelope({
      campaignId,
      items: [approvedLogo(campaignId)],
      updatedAt: new Date().toISOString(),
    });

    const hooked = await invokeMa001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyMa001Record(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    if (!hooked.ok) {
      throw new Error(`${hooked.failureCode}: ${hooked.message}`);
    }
    expect(hooked.invocationOutcome).toBe("RENDERED");
    expect(hooked.lockedPackMemberCount).toBe(1);
    expect(hooked.identity.members).toHaveLength(1);
    expect(hooked.identity.members[0]!.kind).toBe("flyer");
    expect(hooked.ownerRoutineProduction).toBe("NONE");
    expect(hooked.canvaRequired).toBe(false);
    expect(hooked.makeRequired).toBe(false);
  }, 180_000);

  it("valid mixed 4-member pack dispatches with exact N/N + single-promo adapter", async () => {
    const campaignId = `ma001-hook-4m-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidMa001Campaign(campaignId, fourMemberInput());
    const logoRel = stageLogo(campaignId);

    const hooked = await invokeMa001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyMa001Record(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(hooked.ok).toBe(true);
    if (!hooked.ok) return;
    expect(hooked.lockedPackMemberCount).toBe(4);
    expect(hooked.identity.members).toHaveLength(4);
    expect(hooked.identity.members.map((m) => m.kind)).toEqual([
      "flyer",
      "business_card",
      "service_sheet",
      "promotion_graphic",
    ]);
    // Member vs file: business card may own multiple artifacts as one member
    const card = hooked.identity.members.find((m) => m.kind === "business_card");
    expect(card).toBeTruthy();
    expect(card!.artifacts.length).toBeGreaterThanOrEqual(1);
    expect(
      hooked.identity.members.filter((m) => m.memberId === card!.memberId),
    ).toHaveLength(1);
  }, 300_000);

  it("same truth → ALREADY_RENDERED; material pack change → vN+1", async () => {
    const campaignId = `ma001-hook-idem-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidMa001Campaign(campaignId, oneMemberInput());
    const logoRel = stageLogo(campaignId);
    const record = readyMa001Record(campaignId);

    const first = await invokeMa001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.invocationOutcome).toBe("RENDERED");
    const v1 = first.identity.packRenderVersion;

    const second = await invokeMa001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.invocationOutcome).toBe("ALREADY_RENDERED");
    expect(second.identity.packRenderVersion).toBe(v1);

    // Material change: swap to 4-member paid structure (new authorized composition)
    const changed = paidMa001Campaign(`${campaignId}-v2`, fourMemberInput());
    const changedCampaign: CampaignRecord = {
      ...campaign,
      paymentTruth: {
        ...campaign.paymentTruth!,
        ma001CompositionSeal: changed.paymentTruth!.ma001CompositionSeal,
      },
      ma001PostPayDispatchStructure: changed.ma001PostPayDispatchStructure,
    };
    const third = await invokeMa001DispatchHook({
      repoRoot: REPO,
      campaign: changedCampaign,
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(third.invocationOutcome).toBe("RENDERED");
    expect(third.identity.packRenderVersion).toBeGreaterThan(v1);
    expect(third.lockedPackMemberCount).toBe(4);
  }, 360_000);

  it("fail closed: missing payment seal", async () => {
    const campaignId = `ma001-hook-noseal-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidMa001Campaign(campaignId, oneMemberInput());
    const { ma001CompositionSeal: _drop, ...paymentTruth } = campaign.paymentTruth!;
    void _drop;
    const hooked = await invokeMa001DispatchHook({
      repoRoot: REPO,
      campaign: { ...campaign, paymentTruth },
      dispatchRecord: readyMa001Record(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: stageLogo(campaignId),
    });
    expect(hooked.ok).toBe(false);
    if (hooked.ok) return;
    expect(hooked.failureCode).toBe("MISSING_PAYMENT_SEAL");
  });

  it("fail closed: missing post-pay structure", async () => {
    const campaignId = `ma001-hook-nostruct-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidMa001Campaign(campaignId, oneMemberInput());
    const hooked = await invokeMa001DispatchHook({
      repoRoot: REPO,
      campaign: { ...campaign, ma001PostPayDispatchStructure: undefined },
      dispatchRecord: readyMa001Record(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: stageLogo(campaignId),
    });
    expect(hooked.ok).toBe(false);
    if (hooked.ok) return;
    expect(hooked.failureCode).toBe("MISSING_POSTPAY_STRUCTURE");
  });

  it("fail closed: seal/structure mismatch (swapped order)", async () => {
    const campaignId = `ma001-hook-swap-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidMa001Campaign(campaignId, fourMemberInput());
    const structure = campaign.ma001PostPayDispatchStructure!;
    const swapped = {
      ...structure,
      members: [
        structure.members[1]!,
        structure.members[0]!,
        structure.members[2]!,
        structure.members[3]!,
      ],
    };
    const hooked = await invokeMa001DispatchHook({
      repoRoot: REPO,
      campaign: { ...campaign, ma001PostPayDispatchStructure: swapped },
      dispatchRecord: readyMa001Record(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: stageLogo(campaignId),
    });
    expect(hooked.ok).toBe(false);
    if (hooked.ok) return;
    expect(hooked.failureCode).toBe("SEAL_STRUCTURE_MISMATCH");
  });

  it("fail closed: changed kind / plate / producer family", async () => {
    const campaignId = `ma001-hook-tamper-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidMa001Campaign(campaignId, oneMemberInput());
    const structure = campaign.ma001PostPayDispatchStructure!;
    for (const tamper of [
      {
        ...structure,
        members: [{ ...structure.members[0]!, kind: "menu" as const }],
      },
      {
        ...structure,
        members: [{ ...structure.members[0]!, agreedPlateId: "forged-plate" }],
      },
      {
        ...structure,
        members: [
          { ...structure.members[0]!, producerFamily: "v2-rtu-menu" },
        ],
      },
    ]) {
      const hooked = await invokeMa001DispatchHook({
        repoRoot: REPO,
        campaign: { ...campaign, ma001PostPayDispatchStructure: tamper },
        dispatchRecord: readyMa001Record(campaignId),
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: stageLogo(campaignId),
      });
      expect(hooked.ok).toBe(false);
    }
  });

  it("fail closed: unsupported kind (menu) and partial pack / member QA", async () => {
    const campaignId = `ma001-hook-fail-${Date.now()}`;
    seeded.push(campaignId);
    const menuInput: Ma001LiveCompositionInput = {
      lockedPackMemberCount: 1,
      campaignFocus: "Menu only",
      members: [{ kindLabel: "Menu", purpose: "Dinner menu" }],
    };
    const campaign = paidMa001Campaign(campaignId, menuInput);
    const logoRel = stageLogo(campaignId);
    const menuHook = await invokeMa001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyMa001Record(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(menuHook.ok).toBe(false);
    if (!menuHook.ok) {
      expect(menuHook.failureCode).toBe("UNSUPPORTED_KIND");
    }

    const okCampaign = paidMa001Campaign(`${campaignId}-ok`, fourMemberInput());
    const partial = await invokeMa001DispatchHook({
      repoRoot: REPO,
      campaign: okCampaign,
      dispatchRecord: readyMa001Record(`${campaignId}-ok`),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
      forceMemberIdFail: okCampaign.ma001PostPayDispatchStructure!.members[0]!
        .memberId,
    });
    expect(partial.ok).toBe(false);
    if (!partial.ok) {
      expect(partial.failureCode).toMatch(/MEMBER_RENDER_FAILURE|PARTIAL/);
    }

    const qa = await invokeMa001DispatchHook({
      repoRoot: REPO,
      campaign: paidMa001Campaign(`${campaignId}-qa`, oneMemberInput()),
      dispatchRecord: readyMa001Record(`${campaignId}-qa`),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
      forcePackQaFail: true,
    });
    expect(qa.ok).toBe(false);
    if (!qa.ok) {
      expect(qa.failureCode).toBe("PACK_QA_FAILURE");
    }
  }, 300_000);

  it("evaluateJobDispatch primaryTool is studio_design_renderer for ma-001", () => {
    const record = readyMa001Record(`ma001-hook-tool-${Date.now()}`);
    expect(record.requirements?.primaryTool.toolId).toBe("studio_design_renderer");
    expect(record.executionIdentityReady).toBe(true);
    expect(studioDispatchV1.schemaVersion).toBeTruthy();
  });
});
