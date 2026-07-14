import { describe, expect, it } from "vitest";

import {
  REFUND_INTAKE_CASUAL_PROMPT,
  buildRefundRequestSnapshot,
  isRefundIntakeComplete,
  resolveRefundIntakePrompt,
  resolveRefundPolicyStatusLabel,
  resolveRefundTimelineFacts,
  resolveProductionStartedReadOnly,
} from "./refund-request-intake";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

const job: PurchasedJobRecord = {
  jobId: "c1:sm-001",
  campaignId: "c1",
  skuId: "sm-001",
  serviceName: "Social Media Launch Set",
  spineStatus: "waiting_on_client",
  productionLane: "standard",
  intakeComplete: true,
  refundEligibleAt: "2026-07-06T12:00:00.000Z",
  waitingOnClientSince: "2026-06-20T12:00:00.000Z",
  updatedAt: "2026-07-06T12:00:00.000Z",
};

describe("refund-request-intake", () => {
  it("requires reason and requested outcome", () => {
    expect(isRefundIntakeComplete({ reason: "Too slow" })).toBe(false);
    expect(
      isRefundIntakeComplete({ reason: "Too slow", requestedOutcome: "Full refund" }),
    ).toBe(true);
  });

  it("uses casual Squishy prompt when reason missing", () => {
    expect(resolveRefundIntakePrompt({})).toBe(REFUND_INTAKE_CASUAL_PROMPT);
  });

  it("builds snapshot with system read-only facts", () => {
    const snapshot = buildRefundRequestSnapshot(job, {
      reason: "Project stalled waiting on me",
      requestedOutcome: "Full refund and close the job",
      supportingDetails: "I have not heard back in two weeks.",
    });
    expect(snapshot.productionStarted).toBe(false);
    expect(snapshot.receivedConceptsOrFiles).toBe(false);
    expect(snapshot.policyStatusLabel).toContain("May be eligible");
    expect(snapshot.recommendedNextAction).toContain("approve or deny");
  });

  it("BH-RF-1: timeline facts stay job-grain and omit campaign payment", () => {
    const facts = resolveRefundTimelineFacts(job);
    expect(facts).toMatch(/Waiting on client since/i);
    expect(facts).toMatch(/refund-eligibility signal/i);
    expect(facts).not.toMatch(/Payment received/i);
    expect(resolveProductionStartedReadOnly(job)).toBe(false);
    expect(resolveRefundPolicyStatusLabel(job)).toContain("May be eligible");
  });
});
