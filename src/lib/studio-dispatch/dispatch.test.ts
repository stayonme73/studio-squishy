import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { studioDispatchV1 } from "@/config/studio-dispatch-v1";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { mergeCustomerOwnedCampaignSync } from "@/lib/campaign-store/customer-sync-allowlist";
import { buildJobId } from "@/lib/job-control/lane-map";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import { confirmPaymentFromProcessor } from "@/lib/studio-payment/confirm";
import { writeCheckoutSessionBinding } from "@/lib/studio-payment/events-store";
import { buildPreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";
import { evaluatePreAcceptance } from "@/lib/studio-pre-acceptance/evaluate";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";

import { ensureDispatchExecution } from "./ensure";
import { evaluateJobDispatch } from "./evaluate";

const SKUS = ["v2-rtu-flyer", "v2-rtu-business-card"] as const;
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");

function clearFacts(
  overrides: Partial<PreAcceptanceProjectFacts> = {},
): PreAcceptanceProjectFacts {
  return {
    draftRevision: 1,
    routeId: "i75",
    selectedServiceIds: ["v2-rtu-flyer"],
    projectNeed: "Need a flyer for our spring open house",
    businessName: "Cedar Lane",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a flyer for our spring open house",
    ...overrides,
  };
}

function paidCampaign(
  campaignId: string,
  overrides: Partial<CampaignRecord> = {},
): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals([...SKUS]);
  const lineItems = buildServiceScopeSnapshot([...SKUS]);
  return {
    campaignId,
    campaignName: "Cedar Lane",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Paid — dispatch test",
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
      checkoutSessionId: `cs_test_${campaignId}`,
      paymentIntentId: `pi_test_${campaignId}`,
      stripeEventId: `evt_test_${campaignId}`,
      selectedServiceIds: [...SKUS],
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
      selectedServiceIds: [...SKUS],
      includedServiceIds: [...SKUS],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems,
      approvedAt: now,
    },
    ...overrides,
  };
}

async function seedClearedMaterials(campaignId: string): Promise<void> {
  const now = new Date().toISOString();
  const items: CampaignMaterialItem[] = [
    {
      id: "logo-cleared",
      category: "logo-brand",
      requirementLevel: "required",
      reviewStatus: "approved_for_use",
      contentKind: "file-metadata",
      label: "Logo",
      reason: "Brand mark",
      relatedServiceIds: [...SKUS],
      uploadStatus: "stored",
      useAuthorization: {
        basis: "customer_owns",
        attestedAt: now,
      },
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

async function cleanupCampaign(campaignId: string): Promise<void> {
  await Promise.all([
    fs.unlink(path.join(CAMPAIGNS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(TASKS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(MATERIALS_DIR, `${campaignId}.json`)).catch(() => undefined),
  ]);
}

describe("STUDIO-OPERATING-DISPATCH-1", () => {
  const ids: string[] = [];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanupCampaign(id)));
  });

  it("does not create EXECUTION_IDENTITY_READY while waiting on intake", async () => {
    const campaignId = `dd-wait-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId);
    await upsertCampaignRecord(campaign);

    const result = await ensureDispatchExecution(campaign);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dispatch.status).toBe("deferred");
    expect(result.dispatch.records.every((r) => !r.executionIdentityReady)).toBe(true);
    expect(result.dispatch.ownerActionRequired).toBe(false);
  });

  it("creates durable execution identity + requirements for multi-SKU READY_FOR_DISPATCH", async () => {
    const campaignId = `dd-multi-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId, {
      projectDetailsSubmittedAt: new Date().toISOString(),
      campaignStatus: "BUILDING_CONCEPTS",
    });
    await upsertCampaignRecord(campaign);
    await seedClearedMaterials(campaignId);

    const result = await ensureDispatchExecution(campaign);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.dispatch.status).toBe("evaluated");
    expect(result.dispatch.records).toHaveLength(2);
    expect(
      result.dispatch.records.every(
        (r) => r.status === studioDispatchV1.outcomes.executionIdentityReady,
      ),
    ).toBe(true);
    expect(result.dispatch.records.every((r) => r.executionIdentityReady)).toBe(true);
    expect(result.dispatch.records.every((r) => r.requirements)).toBeTruthy();
    expect(result.dispatch.records.every((r) => r.productionFamilyId)).toBeTruthy();
    expect(result.dispatch.ownerActionRequired).toBe(false);

    const flyer = result.dispatch.records.find((r) => r.skuId === "v2-rtu-flyer")!;
    expect(flyer.dispatchId).toBe(`dd:${buildJobId(campaignId, "v2-rtu-flyer")}`);
    expect(flyer.routingDecisionId).toBe(`rd:${buildJobId(campaignId, "v2-rtu-flyer")}`);
    expect(flyer.requirements?.primaryTool.toolId).toBe("studio_design_renderer");
    expect(flyer.requirements?.productionSteps.length).toBeGreaterThan(0);
    expect(flyer.requirements?.deliverables.length).toBeGreaterThan(0);
    // Identity still records tool refs; flyer observer may invoke after ensure (separate package).
    expect(flyer.requirements?.primaryTool.integrationState).toBeTruthy();
    // Without Route Map flyer truth, observer invoke fails closed — identity remains ready.
    const flyerObs = result.designRendererObserver?.results.find(
      (r) => r.dispatchId === flyer.dispatchId,
    );
    expect(flyerObs?.action).toBe("invoked");
    expect(flyerObs?.ok).toBe(false);
  });

  it("duplicate evaluation is idempotent", async () => {
    const campaignId = `dd-idem-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId, {
      projectDetailsSubmittedAt: new Date().toISOString(),
      campaignStatus: "BUILDING_CONCEPTS",
    });
    await upsertCampaignRecord(campaign);
    await seedClearedMaterials(campaignId);

    const first = await ensureDispatchExecution(campaign);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await ensureDispatchExecution(first.campaign);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyEvaluated).toBe(true);
    expect(second.dispatch.records.map((r) => r.dispatchId)).toEqual(
      first.dispatch.records.map((r) => r.dispatchId),
    );
  });

  it("invalidates execution identity when materials block again", async () => {
    const campaignId = `dd-inval-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId, {
      projectDetailsSubmittedAt: new Date().toISOString(),
      campaignStatus: "BUILDING_CONCEPTS",
    });
    await upsertCampaignRecord(campaign);
    await seedClearedMaterials(campaignId);

    const ready = await ensureDispatchExecution(campaign);
    expect(ready.ok).toBe(true);
    if (!ready.ok) return;
    expect(ready.dispatch.records.every((r) => r.executionIdentityReady)).toBe(true);

    const now = new Date().toISOString();
    await writeMaterialsEnvelope({
      campaignId,
      items: [
        {
          id: "logo-missing",
          category: "logo-brand",
          requirementLevel: "required",
          reviewStatus: "missing",
          contentKind: "file-metadata",
          label: "Logo",
          reason: "Needed",
          relatedServiceIds: [...SKUS],
          uploadStatus: "none",
        },
      ],
      updatedAt: now,
      syncedAt: now,
      version: 1,
    });

    const blocked = await ensureDispatchExecution(ready.campaign);
    expect(blocked.ok).toBe(true);
    if (!blocked.ok) return;
    expect(blocked.dispatch.records.every((r) => !r.executionIdentityReady)).toBe(true);
    expect(
      blocked.dispatch.records.every(
        (r) => r.status === studioDispatchV1.outcomes.waitingForPrerequisite,
      ),
    ).toBe(true);
  });

  it("payment confirm creates dispatch identity without File Room when prerequisites satisfied", async () => {
    const campaignId = `dd-confirm-${Date.now()}`;
    ids.push(campaignId);
    const flyerOnly = ["v2-rtu-flyer"] as const;
    const totals = computePlanPricingTotals([...flyerOnly]);
    const lineItems = buildServiceScopeSnapshot([...flyerOnly]);
    const unpaid = paidCampaign(campaignId, {
      paymentReceivedAt: null,
      paymentTruth: undefined,
      campaignStatus: "DRAFT_RECEIVED",
      projectDetailsSubmittedAt: new Date().toISOString(),
      approvedStudioPlan: {
        selectedServiceIds: [...flyerOnly],
        includedServiceIds: [...flyerOnly],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: totals.oneTimeSubtotalCents,
        monthlyTotalCents: 0,
        amountDueTodayCents: totals.amountDueTodayCents,
        lineItems,
        approvedAt: new Date().toISOString(),
      },
    });
    await upsertCampaignRecord(unpaid);
    await seedClearedMaterials(campaignId);

    const facts = clearFacts();
    const decision = evaluatePreAcceptance(facts);
    const authorization = buildPreAcceptancePaymentAuthorization(decision);
    expect(authorization).not.toBeNull();
    if (!authorization) return;

    const sessionId = `cs_test_dd_${campaignId}`;
    await writeCheckoutSessionBinding({
      checkoutSessionId: sessionId,
      campaignId,
      expectedAmountCents: totals.amountDueTodayCents,
      currency: "usd",
      selectedServiceIds: [...flyerOnly],
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: authorization.evaluatedDraftRevision,
      createdAt: new Date().toISOString(),
    });

    const confirmed = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: sessionId,
      paymentIntentId: `pi_${campaignId}`,
      expectedAmountCents: totals.amountDueTodayCents,
      confirmedAmountCents: totals.amountDueTodayCents,
      currency: "usd",
      selectedServiceIds: [...flyerOnly],
      decisionId: authorization.decisionId,
      factFingerprint: authorization.factFingerprint,
      draftRevision: authorization.evaluatedDraftRevision,
      authorization,
      stripeEventId: `evt_${campaignId}`,
      sandbox: true,
    });

    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.routingHandoff?.decisions[0]?.readyForDispatch).toBe(true);
    expect(confirmed.campaign.dispatchExecution?.records[0]?.executionIdentityReady).toBe(
      true,
    );
    expect(confirmed.campaign.dispatchExecution?.records[0]?.requirements?.primaryTool).toBeTruthy();
  });

  it("client sync cannot invent dispatchExecution", () => {
    const existing = paidCampaign("dd-sync-guard");
    const forged = {
      ...existing,
      dispatchExecution: {
        schemaVersion: 1 as const,
        status: "evaluated" as const,
        evaluatedAt: "2026-01-01T00:00:00.000Z",
        lastAttemptAt: "2026-01-01T00:00:00.000Z",
        activationCheckoutSessionId: "cs_forged",
        records: [],
        ownerActionRequired: false as const,
      },
    };
    expect(mergeCustomerOwnedCampaignSync(null, forged).dispatchExecution).toBeUndefined();
  });

  it("durable dispatch survives re-read without staff surfaces", async () => {
    const campaignId = `dd-durable-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId, {
      projectDetailsSubmittedAt: new Date().toISOString(),
      campaignStatus: "BUILDING_CONCEPTS",
    });
    await upsertCampaignRecord(campaign);
    await seedClearedMaterials(campaignId);

    const dispatched = await ensureDispatchExecution(campaign);
    expect(dispatched.ok).toBe(true);
    if (!dispatched.ok) return;

    const reread = await readCampaignEnvelope(campaignId);
    expect(reread?.record.dispatchExecution?.status).toBe("evaluated");
    expect(
      reread?.record.dispatchExecution?.records.every((r) => r.executionIdentityReady),
    ).toBe(true);
  });

  it("pure evaluate waits when routing is not READY_FOR_DISPATCH", () => {
    const record = evaluateJobDispatch({
      campaignId: "dd-pure",
      jobId: "dd-pure:v2-rtu-flyer",
      skuId: "v2-rtu-flyer",
      routing: {
        decisionId: "rd:dd-pure:v2-rtu-flyer",
        jobId: "dd-pure:v2-rtu-flyer",
        campaignId: "dd-pure",
        skuId: "v2-rtu-flyer",
        status: "WAITING_FOR_PREREQUISITE",
        productionFamilyId: null,
        controlLane: "quick",
        capabilityReadiness: null,
        factFingerprint: "fp",
        evaluatedAt: new Date().toISOString(),
        reason: "waiting",
        blocker: "intake_incomplete",
        readyForDispatch: false,
        ownerActionRequired: false,
      },
    });
    expect(record.status).toBe("WAITING_FOR_PREREQUISITE");
    expect(record.executionIdentityReady).toBe(false);
    expect(record.requirements).toBeNull();
  });
});
