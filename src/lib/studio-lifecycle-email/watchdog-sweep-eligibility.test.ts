import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { JOB_COMMUNICATION_TEMPLATES } from "@/lib/job-control/communication";
import type { JobCommunicationRecord } from "@/lib/job-control/types";

import { POST } from "@/app/api/operating/lifecycle-watchdog/route";

import { deliverAuthorizedLifecycleNotices } from "./deliver";
import { runLifecycleWatchdogSweep } from "./sweep";
import {
  lifecycleWatchdogCronAuthorized,
  watchdogSweepMayDeliverCampaign,
  watchdogSweepMaySendNotice,
} from "./watchdog-sweep-eligibility";

const FUTURE = "2026-10-21T20:00:00.000Z";
const PAST = "2026-10-02T12:00:00.000Z";
const FUTURE_A = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const FUTURE_B = "849c793b-88c1-48cd-9194-5ed95554635a";

function notice(overrides: Partial<JobCommunicationRecord>): JobCommunicationRecord {
  return {
    id: "comm:ready_for_review:job-1:pin",
    campaignId: FUTURE_A,
    clientId: "customer-a",
    jobId: "job-a",
    skuId: "social_and_promo_graphics",
    serviceName: "Social and Promo Graphics",
    eventType: "ready_for_review",
    templateId: JOB_COMMUNICATION_TEMPLATES.ready_for_review.id,
    channel: "in_app_outbox",
    sender: { role: "system", displayName: "System" },
    reason: "Ready for review",
    messageContent: "FUTURE-CUSTOMER-NOTICE",
    deliveryStatus: "pending_owner_send",
    createdAt: FUTURE,
    updatedAt: FUTURE,
    activityEventId: "client_communication:future",
    ...overrides,
  };
}

function campaign(
  campaignId: string,
  createdAt: string,
  markers: {
    sandbox?: boolean;
    testPaymentIsolation?: unknown;
    disposableKitStripeTestProof?: unknown;
  } = {},
): ServerCampaignEnvelope {
  return {
    campaignId,
    syncedAt: createdAt,
    syncVersion: 1,
    record: {
      campaignId,
      createdAt,
      updatedAt: createdAt,
      ...(markers.sandbox === undefined
        ? {}
        : { paymentTruth: { sandbox: markers.sandbox } }),
      ...(markers.testPaymentIsolation === undefined
        ? {}
        : { testPaymentIsolation: markers.testPaymentIsolation }),
      ...(markers.disposableKitStripeTestProof === undefined
        ? {}
        : { disposableKitStripeTestProof: markers.disposableKitStripeTestProof }),
    } as CampaignRecord,
  };
}

function tasks(campaignId: string): ServerTasksEnvelope {
  return {
    campaignId,
    planFingerprint: "fp",
    syncedAt: FUTURE,
    updatedAt: FUTURE,
    version: 9,
    tasks: [],
    jobCommunicationRecords: [],
  };
}

describe("lifecycle watchdog historical queue", () => {
  it("keeps proof, recovery, and route-proof projects out of the sweep", () => {
    const blocked = [
      "route-proof-clip-1791580066573",
      "studio-email-cert-20261018195729",
      "camp-clip-full-cust-cert-20261002",
      "messy-customer-social-promo-recovery",
      "harbor-oak-campaign-launch-kit",
      "laptop-approval-social-1791642000000",
      "local-harbor-oak-kit-disposable",
    ];
    for (const campaignId of blocked) {
      expect(watchdogSweepMayDeliverCampaign({ campaignId, createdAt: FUTURE })).toBe(false);
      expect(
        watchdogSweepMaySendNotice({ campaignId, createdAt: FUTURE }),
      ).toBe(false);
    }
  });

  it("fails closed when the timestamp is missing and admits a later customer project", () => {
    expect(watchdogSweepMayDeliverCampaign({ campaignId: FUTURE_A, createdAt: PAST })).toBe(false);
    expect(watchdogSweepMayDeliverCampaign({ campaignId: FUTURE_A, createdAt: null })).toBe(false);
    expect(watchdogSweepMayDeliverCampaign({ campaignId: FUTURE_A, createdAt: "not-a-date" })).toBe(
      false,
    );
    expect(watchdogSweepMayDeliverCampaign({ campaignId: "  ", createdAt: FUTURE })).toBe(false);
    expect(watchdogSweepMayDeliverCampaign({ campaignId: FUTURE_A, createdAt: FUTURE })).toBe(true);
    expect(watchdogSweepMayDeliverCampaign({ campaignId: FUTURE_A, createdAt: FUTURE, sandbox: false })).toBe(
      true,
    );
    expect(watchdogSweepMaySendNotice({ campaignId: "test-new-project", createdAt: FUTURE })).toBe(
      false,
    );
    expect(watchdogSweepMaySendNotice({ campaignId: FUTURE_A, createdAt: PAST })).toBe(false);
    expect(watchdogSweepMaySendNotice({ campaignId: FUTURE_A, createdAt: FUTURE })).toBe(true);
  });

  it("sends a later notice and leaves the historical notice unchanged", async () => {
    const historical = notice({
      id: "comm:old",
      campaignId: "route-proof-clip-1791580066573",
      clientId: "proof-customer",
      messageContent: "OLD-PROOF-NOTICE",
      createdAt: PAST,
      deliveryStatus: "pending_owner_send",
    });
    const future = notice({
      id: "comm:new",
      campaignId: FUTURE_A,
      clientId: "customer-a",
      messageContent: "FUTURE-CUSTOMER-NOTICE",
      createdAt: FUTURE,
      deliveryStatus: "delivery_failed",
      transportAttempts: 1,
      lastTransportAt: "2026-10-21T19:00:00.000Z",
    });
    const sent: string[] = [];
    const result = await deliverAuthorizedLifecycleNotices({
      envelope: {
        campaignId: FUTURE_A,
        planFingerprint: "fp",
        syncedAt: FUTURE,
        updatedAt: FUTURE,
        version: 9,
        tasks: [],
        jobCommunicationRecords: [historical, future],
      },
      toEmail: "customer-a@example.com",
      nowMs: Date.parse("2026-10-21T21:00:00.000Z"),
      noticeMaySend: watchdogSweepMaySendNotice,
      send: async (input) => {
        sent.push(input.text);
        return { ok: true, provider: "resend", providerMessageId: "re_test_gate" };
      },
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain("FUTURE-CUSTOMER-NOTICE");
    expect(sent[0]).not.toContain("OLD-PROOF-NOTICE");
    expect(result.sent).toBe(1);
    const kept = result.envelope.jobCommunicationRecords?.find((record) => record.id === "comm:old");
    expect(kept?.deliveryStatus).toBe("pending_owner_send");
    expect(kept?.transportAttempts ?? 0).toBe(0);
  });

  it("keeps a later fixture, sandbox, or disposable project out of the sweep", () => {
    expect(
      watchdogSweepMayDeliverCampaign({ campaignId: "test-new-project", createdAt: FUTURE }),
    ).toBe(false);
    expect(
      watchdogSweepMayDeliverCampaign({ campaignId: "owner-qa-dev", createdAt: FUTURE }),
    ).toBe(false);
    expect(
      watchdogSweepMayDeliverCampaign({
        campaignId: FUTURE_A,
        createdAt: FUTURE,
        sandbox: true,
      }),
    ).toBe(false);
    expect(
      watchdogSweepMayDeliverCampaign({
        campaignId: FUTURE_A,
        createdAt: FUTURE,
        testPaymentIsolation: { disposable: true },
      }),
    ).toBe(false);
    expect(
      watchdogSweepMayDeliverCampaign({
        campaignId: FUTURE_A,
        createdAt: FUTURE,
        disposableKitStripeTestProof: { livemode: false },
      }),
    ).toBe(false);
  });

  it("does not send or write historical projects, and does not mix customer ids", async () => {
    const delivered: string[] = [];
    const written: string[] = [];
    const result = await runLifecycleWatchdogSweep({
      limit: 1,
      deps: {
        listCampaignEnvelopes: async () => [
          campaign("route-proof-social-promo-1791620985041", PAST),
          campaign("test-new-project", FUTURE),
          campaign(FUTURE_B, FUTURE, { sandbox: true }),
          campaign(FUTURE_A, FUTURE, { testPaymentIsolation: { disposable: true } }),
          campaign("9c6c25f2-2562-4192-97a5-44536e45cd18", FUTURE),
        ],
        readCampaignEnvelope: async (campaignId) => campaign(campaignId, FUTURE),
        readTasksEnvelope: async (campaignId) => tasks(campaignId),
        writeTasksEnvelope: async (envelope) => {
          written.push(envelope.campaignId);
          return { ...envelope, syncedAt: FUTURE };
        },
        getOrInitializeMaterials: async () => ({ items: [] }) as never,
        recoverPaidOperatingChain: async (record) => record,
        recoverMissingAuthorizedNotices: (input) => input.envelope,
        evaluateLifecycleWatchdogFindings: () => [],
        deliverLifecycleNoticesForCampaign: async (campaignId) => {
          delivered.push(campaignId);
          return {
            campaignId,
            attempted: 1,
            sent: 1,
            failed: 0,
            ownerActionRequired: false,
          };
        },
      },
    });
    expect(delivered).toEqual(["9c6c25f2-2562-4192-97a5-44536e45cd18"]);
    expect(delivered).not.toContain("route-proof-social-promo-1791620985041");
    expect(delivered).not.toContain("test-new-project");
    expect(delivered).not.toContain(FUTURE_A);
    expect(delivered).not.toContain(FUTURE_B);
    expect(written).toEqual([]);
    expect(result.skippedHistoricalCampaigns).toBe(4);
    expect(result.attemptedCampaigns).toBe(1);
    expect(result.noticesSent).toBe(1);
  });

  it("refuses the cron header when no secret is configured", () => {
    expect(lifecycleWatchdogCronAuthorized(undefined, "anything")).toBe(false);
    expect(lifecycleWatchdogCronAuthorized("", "anything")).toBe(false);
    expect(lifecycleWatchdogCronAuthorized("gate-secret", null)).toBe(false);
    expect(lifecycleWatchdogCronAuthorized("gate-secret", "other")).toBe(false);
    expect(lifecycleWatchdogCronAuthorized("gate-secret", "gate-secret")).toBe(true);
  });

  it("does not run the sweep for an unauthorized request", async () => {
    const response = await POST(
      new Request("http://127.0.0.1/api/operating/lifecycle-watchdog", { method: "POST" }),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.noticesSent).toBeUndefined();
  });
});
