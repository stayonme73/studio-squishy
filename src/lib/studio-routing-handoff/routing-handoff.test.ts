import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { studioPostPayActivationV1 } from "@/config/studio-post-pay-activation-v1";
import { studioRoutingHandoffV1 } from "@/config/studio-routing-handoff-v1";
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
import { ensurePostPayActivation } from "@/lib/studio-post-pay-activation";
import { confirmPaymentFromProcessor } from "@/lib/studio-payment/confirm";
import { writeCheckoutSessionBinding } from "@/lib/studio-payment/events-store";
import { buildPreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";
import { evaluatePreAcceptance } from "@/lib/studio-pre-acceptance/evaluate";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";

import { evaluateJobRoutingDecision } from "./evaluate";
import { ensureRoutingHandoff } from "./ensure";

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
    campaignDescription: "Paid — routing test",
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

describe("STUDIO-OPERATING-ROUTING-HANDOFF-1", () => {
  const ids: string[] = [];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanupCampaign(id)));
  });

  it("does not mark READY_FOR_DISPATCH when activation is still awaiting intake", async () => {
    const campaignId = `rh-wait-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId);
    await upsertCampaignRecord(campaign);

    const result = await ensureRoutingHandoff(campaign);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.handoff.status).toBe("deferred");
    expect(result.handoff.decisions.every((d) => d.status === "WAITING_FOR_PREREQUISITE")).toBe(
      true,
    );
    expect(result.handoff.decisions.every((d) => !d.readyForDispatch)).toBe(true);
    expect(result.handoff.ownerActionRequired).toBe(false);
  });

  it("routes multi-SKU jobs independently to READY_FOR_DISPATCH when ready", async () => {
    const campaignId = `rh-multi-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId, {
      projectDetailsSubmittedAt: new Date().toISOString(),
      campaignStatus: "BUILDING_CONCEPTS",
    });
    await upsertCampaignRecord(campaign);
    await seedClearedMaterials(campaignId);

    const result = await ensureRoutingHandoff(campaign);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.campaign.postPayActivation?.phase).toBe(
      studioPostPayActivationV1.phases.readyForRouting,
    );
    expect(result.handoff.status).toBe("evaluated");
    expect(result.handoff.decisions).toHaveLength(2);
    expect(result.handoff.decisions.map((d) => d.skuId).sort()).toEqual([
      "v2-rtu-business-card",
      "v2-rtu-flyer",
    ]);
    expect(
      result.handoff.decisions.every(
        (d) => d.status === studioRoutingHandoffV1.outcomes.readyForDispatch,
      ),
    ).toBe(true);
    expect(result.handoff.decisions.every((d) => d.readyForDispatch)).toBe(true);
    expect(result.handoff.decisions.every((d) => d.productionFamilyId)).toBeTruthy();
    expect(result.handoff.ownerActionRequired).toBe(false);

    const flyer = result.handoff.decisions.find((d) => d.skuId === "v2-rtu-flyer")!;
    const card = result.handoff.decisions.find((d) => d.skuId === "v2-rtu-business-card")!;
    expect(flyer.decisionId).toBe(`rd:${buildJobId(campaignId, "v2-rtu-flyer")}`);
    expect(card.decisionId).toBe(`rd:${buildJobId(campaignId, "v2-rtu-business-card")}`);
    expect(flyer.decisionId).not.toBe(card.decisionId);
  });

  it("duplicate evaluation is idempotent", async () => {
    const campaignId = `rh-idem-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId, {
      projectDetailsSubmittedAt: new Date().toISOString(),
      campaignStatus: "BUILDING_CONCEPTS",
    });
    await upsertCampaignRecord(campaign);
    await seedClearedMaterials(campaignId);

    const first = await ensureRoutingHandoff(campaign);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await ensureRoutingHandoff(first.campaign);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyEvaluated).toBe(true);
    expect(second.handoff.decisions.map((d) => d.decisionId)).toEqual(
      first.handoff.decisions.map((d) => d.decisionId),
    );
    expect(second.handoff.decisions.map((d) => d.factFingerprint)).toEqual(
      first.handoff.decisions.map((d) => d.factFingerprint),
    );
  });

  it("invalidates READY_FOR_DISPATCH when materials become blocking again", async () => {
    const campaignId = `rh-inval-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId, {
      projectDetailsSubmittedAt: new Date().toISOString(),
      campaignStatus: "BUILDING_CONCEPTS",
    });
    await upsertCampaignRecord(campaign);
    await seedClearedMaterials(campaignId);

    const ready = await ensureRoutingHandoff(campaign);
    expect(ready.ok).toBe(true);
    if (!ready.ok) return;
    expect(ready.handoff.decisions.every((d) => d.readyForDispatch)).toBe(true);

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

    const blocked = await ensureRoutingHandoff(ready.campaign);
    expect(blocked.ok).toBe(true);
    if (!blocked.ok) return;
    expect(
      blocked.handoff.decisions.every(
        (d) => d.status === "WAITING_FOR_PREREQUISITE" && !d.readyForDispatch,
      ),
    ).toBe(true);
  });

  it("blocks unknown/unsupported capability mapping fail-closed", () => {
    const campaign = paidCampaign("rh-block-pure", {
      projectDetailsSubmittedAt: new Date().toISOString(),
      postPayActivation: {
        schemaVersion: 1,
        status: "activated",
        phase: "ready_for_routing",
        activatedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        checkoutSessionId: "cs_test_rh-block-pure",
        jobIds: ["rh-block-pure:not-a-real-sku"],
        taskCount: 0,
        intakeComplete: true,
        blockingRequiredMaterialsCount: 0,
        ownerActionRequired: false,
      },
    });
    const decision = evaluateJobRoutingDecision({
      campaign,
      job: {
        jobId: "rh-block-pure:not-a-real-sku",
        campaignId: "rh-block-pure",
        skuId: "not-a-real-sku" as never,
        serviceName: "Ghost",
        spineStatus: "ready_for_queue",
        productionLane: "standard",
        intakeComplete: true,
        laneQueuedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      materials: [],
    });
    expect(decision.status).toBe("ROUTING_BLOCKED");
    expect(decision.readyForDispatch).toBe(false);
    expect(decision.ownerActionRequired).toBe(false);
  });

  it("payment confirm path routes without File Room when prerequisites already satisfied", async () => {
    const campaignId = `rh-confirm-${Date.now()}`;
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
    expect(decision.outcome).toBe("CLEAR_TO_ACCEPT");
    const authorization = buildPreAcceptancePaymentAuthorization(decision);
    expect(authorization).not.toBeNull();
    if (!authorization) return;

    const sessionId = `cs_test_rh_${campaignId}`;
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
    expect(confirmed.campaign.postPayActivation?.phase).toBe("ready_for_routing");
    expect(confirmed.campaign.routingHandoff?.status).toBe("evaluated");
    expect(confirmed.campaign.routingHandoff?.decisions).toHaveLength(1);
    expect(confirmed.campaign.routingHandoff?.decisions[0]?.readyForDispatch).toBe(true);
    expect(confirmed.campaign.routingHandoff?.ownerActionRequired).toBe(false);
  });

  it("client sync cannot invent routingHandoff", () => {
    const existing = paidCampaign("rh-sync-guard");
    const forged = {
      ...existing,
      routingHandoff: {
        schemaVersion: 1 as const,
        status: "evaluated" as const,
        evaluatedAt: "2026-01-01T00:00:00.000Z",
        lastAttemptAt: "2026-01-01T00:00:00.000Z",
        activationCheckoutSessionId: "cs_forged",
        decisions: [],
        ownerActionRequired: false as const,
      },
    };
    expect(mergeCustomerOwnedCampaignSync(null, forged).routingHandoff).toBeUndefined();
    const unpaid = {
      ...existing,
      paymentReceivedAt: null,
      paymentTruth: undefined,
      routingHandoff: undefined,
    };
    expect(mergeCustomerOwnedCampaignSync(unpaid, forged).routingHandoff).toBeUndefined();
  });

  it("durable routing survives re-read without staff surfaces", async () => {
    const campaignId = `rh-durable-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId, {
      projectDetailsSubmittedAt: new Date().toISOString(),
      campaignStatus: "BUILDING_CONCEPTS",
    });
    await upsertCampaignRecord(campaign);
    await seedClearedMaterials(campaignId);

    const routed = await ensureRoutingHandoff(campaign);
    expect(routed.ok).toBe(true);
    if (!routed.ok) return;

    const reread = await readCampaignEnvelope(campaignId);
    expect(reread?.record.routingHandoff?.status).toBe("evaluated");
    expect(reread?.record.routingHandoff?.decisions.every((d) => d.readyForDispatch)).toBe(
      true,
    );
  });

  it("activation-only path without materials stays deferred (no production start)", async () => {
    const campaignId = `rh-act-only-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId);
    await upsertCampaignRecord(campaign);

    const activated = await ensurePostPayActivation(campaign);
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;
    expect(activated.activation.phase).toBe("awaiting_intake");

    const routed = await ensureRoutingHandoff(activated.campaign);
    expect(routed.ok).toBe(true);
    if (!routed.ok) return;
    expect(routed.handoff.decisions.every((d) => !d.readyForDispatch)).toBe(true);
  });
});
