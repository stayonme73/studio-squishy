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
    expect(snapshot.policyStatusLabel).toContain("Refund may be approved");
    expect(snapshot.recommendedNextAction).toContain("approve, deny, or ask for more information");
    expect(snapshot.recommendedNextAction).toContain("do not auto-refund");
  });

  it("BH-RF-1: timeline facts stay job-grain and omit campaign payment", () => {
    const facts = resolveRefundTimelineFacts(job);
    expect(facts).toMatch(/Waiting on client since/i);
    expect(facts).toMatch(/Owner refund-eligibility note recorded/i);
    expect(facts).not.toMatch(/Payment received/i);
    expect(resolveProductionStartedReadOnly(job)).toBe(false);
    expect(resolveRefundPolicyStatusLabel(job)).toContain("Refund may be approved");
  });

  it("judges refunds on production-start truth, not elapsed days", () => {
    const sameDay: PurchasedJobRecord = {
      ...job,
      refundEligibleAt: null,
      waitingOnClientSince: "2026-07-06T11:00:00.000Z",
    };
    const label = resolveRefundPolicyStatusLabel(sameDay);
    expect(label).toContain("Refund may be approved");
    expect(label).toContain("Owner approval required");
    expect(label).not.toMatch(/\b14\b|days?|wait/i);
    expect(resolveRefundTimelineFacts(sameDay)).not.toMatch(/\b14\b|evidence|clock/i);

    const started: PurchasedJobRecord = {
      ...job,
      productionStartedAt: "2026-07-02T12:00:00.000Z",
    };
    expect(resolveProductionStartedReadOnly(started)).toBe(true);
    expect(resolveRefundPolicyStatusLabel(started)).toContain("Non-refundable");
    expect(buildRefundRequestSnapshot(started, { reason: "x", requestedOutcome: "Full refund" }).recommendedNextAction).toMatch(/Deny refund/);
  });
});
