import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { recordProviderCall, type ProviderCallRecord } from "@/lib/studio-project-alpha/cost-telemetry";

import {
  appendFulfillmentUsage,
  fulfillmentLinesFromProviderLedger,
  providerTokenTotal,
  qualityUsageLine,
  refundUsageLine,
  type FulfillmentUsageContext,
} from "./fulfillment-usage";
import { initialStudioExtrasTruth } from "./machine";
import { runStudioExtrasProduction } from "./production";
import type { CampaignStudioExtras } from "./types";

const AT = "2026-10-18T02:00:00.000Z";

function context(overrides: Partial<FulfillmentUsageContext> = {}): FulfillmentUsageContext {
  return {
    campaignId: "job-1",
    packageId: "clip_repurposing",
    extraId: "ad_creative",
    selectedExtras: ["ad_creative", "flyer"],
    unitId: "ad-copy",
    productionLine: "studio-extras-copy",
    packageRevisionRound: null,
    deliveryState: "in_production",
    route: "primary",
    at: AT,
    sequenceBase: 0,
    ...overrides,
  };
}

function call(attempt: number, textOutputTokens: number): ProviderCallRecord {
  return {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    purpose: "creative_reasoning",
    attempt,
    httpStatus: 200,
    billable: true,
    usageReported: true,
    rateMissing: false,
    usage: {
      textInputTokens: attempt === 1 ? 100 : 120,
      cachedTextInputTokens: 0,
      imageInputTokens: 0,
      textOutputTokens,
      imageOutputTokens: 0,
    },
    costUsd: 1,
    at: AT,
  };
}

function ledgerOfTwoAttempts() {
  return { calls: [call(1, 40), call(2, 55)] };
}

describe("Studio Extras fulfillment usage", () => {
  it("attributes provider usage to the parent job and Extra, and keeps retries", () => {
    const lines = fulfillmentLinesFromProviderLedger(ledgerOfTwoAttempts(), context());
    expect(lines).toHaveLength(2);
    expect(lines.every((line) => line.campaignId === "job-1")).toBe(true);
    expect(lines.every((line) => line.packageId === "clip_repurposing")).toBe(true);
    expect(lines.every((line) => line.extraId === "ad_creative")).toBe(true);
    expect(lines.every((line) => line.selectedExtras.join() === "ad_creative,flyer")).toBe(true);
    expect(lines.map((line) => line.attempt)).toEqual([1, 2]);
    expect(lines.every((line) => line.productionLine === "studio-extras-copy")).toBe(true);
    expect(providerTokenTotal(lines, "textOutputTokens")).toBe(95);
  });

  it("does not count the same provider usage twice when a quality check is recorded", () => {
    const provider = fulfillmentLinesFromProviderLedger(ledgerOfTwoAttempts(), context());
    const quality = qualityUsageLine(context(), "passed", 2);
    const once = appendFulfillmentUsage(
      { fulfillmentUsage: provider } as CampaignStudioExtras,
      [quality, ...provider],
    );
    const tokens = providerTokenTotal(once.fulfillmentUsage ?? [], "textOutputTokens");
    expect(tokens).toBe(95);
    expect(once.fulfillmentUsage?.filter((line) => line.kind === "provider_usage")).toHaveLength(2);
    expect(quality.usage.textOutputTokens).toBe(0);
    expect(quality.costUsd).toBeNull();
  });

  it("leaves dollars UNKNOWN while the rate card is not verified against an invoice", () => {
    const lines = fulfillmentLinesFromProviderLedger(ledgerOfTwoAttempts(), context());
    expect(lines.every((line) => line.dollarStatus === "UNKNOWN")).toBe(true);
    expect(lines.every((line) => line.costUsd === null)).toBe(true);
    expect(lines.every((line) => line.rateSource === "unverified_list_rate_not_used")).toBe(true);
  });

  it("records the shared package revision round and does not open a separate Extra allowance", () => {
    const lines = fulfillmentLinesFromProviderLedger(
      ledgerOfTwoAttempts(),
      context({ packageRevisionRound: 2 }),
    );
    expect(lines.every((line) => line.packageRevisionRound === 2)).toBe(true);
    expect(lines.every((line) => line.sharesPackageRevisionRounds)).toBe(true);
    expect(lines.every((line) => line.separateExtraRevisionAllowance === false)).toBe(true);
  });

  it("records a refund only when a Courtesy Adjustment was actually issued", () => {
    const base = initialStudioExtrasTruth("clip_repurposing", ["ad_creative", "flyer"], AT);
    const required = {
      ...base,
      courtesy: {
        status: "COURTESY_ADJUSTMENT_REQUIRED" as const,
        exhaustedExtraIds: ["ad_creative" as const],
        percent: 5,
        amountPaidCents: 29900,
        totalAdjustmentCents: 1495,
        alreadyIssuedCents: 0,
        dueCents: 1495,
        proof: {},
        paymentExecution: "not_started" as const,
        refundAmountCents: null,
        stripeRefundId: null,
        idempotencyKey: null,
        refundAttempt: 0,
        providerStatus: null,
        failureDefinitive: null,
        failureReason: null,
        ownerAttention: "none" as const,
        ownerNotice: null,
        computedAt: AT,
      },
    };
    expect(refundUsageLine(required, "job-1")).toEqual([]);
    const issued = {
      ...required,
      courtesy: {
        ...required.courtesy,
        status: "issued" as const,
        paymentExecution: "completed" as const,
        dueCents: 0,
        alreadyIssuedCents: 1495,
      },
    };
    const refunds = refundUsageLine(issued, "job-1");
    expect(refunds).toHaveLength(1);
    expect(refunds[0]?.costUsd).toBe(14.95);
    expect(refunds[0]?.dollarStatus).toBe("DERIVED");
    expect(appendFulfillmentUsage(appendFulfillmentUsage(issued, refunds), refunds).fulfillmentUsage).toHaveLength(1);
  });
});

describe("future Extra jobs record usage without changing the deliverable", () => {
  it("keeps both attempts, attributes them to the parent job, and still passes Quality", async () => {
    const answers = {
      "clip_repurposing:purpose": "Fall pie preorders.",
      "clip_repurposing:cta": "Order at anasbakery.com",
    };
    const campaign = {
      campaignId: "job-1",
      condensedOffer: {
        packageId: "clip_repurposing",
        name: "Clip Repurposing",
        priceCents: 37375,
        revisionRounds: 3,
        customerName: "Ana",
        customerEmail: "a@example.com",
        company: "Ana's Bakery",
        projectNeed: "",
        materialsNote: "",
        support: {},
        extras: ["ad_creative", "flyer"],
      },
      routeMapIntakeDraft: { answers, savedAt: AT },
      studioExtras: initialStudioExtrasTruth("clip_repurposing", ["ad_creative", "flyer"], AT),
    } as unknown as CampaignRecord;

    const passed = async () => {
      recordProviderCall({
        provider: "anthropic",
        model: "claude-sonnet-4-5-20250929",
        purpose: "creative_reasoning",
        attempt: 1,
        httpStatus: 500,
        usage: { textOutputTokens: 10 },
      });
      recordProviderCall({
        provider: "anthropic",
        model: "claude-sonnet-4-5-20250929",
        purpose: "creative_reasoning",
        attempt: 2,
        httpStatus: 200,
        usage: { textOutputTokens: 20 },
      });
      return {
        ok: true,
        attempts: [{ outcome: "passed" as const, reasons: [] }],
        artifacts: [{ path: "data/synthetic/ad.txt", label: "Synthetic", mimeType: "text/plain" }],
        qualitySummary: "Synthetic pass.",
      };
    };

    const first = await runStudioExtrasProduction({
      repoRoot: "C:/unused",
      campaign,
      materials: [],
      adapters: {
        "ad_creative:ad-copy": passed,
        "ad_creative:ad-graphics": passed,
        "flyer:flyer": passed,
      },
    });
    const usage = first.truth?.fulfillmentUsage ?? [];
    const provider = usage.filter((line) => line.kind === "provider_usage");
    expect(provider.length).toBe(6);
    expect(provider.every((line) => line.campaignId === "job-1")).toBe(true);
    expect(new Set(provider.map((line) => line.extraId))).toEqual(new Set(["ad_creative", "flyer"]));
    expect(provider.filter((line) => line.httpStatus === 500)).toHaveLength(3);
    expect(providerTokenTotal(provider, "textOutputTokens")).toBe(90);
    expect(provider.every((line) => line.costUsd === null)).toBe(true);
    expect(usage.filter((line) => line.kind === "refund")).toHaveLength(0);
    expect(usage.filter((line) => line.kind === "quality_check").every((line) => line.sharesPackageRevisionRounds)).toBe(true);
    expect(first.truth?.records.every((record) => record.state === "ready_for_review")).toBe(true);
    expect(first.truth?.records.flatMap((record) => record.units.flatMap((unit) => unit.artifacts)).length).toBe(3);

    const second = await runStudioExtrasProduction({
      repoRoot: "C:/unused",
      campaign: { ...campaign, studioExtras: first.truth ?? undefined },
      materials: [],
      adapters: {
        "ad_creative:ad-copy": passed,
        "ad_creative:ad-graphics": passed,
        "flyer:flyer": passed,
      },
    });
    expect(second.truth?.fulfillmentUsage).toHaveLength(usage.length);
  });
});
