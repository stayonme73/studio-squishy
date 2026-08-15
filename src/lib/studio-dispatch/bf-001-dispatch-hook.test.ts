/**
 * STUDIO-OPERATING-DESIGN-BF-001-DISPATCH-HOOK-1
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  BF_001_SHEET_PLATE,
  DESIGN_RENDERER_BF_001_SKU,
  buildBf001PostPayDispatchStructureFromPaymentSeal,
  ensureHarborOakBf001LogoMaterial,
  mapBf001PackageLockFromLiveTruth,
  plateForGraphicKind,
  sealBf001PackageForPayment,
  type Bf001GraphicKind,
  type Bf001LivePackageLockInput,
} from "@/lib/studio-design-renderer";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";

import { evaluateJobDispatch } from "./evaluate";
import { invokeBf001DispatchHook } from "./bf-001-dispatch-hook";
import { mapBf001RefreshProjectTruthFromJob } from "./map-bf-001-job-truth";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");
const ARTIFACTS_DIR = path.join(REPO, "data", "campaign-design-artifacts");
const SKU = DESIGN_RENDERER_BF_001_SKU;

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

function paidBf001Campaign(
  campaignId: string,
  graphicKind: Bf001GraphicKind = "profile",
  lockOverrides: Partial<Bf001LivePackageLockInput> = {},
): CampaignRecord {
  const now = new Date().toISOString();
  const mapped = mapBf001PackageLockFromLiveTruth(
    harborRefreshLock({
      graphicKind: graphicKind === "profile" ? "Profile image" : "Cover graphic",
      ...lockOverrides,
    }),
  );
  if (!mapped.ok) throw new Error(mapped.message);
  const seal = sealBf001PackageForPayment(mapped.truth);
  const built = buildBf001PostPayDispatchStructureFromPaymentSeal(seal);
  if (!built.ok) throw new Error(built.message);

  return {
    campaignId,
    campaignName: "Harbor Oak",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "bf-001 dispatch hook",
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
      bf001PackageSeal: seal,
    },
    bf001PostPayDispatchStructure: built.structure,
  };
}

function readyBf001Record(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::${SKU}`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: SKU,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "brand_identity_messaging" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-bf-001",
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
    reason: "Existing brand mark — placed, never redrawn",
    relatedServiceIds: [SKU],
    uploadStatus: "stored",
    useAuthorization: { basis: "customer_owns", attestedAt: now },
  };
}

/** Reuse the proven Harbor & Oak supplied mark as the customer material. */
function stageLogo(campaignId: string): string {
  const source = ensureHarborOakBf001LogoMaterial(REPO);
  const svg = readFileSync(path.join(REPO, source.relativePath), "utf8");
  const logoRel = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
  const logoAbs = path.join(REPO, logoRel);
  mkdirSync(path.dirname(logoAbs), { recursive: true });
  writeFileSync(logoAbs, svg, "utf8");
  return logoRel;
}

describe("STUDIO-OPERATING-DESIGN-BF-001-DISPATCH-HOOK-1", () => {
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

  it("remaps bf-001 onto studio_design_renderer; rm-j007 also remaps (APPROVE B)", () => {
    const refresh = resolveServiceProductionContract(SKU);
    expect(refresh.status).toBe("resolved");
    if (refresh.status !== "resolved") return;
    expect(refresh.contract.primaryTool.toolId).toBe("studio_design_renderer");
    expect(refresh.contract.readinessNotes).toMatch(
      /Canva is not on the fulfillment spine/i,
    );

    const update = resolveServiceProductionContract("rm-j007");
    expect(update.status).toBe("resolved");
    if (update.status !== "resolved") return;
    expect(update.contract.primaryTool.toolId).toBe("studio_design_renderer");
  });

  it("maps paid profile structure → exactly 2 members; cover uses the cover plate", () => {
    const campaignId = `bf001-map-profile-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidBf001Campaign(campaignId, "profile");
    const logoRel = stageLogo(campaignId);
    const record = readyBf001Record(campaignId);
    const mapped = mapBf001RefreshProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.graphicKind).toBe("profile");
    expect(mapped.truth.businessName).toBe("Harbor & Oak Studio");
    expect(mapped.truth.lockedPackageMemberCount).toBe(2);
    expect(mapped.truth.plannedMembers.map((m) => m.memberId)).toEqual([
      "brand_direction_sheet",
      "profile_or_cover_graphic",
    ]);
    expect(mapped.truth.plannedMembers.map((m) => m.agreedPlateId)).toEqual([
      BF_001_SHEET_PLATE.plateId,
      plateForGraphicKind("profile").plateId,
    ]);
    expect(mapped.truth.visualStartingPointNotes).toContain("oak-anchor mark");
    expect(mapped.truth.logoMaterial?.relativePath).toBe(logoRel);
    expect(mapped.truth.logoUsageRules.redesignForbidden).toBe(true);
    expect(
      mapped.truth.fontRecommendations.every((f) => f.recommendationOnly),
    ).toBe(true);
    expect(mapped.truth.graphicRenderFontFamily).toMatch(/Georgia/);

    const coverId = `bf001-map-cover-${Date.now()}`;
    seeded.push(coverId);
    const coverMapped = mapBf001RefreshProjectTruthFromJob({
      repoRoot: REPO,
      campaign: paidBf001Campaign(coverId, "cover"),
      dispatchRecord: readyBf001Record(coverId),
      materials: [approvedLogo(coverId)],
      stagedLogoRelativePath: stageLogo(coverId),
    });
    expect(coverMapped.ok).toBe(true);
    if (!coverMapped.ok) return;
    expect(coverMapped.truth.graphicKind).toBe("cover");
    expect(coverMapped.truth.plannedMembers[1]!.kind).toBe("design_cover");
    expect(coverMapped.truth.plannedMembers[1]!.agreedPlateId).toBe(
      plateForGraphicKind("cover").plateId,
    );
  });

  it("fail closed: missing seal / missing structure", () => {
    const campaignId = `bf001-miss-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidBf001Campaign(campaignId);
    const logoRel = stageLogo(campaignId);
    const materials = [approvedLogo(campaignId)];
    const record = readyBf001Record(campaignId);

    const noSeal = mapBf001RefreshProjectTruthFromJob({
      repoRoot: REPO,
      campaign: {
        ...campaign,
        paymentTruth: {
          ...campaign.paymentTruth!,
          bf001PackageSeal: undefined,
        },
      },
      dispatchRecord: record,
      materials,
      stagedLogoRelativePath: logoRel,
    });
    expect(noSeal.ok).toBe(false);
    if (!noSeal.ok) expect(noSeal.code).toBe("MISSING_PAYMENT_SEAL");

    const noStructure = mapBf001RefreshProjectTruthFromJob({
      repoRoot: REPO,
      campaign: { ...campaign, bf001PostPayDispatchStructure: undefined },
      dispatchRecord: record,
      materials,
      stagedLogoRelativePath: logoRel,
    });
    expect(noStructure.ok).toBe(false);
    if (!noStructure.ok) {
      expect(noStructure.code).toBe("MISSING_POSTPAY_STRUCTURE");
    }

    const graphicKindDrift = mapBf001RefreshProjectTruthFromJob({
      repoRoot: REPO,
      campaign: {
        ...campaign,
        bf001PostPayDispatchStructure: {
          ...campaign.bf001PostPayDispatchStructure!,
          graphicKind: "cover",
        },
      },
      dispatchRecord: record,
      materials,
      stagedLogoRelativePath: logoRel,
    });
    expect(graphicKindDrift.ok).toBe(false);
    if (!graphicKindDrift.ok) {
      expect(graphicKindDrift.code).toBe("SEAL_STRUCTURE_MISMATCH");
    }
  });

  it("dispatches the profile refresh package exactly; same truth → ALREADY_RENDERED", async () => {
    const campaignId = `bf001-hook-profile-${Date.now()}`;
    seeded.push(campaignId);
    await writeMaterialsEnvelope({
      campaignId,
      items: [approvedLogo(campaignId)],
      updatedAt: new Date().toISOString(),
      version: 1,
      syncedAt: new Date().toISOString(),
    });
    const campaign = paidBf001Campaign(campaignId, "profile");
    const logoRel = stageLogo(campaignId);
    const record = readyBf001Record(campaignId);

    const first = await invokeBf001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.invocationOutcome).toBe("RENDERED");
    expect(first.graphicKind).toBe("profile");
    expect(first.lockedPackageMemberCount).toBe(2);
    expect(first.identity.members.map((m) => m.memberId)).toEqual([
      "brand_direction_sheet",
      "profile_or_cover_graphic",
    ]);
    expect(first.identity.members.map((m) => m.agreedPlateId)).toEqual([
      BF_001_SHEET_PLATE.plateId,
      plateForGraphicKind("profile").plateId,
    ]);
    expect(first.identity.packageQaOk).toBe(true);
    expect(first.identity.canvaUsed).toBe(false);
    expect(first.identity.remapAuthorized).toBe(false);
    expect(first.canvaRequired).toBe(false);
    expect(first.newLogoCreated).toBe(false);
    expect(first.receiptRelativePath).toContain("dispatch-hook-receipt.json");
    const v1 = first.identity.packageRenderVersion;

    const second = await invokeBf001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.invocationOutcome).toBe("ALREADY_RENDERED");
    expect(second.identity.packageRenderVersion).toBe(v1);
  }, 240_000);

  it("material authorized starting-point change → immutable vN+1", async () => {
    const campaignId = `bf001-hook-vnp1-${Date.now()}`;
    seeded.push(campaignId);
    await writeMaterialsEnvelope({
      campaignId,
      items: [approvedLogo(campaignId)],
      updatedAt: new Date().toISOString(),
      version: 1,
      syncedAt: new Date().toISOString(),
    });
    const campaign = paidBf001Campaign(campaignId, "cover");
    const logoRel = stageLogo(campaignId);
    const record = readyBf001Record(campaignId);

    const first = await invokeBf001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const v1 = first.identity.packageRenderVersion;

    const changed = paidBf001Campaign(campaignId, "cover", {
      businessName: "Harbor & Oak Portrait Studio",
      visualStartingPointNotes:
        "Authorized update — same oval mark, cooler harbor blue emphasis on new cards.",
    });

    const second = await invokeBf001DispatchHook({
      repoRoot: REPO,
      campaign: changed,
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.invocationOutcome).toBe("RENDERED");
    expect(second.identity.packageRenderVersion).toBe(v1 + 1);
    expect(second.identity.packageFingerprint).not.toBe(
      first.identity.packageFingerprint,
    );
  }, 240_000);

  it("refuses wrong executor, wrong SKU, and missing logo", async () => {
    const campaignId = `bf001-hook-refuse-${Date.now()}`;
    seeded.push(campaignId);
    const campaign = paidBf001Campaign(campaignId);
    const record = readyBf001Record(campaignId);
    const badTool = {
      ...record,
      requirements: {
        ...record.requirements!,
        primaryTool: {
          ...record.requirements!.primaryTool,
          toolId: "canva" as const,
        },
      },
    };
    const refused = await invokeBf001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: badTool,
      materials: [approvedLogo(campaignId)],
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.failureCode).toBe("EXECUTOR_MISMATCH");

    const wrongSku = await invokeBf001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: { ...record, skuId: "rm-j008" },
      materials: [approvedLogo(campaignId)],
    });
    expect(wrongSku.ok).toBe(false);
    if (!wrongSku.ok) expect(wrongSku.failureCode).toBe("SKU_NOT_SUPPORTED");

    const noLogo = await invokeBf001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [],
    });
    expect(noLogo.ok).toBe(false);
    if (!noLogo.ok) expect(noLogo.failureCode).toBe("MISSING_REQUIRED_MATERIAL");
  });
});
