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

  it("gates refuse non-ready / wrong tool / non-lane SKUs", () => {
    const base = evaluateJobDispatch({
      campaignId: "gate",
      jobId: "gate::v2-rtu-flyer",
      skuId: "v2-rtu-flyer",
      routing: null,
    });
    expect(shouldObserveDesignRenderer(base).invoke).toBe(false);

    // Card without studio_design_renderer tool snapshot still skips.
    const cardNoTool = {
      ...base,
      skuId: "v2-rtu-business-card" as const,
      executionIdentityReady: true,
      status: "EXECUTION_IDENTITY_READY" as const,
      requirements: undefined,
    };
    expect(shouldObserveDesignRenderer(cardNoTool).invoke).toBe(false);

    const menu = {
      ...base,
      skuId: "v2-rtu-menu" as const,
      executionIdentityReady: true,
      status: "EXECUTION_IDENTITY_READY" as const,
    };
    expect(shouldObserveDesignRenderer(menu).invoke).toBe(false);
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

  it(
    "business-card uses studio_design_renderer and observer auto-invokes double-sided",
    async () => {
      const card = resolveServiceProductionContract("v2-rtu-business-card");
      expect(card.status).toBe("resolved");
      if (card.status === "resolved") {
        expect(card.contract.primaryTool.toolId).toBe("studio_design_renderer");
      }

      const campaignId = `obs-card-${Date.now()}`;
      ids.push(campaignId);
      const now = new Date().toISOString();
      const skus = ["v2-rtu-business-card"] as const;
      const totals = computePlanPricingTotals([...skus]);
      const campaign = paidFlyerCampaign(campaignId, {
        campaignName: "Cedar Lane Studio",
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
        routeMapIntake: {
          submittedAt: now,
          answers: {
            businessName: "Cedar Lane Studio",
            cardNameTitle: "Alex Rivera · Portrait Lead",
            phone: "(804) 555-0199",
            email: "alex@cedarlane.example",
            webOrSocial: "cedarlane.example",
            address: "Richmond, VA",
            brandMaterials: "Logo staged for Machine production",
          },
        },
        routeMapIntakeSubmittedAt: now,
      });
      await upsertCampaignRecord(campaign);
      const matNow = new Date().toISOString();
      await writeMaterialsEnvelope({
        campaignId,
        items: [
          {
            id: `logo-${campaignId}`,
            category: "logo-brand",
            requirementLevel: "required",
            reviewStatus: "approved_for_use",
            contentKind: "file-metadata",
            label: "Logo",
            reason: "Brand mark",
            relatedServiceIds: ["v2-rtu-business-card"],
            uploadStatus: "stored",
            useAuthorization: { basis: "customer_owns", attestedAt: matNow },
          },
        ],
        updatedAt: matNow,
        syncedAt: matNow,
        version: 1,
      });
      stageLogo(campaignId);

      const result = await ensureDispatchExecution(campaign);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const cardRecord = result.dispatch.records.find(
        (r) => r.skuId === "v2-rtu-business-card",
      );
      expect(cardRecord?.requirements?.primaryTool.toolId).toBe(
        "studio_design_renderer",
      );
      expect(cardRecord?.executionIdentityReady).toBe(true);
      const obs = result.designRendererObserver?.results.find(
        (r) => r.skuId === "v2-rtu-business-card",
      );
      expect(obs?.action).toBe("invoked");
      expect(obs?.ok).toBe(true);
      expect(obs?.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(obs?.backPngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(obs?.pngContentSha256).not.toBe(obs?.backPngContentSha256);
    },
    180_000,
  );

  it(
    "service-sheet uses studio_design_renderer and observer auto-invokes; repeat is ALREADY_RENDERED",
    async () => {
      const sheetContract = resolveServiceProductionContract(
        "v2-rtu-service-sheet",
      );
      expect(sheetContract.status).toBe("resolved");
      if (sheetContract.status === "resolved") {
        expect(sheetContract.contract.primaryTool.toolId).toBe(
          "studio_design_renderer",
        );
      }

      const campaignId = `obs-sheet-${Date.now()}`;
      ids.push(campaignId);
      const now = new Date().toISOString();
      const skus = ["v2-rtu-service-sheet"] as const;
      const totals = computePlanPricingTotals([...skus]);
      const serviceStructuredJson = JSON.stringify({
        listHeading: "Our Services",
        services: [
          {
            name: "Spring HVAC Tune-Up",
            description: "Seasonal check.",
            startingPriceText: "$189",
          },
          {
            name: "Assessment",
            description: "Walkthrough.",
            contactForPricingText: "Contact for pricing",
          },
          {
            name: "Custom Coordination",
            description: "Scoped project help.",
          },
        ],
      });
      const campaign = paidFlyerCampaign(campaignId, {
        campaignName: "Cedar Lane Home Care",
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
          checkoutSessionId: `cs_sheet_${campaignId}`,
          paymentIntentId: `pi_sheet_${campaignId}`,
          stripeEventId: `evt_sheet_${campaignId}`,
          selectedServiceIds: [...skus],
          decisionId: `dec_${campaignId}`,
          factFingerprint: `fp_${campaignId}`,
          draftRevision: 1,
          confirmedAt: now,
        },
        routeMapIntake: {
          submittedAt: now,
          answers: {
            businessName: "Cedar Lane Home Care",
            businessType: "Home services",
            contactDetails: "Call (804) 555-0199 · cedarlane.example",
            wording: "Starting prices shown where listed.",
            materials: "Logo staged for Machine production",
            intendedUse: "Both print and digital",
            serviceStructuredJson,
          },
        },
        routeMapIntakeSubmittedAt: now,
      });
      await upsertCampaignRecord(campaign);
      const matNow = new Date().toISOString();
      await writeMaterialsEnvelope({
        campaignId,
        items: [
          {
            id: `logo-${campaignId}`,
            category: "logo-brand",
            requirementLevel: "required",
            reviewStatus: "approved_for_use",
            contentKind: "file-metadata",
            label: "Logo",
            reason: "Brand mark",
            relatedServiceIds: ["v2-rtu-service-sheet"],
            uploadStatus: "stored",
            useAuthorization: { basis: "customer_owns", attestedAt: matNow },
          },
        ],
        updatedAt: matNow,
        syncedAt: matNow,
        version: 1,
      });
      stageLogo(campaignId);

      const first = await ensureDispatchExecution(campaign);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const sheetRecord = first.dispatch.records.find(
        (r) => r.skuId === "v2-rtu-service-sheet",
      );
      expect(sheetRecord?.requirements?.primaryTool.toolId).toBe(
        "studio_design_renderer",
      );
      expect(sheetRecord?.executionIdentityReady).toBe(true);
      const obs1 = first.designRendererObserver?.results.find(
        (r) => r.skuId === "v2-rtu-service-sheet",
      );
      expect(obs1?.action).toBe("invoked");
      expect(obs1?.ok).toBe(true);
      expect(obs1?.invocationOutcome).toBe("RENDERED");
      expect(obs1?.ownerRoutineProduction).toBe("NONE");
      expect(obs1?.canvaRequired).toBe(false);
      const v1 = obs1?.renderVersion;
      const hash1 = obs1?.pngContentSha256;

      const second = await ensureDispatchExecution(first.campaign);
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      const obs2 = second.designRendererObserver?.results.find(
        (r) => r.skuId === "v2-rtu-service-sheet",
      );
      expect(obs2?.ok).toBe(true);
      expect(obs2?.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(obs2?.renderVersion).toBe(v1);
      expect(obs2?.pngContentSha256).toBe(hash1);
    },
    180_000,
  );

  it(
    "menu uses studio_design_renderer and observer auto-invokes; repeat is ALREADY_RENDERED",
    async () => {
      const menuContract = resolveServiceProductionContract("v2-rtu-menu");
      expect(menuContract.status).toBe("resolved");
      if (menuContract.status === "resolved") {
        expect(menuContract.contract.primaryTool.toolId).toBe(
          "studio_design_renderer",
        );
      }

      const campaignId = `obs-menu-${Date.now()}`;
      ids.push(campaignId);
      const now = new Date().toISOString();
      const skus = ["v2-rtu-menu"] as const;
      const totals = computePlanPricingTotals([...skus]);
      const menuStructuredJson = JSON.stringify({
        sections: [
          {
            title: "Pastries",
            items: [
              {
                name: "Butter Croissant",
                description: "Flaky laminated layers.",
                priceDisplay: "$3.75",
              },
              {
                name: "Cinnamon Roll",
                description: "Soft swirl with glaze.",
                priceDisplay: "$4.25",
              },
            ],
          },
          {
            title: "Coffee",
            items: [
              {
                name: "Drip Coffee",
                description: "House blend.",
                priceDisplay: "$2.75",
              },
              {
                name: "Cafe Latte",
                description: "Espresso with steamed milk.",
                priceDisplay: "$4.50",
              },
            ],
          },
        ],
      });
      const campaign = paidFlyerCampaign(campaignId, {
        campaignName: "Maple Street Bakery",
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
          checkoutSessionId: `cs_menu_${campaignId}`,
          paymentIntentId: `pi_menu_${campaignId}`,
          stripeEventId: `evt_menu_${campaignId}`,
          selectedServiceIds: [...skus],
          decisionId: `dec_${campaignId}`,
          factFingerprint: `fp_${campaignId}`,
          draftRevision: 1,
          confirmedAt: now,
        },
        routeMapIntake: {
          submittedAt: now,
          answers: {
            businessName: "Maple Street Bakery",
            businessType: "Bakery",
            dietaryLabels:
              "Contains wheat and dairy in various items. Customer-verified wording.",
            disclaimers: "Prices subject to change.",
            materials: "Logo staged for Machine production",
            intendedUse: "Both print and digital",
            menuStructuredJson,
          },
        },
        routeMapIntakeSubmittedAt: now,
      });
      await upsertCampaignRecord(campaign);
      const matNow = new Date().toISOString();
      await writeMaterialsEnvelope({
        campaignId,
        items: [
          {
            id: `logo-${campaignId}`,
            category: "logo-brand",
            requirementLevel: "required",
            reviewStatus: "approved_for_use",
            contentKind: "file-metadata",
            label: "Logo",
            reason: "Brand mark",
            relatedServiceIds: ["v2-rtu-menu"],
            uploadStatus: "stored",
            useAuthorization: { basis: "customer_owns", attestedAt: matNow },
          },
        ],
        updatedAt: matNow,
        syncedAt: matNow,
        version: 1,
      });
      stageLogo(campaignId);

      const first = await ensureDispatchExecution(campaign);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const menuRecord = first.dispatch.records.find(
        (r) => r.skuId === "v2-rtu-menu",
      );
      expect(menuRecord?.requirements?.primaryTool.toolId).toBe(
        "studio_design_renderer",
      );
      expect(menuRecord?.executionIdentityReady).toBe(true);
      const obs1 = first.designRendererObserver?.results.find(
        (r) => r.skuId === "v2-rtu-menu",
      );
      expect(obs1?.action).toBe("invoked");
      expect(obs1?.ok).toBe(true);
      expect(obs1?.invocationOutcome).toBe("RENDERED");
      expect(obs1?.ownerRoutineProduction).toBe("NONE");
      expect(obs1?.canvaRequired).toBe(false);
      expect(obs1?.makeRequired).toBe(false);
      expect(obs1?.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      const v1 = obs1?.renderVersion;
      const hash1 = obs1?.pngContentSha256;

      const second = await ensureDispatchExecution(first.campaign);
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      const obs2 = second.designRendererObserver?.results.find(
        (r) => r.skuId === "v2-rtu-menu",
      );
      expect(obs2?.ok).toBe(true);
      expect(obs2?.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(obs2?.renderVersion).toBe(v1);
      expect(obs2?.pngContentSha256).toBe(hash1);
    },
    180_000,
  );

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
