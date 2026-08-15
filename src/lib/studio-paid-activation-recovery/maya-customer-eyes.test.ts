import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { studioPaidActivationRecoveryV1 } from "@/config/studio-paid-activation-recovery-v1";
import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "@/lib/plan-pricing";
import { resolveBoardNextActionPresentation } from "@/lib/studio-board-next-action";
import { recoverPaidOperatingChain } from "@/lib/studio-paid-activation-recovery";

const FLYER = ["v2-rtu-flyer"] as const;
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");

function mayaPaidCampaign(
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
    campaignDescription: "Maya Brooks flyer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: `cs_maya_${campaignId}`,
      paymentIntentId: `pi_maya_${campaignId}`,
      stripeEventId: `evt_maya_${campaignId}`,
      selectedServiceIds: [...FLYER],
      decisionId: `dec_maya_${campaignId}`,
      factFingerprint: `fp_maya_${campaignId}`,
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

async function cleanup(campaignId: string): Promise<void> {
  await Promise.all([
    fs.unlink(path.join(CAMPAIGNS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(TASKS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(MATERIALS_DIR, `${campaignId}.json`)).catch(() => undefined),
  ]);
}

describe("STUDIO-OPERATING-PAID-ACTIVATION-RECOVERY-1 Maya customer-eyes", () => {
  const ids: string[] = [];

  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanup(id)));
  });

  it("while recovery is pending, Maya still sees honest intake — not a created/building lie", () => {
    const campaign = mayaPaidCampaign("maya-recovering-intake", {
      postPayActivation: {
        schemaVersion: 1,
        status: "pending_retry",
        phase: "awaiting_intake",
        activatedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        checkoutSessionId: "cs_maya_recovering",
        jobIds: [],
        taskCount: 0,
        intakeComplete: false,
        blockingRequiredMaterialsCount: 0,
        ownerActionRequired: false,
        lastError: "activation hiccup",
      },
    });

    const board = resolveBoardNextActionPresentation({ campaign });
    expect(board.statusLabel).toBe(studioBoard.nextAction.waitingOnProjectIntakeLabel);
    expect(board.action && "label" in board.action ? board.action.label : null).toBe(
      studioBoard.nextAction.completeProjectDetails,
    );
    expect(board.lead).not.toMatch(/building your concepts/i);
    expect(board.lead).not.toMatch(/project has been created/i);

    expect(conversationRoomGuideV1.intakeTabletPaymentReceivedLabel).toBe("Payment received");
  });

  it("after recovery succeeds, Maya still goes to Project Intake and the Machine is awake", async () => {
    const campaignId = `maya-recovered-${Date.now()}`;
    ids.push(campaignId);
    const campaign = mayaPaidCampaign(campaignId, {
      postPayActivation: {
        schemaVersion: 1,
        status: "pending_retry",
        phase: "awaiting_intake",
        activatedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        checkoutSessionId: `cs_maya_${campaignId}`,
        jobIds: [],
        taskCount: 0,
        intakeComplete: false,
        blockingRequiredMaterialsCount: 0,
        ownerActionRequired: false,
        lastError: "activation hiccup",
      },
    });
    await upsertCampaignRecord(campaign);

    const recovered = await recoverPaidOperatingChain(campaign);
    expect(recovered.ok).toBe(true);
    expect(recovered.campaign.postPayActivation?.status).toBe("activated");
    expect(recovered.campaign.postPayActivation?.phase).toBe("awaiting_intake");
    expect(recovered.ownerActionRequired).toBe(false);

    const board = resolveBoardNextActionPresentation({ campaign: recovered.campaign });
    expect(board.statusLabel).toBe(studioBoard.nextAction.waitingOnProjectIntakeLabel);
    expect(board.lead).not.toMatch(/building your concepts/i);
    expect(recovered.campaign.paymentTruth?.confirmedAmountCents).toBe(6900);
  });

  it("if intake is done but the Machine is stuck, Maya is not told work has started", () => {
    const campaign = mayaPaidCampaign("maya-stuck-after-intake", {
      campaignStatus: "BUILDING_CONCEPTS",
      projectDetailsSubmittedAt: new Date().toISOString(),
      postPayActivation: {
        schemaVersion: 1,
        status: "pending_retry",
        phase: "ready_for_routing",
        activatedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        checkoutSessionId: "cs_maya_stuck",
        jobIds: [],
        taskCount: 0,
        intakeComplete: true,
        blockingRequiredMaterialsCount: 0,
        ownerActionRequired: false,
        lastError: "routing write failed",
      },
    });
    const board = resolveBoardNextActionPresentation({
      campaign,
      displayFacts: {
        blockingRequiredCount: 0,
        movedToProduction: true,
        productionGatePassed: true,
      },
    });
    expect(board.statusLabel).toBe(
      studioPaidActivationRecoveryV1.customerCopy.recoveringStatusLabel,
    );
    expect(board.lead).toBe(studioPaidActivationRecoveryV1.customerCopy.recoveringLead);
    expect(board.lead).not.toMatch(/\.\.\./);
    expect(board.statusLabel).not.toBe(studioBoard.nextAction.buildingConceptsLabel);
  });
});
