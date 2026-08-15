import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioCustomerLifeV1 as copy } from "@/config/studio-customer-life-v1";
import { buildJobId } from "@/lib/job-control/lane-map";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "@/lib/plan-pricing";
import {
  answerCustomerLifeQuestion,
  assembleCustomerLifeTruth,
} from "@/lib/studio-customer-life";
import { statusSummaryHasObsoleteContradiction } from "@/lib/studio-customer-life/summarize-status";
import { canClientAccessJobReview, canClientViewJobReview } from "@/lib/job-control/review-room-access";

const FLYER = ["v2-rtu-flyer"] as const;
const STATUS_Q = "What's happening with my flyer?";

function mayaCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals([...FLYER]);
  return {
    campaignId: "maya-status",
    campaignName: "Cedar & Bloom Home Organizing",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Back-to-School Reset flyer",
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
      checkoutSessionId: "cs_maya_status",
      selectedServiceIds: [...FLYER],
      decisionId: "dec_maya_status",
      factFingerprint: "fp_maya_status",
      draftRevision: 1,
      confirmedAt: now,
    },
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
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
      lineItems: buildServiceScopeSnapshot([...FLYER]),
      approvedAt: now,
    },
    ...overrides,
  };
}

function withIntake(campaign: CampaignRecord): CampaignRecord {
  const now = campaign.updatedAt;
  return {
    ...campaign,
    projectDetailsSubmittedAt: now,
    routeMapIntakeSubmittedAt: now,
    postPayActivation: {
      schemaVersion: 1,
      status: "activated",
      phase: "ready_for_routing",
      activatedAt: now,
      lastAttemptAt: now,
      checkoutSessionId: campaign.paymentTruth?.checkoutSessionId ?? "cs",
      jobIds: [buildJobId(campaign.campaignId, "v2-rtu-flyer")],
      taskCount: 1,
      intakeComplete: true,
      blockingRequiredMaterialsCount: 0,
      ownerActionRequired: false,
      lastError: null,
    },
  };
}

function reviewAuth(workVersionId: string) {
  return {
    status: "ELIGIBLE_FOR_REVIEW" as const,
    workVersionId,
    contentSha256s: ["abc"],
    artifactIds: [workVersionId],
    authorizedAt: new Date().toISOString(),
  };
}

function tasksFor(
  campaign: CampaignRecord,
  extra: {
    spine?: string;
    qaAction?: "qa_pass" | "qa_fail";
    noticeFailed?: boolean;
    productionStartedAt?: string;
    workVersionId?: string;
    approved?: boolean;
  } = {},
): ServerTasksEnvelope {
  const now = new Date().toISOString();
  const jobId = buildJobId(campaign.campaignId, "v2-rtu-flyer");
  const spine = extra.spine ?? "building_concepts";
  return {
    campaignId: campaign.campaignId,
    version: 12,
    planFingerprint: "fp",
    updatedAt: now,
    syncedAt: now,
    tasks: [],
    jobRecords: [
      {
        jobId,
        campaignId: campaign.campaignId,
        skuId: "v2-rtu-flyer",
        serviceName: "Make Me a Flyer",
        spineStatus: spine as never,
        productionLane: "quick",
        intakeComplete: Boolean(campaign.projectDetailsSubmittedAt),
        updatedAt: now,
        productionStartedAt: extra.productionStartedAt,
        internalQaReviewAuthorization: extra.workVersionId
          ? reviewAuth(extra.workVersionId)
          : undefined,
        customerApprovedArtifactAuthorization: extra.approved
          ? ({
              status: "CUSTOMER_APPROVED",
              workVersionId: extra.workVersionId ?? "flyer-v2",
              contentSha256s: ["def"],
              artifactIds: [extra.workVersionId ?? "flyer-v2"],
              decisionId: "dec-1",
              approvedAt: now,
            } as never)
          : undefined,
      },
    ],
    qaRecords: extra.qaAction
      ? [
          {
            id: `qa-${extra.qaAction}`,
            campaignId: campaign.campaignId,
            taskId: "v2-rtu-flyer:qa",
            action: extra.qaAction,
            recordedAt: now,
            workVersionId: extra.qaAction === "qa_pass" ? "flyer-v1" : "flyer-v0",
          } as never,
        ]
      : [],
    jobCommunicationRecords: extra.noticeFailed
      ? [
          {
            id: "comm.ready_for_review.v1:fail",
            campaignId: campaign.campaignId,
            clientId: "maya",
            jobId,
            skuId: "v2-rtu-flyer",
            serviceName: "Make Me a Flyer",
            eventType: "ready_for_review",
            templateId: "comm.ready_for_review.v1",
            channel: "in_app_outbox",
            sender: { role: "system", displayName: "Studio Machine" },
            reason: "Ready for review",
            messageContent: "Your flyer is ready to review.",
            deliveryStatus: "delivery_failed",
            createdAt: now,
            updatedAt: now,
          } as never,
        ]
      : [],
  };
}

function ask(campaign: CampaignRecord, tasks?: ServerTasksEnvelope, materials?: CampaignMaterialItem[]) {
  return answerCustomerLifeQuestion(STATUS_Q, { campaign, tasks, materials });
}

describe("coherent Studio Voice project summary", () => {
  it("paid / intake missing names intake as the current state", () => {
    const answer = ask(mayaCampaign());
    expect(answer.phase).toBe("awaiting_intake");
    expect(answer.text).toBe(copy.customerCopy.statusAwaitingIntake);
    expect(answer.text).not.toMatch(/assigned|Review is open|no received upload/i);
    expect(statusSummaryHasObsoleteContradiction(answer.text)).toBe(false);
  });

  it("waiting on customer names required materials, not later production facts", () => {
    const campaign = withIntake(
      mayaCampaign({
        materialsSummary: { blockingRequiredCount: 1, updatedAt: new Date().toISOString() },
      }),
    );
    const materials: CampaignMaterialItem[] = [
      {
        id: "logo",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Logo",
        reason: "Needed",
        relatedServiceIds: [...FLYER],
        uploadStatus: "none",
      },
    ];
    const answer = ask(campaign, undefined, materials);
    expect(answer.phase).toBe("awaiting_materials");
    expect(answer.text).toBe(copy.customerCopy.statusAwaitingMaterials);
    expect(answer.text).not.toMatch(/not been assigned|work has started|Review is open/i);
  });

  it("production ready does not claim work started or assignment", () => {
    const campaign = withIntake(mayaCampaign());
    const answer = ask(campaign, tasksFor(campaign));
    expect(answer.phase).toBe("producing");
    expect(answer.text).toBe(copy.customerCopy.statusProductionReady);
    expect(answer.text).not.toMatch(/assigned|work has started|email/i);
  });

  it("production underway is the current state", () => {
    const campaign = withIntake(mayaCampaign());
    const answer = ask(
      campaign,
      tasksFor(campaign, { productionStartedAt: new Date().toISOString() }),
    );
    expect(answer.phase).toBe("producing");
    expect(answer.text).toBe(copy.customerCopy.holdingProduction);
    expect(answer.text).not.toMatch(/not been assigned|Intake is still needed/i);
  });

  it("QA failed names correction, not Review open", () => {
    const campaign = withIntake(mayaCampaign());
    const answer = ask(
      campaign,
      tasksFor(campaign, {
        productionStartedAt: new Date().toISOString(),
        qaAction: "qa_fail",
      }),
    );
    expect(answer.phase).toBe("internal_qa");
    expect(answer.text).toBe(copy.customerCopy.statusQaCorrection);
    expect(answer.text).not.toMatch(/ready for Review|email notification/i);
  });

  it("Review ready with failed email keeps Review as primary and email as secondary", () => {
    const campaign = withIntake(mayaCampaign());
    const tasks = tasksFor(campaign, {
      spine: "ready_for_review",
      productionStartedAt: new Date().toISOString(),
      qaAction: "qa_pass",
      noticeFailed: true,
      workVersionId: "flyer-v1",
    });
    const truth = assembleCustomerLifeTruth({ campaign, tasks });
    const answer = ask(campaign, tasks);
    expect(answer.phase).toBe("ready_for_review");
    expect(answer.text).toContain(copy.customerCopy.statusReviewReady);
    expect(answer.text).toContain(copy.customerCopy.statusEmailRetryingSecondary);
    expect(answer.text).not.toMatch(/not been assigned|no received upload|getting your project ready/i);
    expect(statusSummaryHasObsoleteContradiction(answer.text)).toBe(false);
    expect(truth.waitingOn).toBe("none");
    expect(truth.noticeTransportPending).toBe(true);
  });

  it("revision underway does not keep Review-open as the current story", () => {
    const campaign = withIntake(mayaCampaign());
    const answer = ask(
      campaign,
      tasksFor(campaign, {
        spine: "revision_requested",
        productionStartedAt: new Date().toISOString(),
        qaAction: "qa_pass",
      }),
    );
    expect(answer.phase).toBe("revision");
    expect(answer.text).toBe(copy.customerCopy.holdingRevision);
    expect(answer.text).not.toMatch(/ready for Review|not been assigned/i);
  });

  it("Version 2 ready is Review again, without obsolete blockers", () => {
    const campaign = withIntake(mayaCampaign());
    const answer = ask(
      campaign,
      tasksFor(campaign, {
        spine: "ready_for_review",
        productionStartedAt: new Date().toISOString(),
        qaAction: "qa_pass",
        workVersionId: "flyer-v2",
      }),
    );
    expect(answer.text).toBe(copy.customerCopy.statusReviewReady);
    expect(answer.text).not.toMatch(/email notification is still retrying/i);
  });

  it("approved / Final Delivery names released files", () => {
    const campaign = withIntake(mayaCampaign());
    const answer = ask(
      campaign,
      tasksFor(campaign, {
        spine: "ready_for_delivery",
        productionStartedAt: new Date().toISOString(),
        qaAction: "qa_pass",
        workVersionId: "flyer-v2",
        approved: true,
      }),
    );
    expect(answer.phase).toBe("approved");
    expect(answer.text).toBe(copy.customerCopy.finalReady);
    expect(answer.text).not.toMatch(/assigned|retrying|Intake/i);
  });

  it("mixed historical torture facts resolve to Review, not a stacked drawer", () => {
    const now = new Date().toISOString();
    const campaign = withIntake(
      mayaCampaign({
        dispatchExecution: {
          schemaVersion: 1,
          status: "pending_retry",
          evaluatedAt: now,
          lastAttemptAt: now,
          activationCheckoutSessionId: "cs_maya_status",
          records: [],
          ownerActionRequired: false,
        },
      }),
    );
    const optional: CampaignMaterialItem[] = [
      {
        id: "mark",
        category: "logo-brand",
        requirementLevel: "optional",
        reviewStatus: "submitted",
        contentKind: "file-metadata",
        label: "Optional mark",
        reason: "Optional",
        relatedServiceIds: [...FLYER],
        uploadStatus: "stored",
        fileName: "maya-optional-mark.png",
      },
    ];
    const tasks = tasksFor(campaign, {
      spine: "ready_for_review",
      productionStartedAt: now,
      qaAction: "qa_pass",
      noticeFailed: true,
      workVersionId: "flyer-v1",
    });
    const truth = assembleCustomerLifeTruth({ campaign, tasks, materials: optional });
    const answer = answerCustomerLifeQuestion(STATUS_Q, {
      campaign,
      tasks,
      materials: optional,
    });
    expect(truth.activationPendingRetry).toBe(true);
    expect(truth.productionAssigned).toBe(false);
    expect(truth.receivedMaterialCount).toBeGreaterThan(0);
    expect(truth.reviewEligible).toBe(true);
    expect(truth.noticeTransportPending).toBe(true);
    expect(answer.phase).toBe("ready_for_review");
    expect(answer.text).toContain(copy.customerCopy.statusReviewReady);
    expect(answer.text).toContain(copy.customerCopy.statusEmailRetryingSecondary);
    expect(answer.text).not.toMatch(/not been assigned/i);
    expect(answer.text).not.toMatch(/no received upload/i);
    expect(answer.text).not.toMatch(/getting your project ready/i);
    expect(answer.text).not.toMatch(/Work has started/i);
    expect(statusSummaryHasObsoleteContradiction(answer.text)).toBe(false);
    expect(truth.waitingOn).toBe("none");
  });
});

describe("Review Room navigation is not the same as Review readiness", () => {
  it("does not expose a reviewable artifact before eligibility", () => {
    expect(canClientAccessJobReview({ spineStatus: "building_concepts" })).toBe(false);
    expect(canClientViewJobReview({ spineStatus: "building_concepts" }, null)).toBe(false);
    expect(canClientAccessJobReview({ spineStatus: "ready_for_review" })).toBe(false);
  });
});
