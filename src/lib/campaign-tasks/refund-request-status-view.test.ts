import { describe, expect, it } from "vitest";

import type { PurchasedJobRecord } from "@/lib/job-control/types";

import type { OwnerDecisionInteractionRecord } from "./owner-decision-interaction-types";
import {
  toRefundRequestCustomerStatus,
  toRefundRequestCustomerView,
  toRefundRequestDecisionOutcome,
} from "./refund-request-status-view";

const NOW = "2026-08-01T20:00:00.000Z";

function interaction(
  status: OwnerDecisionInteractionRecord["status"],
): OwnerDecisionInteractionRecord {
  return {
    id: "interaction-refund-job-1",
    campaignId: "c1",
    jobId: "c1:sm-001",
    interactionKind: "refund_request",
    status,
    clientMessage: "Need a refund review.",
    createdAt: NOW,
    updatedAt: NOW,
    resolutionNotes: "Owner internal: escalate and mention Stripe ref xyz",
    refundSnapshot: {
      reason: "Need a refund review.",
      requestedOutcome: "Full refund review",
      productionStarted: false,
      receivedConceptsOrFiles: false,
      policyStatusLabel: "internal",
      timelineFacts: "internal",
      recommendedNextAction: "internal",
      submittedAt: NOW,
    },
  };
}

function job(spineStatus: PurchasedJobRecord["spineStatus"]): PurchasedJobRecord {
  return {
    jobId: "c1:sm-001",
    campaignId: "c1",
    skuId: "sm-001",
    serviceName: "Social Media Launch Set",
    spineStatus,
    productionLane: "standard",
    intakeComplete: true,
    updatedAt: NOW,
  };
}

describe("toRefundRequestCustomerStatus", () => {
  it("maps waiting_owner and waiting_internal to received", () => {
    expect(toRefundRequestCustomerStatus("waiting_owner")).toBe("received");
    expect(toRefundRequestCustomerStatus("waiting_internal")).toBe("received");
  });

  it("maps waiting_client to additional_information_requested", () => {
    expect(toRefundRequestCustomerStatus("waiting_client")).toBe(
      "additional_information_requested",
    );
  });

  it("maps resolved to decision_recorded", () => {
    expect(toRefundRequestCustomerStatus("resolved")).toBe("decision_recorded");
  });
});

describe("toRefundRequestDecisionOutcome", () => {
  it("uses spine refunded_cancelled for approved without reading notes", () => {
    expect(toRefundRequestDecisionOutcome(interaction("resolved"), job("refunded_cancelled"))).toBe(
      "approved",
    );
  });

  it("maps resolved without cancelled spine to not_approved", () => {
    expect(
      toRefundRequestDecisionOutcome(interaction("resolved"), job("building_concepts")),
    ).toBe("not_approved");
  });

  it("returns null before a recorded decision", () => {
    expect(toRefundRequestDecisionOutcome(interaction("waiting_owner"), job("waiting_on_client"))).toBe(
      null,
    );
  });
});

describe("toRefundRequestCustomerView", () => {
  it("never surfaces resolutionNotes, clientMessage, or snapshot internals", () => {
    const view = toRefundRequestCustomerView(interaction("resolved"), job("refunded_cancelled"));
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("Stripe");
    expect(serialized).not.toContain("Need a refund review");
    expect(serialized).not.toContain("recommendedNextAction");
    expect(serialized).not.toContain("policyStatusLabel");
    expect(view.decisionOutcome).toBe("approved");
    expect(view.statusLabel.toLowerCase()).toContain("approved");
    expect(view.statusLabel.toLowerCase()).toContain("does not confirm that money has been returned");
  });

  it("keeps not-approved decision free of money-returned claims", () => {
    const view = toRefundRequestCustomerView(interaction("resolved"), job("building_concepts"));
    expect(view.decisionOutcome).toBe("not_approved");
    expect(view.statusLabel.toLowerCase()).not.toMatch(/money|funds|stripe|processed|settlement/);
  });

  it("labels pending review without inventing human assignment", () => {
    const view = toRefundRequestCustomerView(interaction("waiting_owner"), job("waiting_on_client"));
    expect(view.status).toBe("received");
    expect(view.statusLabel).toMatch(/received|pending owner review/i);
    expect(view.statusLabel.toLowerCase()).not.toMatch(/assigned|escalated|investigat/);
  });
});
