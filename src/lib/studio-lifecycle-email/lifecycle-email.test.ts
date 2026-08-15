import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { JOB_COMMUNICATION_TEMPLATES } from "@/lib/job-control/communication";
import { buildJobId } from "@/lib/job-control/lane-map";
import type { JobCommunicationRecord, PurchasedJobRecord } from "@/lib/job-control/types";
import { classifyOutboxDisposition } from "@/lib/studio-kitchen-comms/outbox-disposition";
import {
  answerCustomerLifeQuestion,
  assembleCustomerLifeTruth,
} from "@/lib/studio-customer-life";

import { composeCustomerEmail, deliverAuthorizedLifecycleNotices, isLifecycleTransportDue } from "./deliver";
import { lifecycleNoticeReceipt } from "./receipt";
import {
  evaluateLifecycleWatchdogFindings,
  recoverMissingAuthorizedNotices,
} from "./watchdog-gaps";

function notice(overrides: Partial<JobCommunicationRecord> = {}): JobCommunicationRecord {
  return {
    id: "comm:ready_for_review:job-1:pin",
    campaignId: "camp-1",
    clientId: "user-maya",
    jobId: "camp-1::v2-rtu-flyer",
    skuId: "v2-rtu-flyer",
    serviceName: "Make Me a Flyer",
    eventType: "ready_for_review",
    templateId: JOB_COMMUNICATION_TEMPLATES.ready_for_review.id,
    channel: "in_app_outbox",
    sender: { role: "system", displayName: "Studio Machine" },
    reason: JOB_COMMUNICATION_TEMPLATES.ready_for_review.reason,
    messageContent:
      "Make Me a Flyer is ready for your review. Open Review Room when you are ready to look it over.",
    deliveryStatus: "pending_owner_send",
    createdAt: "2026-08-15T18:00:00.000Z",
    updatedAt: "2026-08-15T18:00:00.000Z",
    activityEventId: "client_communication:comm:ready_for_review:job-1:pin",
    ...overrides,
  };
}

function envelope(records: JobCommunicationRecord[]): ServerTasksEnvelope {
  return {
    campaignId: "camp-1",
    planFingerprint: "fp",
    syncedAt: "2026-08-15T18:00:00.000Z",
    updatedAt: "2026-08-15T18:00:00.000Z",
    version: 9,
    tasks: [],
    jobCommunicationRecords: records,
  };
}

describe("STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1", () => {
  it("sends existing template copy through Resend and does not invent claims", async () => {
    const sent: string[] = [];
    const result = await deliverAuthorizedLifecycleNotices({
      envelope: envelope([notice()]),
      toEmail: "maya@example.com",
      userId: "user-maya",
      send: async (input) => {
        sent.push(input.text);
        expect(input.kind).toBe("customer-lifecycle");
        expect(input.subject).toBe("Ready for review");
        return { ok: true, provider: "resend", providerMessageId: "re_test_1" };
      },
    });
    expect(result.ownerActionRequired).toBe(false);
    expect(result.sent).toBe(1);
    expect(result.envelope.jobCommunicationRecords?.[0]?.deliveryStatus).toBe("sent");
    expect(sent[0]).toContain("Open Review Room");
    expect(sent[0]).not.toContain("You distribute");
    expect(sent[0]).not.toMatch(/guarantee/i);
  });

  it("failed notification is retryable and is not Owner routine", async () => {
    const first = await deliverAuthorizedLifecycleNotices({
      envelope: envelope([notice()]),
      toEmail: "maya@example.com",
      nowMs: Date.parse("2026-08-15T18:00:00.000Z"),
      send: async () => ({ ok: false, provider: "resend", code: "provider_error" }),
    });
    expect(first.failed).toBe(1);
    expect(first.ownerActionRequired).toBe(false);
    expect(first.envelope.jobCommunicationRecords?.[0]?.deliveryStatus).toBe("delivery_failed");
    expect(
      classifyOutboxDisposition(first.envelope.jobCommunicationRecords![0]!),
    ).toBe("awaiting_authorized_transport");

    const tooSoon = isLifecycleTransportDue(
      first.envelope.jobCommunicationRecords![0]!,
      Date.parse("2026-08-15T18:00:30.000Z"),
    );
    expect(tooSoon).toBe(false);

    const later = await deliverAuthorizedLifecycleNotices({
      envelope: first.envelope,
      toEmail: "maya@example.com",
      nowMs: Date.parse("2026-08-15T18:02:00.000Z"),
      send: async () => ({ ok: true, provider: "resend", providerMessageId: "re_retry" }),
    });
    expect(later.sent).toBe(1);
    expect(later.envelope.jobCommunicationRecords?.[0]?.deliveryStatus).toBe("sent");
    expect(later.envelope.jobCommunicationRecords?.[0]?.transportAttempts).toBe(2);
  });

  it("does not send twice after a successful delivery", async () => {
    let calls = 0;
    const first = await deliverAuthorizedLifecycleNotices({
      envelope: envelope([notice()]),
      toEmail: "maya@example.com",
      send: async () => {
        calls += 1;
        return { ok: true, provider: "resend" };
      },
    });
    await deliverAuthorizedLifecycleNotices({
      envelope: first.envelope,
      toEmail: "maya@example.com",
      send: async () => {
        calls += 1;
        return { ok: true, provider: "resend" };
      },
    });
    expect(calls).toBe(1);
    expect(classifyOutboxDisposition(first.envelope.jobCommunicationRecords![0]!)).toBe("sent");
  });

  it("missing recipient fails closed without summoning Tagia", async () => {
    const result = await deliverAuthorizedLifecycleNotices({
      envelope: envelope([notice()]),
      toEmail: null,
    });
    expect(result.failed).toBe(1);
    expect(result.ownerActionRequired).toBe(false);
    expect(result.envelope.jobCommunicationRecords?.[0]?.lastTransportCode).toBe(
      "missing_recipient",
    );
  });

  it("not_configured transport stays retryable", async () => {
    const result = await deliverAuthorizedLifecycleNotices({
      envelope: envelope([notice()]),
      toEmail: "maya@example.com",
      send: async () => ({ ok: false, provider: "resend", code: "not_configured" }),
    });
    expect(result.envelope.jobCommunicationRecords?.[0]?.deliveryStatus).toBe("delivery_failed");
    expect(result.ownerActionRequired).toBe(false);
    expect(
      assembleCustomerLifeTruth({
        tasks: result.envelope,
      }).stalls.some((stall) => stall.id === "notice_queued_email_not_confirmed"),
    ).toBe(true);
  });

  it("pending_owner_send is still not an Owner send duty", () => {
    expect(
      classifyOutboxDisposition({
        eventType: "ready_for_review",
        deliveryStatus: "pending_owner_send",
      }),
    ).toBe("awaiting_authorized_transport");
  });

  it("customer email uses locked Review Room / Studio Board links and does not leak internals", () => {
    const composed = composeCustomerEmail(notice());
    expect(composed.subject).toBe("Ready for review");
    expect(composed.text).toContain("Open Review Room");
    expect(composed.text).toContain("Studio Board:");
    expect(composed.text).toContain("/studio-board");
    expect(composed.text).toContain("Review Room:");
    expect(composed.text).toContain("/feedback-studio");
    expect(composed.text).toContain("— The Studio");
    expect(composed.text).not.toMatch(/Tagia|Owner Console|pending_owner_send|job-control/i);
    expect(composed.html).toContain('href="');
  });

  it("records send/fail/retry receipt without inventing open tracking", async () => {
    expect(lifecycleNoticeReceipt(undefined).created).toBe(false);
    const failed = await deliverAuthorizedLifecycleNotices({
      envelope: envelope([notice()]),
      toEmail: "maya@example.com",
      send: async () => ({ ok: false, provider: "resend", code: "provider_error" }),
    });
    expect(lifecycleNoticeReceipt(failed.envelope.jobCommunicationRecords![0])).toEqual({
      created: true,
      sendAttempted: true,
      sent: false,
      failed: true,
      retryPending: true,
      openOrReadConfirmed: false,
    });
  });

  it("Voice still says Review is open when the review-ready email failed", () => {
    const campaign = {
      campaignId: "camp-1",
      campaignName: "Cedar & Bloom Home Organizing",
      campaignStatus: "READY_FOR_REVIEW",
      campaignDescription: "Back-to-School Reset flyer",
      estimatedCompletion: "Soon",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      createdAt: "2026-08-15T18:00:00.000Z",
      updatedAt: "2026-08-15T18:00:00.000Z",
    } as CampaignRecord;
    const job = {
      jobId: "camp-1::v2-rtu-flyer",
      campaignId: "camp-1",
      skuId: "v2-rtu-flyer",
      serviceName: "Make Me a Flyer",
      spineStatus: "ready_for_review",
      productionLane: "standard",
      intakeComplete: true,
      internalQaReviewAuthorization: {
        status: "ELIGIBLE_FOR_REVIEW",
        decisionId: "pin-1",
        packageId: "STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1",
        skuId: "v2-rtu-flyer",
        qaRecordIds: [],
        workVersionId: "v2",
        contentSha256s: [],
        artifactIds: [],
        authorizedAt: "2026-08-15T18:00:00.000Z",
      },
    } as PurchasedJobRecord;
    const tasks = {
      ...envelope([notice({ deliveryStatus: "delivery_failed", transportAttempts: 1 })]),
      jobRecords: [job],
    };
    const answer = answerCustomerLifeQuestion("When can I review it?", {
      campaign,
      tasks,
    });
    const truth = assembleCustomerLifeTruth({ campaign, tasks });
    expect(truth.reviewEligible).toBe(true);
    expect(answer.text).toBe(studioCustomerLifeV1.customerCopy.reviewReady);
    expect(answer.text).not.toMatch(/unavailable|email failed/i);
  });

  it("watchdog detects waiting, failed retry, and missing authorized notices, then recovers without Owner duty", () => {
    const campaign = {
      campaignId: "camp-1",
      campaignName: "Cedar & Bloom Home Organizing",
      campaignStatus: "BUILDING_CONCEPTS",
      campaignDescription: "",
      estimatedCompletion: "",
      packageId: "custom",
      packageLabel: "Custom",
      paymentReceivedAt: "2026-08-15T17:00:00.000Z",
      paymentTruth: { status: "confirmed" },
      createdAt: "2026-08-15T17:00:00.000Z",
      updatedAt: "2026-08-15T18:00:00.000Z",
      approvedStudioPlan: {
        selectedServiceIds: ["v2-rtu-flyer"],
        includedServiceIds: ["v2-rtu-flyer"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 6900,
        monthlyTotalCents: 0,
        amountDueTodayCents: 6900,
        lineItems: [
          {
            skuId: "v2-rtu-flyer",
            serviceId: "v2-rtu-flyer",
            serviceName: "Make Me a Flyer",
            billingType: "one_time",
            exactPriceCents: 6900,
            priceDisplay: "$69",
            deliverables: [],
            exclusions: [],
            timingWindowLabel: "",
            revisionRule: "1 round",
            clientResponsibilities: [],
            executionResponsibility: "Studio",
          },
        ],
        approvedAt: "2026-08-15T17:00:00.000Z",
      },
    } as CampaignRecord;

    const waiting = evaluateLifecycleWatchdogFindings({
      campaign,
      envelope: envelope([
        notice({
          createdAt: "2026-08-15T17:50:00.000Z",
          deliveryStatus: "pending_owner_send",
        }),
      ]),
      nowMs: Date.parse("2026-08-15T18:00:00.000Z"),
    });
    expect(waiting.some((finding) => finding.kind === "notice_waiting")).toBe(true);
    expect(waiting.every((finding) => finding.ownerActionRequired === false)).toBe(true);

    const failed = evaluateLifecycleWatchdogFindings({
      campaign,
      envelope: envelope([notice({ deliveryStatus: "delivery_failed", transportAttempts: 1 })]),
    });
    expect(failed.some((finding) => finding.kind === "failed_transport_retryable")).toBe(true);

    const job = {
      jobId: buildJobId("camp-1", "v2-rtu-flyer"),
      campaignId: "camp-1",
      skuId: "v2-rtu-flyer",
      serviceName: "Make Me a Flyer",
      spineStatus: "in_production",
      productionLane: "standard",
      intakeComplete: true,
      productionStartedAt: "2026-08-15T17:30:00.000Z",
    } as PurchasedJobRecord;
    const missing = evaluateLifecycleWatchdogFindings({
      campaign,
      envelope: { ...envelope([]), jobRecords: [job] },
    });
    expect(missing.map((finding) => finding.eventType).sort()).toEqual(
      ["payment_received", "production_started"].sort(),
    );

    const recovered = recoverMissingAuthorizedNotices({
      campaign,
      envelope: { ...envelope([]), jobRecords: [job] },
      clientUserId: "user-maya",
    });
    const eventTypes = (recovered.jobCommunicationRecords ?? []).map((record) => record.eventType);
    expect(eventTypes).toContain("payment_received");
    expect(eventTypes).toContain("production_started");
    const twice = recoverMissingAuthorizedNotices({
      campaign,
      envelope: recovered,
      clientUserId: "user-maya",
    });
    expect(twice.jobCommunicationRecords?.length).toBe(recovered.jobCommunicationRecords?.length);
  });
});
