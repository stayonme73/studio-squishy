/**
 * STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";

import type { CampaignRecord } from "@/config/studio-board";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { buildJobId } from "@/lib/job-control/lane-map";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";

import { ensureDispatchExecution } from "./ensure";
import { shouldObserveDesignRenderer } from "./design-renderer-observer";
import { evaluateJobDispatch } from "./evaluate";

const REPO = path.resolve(__dirname, "../../..");
const CAMPAIGNS_DIR = path.join(REPO, "data", "campaigns");
const TASKS_DIR = path.join(REPO, "data", "campaign-tasks");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");

function paidFlyerCampaign(
  campaignId: string,
  overrides: Partial<CampaignRecord> = {},
): CampaignRecord {
  const now = new Date().toISOString();
  const skus = ["v2-rtu-flyer"] as const;
  const totals = computePlanPricingTotals([...skus]);
  const lineItems = buildServiceScopeSnapshot([...skus]);
  return {
    campaignId,
    campaignName: "Observer Lane Studio",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Observer flyer auto-invoke",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: totals.amountDueTodayCents,
      confirmedAmountCents: totals.amountDueTodayCents,
      checkoutSessionId: `cs_obs_${campaignId}`,
      paymentIntentId: `pi_obs_${campaignId}`,
      stripeEventId: `evt_obs_${campaignId}`,
      selectedServiceIds: [...skus],
      decisionId: `dec_${campaignId}`,
      factFingerprint: `fp_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
    },
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [...skus],
      includedServiceIds: [...skus],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems,
      approvedAt: now,
    },
    projectDetailsSubmittedAt: now,
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        flyerPurpose: "Spring neighborhood open house",
        mustInclude:
          "Spring Open House — portraits $99. April 12 – April 20, 2026. Call (804) 555-0199 or visit observer.example/open-house",
        materials: "Logo staged for Machine",
        intendedUse: "Both print and digital",
        disclaimers: "While appointments remain.",
      },
    },
    ...overrides,
  };
}

async function seedMaterials(campaignId: string): Promise<void> {
  const now = new Date().toISOString();
  const items: CampaignMaterialItem[] = [
    {
      id: `logo-${campaignId}`,
      category: "logo-brand",
      requirementLevel: "required",
      reviewStatus: "approved_for_use",
      contentKind: "file-metadata",
      label: "Logo",
      reason: "Brand mark",
      relatedServiceIds: ["v2-rtu-flyer"],
      uploadStatus: "stored",
      useAuthorization: { basis: "customer_owns", attestedAt: now },
    },
  ];
  await writeMaterialsEnvelope({
    campaignId,
    items,
    updatedAt: now,
    syncedAt: now,
    version: 1,
  });
}

function stageLogo(campaignId: string): void {
  const rel = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
  const abs = path.join(REPO, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, HARBOR_OAK_LOGO_SVG, "utf8");
}

async function cleanup(campaignId: string): Promise<void> {
  await Promise.all([
    fs.unlink(path.join(CAMPAIGNS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(TASKS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(MATERIALS_DIR, `${campaignId}.json`)).catch(() => undefined),
  ]);
}

describe("STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1", () => {
  const ids: string[] = [];

  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanup(id)));
  });

  it("gates refuse non-ready / wrong tool / non-flyer", () => {
    const base = evaluateJobDispatch({
      campaignId: "gate",
      jobId: "gate::v2-rtu-flyer",
      skuId: "v2-rtu-flyer",
      routing: null,
    });
    expect(shouldObserveDesignRenderer(base).invoke).toBe(false);

    const card = {
      ...base,
      skuId: "v2-rtu-business-card" as const,
      executionIdentityReady: true,
      status: "EXECUTION_IDENTITY_READY" as const,
    };
    expect(shouldObserveDesignRenderer(card).invoke).toBe(false);
  });

  it(
    "ready flyer dispatch auto-invokes; repeat is ALREADY_RENDERED with no new version",
    async () => {
      const campaignId = `obs-flyer-${Date.now()}`;
      ids.push(campaignId);
      const campaign = paidFlyerCampaign(campaignId);
      await upsertCampaignRecord(campaign);
      await seedMaterials(campaignId);
      stageLogo(campaignId);

      const first = await ensureDispatchExecution(campaign);
      expect(first.ok).toBe(true);
      if (!first.ok) return;

      const flyer = first.dispatch.records.find((r) => r.skuId === "v2-rtu-flyer");
      expect(flyer?.executionIdentityReady).toBe(true);
      expect(flyer?.requirements?.primaryTool.toolId).toBe(
        "studio_design_renderer",
      );

      const obs1 = first.designRendererObserver?.results.find(
        (r) => r.skuId === "v2-rtu-flyer",
      );
      expect(obs1?.action).toBe("invoked");
      expect(obs1?.ok).toBe(true);
      expect(obs1?.invocationOutcome).toBe("RENDERED");
      expect(obs1?.ownerRoutineProduction).toBe("NONE");
      expect(obs1?.canvaRequired).toBe(false);
      expect(obs1?.makeRequired).toBe(false);
      const v1 = obs1?.renderVersion;
      const hash1 = obs1?.pngContentSha256;

      const second = await ensureDispatchExecution(first.campaign);
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.alreadyEvaluated).toBe(true);

      const obs2 = second.designRendererObserver?.results.find(
        (r) => r.skuId === "v2-rtu-flyer",
      );
      expect(obs2?.ok).toBe(true);
      expect(obs2?.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(obs2?.renderVersion).toBe(v1);
      expect(obs2?.pngContentSha256).toBe(hash1);
    },
    180_000,
  );

  it("non-ready flyer does not invoke renderer", async () => {
    const campaignId = `obs-wait-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidFlyerCampaign(campaignId, {
      projectDetailsSubmittedAt: undefined,
      routeMapIntakeSubmittedAt: undefined,
      routeMapIntake: undefined,
    });
    await upsertCampaignRecord(campaign);

    const result = await ensureDispatchExecution(campaign);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.dispatch.records.every((r) => !r.executionIdentityReady),
    ).toBe(true);
    const flyerSkip = result.designRendererObserver?.results.find(
      (r) => r.skuId === "v2-rtu-flyer",
    );
    expect(flyerSkip?.action).toBe("skipped");
    expect(flyerSkip?.skipReason).toMatch(/not_execution_identity_ready|status_not_ready/);
  });

  it("business-card remains Canva and never enters observer invoke", async () => {
    const card = resolveServiceProductionContract("v2-rtu-business-card");
    expect(card.status).toBe("resolved");
    if (card.status === "resolved") {
      expect(card.contract.primaryTool.toolId).toBe("canva");
    }

    const campaignId = `obs-card-${Date.now()}`;
    ids.push(campaignId);
    const now = new Date().toISOString();
    const skus = ["v2-rtu-business-card"] as const;
    const totals = computePlanPricingTotals([...skus]);
    const campaign = paidFlyerCampaign(campaignId, {
      campaignName: "Card Only",
      approvedStudioPlan: {
        selectedServiceIds: [...skus],
        includedServiceIds: [...skus],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: totals.oneTimeSubtotalCents,
        monthlyTotalCents: 0,
        amountDueTodayCents: totals.amountDueTodayCents,
        lineItems: buildServiceScopeSnapshot([...skus]),
        approvedAt: now,
      },
      paymentTruth: {
        processor: "stripe",
        status: "confirmed",
        currency: "usd",
        expectedAmountCents: totals.amountDueTodayCents,
        confirmedAmountCents: totals.amountDueTodayCents,
        checkoutSessionId: `cs_card_${campaignId}`,
        paymentIntentId: `pi_card_${campaignId}`,
        stripeEventId: `evt_card_${campaignId}`,
        selectedServiceIds: [...skus],
        decisionId: `dec_${campaignId}`,
        factFingerprint: `fp_${campaignId}`,
        draftRevision: 1,
        confirmedAt: now,
      },
      routeMapIntake: undefined,
      routeMapIntakeSubmittedAt: undefined,
    });
    await upsertCampaignRecord(campaign);
    await seedMaterials(campaignId);

    const result = await ensureDispatchExecution(campaign);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cardRecord = result.dispatch.records.find(
      (r) => r.skuId === "v2-rtu-business-card",
    );
    expect(cardRecord?.requirements?.primaryTool.toolId).toBe("canva");
    expect(
      result.designRendererObserver?.results.some(
        (r) => r.skuId === "v2-rtu-business-card",
      ),
    ).toBe(false);
  });

  it(
    "missing material / incomplete truth fails closed without completing render",
    async () => {
      const campaignId = `obs-miss-${Date.now()}`;
      ids.push(campaignId);
      // Ready identity but no staged logo file and no logo material path.
      const campaign = paidFlyerCampaign(campaignId);
      await upsertCampaignRecord(campaign);
      await seedMaterials(campaignId);
      // intentionally do not stageLogo

      const result = await ensureDispatchExecution(campaign);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const flyer = result.dispatch.records.find((r) => r.skuId === "v2-rtu-flyer");
      expect(flyer?.executionIdentityReady).toBe(true);
      expect(flyer?.dispatchId).toBe(
        `dd:${buildJobId(campaignId, "v2-rtu-flyer")}`,
      );
      const obs = result.designRendererObserver?.results.find(
        (r) => r.skuId === "v2-rtu-flyer",
      );
      expect(obs?.action).toBe("invoked");
      expect(obs?.ok).toBe(false);
      expect(obs?.failureCode).toMatch(
        /MISSING_REQUIRED_MATERIAL|BROKEN_ASSET_REFERENCE|INVALID_DESIGN_SPEC/,
      );
    },
    60_000,
  );
});
