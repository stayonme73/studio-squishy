/**
 * STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-HOOK-1
 */

import { mkdirSync, writeFileSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioDispatchV1 } from "@/config/studio-dispatch-v1";
import { studioSm001MonthlyDispatchCycleTargetV1 } from "@/config/studio-sm-001-monthly-dispatch-cycle-target-v1";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import {
  DESIGN_RENDERER_SM_001_MONTHLY_SKU,
  DESIGN_RENDERER_SM_001_SKU,
} from "@/lib/studio-design-renderer";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import type { PaidCyclePurchaseRecord } from "@/lib/studio-payment/paid-cycle-types";
import {
  clearSm001MonthlyCycleForMachineDispatch,
  createSm001MonthlyProductionCycleFromPaidAuthority,
  lockSm001MonthlyCyclePeriodTruth,
  lockSm001MonthlyPlannedPostCount,
  replaceSm001MonthlyProductionCycle,
} from "@/lib/studio-monthly-production-cycle";
import type { Sm001MaterialRef } from "@/lib/studio-design-renderer/sm-001-types";

import { runDesignRendererDispatchObserver } from "./design-renderer-observer";
import { buildDispatchId, evaluateJobDispatch } from "./evaluate";
import { invokeSm001MonthlyDispatchHook } from "./sm-001-monthly-dispatch-hook";
import type { DispatchExecutionRecord, JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");
const SKU = studioSm001MonthlyDispatchCycleTargetV1.skuId;

const LOGO: Sm001MaterialRef = {
  materialId: "mat_logo",
  role: "logo",
  relativePath: "logo.svg",
  contentSha256: "abc123",
};

const CREATIVE_CORE = {
  materials: [LOGO] as const,
  offerName: "Spring Tune-Up + Drain Clear",
  priceDisplay: "$189",
  cta: "Book now",
};

const CREATIVE_FULL = {
  ...CREATIVE_CORE,
  headline: "Spring service you can trust",
  body: "Plain, steady service for homeowners who want clear help.",
  wasPriceDisplay: "was $249",
};

const PERIOD_A = {
  cycleStartDate: "2026-03-10",
  cycleEndDate: "2026-03-20",
  monthlyContentFocus: "March Spring Tune-Up awareness",
} as const;

const PERIOD_B = {
  cycleStartDate: "2026-03-25",
  cycleEndDate: "2026-04-15",
  monthlyContentFocus: "April Drain Clear booking push",
} as const;

const FULL_POSTS_ABOUT =
  "Promote an offer — Spring Tune-Up + Drain Clear $189, was $249. " +
  "Plain, steady service for homeowners who want clear help. " +
  "March 10 – April 15, 2026.";

function confirmedPurchase(
  campaignId: string,
  paidCyclePurchaseId: string,
): PaidCyclePurchaseRecord {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    paidCyclePurchaseId,
    campaignId,
    skuId: SKU,
    purchaseKind: "paid_cycle",
    status: "confirmed",
    expectedAmountCents: 9900,
    cyclePriceCents: 9900,
    currency: "usd",
    checkoutSessionId: `cs_${paidCyclePurchaseId}`,
    selectedServiceIds: [SKU],
    decisionId: `dec_${paidCyclePurchaseId}`,
    factFingerprint: `fp_${paidCyclePurchaseId}`,
    draftRevision: 1,
    initiatedAt: now,
    confirmedAt: now,
    sandbox: true,
  };
}

function monthlyCampaign(
  campaignId: string,
  postsAbout = FULL_POSTS_ABOUT,
): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Harbor Oak",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "sm-001-monthly dispatch hook",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        socialPostsPurposeChoice: "Promote an offer",
        socialPostsActionChoice: "Book now",
        postsAbout,
        callToAction:
          "Book now — Destination: (804) 555-0142 · cedarlane.example/book-tuneup",
        materials: "Selected materials path: I can provide a logo",
        wordingHashtags: "No required wording, disclosures, or hashtags provided yet.",
        mustNotSay: "",
      },
    },
    routeMapIntakeSubmittedAt: now,
  };
}

function readyMonthlyRecord(
  campaignId: string,
  productionCycleId?: string,
): JobDispatchRecord {
  const jobId = `${campaignId}::${SKU}`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: SKU,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "social" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-sm-001-monthly",
    capabilityReadiness: "contract_ready" as const,
    evaluatedAt: new Date().toISOString(),
    reason: null,
    blocker: null,
    ownerActionRequired: false as const,
  };
  const base = evaluateJobDispatch({
    campaignId,
    routing,
    jobId,
    skuId: SKU,
  });
  return productionCycleId ? { ...base, productionCycleId } : base;
}

function dispatchEnvelope(
  campaignId: string,
  records: JobDispatchRecord[],
): DispatchExecutionRecord {
  const now = new Date().toISOString();
  return {
    schemaVersion: studioDispatchV1.schemaVersion,
    status: studioDispatchV1.envelopeStatuses.evaluated,
    evaluatedAt: now,
    lastAttemptAt: now,
    activationCheckoutSessionId: `cs_${campaignId}`,
    records,
    ownerActionRequired: false,
    lastError: null,
  };
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
    relatedServiceIds: [SKU, DESIGN_RENDERER_SM_001_SKU],
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

async function prepareTargetedCycle(input: {
  campaignId: string;
  purchaseId: string;
  period: typeof PERIOD_A | typeof PERIOD_B;
  creative: typeof CREATIVE_CORE | typeof CREATIVE_FULL;
}) {
  let campaign = monthlyCampaign(input.campaignId);
  campaign = {
    ...campaign,
    paidCyclePurchases: [confirmedPurchase(input.campaignId, input.purchaseId)],
  };
  const lockedPeriod = lockSm001MonthlyCyclePeriodTruth(campaign, {
    paidCyclePurchaseId: input.purchaseId,
    ...input.period,
  });
  if (!lockedPeriod.ok) throw new Error(lockedPeriod.message);
  const created = createSm001MonthlyProductionCycleFromPaidAuthority(
    lockedPeriod.campaign,
    input.purchaseId,
  );
  if (!created.ok) throw new Error(created.message);

  const nLocked = lockSm001MonthlyPlannedPostCount(created.campaign, {
    productionCycleId: created.cycle.productionCycleId,
    creative: input.creative,
  });
  if (!nLocked.ok) throw new Error(nLocked.message);

  campaign = {
    ...nLocked.campaign,
    dispatchExecution: dispatchEnvelope(input.campaignId, [
      readyMonthlyRecord(input.campaignId),
    ]),
  };

  const targeted = clearSm001MonthlyCycleForMachineDispatch(
    campaign,
    created.cycle.productionCycleId,
  );
  if (!targeted.ok) throw new Error(targeted.message);

  return {
    campaign: targeted.campaign,
    cycle: targeted.cycle,
    dispatchRecord: targeted.dispatchRecord,
  };
}

describe("STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-HOOK-1", () => {
  const seededMaterialCampaignIds: string[] = [];
  const artifactDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      seededMaterialCampaignIds
        .splice(0)
        .map((id) =>
          fs
            .unlink(path.join(MATERIALS_DIR, `${id}.json`))
            .catch(() => undefined),
        ),
    );
    await Promise.all(
      artifactDirs
        .splice(0)
        .map((dir) => fs.rm(dir, { recursive: true, force: true }).catch(() => undefined)),
    );
  });

  it("remaps only sm-001-monthly onto studio_design_renderer; sealed lanes stay green", () => {
    const monthly = resolveServiceProductionContract("sm-001-monthly");
    expect(monthly.status).toBe("resolved");
    if (monthly.status !== "resolved") return;
    expect(monthly.contract.primaryTool.toolId).toBe("studio_design_renderer");
    expect(monthly.contract.readinessNotes).toMatch(/Canva not on fulfillment spine/i);

    const sealed = [
      "v2-rtu-flyer",
      "v2-rtu-business-card",
      "v2-rtu-menu",
      "v2-rtu-service-sheet",
      "v2-rtu-promotion-graphics",
      "v2-rtu-social-posts",
      "sm-001",
    ] as const;
    for (const skuId of sealed) {
      const resolved = resolveServiceProductionContract(skuId);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") continue;
      expect(resolved.contract.primaryTool.toolId).toBe("studio_design_renderer");
    }

    const sm001 = resolveServiceProductionContract("sm-001");
    expect(sm001.status).toBe("resolved");
  });

  it("valid targeted Cycle A auto-invokes with exact N/N and cycle-bounded calendar", async () => {
    const campaignId = `mhook-a-${Date.now()}`;
    seededMaterialCampaignIds.push(campaignId);
    await writeMaterialsEnvelope({
      campaignId,
      items: [approvedLogo(campaignId)],
      updatedAt: new Date().toISOString(),
    });
    const staged = stageLogo(campaignId);
    const prepared = await prepareTargetedCycle({
      campaignId,
      purchaseId: "pcp_a",
      period: PERIOD_A,
      creative: CREATIVE_CORE,
    });
    artifactDirs.push(
      path.join(REPO, "data/campaign-design-artifacts", campaignId),
    );

    const hooked = await invokeSm001MonthlyDispatchHook({
      repoRoot: REPO,
      campaign: prepared.campaign,
      dispatchRecord: prepared.dispatchRecord,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: staged,
    });
    expect(hooked.ok).toBe(true);
    if (!hooked.ok) return;
    expect(hooked.invocationOutcome).toBe("RENDERED");
    expect(hooked.productionCycleId).toBe(prepared.cycle.productionCycleId);
    expect(hooked.plannedPostCount).toBe(4);
    expect(hooked.identity.assets).toHaveLength(4);
    expect(hooked.identity.captions).toHaveLength(4);
    expect(hooked.identity.postingOrder).toHaveLength(4);
    expect(hooked.identity.calendar?.entries).toHaveLength(4);
    expect(hooked.ownerRoutineProduction).toBe("NONE");
    expect(hooked.canvaRequired).toBe(false);
    expect(hooked.makeRequired).toBe(false);
    expect(hooked.artifactRootRel).toContain(
      `/cycles/${prepared.cycle.productionCycleId}`,
    );

    for (const entry of hooked.identity.calendar!.entries) {
      expect(entry.suggestedDate >= PERIOD_A.cycleStartDate).toBe(true);
      expect(entry.suggestedDate <= PERIOD_A.cycleEndDate).toBe(true);
    }

    const again = await invokeSm001MonthlyDispatchHook({
      repoRoot: REPO,
      campaign: prepared.campaign,
      dispatchRecord: prepared.dispatchRecord,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: staged,
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.invocationOutcome).toBe("ALREADY_RENDERED");
    expect(again.productionCycleId).toBe(prepared.cycle.productionCycleId);
  }, 120_000);

  it("Cycle B invokes independently without contaminating Cycle A", async () => {
    const campaignId = `mhook-iso-${Date.now()}`;
    seededMaterialCampaignIds.push(campaignId);
    await writeMaterialsEnvelope({
      campaignId,
      items: [approvedLogo(campaignId)],
      updatedAt: new Date().toISOString(),
    });
    const staged = stageLogo(campaignId);

    const a = await prepareTargetedCycle({
      campaignId,
      purchaseId: "pcp_a",
      period: PERIOD_A,
      creative: CREATIVE_CORE,
    });
    artifactDirs.push(
      path.join(REPO, "data/campaign-design-artifacts", campaignId),
    );

    const renderA = await invokeSm001MonthlyDispatchHook({
      repoRoot: REPO,
      campaign: a.campaign,
      dispatchRecord: a.dispatchRecord,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: staged,
    });
    expect(renderA.ok).toBe(true);
    if (!renderA.ok) return;
    const aRoot = renderA.artifactRootRel;
    const aVersion = renderA.identity.campaignSetRenderVersion;
    const aFocus = a.cycle.monthlyContentFocus;

    // Clear A target by replacing cycle flag, then add + target B.
    let campaign = replaceSm001MonthlyProductionCycle(a.campaign, {
      ...a.cycle,
      machineDispatchTarget: false,
      machineDispatchTargetSetAt: undefined,
    });
    campaign = {
      ...campaign,
      paidCyclePurchases: [
        ...(campaign.paidCyclePurchases ?? []),
        confirmedPurchase(campaignId, "pcp_b"),
      ],
    };
    const periodB = lockSm001MonthlyCyclePeriodTruth(campaign, {
      paidCyclePurchaseId: "pcp_b",
      ...PERIOD_B,
    });
    if (!periodB.ok) throw new Error(periodB.message);
    const createdB = createSm001MonthlyProductionCycleFromPaidAuthority(
      periodB.campaign,
      "pcp_b",
    );
    if (!createdB.ok) throw new Error(createdB.message);
    const lockB = lockSm001MonthlyPlannedPostCount(createdB.campaign, {
      productionCycleId: createdB.cycle.productionCycleId,
      creative: CREATIVE_FULL,
    });
    if (!lockB.ok) throw new Error(lockB.message);
    campaign = {
      ...lockB.campaign,
      dispatchExecution: dispatchEnvelope(campaignId, [
        readyMonthlyRecord(campaignId),
      ]),
    };
    const targetB = clearSm001MonthlyCycleForMachineDispatch(
      campaign,
      createdB.cycle.productionCycleId,
    );
    expect(targetB.ok).toBe(true);
    if (!targetB.ok) return;

    const renderB = await invokeSm001MonthlyDispatchHook({
      repoRoot: REPO,
      campaign: targetB.campaign,
      dispatchRecord: targetB.dispatchRecord,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: staged,
    });
    expect(renderB.ok).toBe(true);
    if (!renderB.ok) return;
    expect(renderB.productionCycleId).toBe(createdB.cycle.productionCycleId);
    expect(renderB.plannedPostCount).toBe(6);
    expect(renderB.artifactRootRel).not.toBe(aRoot);
    expect(renderB.artifactRootRel).toContain(createdB.cycle.productionCycleId);
    expect(renderB.identity.assets).toHaveLength(6);

    const retargetACampaign: CampaignRecord = {
      ...targetB.campaign,
      sm001MonthlyProductionCycles: (
        targetB.campaign.sm001MonthlyProductionCycles ?? []
      ).map((c) =>
        c.productionCycleId === createdB.cycle.productionCycleId
          ? {
              ...c,
              machineDispatchTarget: false,
              machineDispatchTargetSetAt: undefined,
            }
          : c.productionCycleId === a.cycle.productionCycleId
            ? { ...c, machineDispatchTarget: true }
            : c,
      ),
      dispatchExecution: dispatchEnvelope(campaignId, [
        readyMonthlyRecord(campaignId, a.cycle.productionCycleId),
      ]),
    };

    const aIsolated = await invokeSm001MonthlyDispatchHook({
      repoRoot: REPO,
      campaign: retargetACampaign,
      dispatchRecord: readyMonthlyRecord(
        campaignId,
        a.cycle.productionCycleId,
      ),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: staged,
    });
    expect(aIsolated.ok).toBe(true);
    if (!aIsolated.ok) return;
    expect(aIsolated.invocationOutcome).toBe("ALREADY_RENDERED");
    expect(aIsolated.productionCycleId).toBe(a.cycle.productionCycleId);
    expect(aIsolated.plannedPostCount).toBe(4);
    expect(aIsolated.identity.campaignSetRenderVersion).toBe(aVersion);
    expect(aIsolated.artifactRootRel).toBe(aRoot);
    expect(aFocus.length).toBeGreaterThan(0);
  }, 180_000);

  it("within-cycle material change yields vN+1 under same productionCycleId", async () => {
    const campaignId = `mhook-vn-${Date.now()}`;
    seededMaterialCampaignIds.push(campaignId);
    await writeMaterialsEnvelope({
      campaignId,
      items: [approvedLogo(campaignId)],
      updatedAt: new Date().toISOString(),
    });
    const staged = stageLogo(campaignId);
    const prepared = await prepareTargetedCycle({
      campaignId,
      purchaseId: "pcp_a",
      period: PERIOD_A,
      creative: CREATIVE_CORE,
    });
    artifactDirs.push(
      path.join(REPO, "data/campaign-design-artifacts", campaignId),
    );

    const first = await invokeSm001MonthlyDispatchHook({
      repoRoot: REPO,
      campaign: prepared.campaign,
      dispatchRecord: prepared.dispatchRecord,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: staged,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const v1 = first.identity.campaignSetRenderVersion;

    const changed: CampaignRecord = {
      ...prepared.campaign,
      routeMapIntake: {
        ...prepared.campaign.routeMapIntake!,
        answers: {
          ...prepared.campaign.routeMapIntake!.answers,
          postsAbout: `${FULL_POSTS_ABOUT} Extra patio reopen note for version bump.`,
        },
      },
    };

    const second = await invokeSm001MonthlyDispatchHook({
      repoRoot: REPO,
      campaign: changed,
      dispatchRecord: prepared.dispatchRecord,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: staged,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.invocationOutcome).toBe("RENDERED");
    expect(second.productionCycleId).toBe(prepared.cycle.productionCycleId);
    expect(second.identity.campaignSetRenderVersion).toBeGreaterThan(v1);
  }, 120_000);

  it("N=5 and N=6 work with exact counts", async () => {
    for (const [n, creative, purchaseId] of [
      [5, { ...CREATIVE_CORE, headline: "Extended spring offer", body: "Steady help with clear timing." }, "pcp_n5"],
      [6, CREATIVE_FULL, "pcp_n6"],
    ] as const) {
      const campaignId = `mhook-n${n}-${Date.now()}`;
      seededMaterialCampaignIds.push(campaignId);
      await writeMaterialsEnvelope({
        campaignId,
        items: [approvedLogo(campaignId)],
        updatedAt: new Date().toISOString(),
      });
      const staged = stageLogo(campaignId);
      const prepared = await prepareTargetedCycle({
        campaignId,
        purchaseId,
        period: PERIOD_B,
        creative,
      });
      artifactDirs.push(
        path.join(REPO, "data/campaign-design-artifacts", campaignId),
      );
      expect(prepared.cycle.plannedPostCount).toBe(n);

      const hooked = await invokeSm001MonthlyDispatchHook({
        repoRoot: REPO,
        campaign: prepared.campaign,
        dispatchRecord: prepared.dispatchRecord,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: staged,
      });
      expect(hooked.ok).toBe(true);
      if (!hooked.ok) return;
      expect(hooked.plannedPostCount).toBe(n);
      expect(hooked.identity.assets).toHaveLength(n);
      expect(hooked.identity.calendar?.entries).toHaveLength(n);
    }
  }, 180_000);

  it("fail closed: no target, wrong mirror, dual target, unpaid, unsupported plate", async () => {
    const campaignId = `mhook-fail-${Date.now()}`;
    seededMaterialCampaignIds.push(campaignId);
    await writeMaterialsEnvelope({
      campaignId,
      items: [approvedLogo(campaignId)],
      updatedAt: new Date().toISOString(),
    });
    const staged = stageLogo(campaignId);

    const prepared = await prepareTargetedCycle({
      campaignId,
      purchaseId: "pcp_a",
      period: PERIOD_A,
      creative: CREATIVE_CORE,
    });
    artifactDirs.push(
      path.join(REPO, "data/campaign-design-artifacts", campaignId),
    );

    const noTargetRecord = readyMonthlyRecord(campaignId);
    const noTarget = await invokeSm001MonthlyDispatchHook({
      repoRoot: REPO,
      campaign: {
        ...prepared.campaign,
        sm001MonthlyProductionCycles: (
          prepared.campaign.sm001MonthlyProductionCycles ?? []
        ).map((c) => ({
          ...c,
          machineDispatchTarget: false,
          machineDispatchTargetSetAt: undefined,
        })),
      },
      dispatchRecord: noTargetRecord,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: staged,
    });
    expect(noTarget.ok).toBe(false);
    if (noTarget.ok) return;
    expect(noTarget.failureCode).toMatch(/MISSING_PRODUCTION_CYCLE_ID|TARGET_NOT_SET/i);

    const wrongMirror = await invokeSm001MonthlyDispatchHook({
      repoRoot: REPO,
      campaign: prepared.campaign,
      dispatchRecord: {
        ...prepared.dispatchRecord,
        productionCycleId: "cyc_wrong",
      },
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: staged,
    });
    expect(wrongMirror.ok).toBe(false);

    let dualCampaign = {
      ...prepared.campaign,
      paidCyclePurchases: [
        ...(prepared.campaign.paidCyclePurchases ?? []),
        confirmedPurchase(campaignId, "pcp_b"),
      ],
    };
    const periodB = lockSm001MonthlyCyclePeriodTruth(dualCampaign, {
      paidCyclePurchaseId: "pcp_b",
      ...PERIOD_B,
    });
    if (!periodB.ok) throw new Error(periodB.message);
    const createdB = createSm001MonthlyProductionCycleFromPaidAuthority(
      periodB.campaign,
      "pcp_b",
    );
    if (!createdB.ok) throw new Error(createdB.message);
    const lockB = lockSm001MonthlyPlannedPostCount(createdB.campaign, {
      productionCycleId: createdB.cycle.productionCycleId,
      creative: CREATIVE_FULL,
    });
    if (!lockB.ok) throw new Error(lockB.message);
    dualCampaign = {
      ...lockB.campaign,
      sm001MonthlyProductionCycles: (
        lockB.campaign.sm001MonthlyProductionCycles ?? []
      ).map((c) =>
        c.productionCycleId === prepared.cycle.productionCycleId ||
        c.productionCycleId === createdB.cycle.productionCycleId
          ? { ...c, machineDispatchTarget: true }
          : c,
      ),
    };
    const dual = await invokeSm001MonthlyDispatchHook({
      repoRoot: REPO,
      campaign: dualCampaign,
      dispatchRecord: prepared.dispatchRecord,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: staged,
    });
    expect(dual.ok).toBe(false);
    if (dual.ok) return;
    expect(dual.failureCode).toMatch(/DUAL_TARGET/i);

    const unpaidCampaign = {
      ...prepared.campaign,
      paidCyclePurchases: [
        {
          ...confirmedPurchase(campaignId, "pcp_a"),
          status: "initiated" as const,
          confirmedAt: undefined,
        },
      ],
    };
    const unpaid = await invokeSm001MonthlyDispatchHook({
      repoRoot: REPO,
      campaign: unpaidCampaign,
      dispatchRecord: prepared.dispatchRecord,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: staged,
    });
    expect(unpaid.ok).toBe(false);
    if (unpaid.ok) return;
    expect(unpaid.failureCode).toMatch(/PURCHASE_NOT_CONFIRMED/i);

    const plate = await invokeSm001MonthlyDispatchHook({
      repoRoot: REPO,
      campaign: prepared.campaign,
      dispatchRecord: prepared.dispatchRecord,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: staged,
      forceInvalidPlate: true,
    });
    expect(plate.ok).toBe(false);
    if (plate.ok) return;
    expect(plate.failureCode).toMatch(/INVALID_PLATE|ENGINE_FAILURE/i);
  }, 120_000);

  it("observer auto-invokes monthly when targeted and ready", async () => {
    const campaignId = `mhook-obs-${Date.now()}`;
    seededMaterialCampaignIds.push(campaignId);
    await writeMaterialsEnvelope({
      campaignId,
      items: [approvedLogo(campaignId)],
      updatedAt: new Date().toISOString(),
    });
    stageLogo(campaignId);
    const prepared = await prepareTargetedCycle({
      campaignId,
      purchaseId: "pcp_obs",
      period: PERIOD_A,
      creative: CREATIVE_CORE,
    });
    artifactDirs.push(
      path.join(REPO, "data/campaign-design-artifacts", campaignId),
    );

    const pass = await runDesignRendererDispatchObserver({
      repoRoot: REPO,
      campaign: prepared.campaign,
      dispatch: prepared.campaign.dispatchExecution!,
    });
    const monthly = pass.results.find((r) => r.skuId === SKU);
    expect(monthly?.action).toBe("invoked");
    expect(monthly?.ok).toBe(true);
    expect(monthly?.ownerRoutineProduction).toBe("NONE");
    expect(monthly?.canvaRequired).toBe(false);
    expect(monthly?.makeRequired).toBe(false);
    expect(prepared.dispatchRecord.dispatchId).toBe(
      buildDispatchId(`${campaignId}::${SKU}`),
    );
  }, 120_000);
});
