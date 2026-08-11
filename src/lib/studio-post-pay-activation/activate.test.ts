import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { studioPostPayActivationV1 } from "@/config/studio-post-pay-activation-v1";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { mergeCustomerOwnedCampaignSync } from "@/lib/campaign-store/customer-sync-allowlist";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
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

import { ensurePostPayActivation } from "./activate";
import { resolvePostPayActivationPhase } from "./resolve-phase";

/** Real catalog production SKUs (legacy ma-flyer-v2 is not in catalog). */
const SKUS = ["v2-rtu-flyer", "sm-001"] as const;
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

function paidReadyCampaign(
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
    campaignDescription: "Paid — activation test",
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

describe("STUDIO-OPERATING-POST-PAY-ACTIVATION-CONSUMER-1", () => {
  const ids: string[] = [];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanupCampaign(id)));
  });

  it("resolves awaiting_intake when paid without intake", () => {
    const campaign = paidReadyCampaign("phase-intake");
    const resolved = resolvePostPayActivationPhase(campaign, []);
    expect(resolved.phase).toBe(studioPostPayActivationV1.phases.awaitingIntake);
    expect(resolved.intakeComplete).toBe(false);
  });

  it("resolves awaiting_materials when intake done but materials still block", () => {
    const campaign = paidReadyCampaign("phase-materials", {
      projectDetailsSubmittedAt: new Date().toISOString(),
    });
    const blocking: CampaignMaterialItem[] = [
      {
        id: "logo-missing",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Logo",
        reason: "Needed",
        relatedServiceIds: ["sm-001"],
        uploadStatus: "none",
      },
    ];
    const resolved = resolvePostPayActivationPhase(campaign, blocking);
    expect(resolved.phase).toBe(studioPostPayActivationV1.phases.awaitingMaterials);
    expect(resolved.blockingRequiredMaterialsCount).toBeGreaterThan(0);
  });

  it("resolves ready_for_routing when intake complete and materials clear", () => {
    const campaign = paidReadyCampaign("phase-ready", {
      projectDetailsSubmittedAt: new Date().toISOString(),
      campaignStatus: "BUILDING_CONCEPTS",
    });
    const resolved = resolvePostPayActivationPhase(campaign, []);
    expect(resolved.phase).toBe(studioPostPayActivationV1.phases.readyForRouting);
    expect(resolved.intakeComplete).toBe(true);
    expect(resolved.blockingRequiredMaterialsCount).toBe(0);
  });

  it("eagerly materializes jobs/tasks from confirmed payment without File Room visit", async () => {
    const campaignId = `ppa-eager-${Date.now()}`;
    ids.push(campaignId);
    const flyerOnly = ["v2-rtu-flyer"] as const;
    const totals = computePlanPricingTotals([...flyerOnly]);
    const lineItems = buildServiceScopeSnapshot([...flyerOnly]);
    const unpaid = paidReadyCampaign(campaignId, {
      paymentReceivedAt: null,
      paymentTruth: undefined,
      campaignStatus: "DRAFT_RECEIVED",
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

    const facts = clearFacts();
    const decision = evaluatePreAcceptance(facts);
    expect(decision.outcome).toBe("CLEAR_TO_ACCEPT");
    const authorization = buildPreAcceptancePaymentAuthorization(decision);
    expect(authorization).not.toBeNull();
    if (!authorization) return;
    const sessionId = `cs_test_eager_${campaignId}`;

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

    // Browser-closed scenario: no File Room / Owner Console — only confirm path.
    expect(confirmed.campaign.postPayActivation?.status).toBe("activated");
    expect(confirmed.campaign.postPayActivation?.phase).toBe("awaiting_intake");
    expect(confirmed.campaign.postPayActivation?.ownerActionRequired).toBe(false);
    expect(confirmed.campaign.postPayActivation?.jobIds).toEqual([
      buildJobId(campaignId, "v2-rtu-flyer"),
    ]);

    const tasks = await readTasksEnvelope(campaignId);
    expect(tasks).not.toBeNull();
    expect(tasks!.jobRecords).toHaveLength(1);
    expect(tasks!.tasks.length).toBeGreaterThan(0);
    expect(tasks!.jobRecords!.every((job) => !job.productionStartedAt)).toBe(true);
  });

  it("duplicate confirm does not duplicate jobs or activation", async () => {
    const campaignId = `ppa-idem-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidReadyCampaign(campaignId);
    await upsertCampaignRecord(campaign);

    const first = await ensurePostPayActivation(campaign);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.activation.jobIds).toHaveLength(2);

    const second = await ensurePostPayActivation(first.campaign);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(second.alreadyActivated).toBe(true);
    expect(second.activation.jobIds).toEqual(first.activation.jobIds);
    expect(second.activation.activatedAt).toBe(first.activation.activatedAt);

    const tasks = await readTasksEnvelope(campaignId);
    expect(tasks!.jobRecords).toHaveLength(2);
  });

  it("retry after pending_retry recovers without duplicating jobs", async () => {
    const campaignId = `ppa-retry-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidReadyCampaign(campaignId, {
      postPayActivation: {
        schemaVersion: 1,
        status: "pending_retry",
        phase: "awaiting_intake",
        activatedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        checkoutSessionId: `cs_test_${campaignId}`,
        jobIds: [],
        taskCount: 0,
        intakeComplete: false,
        blockingRequiredMaterialsCount: 0,
        ownerActionRequired: false,
        lastError: "simulated write failure",
      },
    });
    await upsertCampaignRecord(campaign);

    const recovered = await ensurePostPayActivation(campaign);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;
    expect(recovered.activation.status).toBe("activated");
    expect(recovered.activation.jobIds).toHaveLength(2);
    expect(recovered.activation.lastError).toBeNull();

    const again = await ensurePostPayActivation(recovered.campaign);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.activation.jobIds).toEqual(recovered.activation.jobIds);
  });

  it("intake-complete with cleared materials becomes ready_for_routing without production start", async () => {
    const campaignId = `ppa-ready-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidReadyCampaign(campaignId, {
      projectDetailsSubmittedAt: new Date().toISOString(),
      campaignStatus: "BUILDING_CONCEPTS",
    });
    await upsertCampaignRecord(campaign);
    await seedClearedMaterials(campaignId);

    const result = await ensurePostPayActivation(campaign);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.activation.phase).toBe("ready_for_routing");
    expect(result.activation.intakeComplete).toBe(true);
    expect(result.activation.blockingRequiredMaterialsCount).toBe(0);

    const tasks = await readTasksEnvelope(campaignId);
    expect(tasks!.jobRecords!.every((job) => job.intakeComplete)).toBe(true);
    expect(tasks!.jobRecords!.every((job) => !job.productionStartedAt)).toBe(true);
  });

  it("intake-complete with missing materials stays awaiting_materials (not production)", async () => {
    const campaignId = `ppa-wait-mat-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidReadyCampaign(campaignId, {
      projectDetailsSubmittedAt: new Date().toISOString(),
      campaignStatus: "BUILDING_CONCEPTS",
    });
    await upsertCampaignRecord(campaign);
    // Do not seed cleared materials — migrate creates blocking required slots.

    const result = await ensurePostPayActivation(campaign);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.activation.phase).toBe("awaiting_materials");
    expect(result.activation.blockingRequiredMaterialsCount).toBeGreaterThan(0);

    const tasks = await readTasksEnvelope(campaignId);
    expect(tasks!.jobRecords!.every((job) => !job.productionStartedAt)).toBe(true);
  });

  it("Board/server sync cannot invent postPayActivation from the client", () => {
    const existing = paidReadyCampaign("ppa-sync-guard");
    const forged = {
      ...existing,
      postPayActivation: {
        schemaVersion: 1 as const,
        status: "activated" as const,
        phase: "ready_for_routing" as const,
        activatedAt: "2026-01-01T00:00:00.000Z",
        lastAttemptAt: "2026-01-01T00:00:00.000Z",
        checkoutSessionId: "cs_forged",
        jobIds: ["forged-job"],
        taskCount: 99,
        intakeComplete: true,
        blockingRequiredMaterialsCount: 0,
        ownerActionRequired: false as const,
      },
    };

    const withoutExisting = mergeCustomerOwnedCampaignSync(null, forged);
    expect(withoutExisting.postPayActivation).toBeUndefined();

    const unpaidExisting = {
      ...existing,
      paymentReceivedAt: null,
      paymentTruth: undefined,
      postPayActivation: undefined,
    };
    const merged = mergeCustomerOwnedCampaignSync(unpaidExisting, forged);
    expect(merged.postPayActivation).toBeUndefined();
  });

  it("durable activation survives re-read without staff surfaces", async () => {
    const campaignId = `ppa-durable-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidReadyCampaign(campaignId);
    await upsertCampaignRecord(campaign);

    const activated = await ensurePostPayActivation(campaign);
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;

    const reread = await readCampaignEnvelope(campaignId);
    expect(reread?.record.postPayActivation?.status).toBe("activated");
    expect(reread?.record.postPayActivation?.jobIds).toHaveLength(2);
    expect(reread?.record.paymentTruth?.status).toBe("confirmed");
  });
});
