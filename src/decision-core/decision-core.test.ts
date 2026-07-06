import { describe, expect, it, beforeEach } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";
import { buildDiscoveryBrief } from "@/lib/discovery-brief";
import { syncJobCommunicationRecords } from "@/lib/job-control/communication";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { resolveOwnerReviewRequired } from "@/lib/campaign-tasks/exceptions-view";
import { recommendFromDiscovery } from "@/recommendation";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";

import {
  clearDecisionEvaluatorRegistry,
  evaluateDecision,
  evaluateDiscovery,
  evaluateEscalation,
  evaluateIncomingCustomerInteraction,
  evaluateOutgoingCommunicationEvents,
  evaluateProductionTrigger,
  evaluateRefundEligibility,
  listRegisteredDecisionDomains,
  registerDefaultDecisionEvaluators,
  resetDefaultDecisionEvaluatorRegistration,
} from "@/decision-core";

const NOW = "2026-07-03T12:00:00.000Z";
const CLIENT_ID = "client-1";

function answersFor(overrides: Partial<DiscoveryAnswers> = {}): DiscoveryAnswers {
  return {
    "your-business": "Test Co",
    "your-situation": "Starting fresh",
    "your-challenge": "I am not sure what to say about my business",
    "your-current-tools": "None yet / starting from scratch",
    "your-focus": "Promote an offer, event, or launch",
    "success-looks-like": "A successful launch",
    "whats-slowing-you-down": "Visibility",
    ...overrides,
  };
}

function lineItem(skuId: string, name: string) {
  return {
    skuId,
    serviceId: skuId,
    serviceName: name,
    billingType: "one_time" as const,
    exactPriceCents: 10000,
    priceDisplay: "$100",
    deliverables: ["Concept set"],
    exclusions: [],
    timingWindowLabel: "3-5 days",
    revisionRule: "1 round",
    clientResponsibilities: [],
    executionResponsibility: "Studio",
  };
}

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "dc-camp",
    campaignName: "Acme Co",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: "2026-07-01T10:00:00.000Z",
    projectDetailsSubmittedAt: "2026-07-01T12:00:00.000Z",
    approvedStudioPlan: {
      selectedServiceIds: ["ma-flyer-v2"],
      includedServiceIds: ["ma-flyer-v2"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 10000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 10000,
      lineItems: [lineItem("ma-flyer-v2", "Flyer")],
      approvedAt: "2026-07-01T09:00:00.000Z",
    },
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    ...overrides,
  } as CampaignRecord;
}

function envelope(jobs: PurchasedJobRecord[] = []): ServerTasksEnvelope {
  return {
    campaignId: "dc-camp",
    tasks: [],
    planFingerprint: "test",
    updatedAt: NOW,
    syncedAt: NOW,
    version: 9,
    jobRecords: jobs,
    jobActivityEvents: [],
    jobCommunicationRecords: [],
  };
}

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: "dc-camp:ma-flyer-v2",
    campaignId: "dc-camp",
    skuId: "ma-flyer-v2",
    serviceName: "Flyer",
    spineStatus: "ready_for_queue",
    productionLane: "standard",
    intakeComplete: true,
    laneQueuedAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function openException(
  overrides: Partial<CampaignExceptionRecord> = {},
): CampaignExceptionRecord {
  return {
    id: "ex-1",
    campaignId: "dc-camp",
    kind: "scope_change",
    status: "waiting_owner",
    title: "Scope change",
    createdAt: NOW,
    updatedAt: NOW,
    raisedByUserId: "u1",
    raisedByDisplayName: "Staff",
    raisedByRole: "producer_dispatcher",
    ...overrides,
  } as CampaignExceptionRecord;
}

beforeEach(() => {
  clearDecisionEvaluatorRegistry();
  resetDefaultDecisionEvaluatorRegistration();
});

describe("decision-core registry", () => {
  it("registers Phase 1–2 domains", () => {
    registerDefaultDecisionEvaluators();
    const domains = listRegisteredDecisionDomains().sort();
    expect(domains).toEqual(
      [
        "communication",
        "customer_interaction",
        "discovery",
        "escalation",
        "production_trigger",
        "refund",
      ].sort(),
    );
  });
});

describe("evaluateDiscovery parity", () => {
  it("matches recommendFromDiscovery output", () => {
    const brief = buildDiscoveryBrief(answersFor());
    const direct = recommendFromDiscovery(brief);
    const outcome = evaluateDiscovery({
      domain: "discovery",
      campaignId: "test",
      actor: "system",
      trigger: { type: "discovery_brief_submitted" },
      occurredAt: NOW,
      facts: { brief },
    });

    expect(outcome.recommendationResult?.primaryServiceId).toBe(direct.primaryServiceId);
    expect(outcome.recommendationResult?.recommendations.map((e) => e.serviceId)).toEqual(
      direct.recommendations.map((e) => e.serviceId),
    );
    expect(outcome.humanReviewRequired).toBe(direct.requiresApproval);
  });
});

describe("evaluateOutgoingCommunicationEvents parity", () => {
  it("matches syncJobCommunicationRecords envelope", () => {
    const record = campaign();
    const env = envelope([job()]);
    const materials: CampaignMaterialItem[] = [];

    const synced = syncJobRecordsFromCampaign(
      record,
      env.tasks ?? [],
      materials,
      env.exceptionRecords ?? [],
      env.jobRecords,
    );
    const jobs = applyWaitingOnClientPolicies(synced, materials, new Date(NOW).getTime());

    const direct = syncJobCommunicationRecords({
      envelope: env,
      campaign: record,
      clientId: CLIENT_ID,
      jobs,
      materials,
      nowMs: new Date(NOW).getTime(),
    });

    const outcome = evaluateOutgoingCommunicationEvents({
      domain: "communication",
      campaignId: record.campaignId,
      actor: "system",
      trigger: { type: "communication_sync", nowMs: new Date(NOW).getTime() },
      occurredAt: NOW,
      facts: {
        envelope: env,
        campaign: record,
        clientId: CLIENT_ID,
        jobs,
        materials,
        nowMs: new Date(NOW).getTime(),
      },
    });

    const coreEnvelope = outcome.payload?.envelope as ServerTasksEnvelope;
    expect(coreEnvelope.jobCommunicationRecords?.length).toBe(
      direct.envelope.jobCommunicationRecords?.length,
    );
    expect(coreEnvelope.jobCommunicationRecords?.map((r) => r.id)).toEqual(
      direct.envelope.jobCommunicationRecords?.map((r) => r.id),
    );
  });
});

describe("evaluateIncomingCustomerInteraction", () => {
  it("escalates revision when rounds exhausted", () => {
    const outcome = evaluateIncomingCustomerInteraction({
      domain: "customer_interaction",
      campaignId: "dc-camp",
      jobId: "dc-camp:ma-flyer-v2",
      actor: "client",
      trigger: { type: "incoming_customer_event", eventType: "revision_request" },
      occurredAt: NOW,
      facts: { revisionRoundsUsed: 1, revisionRoundsIncluded: 1 },
    });

    expect(outcome.determination).toBe("escalate");
    expect(outcome.humanReviewRequired).toBe(true);
    expect(outcome.effects.some((e) => e.kind === "raise_exception")).toBe(true);
  });

  it("allows revision when rounds remain", () => {
    const outcome = evaluateIncomingCustomerInteraction({
      domain: "customer_interaction",
      campaignId: "dc-camp",
      actor: "client",
      trigger: { type: "incoming_customer_event", eventType: "revision_request" },
      occurredAt: NOW,
      facts: { revisionRoundsUsed: 0, revisionRoundsIncluded: 1 },
    });

    expect(outcome.determination).toBe("allow");
    expect(outcome.humanReviewRequired).toBe(false);
  });

  it("escalates scope_request", () => {
    const outcome = evaluateIncomingCustomerInteraction({
      domain: "customer_interaction",
      campaignId: "dc-camp",
      actor: "client",
      trigger: { type: "incoming_customer_event", eventType: "scope_request" },
      occurredAt: NOW,
      facts: {},
    });

    expect(outcome.determination).toBe("escalate");
  });
});

describe("evaluateEscalation parity", () => {
  it("matches resolveOwnerReviewRequired", () => {
    const exception = openException();
    const direct = resolveOwnerReviewRequired(exception);
    const outcome = evaluateEscalation({
      domain: "escalation",
      campaignId: exception.campaignId,
      actor: "system",
      trigger: { type: "exception_evaluated" },
      occurredAt: NOW,
      facts: { exception },
    });

    expect(outcome.humanReviewRequired).toBe(direct);
    expect(outcome.determination).toBe(direct ? "escalate" : "no_action");
  });
});

describe("evaluateRefundEligibility", () => {
  it("defers with may-be-eligible when 14-day window met and production not started", () => {
    const waitingSince = new Date("2026-06-01T10:00:00.000Z").toISOString();
    const nowMs = new Date("2026-06-20T10:00:00.000Z").getTime();

    const outcome = evaluateRefundEligibility({
      domain: "refund",
      campaignId: "dc-camp",
      jobId: "dc-camp:ma-flyer-v2",
      actor: "system",
      trigger: { type: "refund_eligibility_check", nowMs },
      occurredAt: new Date(nowMs).toISOString(),
      facts: {
        job: job({ productionStartedAt: null, nonRefundable: false }),
        waitingSince,
        nowMs,
      },
    });

    expect(outcome.determination).toBe("defer");
    expect(outcome.humanReviewRequired).toBe(true);
    expect(outcome.payload?.mayBeEligible).toBe(true);
  });
});

describe("evaluateProductionTrigger", () => {
  it("requires all four help-center conditions", () => {
    const outcome = evaluateProductionTrigger({
      domain: "production_trigger",
      campaignId: "dc-camp",
      jobId: "dc-camp:ma-flyer-v2",
      actor: "system",
      trigger: { type: "production_trigger_check" },
      occurredAt: NOW,
      facts: {
        campaign: campaign(),
        job: job({ productionStartedAt: "2026-07-02T10:00:00.000Z" }),
        materials: [],
        tasks: [
          {
            id: "t1",
            relatedServiceIds: ["ma-flyer-v2"],
            workflowState: "in_progress",
          } as never,
        ],
      },
    });

    expect(outcome.payload?.allFourMet).toBe(true);
    expect(outcome.determination).toBe("allow");
  });

  it("defers when payment missing", () => {
    const outcome = evaluateProductionTrigger({
      domain: "production_trigger",
      campaignId: "dc-camp",
      actor: "system",
      trigger: { type: "production_trigger_check" },
      occurredAt: NOW,
      facts: {
        campaign: campaign({ paymentReceivedAt: undefined }),
        job: job(),
        materials: [],
      },
    });

    expect(outcome.payload?.allFourMet).toBe(false);
    expect(outcome.determination).toBe("defer");
  });
});

describe("evaluateDecision orchestrator", () => {
  it("routes to registered evaluator", () => {
    const brief = buildDiscoveryBrief(answersFor());
    const outcome = evaluateDecision({
      domain: "discovery",
      campaignId: "test",
      actor: "system",
      trigger: { type: "discovery_brief_submitted" },
      occurredAt: NOW,
      facts: { brief },
    });

    expect(outcome.recommendationResult).toBeDefined();
    expect(outcome.matchedRules.length).toBeGreaterThan(0);
  });
});
