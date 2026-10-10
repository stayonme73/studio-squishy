import { beforeEach, describe, expect, it, vi } from "vitest";

const { createCheckoutSession } = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(async (_request: unknown, _context?: unknown) => ({
    ok: true as const,
    checkoutUrl: "https://checkout.test/session",
    checkoutSessionId: "cs_test_acceptance",
  })),
}));

vi.mock("@/lib/studio-payment/create-session", () => ({ createCheckoutSession }));
vi.mock("@/lib/auth/session", () => ({ readSessionFromRequest: vi.fn(async () => null) }));

import type { CampaignRecord } from "@/config/studio-board";
import { studioCanonicalLaunchTruthV1 as truth } from "@/config/studio-canonical-launch-truth-v1";
import {
  clipRepurposingPackageDetail,
  shortFormVideoEditingPackageDetail,
  socialAndPromoGraphicsPackageDetail,
} from "@/config/studio-customer-journey-condense-v1";
import { POST } from "@/app/api/payments/checkout-session/route";
import { answerCondensedLaunchVoice } from "@/lib/studio-customer-life/condensed-launch-voice";
import {
  answerPricingFromShelf,
  answerScopeFromShelf,
  answerServiceFitFromShelf,
} from "@/lib/studio-customer-life/voice-shelf-truth";

const OLD_PRICES = /\$549|\$349|\$599|\$69\b|\$79\b|\$89\b|\$99\b|\$129\b|\$149\b/;

type PackageId = NonNullable<CampaignRecord["condensedOffer"]>["packageId"];

function condensedCampaign(packageId: PackageId): CampaignRecord {
  const pkg = truth.packages.find((item) => item.packageId === packageId)!;
  return {
    campaignId: `accept-${packageId}`,
    campaignName: pkg.customerFacingName,
    campaignStatus: "PAYMENT_RECEIVED",
    paymentReceivedAt: "2026-10-10T12:00:00.000Z",
    paymentTruth: { processor: "stripe", status: "confirmed", expectedAmountCents: pkg.amountDueAfterThankYouCents },
    condensedOffer: {
      packageId,
      name: pkg.customerFacingName,
      priceCents: pkg.listPriceCents,
      listPriceCents: pkg.listPriceCents,
      thankYouDiscountCents: pkg.listPriceCents - pkg.amountDueAfterThankYouCents,
      amountDueCents: pkg.amountDueAfterThankYouCents,
      revisionRounds: 3,
    },
  } as unknown as CampaignRecord;
}

function legacyCampaign(status: "confirmed" | "initiated", cents: number): CampaignRecord {
  return {
    campaignId: `legacy-${status}`,
    campaignStatus: status === "confirmed" ? "PAYMENT_RECEIVED" : "DRAFT",
    paymentReceivedAt: status === "confirmed" ? "2026-09-26T12:00:00.000Z" : null,
    paymentTruth: { processor: "stripe", status, expectedAmountCents: cents },
  } as unknown as CampaignRecord;
}

/** Every Voice answer a menu question can reach: the three-package script first, then fit / price / scope. */
function voiceAnswers(question: string, campaign: CampaignRecord | null = null): string[] {
  const script = answerCondensedLaunchVoice(question);
  return [
    script ?? "",
    answerServiceFitFromShelf(question),
    answerPricingFromShelf(question, campaign),
    answerScopeFromShelf(question, campaign),
  ];
}

function price(question: string, campaign: CampaignRecord | null = null): string {
  return answerCondensedLaunchVoice(question) ?? answerPricingFromShelf(question, campaign);
}

function checkoutRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/payments/checkout-session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      campaignId: "accept-checkout",
      facts: { selectedServiceIds: ["v2-rtu-clip-repurposing"] },
      returnOrigin: "http://localhost:3000",
      ...body,
    }),
  });
}

describe("Studio Voice acceptance (committed state)", () => {
  it("never offers an old-shelf service or price for a stranger", () => {
    const questions = [
      "I just need something for Instagram, I don't know which one.",
      "Which service fits footage of me talking?",
      "How much is the talking head reel edit?",
      "How much does the 15 minute clip set cost?",
      "How much is a flyer?",
      "Which service is right for a business card?",
      "What do I get with the email kit?",
      "How much is a menu?",
      "What is the price for an SMS kit?",
      "Which one should I buy for promotion graphics?",
      "What's the cost of repurposing my long video?",
      "How much is this going to cost me?",
      "So what exactly am I getting?",
    ];
    for (const question of questions) {
      for (const text of voiceAnswers(question)) {
        expect(text, question).not.toMatch(OLD_PRICES);
        expect(text, question).not.toMatch(/Make Me a|Launch Now|published Studio shelf/i);
      }
    }
  });

  it("quotes canonical prices with the Studio Thank-You", () => {
    expect(answerServiceFitFromShelf("Which service fits footage of me talking?")).toMatch(
      /Short-Form Video Editing at \$249/,
    );
    expect(price("How much is the talking head reel edit?")).toMatch(/\$249.*\$199\.20/);
    expect(price("How much does the 15 minute clip set cost?")).toMatch(/Clip Repurposing is \$399.*\$319\.20/);
    expect(price("How much is Social & Promo Graphics?")).toMatch(/Social & Promo Graphics is \$199\./);
    expect(price("How much is a flyer?")).toMatch(
      /Clip Repurposing at \$399, Short-Form Video Editing at \$249, and Social & Promo Graphics at \$199/,
    );
  });

  it("corrects $549 Clip and $349 Short-Form instead of quoting them as current", () => {
    expect(answerCondensedLaunchVoice("Is Clip Repurposing $549?")).toMatch(/\$399, not \$549/);
    expect(answerCondensedLaunchVoice("Is Short-Form Video Editing $349?")).toMatch(/\$249, not \$349/);
  });

  it("quotes a three-package customer's own record", () => {
    const clip = answerPricingFromShelf("How much is this going to cost me?", condensedCampaign("clip_repurposing"));
    expect(clip).toMatch(/Clip Repurposing.*\$399.*\$319\.20/);
    const shortForm = answerPricingFromShelf(
      "How much is this going to cost me?",
      condensedCampaign("short_form_video_editing"),
    );
    expect(shortForm).toMatch(/Short-Form Video Editing.*\$249.*\$199\.20/);
    const social = answerPricingFromShelf(
      "How much is this going to cost me?",
      condensedCampaign("social_and_promo_graphics"),
    );
    expect(social).toMatch(/Social & Promo Graphics.*\$199.*\$159\.20/);
    for (const text of [clip, shortForm, social]) expect(text).not.toMatch(OLD_PRICES);
    const scope = answerScopeFromShelf("So what exactly am I getting?", condensedCampaign("clip_repurposing"));
    expect(scope).toMatch(/Your project is Clip Repurposing\./);
    expect(scope).not.toMatch(OLD_PRICES);
  });

  it("does not quote an unpaid old-shelf plan, and labels a paid historical record as not current", () => {
    const unpaid = answerPricingFromShelf("How much is this going to cost me?", legacyCampaign("initiated", 6900));
    expect(unpaid).not.toMatch(OLD_PRICES);
    expect(unpaid).toMatch(/Clip Repurposing at \$399/);
    const paid = answerPricingFromShelf("How much is this going to cost me?", legacyCampaign("confirmed", 54900));
    expect(paid).toMatch(/earlier Studio purchase/);
    expect(paid).toMatch(/It is not a current price\./);
  });
});

describe("checkout acceptance (committed state)", () => {
  beforeEach(() => createCheckoutSession.mockClear());

  it("refuses old-shelf purchase kinds before any session is created", async () => {
    for (const purchaseKind of [undefined, "studio_plan", "paid_cycle"]) {
      const response = await POST(checkoutRequest(purchaseKind ? { purchaseKind } : {}));
      expect(response.status, String(purchaseKind)).toBe(410);
      const json = (await response.json()) as { ok: boolean; error: string; message: string };
      expect(json.ok).toBe(false);
      expect(json.error).toBe("superseded_offer");
      expect(json.message).not.toMatch(OLD_PRICES);
    }
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("starts the canonical three-package checkout and passes the chosen package through", async () => {
    const response = await POST(
      checkoutRequest({
        purchaseKind: "condensed_offer",
        condensedOffer: { packageId: "clip_repurposing", customerName: "Ada Stone", company: "Cedar Lane" },
      }),
    );
    expect(response.status).toBe(200);
    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    const [args] = createCheckoutSession.mock.calls[0] as unknown as [
      { purchaseKind: string; condensedOffer: { packageId: string } },
    ];
    expect(args.purchaseKind).toBe("condensed_offer");
    expect(args.condensedOffer.packageId).toBe("clip_repurposing");
  });

  it("the three-package door shows exactly the canonical three at canonical prices", () => {
    const door = [clipRepurposingPackageDetail, shortFormVideoEditingPackageDetail, socialAndPromoGraphicsPackageDetail];
    expect(door.map((pkg) => pkg.priceCents)).toEqual(truth.packages.map((pkg) => pkg.listPriceCents));
  });
});
