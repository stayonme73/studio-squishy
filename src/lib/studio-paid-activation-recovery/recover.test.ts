import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { studioPaidActivationRecoveryV1 } from "@/config/studio-paid-activation-recovery-v1";
import { studioBoard } from "@/config/studio-board";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { buildJobId } from "@/lib/job-control/lane-map";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import { resolveBoardNextActionPresentation } from "@/lib/studio-board-next-action";
import {
  recoverPaidOperatingChain,
  sweepPaidActivationRecovery,
  wakePaidCampaignEnvelope,
} from "@/lib/studio-paid-activation-recovery";
import { confirmPaymentFromProcessor } from "@/lib/studio-payment/confirm";
import { writeCheckoutSessionBinding } from "@/lib/studio-payment/events-store";
import { reconcileCheckoutSession } from "@/lib/studio-payment/reconcile";
import { buildPreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";
import { evaluatePreAcceptance } from "@/lib/studio-pre-acceptance/evaluate";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";
import * as materialsStore from "@/lib/materials/store";

const FLYER = ["v2-rtu-flyer"] as const;
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
    businessName: "Cedar & Bloom Home Organizing",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a flyer for our spring open house",
    ...overrides,
  };
}

function flyerPaidCampaign(
  campaignId: string,
  overrides: Partial<CampaignRecord> = {},
): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals([...FLYER]);
  const lineItems = buildServiceScopeSnapshot([...FLYER]);
  return {
    campaignId,
    campaignName: "Cedar & Bloom Home Organizing",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Paid — recovery test",
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
      selectedServiceIds: [...FLYER],
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
      selectedServiceIds: [...FLYER],
      includedServiceIds: [...FLYER],
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

function pendingRetryOverlay(
  campaignId: string,
  lastError: string,
): Pick<CampaignRecord, "postPayActivation"> {
  const now = new Date().toISOString();
  return {
    postPayActivation: {
      schemaVersion: 1,
      status: "pending_retry",
      phase: "awaiting_intake",
      activatedAt: now,
      lastAttemptAt: now,
      checkoutSessionId: `cs_test_${campaignId}`,
      jobIds: [],
      taskCount: 0,
      intakeComplete: false,
      blockingRequiredMaterialsCount: 0,
      ownerActionRequired: false,
      lastError,
    },
  };
}

async function cleanupCampaign(campaignId: string): Promise<void> {
  await Promise.all([
    fs.unlink(path.join(CAMPAIGNS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(TASKS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(MATERIALS_DIR, `${campaignId}.json`)).catch(() => undefined),
  ]);
}

async function confirmFlyerPayment(campaignId: string) {
  const totals = computePlanPricingTotals([...FLYER]);
  const lineItems = buildServiceScopeSnapshot([...FLYER]);
  const unpaid = flyerPaidCampaign(campaignId, {
    paymentReceivedAt: null,
    paymentTruth: undefined,
    campaignStatus: "DRAFT_RECEIVED",
    approvedStudioPlan: {
      selectedServiceIds: [...FLYER],
      includedServiceIds: [...FLYER],
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
  const authorization = buildPreAcceptancePaymentAuthorization(decision);
  if (!authorization) throw new Error("expected CLEAR_TO_ACCEPT");
  const sessionId = `cs_test_${campaignId}`;

  await writeCheckoutSessionBinding({
    checkoutSessionId: sessionId,
    campaignId,
    expectedAmountCents: totals.amountDueTodayCents,
    currency: "usd",
    selectedServiceIds: [...FLYER],
    decisionId: authorization.decisionId,
    factFingerprint: authorization.factFingerprint,
    draftRevision: authorization.evaluatedDraftRevision,
    createdAt: new Date().toISOString(),
  });

  return confirmPaymentFromProcessor({
    campaignId,
    checkoutSessionId: sessionId,
    paymentIntentId: `pi_${campaignId}`,
    expectedAmountCents: totals.amountDueTodayCents,
    confirmedAmountCents: totals.amountDueTodayCents,
    currency: "usd",
    selectedServiceIds: [...FLYER],
    decisionId: authorization.decisionId,
    factFingerprint: authorization.factFingerprint,
    draftRevision: authorization.evaluatedDraftRevision,
    authorization,
    stripeEventId: `evt_${campaignId}`,
    sandbox: true,
  });
}

describe("STUDIO-OPERATING-PAID-ACTIVATION-RECOVERY-1", () => {
  const ids: string[] = [];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(ids.splice(0).map((id) => cleanupCampaign(id)));
  });

  it("payment succeeds while activation initially fails, then in-process retry recovers", async () => {
    const campaignId = `par-initfail-${Date.now()}`;
    ids.push(campaignId);
    vi.spyOn(materialsStore, "getOrInitializeMaterials").mockRejectedValueOnce(
      new Error("simulated activation disk failure"),
    );

    const confirmed = await confirmFlyerPayment(campaignId);
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.paymentTruth?.status).toBe("confirmed");
    expect(confirmed.campaign.postPayActivation?.status).toBe("activated");
    expect(confirmed.campaign.postPayActivation?.ownerActionRequired).toBe(false);
    expect(confirmed.campaign.postPayActivation?.jobIds).toEqual([
      buildJobId(campaignId, "v2-rtu-flyer"),
    ]);
  });

  it("exhausts retries, stays paid as pending_retry, then later recover succeeds without Owner", async () => {
    const campaignId = `par-exhaust-${Date.now()}`;
    ids.push(campaignId);
    vi.spyOn(materialsStore, "getOrInitializeMaterials").mockRejectedValue(
      new Error("activation still failing"),
    );

    const confirmed = await confirmFlyerPayment(campaignId);
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.campaign.paymentReceivedAt).toBeTruthy();
    expect(confirmed.campaign.postPayActivation?.status).toBe("pending_retry");
    expect(confirmed.campaign.postPayActivation?.ownerActionRequired).toBe(false);

    vi.restoreAllMocks();
    const recovered = await recoverPaidOperatingChain(confirmed.campaign);
    expect(recovered.ownerActionRequired).toBe(false);
    expect(recovered.ok).toBe(true);
    expect(recovered.needsRecovery).toBe(false);
    expect(recovered.campaign.postPayActivation?.status).toBe("activated");
    expect(recovered.campaign.postPayActivation?.jobIds).toEqual([
      buildJobId(campaignId, "v2-rtu-flyer"),
    ]);
  });

  it("partial activation (jobs on disk, pending_retry) reconstructs without duplicating jobs", async () => {
    const campaignId = `par-partial-${Date.now()}`;
    ids.push(campaignId);
    const campaign = flyerPaidCampaign(campaignId, pendingRetryOverlay(campaignId, "partial write"));
    await upsertCampaignRecord(campaign);

    const first = await recoverPaidOperatingChain(campaign);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const jobIds = first.campaign.postPayActivation?.jobIds ?? [];
    expect(jobIds).toEqual([buildJobId(campaignId, "v2-rtu-flyer")]);

    const second = await recoverPaidOperatingChain(first.campaign);
    expect(second.alreadyClear).toBe(true);
    expect(second.campaign.postPayActivation?.jobIds).toEqual(jobIds);
    const tasks = await readTasksEnvelope(campaignId);
    expect(tasks?.jobRecords).toHaveLength(1);
  });

  it("interrupted/restarted process recovers from durable payment truth without a live browser", async () => {
    const campaignId = `par-restart-${Date.now()}`;
    ids.push(campaignId);
    const campaign = flyerPaidCampaign(campaignId, { postPayActivation: undefined });
    await upsertCampaignRecord(campaign);

    const recovered = await recoverPaidOperatingChain(campaign);
    expect(recovered.ok).toBe(true);
    expect(recovered.ownerActionRequired).toBe(false);
    expect(recovered.campaign.postPayActivation?.status).toBe("activated");

    const disk = await readCampaignEnvelope(campaignId);
    expect(disk?.record.postPayActivation?.status).toBe("activated");
    expect(disk?.record.postPayActivation?.jobIds).toEqual([
      buildJobId(campaignId, "v2-rtu-flyer"),
    ]);
  });

  it("same payment event again does not duplicate project, activation, or jobs", async () => {
    const campaignId = `par-replay-${Date.now()}`;
    ids.push(campaignId);
    const first = await confirmFlyerPayment(campaignId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const jobIds = first.campaign.postPayActivation?.jobIds;
    const truth = first.campaign.paymentTruth!;
    const authorization = first.campaign.preAcceptancePaymentAuthorization;
    if (!authorization) throw new Error("expected stored payment authorization");

    const second = await confirmPaymentFromProcessor({
      campaignId,
      checkoutSessionId: truth.checkoutSessionId,
      paymentIntentId: truth.paymentIntentId ?? `pi_${campaignId}`,
      expectedAmountCents: truth.expectedAmountCents,
      confirmedAmountCents: truth.confirmedAmountCents ?? truth.expectedAmountCents,
      currency: "usd",
      selectedServiceIds: [...FLYER],
      decisionId: truth.decisionId,
      factFingerprint: truth.factFingerprint,
      draftRevision: truth.draftRevision,
      authorization,
      stripeEventId: truth.stripeEventId ?? `evt_${campaignId}`,
      sandbox: true,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyPaid).toBe(true);
    expect(second.campaign.postPayActivation?.jobIds).toEqual(jobIds);
    expect(second.campaign.postPayActivation?.activatedAt).toBe(
      first.campaign.postPayActivation?.activatedAt,
    );
    const tasks = await readTasksEnvelope(campaignId);
    expect(tasks?.jobRecords).toHaveLength(1);
  });

  it("customer leave/return while recovery is pending wakes from campaign GET helper", async () => {
    const campaignId = `par-return-${Date.now()}`;
    ids.push(campaignId);
    const campaign = flyerPaidCampaign(campaignId, pendingRetryOverlay(campaignId, "customer left"));
    const saved = await upsertCampaignRecord(campaign);

    const woken = await wakePaidCampaignEnvelope(saved);
    expect(woken.record.postPayActivation?.status).toBe("activated");
    expect(woken.record.postPayActivation?.ownerActionRequired).toBe(false);

    const reread = await readCampaignEnvelope(campaignId);
    expect(reread?.record.postPayActivation?.status).toBe("activated");
  });

  it("already-paid reconcile re-wakes pending_retry instead of returning asleep", async () => {
    const campaignId = `par-recon-${Date.now()}`;
    ids.push(campaignId);
    const campaign = flyerPaidCampaign(campaignId, pendingRetryOverlay(campaignId, "webhook wrote paid first"));
    await upsertCampaignRecord(campaign);
    await writeCheckoutSessionBinding({
      checkoutSessionId: `cs_test_${campaignId}`,
      campaignId,
      expectedAmountCents: campaign.paymentTruth!.expectedAmountCents,
      currency: "usd",
      selectedServiceIds: [...FLYER],
      decisionId: campaign.paymentTruth!.decisionId,
      factFingerprint: campaign.paymentTruth!.factFingerprint,
      draftRevision: 1,
      createdAt: new Date().toISOString(),
    });

    const reconciled = await reconcileCheckoutSession(`cs_test_${campaignId}`);
    expect(reconciled.ok).toBe(true);
    if (!reconciled.ok) return;
    expect(reconciled.paid).toBe(true);
    expect(reconciled.campaign?.postPayActivation?.status).toBe("activated");
  });

  it("sweep recovers a stranded paid campaign without Owner action", async () => {
    const campaignId = `par-sweep-${Date.now()}`;
    ids.push(campaignId);
    await upsertCampaignRecord(
      flyerPaidCampaign(campaignId, pendingRetryOverlay(campaignId, "stranded")),
    );

    const sweep = await sweepPaidActivationRecovery({
      onlyCampaignIds: [campaignId],
    });
    expect(sweep.ownerActionRequired).toBe(false);
    expect(sweep.attempted).toBe(1);
    expect(sweep.recovered).toBe(1);
    expect(sweep.stillPending).toBe(0);

    const disk = await readCampaignEnvelope(campaignId);
    expect(disk?.record.postPayActivation?.status).toBe("activated");
  });

  it("does not show Building Concepts while the Machine is stuck in pending_retry", () => {
    const campaign = flyerPaidCampaign("par-copy-stuck", {
      campaignStatus: "BUILDING_CONCEPTS",
      projectDetailsSubmittedAt: new Date().toISOString(),
      ...pendingRetryOverlay("par-copy-stuck", "setup failed"),
    });
    const presentation = resolveBoardNextActionPresentation({
      campaign,
      displayFacts: {
        blockingRequiredCount: 0,
        movedToProduction: true,
        productionGatePassed: true,
      },
    });
    expect(presentation.statusLabel).toBe(
      studioPaidActivationRecoveryV1.customerCopy.recoveringStatusLabel,
    );
    expect(presentation.lead).toBe(studioPaidActivationRecoveryV1.customerCopy.recoveringLead);
    expect(presentation.lead).not.toMatch(/\.\.\./);
    expect(presentation.statusLabel).not.toBe(studioBoard.nextAction.buildingConceptsLabel);
    expect(presentation.lead).not.toMatch(/building your concepts/i);
  });

  it("routine recovery Owner action remains NONE", async () => {
    expect(studioPaidActivationRecoveryV1.routineOwnerAction).toBe("NONE");
    const campaignId = `par-owner-${Date.now()}`;
    ids.push(campaignId);
    const recovered = await recoverPaidOperatingChain(
      flyerPaidCampaign(campaignId, pendingRetryOverlay(campaignId, "retry")),
    );
    expect(recovered.ownerActionRequired).toBe(false);
    expect(recovered.campaign.postPayActivation?.ownerActionRequired).toBe(false);
  });
});
