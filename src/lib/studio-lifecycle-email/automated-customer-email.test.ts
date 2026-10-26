import { afterEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  enqueueJobCommunicationRecord,
  JOB_COMMUNICATION_TEMPLATES,
} from "@/lib/job-control/communication";
import type { JobCommunicationEventType, PurchasedJobRecord } from "@/lib/job-control/types";
import { deliverStudioExtrasCourtesyEmail } from "@/lib/studio-extras/courtesy-email";
import type { CourtesyRefundStage, StudioExtrasCourtesy } from "@/lib/studio-extras/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

import { composeCustomerEmail, deliverAuthorizedLifecycleNotices } from "./deliver";
import { lifecycleCustomerSurfaceAbsoluteLinks } from "./surfaces";

const NOW = "2026-10-18T18:00:00.000Z";
const LATER = "2026-10-18T18:02:00.000Z";

const FACTORY_EVENTS = [
  "payment_received",
  "ready_for_review",
  "revision_requested",
  "revision_ready_again",
  "approved_for_delivery",
  "final_delivery_available",
  "refund_processing",
  "refund_issued",
  "refund_review_needed",
] as const satisfies readonly JobCommunicationEventType[];

function job(): PurchasedJobRecord {
  return {
    jobId: "camp-email::studio-test",
    campaignId: "camp-email",
    skuId: "studio-test",
    serviceName: "Studio test service",
    spineStatus: "building_concepts",
  } as PurchasedJobRecord;
}

function campaign(): CampaignRecord {
  return {
    campaignId: "camp-email",
    campaignName: "Studio email test",
  } as CampaignRecord;
}

function envelope(): ServerTasksEnvelope {
  return {
    campaignId: "camp-email",
    planFingerprint: "fp",
    syncedAt: NOW,
    updatedAt: NOW,
    version: 9,
    tasks: [],
  };
}

function queuedFactory(): ServerTasksEnvelope {
  return FACTORY_EVENTS.reduce(
    (current, eventType) =>
      enqueueJobCommunicationRecord(current, {
        job: job(),
        campaign: campaign(),
        clientId: "user-test",
        eventType,
        occurredAt: NOW,
        idempotencyKey: eventType,
      }),
    envelope(),
  );
}

function courtesyCampaign(
  stage: CourtesyRefundStage,
  extra: Partial<StudioExtrasCourtesy> = {},
): CampaignRecord {
  const courtesy: StudioExtrasCourtesy = {
    status: stage === "completed" ? "issued" : "COURTESY_ADJUSTMENT_REQUIRED",
    exhaustedExtraIds: ["flyer"],
    percent: 5,
    amountPaidCents: 15920,
    totalAdjustmentCents: 796,
    alreadyIssuedCents: stage === "completed" ? 796 : 0,
    dueCents: 0,
    proof: {},
    paymentExecution: stage,
    refundAmountCents: 796,
    stripeRefundId: stage === "not_started" ? null : "re_test_courtesy",
    idempotencyKey: "courtesy:camp-email:flyer:5",
    refundAttempt: 1,
    providerStatus: stage === "not_started" ? null : stage,
    failureDefinitive: stage === "failed" ? true : null,
    failureReason: stage === "failed" ? "card_declined" : null,
    ownerAttention: stage === "failed" || stage === "uncertain" ? "exception" : "notice",
    ownerNotice: "Tagia, the adjustment is recorded.",
    computedAt: NOW,
    ...extra,
  };
  return {
    campaignId: "camp-email",
    studioExtras: {
      records: [],
      revisionRounds: [],
      courtesy,
      updatedAt: NOW,
    },
  } as unknown as CampaignRecord;
}

describe("automated customer email", () => {
  const priorSite = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (priorSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = priorSite;
  });

  it("omits project and review links while the public site is localhost", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3475";
    expect(lifecycleCustomerSurfaceAbsoluteLinks("ready_for_review")).toEqual([]);
    expect(lifecycleCustomerSurfaceAbsoluteLinks("final_delivery_available")).toEqual([]);
    const record = queuedFactory().jobCommunicationRecords?.find(
      (entry) => entry.eventType === "ready_for_review",
    );
    expect(record).toBeTruthy();
    const email = composeCustomerEmail(record!);
    expect(email.text).not.toMatch(/localhost|127\.0\.0\.1/i);
    expect(email.html).not.toMatch(/localhost|127\.0\.0\.1/i);
    expect(email.subject).toBe(record!.reason);
  });

  it("labels certification-fixture mail and leaves ordinary customer subjects unchanged", () => {
    const ordinary = queuedFactory().jobCommunicationRecords?.[0];
    expect(composeCustomerEmail(ordinary!).subject).toBe(ordinary!.reason);
    const labeled = composeCustomerEmail({
      ...ordinary!,
      campaignId: "studio-email-cert-fixture",
    });
    expect(labeled.subject).toBe(`Studio test — ${ordinary!.reason}`);
    expect(labeled.text).toMatch(/Studio delivery test/);
    expect(labeled.text).not.toMatch(/localhost|127\.0\.0\.1/i);
  });

  it("uses a public origin when one is configured", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://thestudiocompany7.com";
    const links = lifecycleCustomerSurfaceAbsoluteLinks("ready_for_review");
    expect(links.map((link) => link.url).join(" ")).toContain("https://thestudiocompany7.com/");
    expect(links.map((link) => link.url).join(" ")).not.toMatch(/localhost/i);
  });

  it("queues each factory notice once, sends it once, and does not send it again", async () => {
    const firstEnvelope = queuedFactory();
    for (const eventType of FACTORY_EVENTS) {
      const record = firstEnvelope.jobCommunicationRecords?.find((entry) => entry.eventType === eventType);
      expect(record?.deliveryStatus).toBe("pending_owner_send");
    }
    expect(firstEnvelope.jobCommunicationRecords?.find((entry) => entry.eventType === "refund_issued")?.messageContent).toMatch(
      /was returned/,
    );
    expect(
      firstEnvelope.jobCommunicationRecords?.find((entry) => entry.eventType === "refund_processing")?.messageContent,
    ).not.toMatch(/was returned|service is closed/i);
    expect(
      firstEnvelope.jobCommunicationRecords?.find((entry) => entry.eventType === "refund_processing")?.messageContent,
    ).toMatch(/not back yet/);
    expect(
      firstEnvelope.jobCommunicationRecords?.find((entry) => entry.eventType === "refund_issued")?.messageContent,
    ).toMatch(/service is closed/i);
    expect(
      firstEnvelope.jobCommunicationRecords?.find((entry) => entry.eventType === "refund_review_needed")?.messageContent,
    ).toMatch(/could not be completed/);
    expect(
      firstEnvelope.jobCommunicationRecords?.find((entry) => entry.eventType === "refund_review_needed")?.messageContent,
    ).not.toMatch(/service is closed|was returned/i);

    const sent: string[] = [];
    const first = await deliverAuthorizedLifecycleNotices({
      envelope: firstEnvelope,
      toEmail: "studio-test@example.com",
      nowMs: Date.parse(NOW),
      send: async (input) => {
        sent.push(input.subject);
        expect(input.text).not.toMatch(/localhost|127\.0\.0\.1/i);
        expect(input.kind).toBe("customer-lifecycle");
        return { ok: true, provider: "resend", providerMessageId: `id-${input.subject}` };
      },
    });
    expect(first.sent).toBe(FACTORY_EVENTS.length);
    expect(new Set(sent).size).toBe(FACTORY_EVENTS.length);
    expect(sent).toEqual(
      FACTORY_EVENTS.map((eventType) => JOB_COMMUNICATION_TEMPLATES[eventType].reason),
    );

    let replayCalls = 0;
    const replay = await deliverAuthorizedLifecycleNotices({
      envelope: first.envelope,
      toEmail: "studio-test@example.com",
      nowMs: Date.parse(LATER),
      send: async () => {
        replayCalls += 1;
        return { ok: true, provider: "resend" };
      },
    });
    expect(replayCalls).toBe(0);
    expect(replay.sent).toBe(0);
  });

  it("keeps the customer message when the provider is down, then retries once", async () => {
    const queued = enqueueJobCommunicationRecord(envelope(), {
      job: job(),
      campaign: campaign(),
      clientId: "user-test",
      eventType: "ready_for_review",
      occurredAt: NOW,
      idempotencyKey: "review",
    });
    const original = queued.jobCommunicationRecords?.[0]?.messageContent;
    const failed = await deliverAuthorizedLifecycleNotices({
      envelope: queued,
      toEmail: "studio-test@example.com",
      nowMs: Date.parse(NOW),
      send: async () => ({ ok: false, provider: "resend", code: "provider_error" }),
    });
    expect(failed.failed).toBe(1);
    expect(failed.ownerActionRequired).toBe(false);
    expect(failed.envelope.jobCommunicationRecords?.[0]).toMatchObject({
      deliveryStatus: "delivery_failed",
      messageContent: original,
      transportAttempts: 1,
    });

    const tooSoon = await deliverAuthorizedLifecycleNotices({
      envelope: failed.envelope,
      toEmail: "studio-test@example.com",
      nowMs: Date.parse(NOW) + 1_000,
      send: async () => ({ ok: true, provider: "resend" }),
    });
    expect(tooSoon.sent).toBe(0);
    expect(tooSoon.envelope.jobCommunicationRecords?.[0]?.deliveryStatus).toBe("delivery_failed");

    const retried = await deliverAuthorizedLifecycleNotices({
      envelope: failed.envelope,
      toEmail: "studio-test@example.com",
      nowMs: Date.parse(LATER),
      send: async () => ({ ok: true, provider: "resend", providerMessageId: "retry-1" }),
    });
    expect(retried.sent).toBe(1);
    expect(retried.envelope.jobCommunicationRecords?.[0]?.deliveryStatus).toBe("sent");
  });

  it("does not pretend a missing recipient was emailed", async () => {
    const queued = enqueueJobCommunicationRecord(envelope(), {
      job: job(),
      campaign: campaign(),
      clientId: "unclaimed-client:camp-email",
      eventType: "payment_received",
      occurredAt: NOW,
      idempotencyKey: "pay",
    });
    let calls = 0;
    const result = await deliverAuthorizedLifecycleNotices({
      envelope: queued,
      toEmail: null,
      nowMs: Date.parse(NOW),
      send: async () => {
        calls += 1;
        return { ok: true, provider: "resend" };
      },
    });
    expect(calls).toBe(0);
    expect(result.envelope.jobCommunicationRecords?.[0]?.deliveryStatus).toBe("delivery_failed");
    expect(result.envelope.jobCommunicationRecords?.[0]?.messageContent).toMatch(/Payment is received/);
  });

  it("emails Courtesy stages truthfully and does not repeat a stage", async () => {
    const sent: string[] = [];
    const send = async (input: { subject: string; text: string }) => {
      sent.push(`${input.subject}\n${input.text}`);
      expect(input.text).not.toMatch(/https?:\/\//);
      return { ok: true as const, provider: "resend" as const, providerMessageId: "courtesy-1" };
    };
    const writes: CampaignRecord[] = [];
    const accepted = await deliverStudioExtrasCourtesyEmail(courtesyCampaign("accepted"), {
      now: NOW,
      send,
      writeCampaign: async (record) => {
        writes.push(record);
        return record;
      },
      resolveRecipient: async () => ({ email: "studio-test@example.com" }),
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatch(/accepted by the payment processor/);
    expect(sent[0]).not.toMatch(/was returned/);
    expect(accepted.studioExtras?.courtesy?.paymentExecution).toBe("accepted");
    expect(accepted.studioExtras?.courtesy?.customerEmailStage).toBe("accepted");

    sent.length = 0;
    await deliverStudioExtrasCourtesyEmail(accepted, {
      now: LATER,
      send,
      writeCampaign: async (record) => record,
      resolveRecipient: async () => ({ email: "studio-test@example.com" }),
    });
    expect(sent).toHaveLength(0);

    const completed = await deliverStudioExtrasCourtesyEmail(
      courtesyCampaign("completed", {
        customerEmailStage: "accepted",
        customerEmailRefundId: "re_test_courtesy",
      }),
      {
        now: LATER,
        send,
        writeCampaign: async (record) => record,
        resolveRecipient: async () => ({ email: "studio-test@example.com" }),
      },
    );
    expect(sent[0]).toMatch(/was returned to your original card/);
    expect(completed.studioExtras?.courtesy?.customerEmailStage).toBe("completed");
    expect(completed.studioExtras?.courtesy?.status).toBe("issued");
  });

  it("does not change the Courtesy payment status when email fails, and retries after the interval", async () => {
    let calls = 0;
    const failed = await deliverStudioExtrasCourtesyEmail(courtesyCampaign("failed"), {
      now: NOW,
      send: async () => {
        calls += 1;
        return { ok: false, provider: "resend", code: "provider_error" };
      },
      writeCampaign: async (record) => record,
      resolveRecipient: async () => ({ email: "studio-test@example.com" }),
    });
    expect(calls).toBe(1);
    expect(failed.studioExtras?.courtesy?.paymentExecution).toBe("failed");
    expect(failed.studioExtras?.courtesy?.customerEmailStage ?? null).toBeNull();
    expect(failed.studioExtras?.courtesy?.customerEmailAttempts).toBe(1);
    expect(failed.studioExtras?.courtesy?.ownerNotice).not.toMatch(/was not emailed/);

    const tooSoon = await deliverStudioExtrasCourtesyEmail(failed, {
      now: "2026-10-18T18:00:30.000Z",
      send: async () => {
        calls += 1;
        return { ok: true, provider: "resend" };
      },
      writeCampaign: async (record) => record,
      resolveRecipient: async () => ({ email: "studio-test@example.com" }),
    });
    expect(calls).toBe(1);
    expect(tooSoon.studioExtras?.courtesy?.customerEmailStage).toBeUndefined();

    const retried = await deliverStudioExtrasCourtesyEmail(failed, {
      now: LATER,
      send: async () => {
        calls += 1;
        return { ok: true, provider: "resend", providerMessageId: "courtesy-retry" };
      },
      writeCampaign: async (record) => record,
      resolveRecipient: async () => ({ email: "studio-test@example.com" }),
    });
    expect(calls).toBe(2);
    expect(retried.studioExtras?.courtesy?.customerEmailStage).toBe("failed");
    expect(retried.studioExtras?.courtesy?.paymentExecution).toBe("failed");
  });

  it("does not email a Courtesy Adjustment that never reached Stripe", async () => {
    let calls = 0;
    const sandbox = await deliverStudioExtrasCourtesyEmail(
      courtesyCampaign("failed", {
        stripeRefundId: null,
        providerStatus: null,
        failureReason: "sandbox_payment",
        failureDefinitive: false,
      }),
      {
        now: NOW,
        send: async () => {
          calls += 1;
          return { ok: true, provider: "resend" };
        },
        writeCampaign: async (record) => record,
        resolveRecipient: async () => ({ email: "studio-test@example.com" }),
      },
    );
    expect(calls).toBe(0);
    expect(sandbox.studioExtras?.courtesy?.customerEmailStage).toBeUndefined();
  });

  it("does not email a Courtesy Adjustment when there is no recipient", async () => {
    let calls = 0;
    const result = await deliverStudioExtrasCourtesyEmail(courtesyCampaign("completed"), {
      now: NOW,
      send: async () => {
        calls += 1;
        return { ok: true, provider: "resend" };
      },
      writeCampaign: async (record) => record,
      resolveRecipient: async () => ({ email: null }),
    });
    expect(calls).toBe(0);
    expect(result.studioExtras?.courtesy?.customerEmailStage).toBeUndefined();
    expect(result.studioExtras?.courtesy?.paymentExecution).toBe("completed");
  });
});
