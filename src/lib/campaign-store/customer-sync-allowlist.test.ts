import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";

import { mergeCustomerOwnedCampaignSync } from "./customer-sync-allowlist";

function baseRecord(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = "2026-07-08T23:54:24.773Z";
  return {
    campaignId: "camp-sync-test",
    campaignName: "Test Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Original description",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 39500,
      monthlyTotalCents: 0,
      amountDueTodayCents: 39500,
      lineItems: [],
      approvedAt: now,
    },
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: { ...EMPTY_PROJECT_DETAILS_FORM, primaryApproverEmail: "kept@example.com" },
      files: [],
      submittedAt: now,
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: "Studio note" }],
    customerFieldTokens: {
      primary_approver_email: { revision: 1, valueFingerprint: "kept@example.com" },
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("mergeCustomerOwnedCampaignSync", () => {
  it("allows customer-owned descriptive fields to update", () => {
    const existing = baseRecord();
    const incoming = baseRecord({
      campaignDescription: "Updated by client",
      campaignName: "Renamed",
    });

    const merged = mergeCustomerOwnedCampaignSync(existing, incoming);

    expect(merged.campaignDescription).toBe("Updated by client");
    expect(merged.campaignName).toBe("Renamed");
  });

  it("ignores studio-owned milestone poisoning on paid campaigns", () => {
    const existing = baseRecord();
    const incoming = baseRecord({
      paymentReceivedAt: null,
      approvedStudioPlan: {
        ...existing.approvedStudioPlan!,
        oneTimeTotalCents: 1,
        selectedServiceIds: ["sm-001", "sm-002"],
      },
      revisionRoundsIncluded: 99,
      studioNotes: [...(existing.studioNotes ?? []), { date: "Today", message: "HACK" }],
      projectDetails: {
        form: { ...EMPTY_PROJECT_DETAILS_FORM, primaryApproverEmail: "hijack@example.com" },
        files: [],
        submittedAt: existing.projectDetailsSubmittedAt!,
      },
    });

    const merged = mergeCustomerOwnedCampaignSync(existing, incoming);

    expect(merged.paymentReceivedAt).toBe(existing.paymentReceivedAt);
    expect(merged.approvedStudioPlan).toEqual(existing.approvedStudioPlan);
    expect(merged.revisionRoundsIncluded).toBe(1);
    expect(merged.studioNotes).toEqual(existing.studioNotes);
    expect(merged.projectDetails?.form.primaryApproverEmail).toBe("kept@example.com");
    expect(merged.customerFieldTokens).toEqual(existing.customerFieldTokens);
  });

  it("bootstraps plan milestones but never payment truth from client", () => {
    const incoming = baseRecord({ paymentReceivedAt: undefined, approvedStudioPlan: undefined });

    const merged = mergeCustomerOwnedCampaignSync(null, {
      ...incoming,
      paymentReceivedAt: "2026-07-09T00:00:00.000Z",
      preAcceptancePaymentAuthorization: {
        decisionId: "dec-forged",
        outcome: "CLEAR_TO_ACCEPT",
        paymentAuthorized: true,
        evaluatedDraftRevision: 1,
        selectedServiceIds: ["sm-001"],
        factFingerprint: "pa:forged",
        decisionSchemaVersion: 1,
        evaluatedAt: "2026-07-09T00:00:00.000Z",
        authorizedAt: "2026-07-09T00:00:00.000Z",
        packageId: "custom-studio-plan",
      },
      paymentTruth: {
        processor: "stripe",
        status: "confirmed",
        currency: "usd",
        expectedAmountCents: 1,
        confirmedAmountCents: 1,
        selectedServiceIds: ["sm-001"],
        decisionId: "dec-forged",
        factFingerprint: "pa:forged",
        draftRevision: 1,
      },
      approvedStudioPlan: baseRecord().approvedStudioPlan,
      revisionRoundsIncluded: 2,
    });

    expect(merged.paymentReceivedAt).toBeUndefined();
    expect(merged.paymentTruth).toBeUndefined();
    expect(merged.preAcceptancePaymentAuthorization).toBeUndefined();
    expect(merged.approvedStudioPlan?.oneTimeTotalCents).toBe(39500);
    expect(merged.revisionRoundsIncluded).toBe(2);
    expect(merged.studioNotes).toBeUndefined();
  });

  it("ignores client inventing paymentReceivedAt on merge", () => {
    const existing = baseRecord({
      paymentReceivedAt: null,
      paymentTruth: undefined,
      preAcceptancePaymentAuthorization: undefined,
    });
    const incoming = baseRecord({
      paymentReceivedAt: "2026-07-09T00:00:00.000Z",
    });
    const merged = mergeCustomerOwnedCampaignSync(existing, incoming);
    expect(merged.paymentReceivedAt).toBeFalsy();
  });
});
