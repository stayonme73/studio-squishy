import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { studioRoutingHandoffV1 } from "@/config/studio-routing-handoff-v1";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { buildJobId } from "@/lib/job-control/lane-map";
import { socialPromoCompositeRoutingDecisions } from "@/lib/studio-dispatch/social-promo-composite-dispatch";
import { writeCheckoutSessionBinding } from "@/lib/studio-payment/events-store";

import { submitPaidIntakeByCheckoutSession } from "./intake-submit";

function socialPromoIntakeAnswers() {
  return {
    "shared:businessName": "Spruce Line Studio",
    "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
    "social_and_promo_graphics:facts":
      "Free mini-consultations Saturday 10–4. One complimentary beverage per guest. RSVP encouraged.",
    "social_and_promo_graphics:prices": "No purchase required for consultation",
    "social_and_promo_graphics:dates": "April 12–13, 2026",
    "social_and_promo_graphics:cta": "Reserve your spot",
    "social_and_promo_graphics:phone": "(555) 010-8820",
    "social_and_promo_graphics:website": "spruceline.example/open-house",
    "social_and_promo_graphics:mustKeep": "Warm, welcoming, not loud or salesy",
    "social_and_promo_graphics:rights":
      "I have permission to use the materials I am supplying for this disposable test project.",
  };
}

const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const SKU = "social_and_promo_graphics" as const;

function socialPaidCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Intake reconcile test",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Paid",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Social & Promo",
    paymentReceivedAt: now,
    condensedOffer: { packageId: SKU },
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 15920,
      confirmedAmountCents: 15920,
      checkoutSessionId: `cs_${campaignId}`,
      selectedServiceIds: [SKU],
      decisionId: "dec",
      factFingerprint: "fp",
      draftRevision: 1,
      confirmedAt: now,
      sandbox: true,
    },
    postPayActivation: {
      schemaVersion: 1,
      status: "activated",
      phase: "awaiting_intake",
      activatedAt: now,
      lastAttemptAt: now,
      checkoutSessionId: `cs_${campaignId}`,
      paymentIntentId: null,
      stripeEventId: null,
      jobIds: [buildJobId(campaignId, SKU)],
      taskCount: 1,
      intakeComplete: false,
      blockingRequiredMaterialsCount: 1,
      ownerActionRequired: false,
      lastError: null,
    },
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
  };
}

async function cleanup(campaignId: string) {
  await Promise.all([
    fs.unlink(path.join(CAMPAIGNS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(TASKS_DIR, `${campaignId}.json`)).catch(() => undefined),
  ]);
}

describe("intake → purchased job reconciliation", () => {
  const ids: string[] = [];

  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanup(id)));
  });

  it("updates stale parent job intakeComplete after intake submit without plan on campaign", async () => {
    const campaignId = `intake-reconcile-${Date.now()}`;
    ids.push(campaignId);
    const checkoutSessionId = `cs_${campaignId}`;
    const jobId = buildJobId(campaignId, SKU);
    const now = new Date().toISOString();

    await upsertCampaignRecord(socialPaidCampaign(campaignId), "client-intake-reconcile");
    await writeCheckoutSessionBinding({
      checkoutSessionId,
      campaignId,
      expectedAmountCents: 15920,
      currency: "usd",
      selectedServiceIds: [SKU],
      decisionId: "dec",
      factFingerprint: "fp",
      draftRevision: 1,
      createdAt: now,
      sandbox: true,
    });
    await writeTasksEnvelope({
      campaignId,
      planFingerprint: "social_and_promo_graphics:one_time",
      planVersion: 1,
      tasks: [],
      jobRecords: [
        {
          jobId,
          campaignId,
          skuId: SKU,
          serviceName: "Social & Promo Graphics",
          spineStatus: "waiting_on_client",
          productionLane: "standard",
          intakeComplete: false,
          productionStartedAt: null,
          ownerApprovalPending: null,
          laneQueuedAt: now,
          fileRegistry: [],
          updatedAt: now,
        },
      ],
      updatedAt: now,
      version: 1,
      syncedAt: now,
    });

    const answers = socialPromoIntakeAnswers();
    const result = await submitPaidIntakeByCheckoutSession({
      checkoutSessionId,
      answers,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tasks = await readTasksEnvelope(campaignId);
    const job = tasks?.jobRecords?.find((entry) => entry.jobId === jobId);
    expect(job?.intakeComplete).toBe(true);

    expect(result.campaign.approvedStudioPlan?.lineItems?.[0]?.skuId).toBe(SKU);

    const composite = socialPromoCompositeRoutingDecisions({
      campaign: result.campaign,
      job: job!,
      materials: [],
    });
    expect(composite).not.toBeNull();
    expect(composite!.every((d) => d.blocker !== "intake_incomplete")).toBe(true);
    expect(
      composite!.some(
        (d) => d.status !== studioRoutingHandoffV1.outcomes.waitingForPrerequisite,
      ),
    ).toBe(true);
  });
});
