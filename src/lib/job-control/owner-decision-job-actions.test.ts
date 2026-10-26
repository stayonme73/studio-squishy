import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";

import {
  applyOwnerApproveRefund,
  applyOwnerDenyRefund,
  applyOwnerResolveHeavyLane,
} from "./owner-decision-job-actions";
import type { PurchasedJobRecord } from "./types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

const now = "2026-07-06T20:00:00.000Z";

const owner: StudioUser = {
  id: "owner-1",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner"],
};

const campaign: CampaignRecord = {
  campaignId: "refund-folder-3",
  campaignName: "Refund Demo",
  campaignStatus: "WAITING_ON_CLIENT",
  campaignDescription: "",
  estimatedCompletion: "",
  packageId: "custom-studio-plan",
  packageLabel: "Custom Studio Plan",
  paymentReceivedAt: now,
  projectDetailsSubmittedAt: now,
  approvedStudioPlan: {
    selectedServiceIds: ["sm-001"],
    includedServiceIds: ["sm-001"],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: 30000,
    monthlyTotalCents: 0,
    amountDueTodayCents: 30000,
    lineItems: [],
    approvedAt: now,
  },
  revisionRoundsIncluded: 1,
  revisionRoundsUsed: 0,
  createdAt: now,
  updatedAt: now,
};

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: "refund-folder-3:sm-001",
    campaignId: "refund-folder-3",
    skuId: "sm-001",
    serviceName: "Social Media Launch Set",
    spineStatus: "waiting_on_client",
    productionLane: "standard",
    refundEligibleAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function envelope(jobRecord: PurchasedJobRecord): ServerTasksEnvelope {
  return {
    campaignId: "refund-folder-3",
    tasks: [],
    planFingerprint: "fp",
    updatedAt: now,
    version: 11,
    syncedAt: now,
    jobRecords: [jobRecord],
    jobActivityEvents: [],
    exceptionRecords: [],
    exceptionEvents: [],
    qaRecords: [],
  };
}

describe("owner-decision-job-actions", () => {
  it("refuses a refund larger than the discounted amount paid", () => {
    const paid: CampaignRecord = {
      ...campaign,
      condensedOffer: {
        packageId: "clip_repurposing",
        name: "Clip Repurposing",
        priceCents: 37375,
        listPriceCents: 37375,
        thankYouDiscountCents: 7475,
        amountDueCents: 29900,
        revisionRounds: 3,
        customerName: "Ada",
        customerEmail: "ada@example.com",
        company: "Cedar",
        projectNeed: "Open house",
        materialsNote: "",
        support: {},
      },
      paymentTruth: {
        processor: "stripe",
        status: "confirmed",
        currency: "usd",
        expectedAmountCents: 29900,
        confirmedAmountCents: 29900,
        paymentIntentId: "pi_test_thank_you",
        selectedServiceIds: ["clip_repurposing"],
        decisionId: "pa-thank-you",
        factFingerprint: "fp",
        draftRevision: 1,
      },
      approvedStudioPlan: {
        ...campaign.approvedStudioPlan!,
        lineItems: [{ skuId: "sm-001" } as never],
      },
    };
    const env = { STRIPE_SECRET_KEY: "sk_test_unit" } as unknown as NodeJS.ProcessEnv;
    const over = applyOwnerApproveRefund(
      envelope(job()),
      paid,
      "refund-folder-3:sm-001",
      { reason: "Asked for the list price.", amountCents: 37375 },
      owner,
      "tagia",
      { env },
    );
    expect(over.ok).toBe(false);
    const partial = applyOwnerApproveRefund(
      envelope(job()),
      paid,
      "refund-folder-3:sm-001",
      { reason: "Half back.", amountCents: 15960 },
      owner,
      "tagia",
      { env },
    );
    expect(partial.ok).toBe(false);
    if (!partial.ok) expect(partial.error).toMatch(/full refunds/i);
    const approved = applyOwnerApproveRefund(
      envelope(job()),
      paid,
      "refund-folder-3:sm-001",
      { reason: "Approved the amount paid." },
      owner,
      "tagia",
      { env },
    );
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.job.refundApprovedAmountCents).toBe(29900);
    expect(approved.refundExecutionPlan?.amountCents).toBe(29900);
  });

  it("owner_approve_refund records approval without closing the job or claiming money moved", () => {
    const paid: CampaignRecord = {
      ...campaign,
      condensedOffer: { packageId: "social_and_promo_graphics", priceCents: 19900 } as never,
      paymentTruth: {
        processor: "stripe",
        status: "confirmed",
        currency: "usd",
        expectedAmountCents: 15920,
        confirmedAmountCents: 15920,
        paymentIntentId: "pi_test_social",
        selectedServiceIds: ["social_and_promo_graphics"],
        decisionId: "pa",
        factFingerprint: "fp",
        draftRevision: 1,
      },
      approvedStudioPlan: { ...campaign.approvedStudioPlan!, lineItems: [{ skuId: "sm-001" } as never] },
    };
    const env = { STRIPE_SECRET_KEY: "sk_test_unit" } as unknown as NodeJS.ProcessEnv;
    const result = applyOwnerApproveRefund(
      envelope(job()),
      paid,
      "refund-folder-3:sm-001",
      { reason: "Production has not started.", ownerNotes: "Approved." },
      owner,
      "tagia",
      { env },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.spineStatus).toBe("waiting_on_client");
    expect(result.job.refundExecution?.stage).toBe("approved");
    expect(result.job.refundOwnerDecisionAt ?? null).toBeNull();
    expect(result.refundExecutionPlan?.idempotencyKey).toBe("refund:refund-folder-3:refund-folder-3:sm-001");
    expect(
      (result.envelope.jobCommunicationRecords ?? []).filter((row) => row.eventType === "refund_issued"),
    ).toHaveLength(0);

    const replay = applyOwnerApproveRefund(
      result.envelope,
      paid,
      "refund-folder-3:sm-001",
      { reason: "Clicked again." },
      owner,
      "tagia",
      { env },
    );
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.refundExecutionPlan?.idempotencyKey).toBe(result.refundExecutionPlan?.idempotencyKey);
  });

  it("owner_approve_refund refuses payments that are not a Stripe single-package order", () => {
    const result = applyOwnerApproveRefund(
      envelope(job()),
      campaign,
      "refund-folder-3:sm-001",
      { reason: "Production has not started." },
      owner,
      "tagia",
      { env: { STRIPE_SECRET_KEY: "sk_test_unit" } as unknown as NodeJS.ProcessEnv },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(422);
  });

  it("owner_deny_refund clears eligibility and records decision", () => {
    const result = applyOwnerDenyRefund(
      envelope(job()),
      "refund-folder-3:sm-001",
      { ownerNotes: "Preference only." },
      owner,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.refundEligibleAt).toBeNull();
    expect(result.job.refundOwnerDecisionAt).toBeTruthy();
  });

  it("owner_resolve_heavy_lane records lane decision", () => {
    const result = applyOwnerResolveHeavyLane(
      envelope(job({ productionLane: "heavy" })),
      "refund-folder-3:sm-001",
      { decision: "wait", ownerNotes: "Active job almost done." },
      owner,
      [],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.heavyLaneOwnerDecision).toBe("wait");
  });
});
