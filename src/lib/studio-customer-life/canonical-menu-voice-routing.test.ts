import { beforeEach, describe, expect, it, vi } from "vitest";

const { createCheckoutSession } = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(async (_request: unknown, _context?: unknown) => ({
    ok: true as const,
    checkoutUrl: "https://checkout.test/session",
    checkoutSessionId: "cs_test_enforcement",
  })),
}));

vi.mock("@/lib/studio-payment/create-session", () => ({ createCheckoutSession }));
vi.mock("@/lib/auth/session", () => ({ readSessionFromRequest: vi.fn(async () => null) }));

import { ROUTE_MAP_V2_LAUNCH_SERVICES } from "@/catalog/route-map-v2-launch";
import type { CampaignRecord } from "@/config/studio-board";
import { studioCanonicalLaunchTruthV1 as truth } from "@/config/studio-canonical-launch-truth-v1";
import {
  campaignLaunchKitPackageDetail,
  clipRepurposingPackageDetail,
  shortFormVideoEditingPackageDetail,
  socialAndPromoGraphicsPackageDetail,
} from "@/config/studio-customer-journey-condense-v1";
import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";
import {
  LAUNCH_MENU_FROZEN_PRICES_CENTS,
  studioMenuReadinessAndDemandFreezeV1,
} from "@/config/studio-menu-readiness-and-demand-freeze-v1";
import { studioPublicShelfHonestyV1 } from "@/config/studio-public-shelf-honesty-v1";
import { POST } from "@/app/api/payments/checkout-session/route";
import { answerCustomerLifeQuestion } from "@/lib/studio-customer-life/answer-question";
import { deriveCheckoutAmountCents } from "@/lib/studio-payment/amount";

const OLD_PRICES = /\$549|\$599|\$69\b|\$79\b|\$89\b|\$99\b/;

type PackageId = NonNullable<CampaignRecord["condensedOffer"]>["packageId"];

function condensedCampaign(packageId: PackageId): CampaignRecord {
  const pkg = truth.packages.find((item) => item.packageId === packageId)!;
  return {
    campaignId: `enforce-${packageId}`,
    campaignName: pkg.customerFacingName,
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Enforcement fixture",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: pkg.customerFacingName,
    paymentReceivedAt: "2026-10-10T12:00:00.000Z",
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: pkg.amountDueAfterThankYouCents,
      checkoutSessionId: "cs_enforce",
      selectedServiceIds: pkg.factorySku ? [pkg.factorySku] : ["v2-rtu-social-posts"],
      decisionId: "dec",
      factFingerprint: "fp",
      draftRevision: 1,
    },
    condensedOffer: {
      packageId,
      name: pkg.customerFacingName,
      priceCents: pkg.listPriceCents,
      listPriceCents: pkg.listPriceCents,
      thankYouDiscountCents: pkg.listPriceCents - pkg.amountDueAfterThankYouCents,
      amountDueCents: pkg.amountDueAfterThankYouCents,
      revisionRounds: 3,
      customerName: "Ada Stone",
      customerEmail: "ada@example.test",
      company: "Cedar Lane",
      projectNeed: "Fixture",
      materialsNote: "",
      support: {},
    },
  } as unknown as CampaignRecord;
}

function legacyCampaign(status: "confirmed" | "initiated", skuId: string, cents: number): CampaignRecord {
  return {
    campaignId: `legacy-${status}`,
    campaignName: "Legacy",
    campaignStatus: status === "confirmed" ? "PAYMENT_RECEIVED" : "DRAFT",
    campaignDescription: "Legacy fixture",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: status === "confirmed" ? "2026-09-26T12:00:00.000Z" : null,
    paymentTruth: {
      processor: "stripe",
      status,
      currency: "usd",
      expectedAmountCents: cents,
      checkoutSessionId: "cs_legacy",
      selectedServiceIds: [skuId],
      decisionId: "dec",
      factFingerprint: "fp",
      draftRevision: 1,
    },
  } as unknown as CampaignRecord;
}

function ask(question: string, campaign: CampaignRecord | null = null): string {
  return answerCustomerLifeQuestion(question, { campaign }).text;
}

function checkoutRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/payments/checkout-session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      campaignId: "enforce-checkout",
      facts: { selectedServiceIds: ["v2-rtu-clip-repurposing"] },
      returnOrigin: "http://localhost:3000",
      ...body,
    }),
  });
}

describe("Studio Voice obeys canonical launch truth", () => {
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
      "Can you make a short video from my stills?",
      "What is the price for an SMS kit?",
      "How much is a service sheet?",
      "Which one should I buy for promotion graphics?",
      "What's the cost of repurposing my long video?",
      "How much is this going to cost me?",
      "So what exactly am I getting?",
    ];
    for (const question of questions) {
      const text = ask(question);
      expect(text, question).not.toMatch(OLD_PRICES);
      expect(text, question).not.toMatch(/Make Me a|Launch Now|published Studio shelf/i);
    }
  });

  it("matches realistic phrasing to a canonical package with current price and Thank-You", () => {
    expect(ask("Which service fits footage of me talking?")).toMatch(/Short-Form Video Editing at \$186\.25/);
    expect(ask("How much is the talking head reel edit?")).toMatch(/\$186\.25.*\$149/);
    expect(ask("How much does the 15 minute clip set cost?")).toMatch(/Clip Repurposing is \$373\.75.*\$299/);
    expect(ask("How much is a flyer?")).toMatch(/not a separate Extra on that package/);
    expect(ask("How much is a flyer?")).toMatch(/does not change the package price/);
    expect(ask("Which service is right for a business card?")).toMatch(/does not currently offer a business card/);
    expect(ask("Which service is right for a business card?")).toMatch(/offers four packages/);
  });

  it("corrects $549 Clip and $349 Short-Form instead of quoting them as current", () => {
    expect(ask("Is Clip Repurposing $549?")).toMatch(/\$373\.75.*not \$549/);
    expect(ask("Is Short-Form Video Editing $349?")).toMatch(/\$186\.25.*not \$349/);
  });

  it("quotes a three-package customer's own record, never the old shelf price for the same factory SKU", () => {
    const clip = ask("How much is this going to cost me?", condensedCampaign("clip_repurposing"));
    expect(clip).toMatch(/Clip Repurposing.*\$373\.75.*\$299/);
    expect(clip).not.toMatch(OLD_PRICES);
    const shortForm = ask("How much is this going to cost me?", condensedCampaign("short_form_video_editing"));
    expect(shortForm).toMatch(/Short-Form Video Editing.*\$186\.25.*\$149/);
    expect(shortForm).not.toMatch(OLD_PRICES);
    const social = ask("How much is this going to cost me?", condensedCampaign("social_and_promo_graphics"));
    expect(social).toMatch(/Social & Promo Graphics.*\$199.*\$159\.20/);
    const scope = ask("So what exactly am I getting?", condensedCampaign("clip_repurposing"));
    expect(scope).toMatch(/Your project is Clip Repurposing\./);
    expect(scope).toMatch(/three finished vertical shorts/);
    expect(scope).not.toMatch(OLD_PRICES);
  });

  it("does not quote an unpaid old-shelf plan, and labels a paid historical record as not current", () => {
    const unpaid = ask("How much is this going to cost me?", legacyCampaign("initiated", "v2-rtu-flyer", 6900));
    expect(unpaid).not.toMatch(OLD_PRICES);
    expect(unpaid).toMatch(/currently offers 4 packages/);
    expect(unpaid).not.toMatch(/Creative QA & Finish at \$129/);
    expect(unpaid).toMatch(/Campaign Launch Kit at \$349/);
    expect(unpaid).toMatch(/\$159\.20 for Social & Promo Graphics/);
    expect(unpaid).toMatch(/\$279\.20 for Campaign Launch Kit/);
    const paid = ask("How much is this going to cost me?", legacyCampaign("confirmed", "v2-rtu-clip-repurposing", 54900));
    expect(paid).toMatch(/earlier Studio purchase/);
    expect(paid).toMatch(/It is not a current price\./);
  });
});

describe("new customer checkout obeys canonical launch truth", () => {
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

  it("still starts the canonical three-package checkout", async () => {
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
});

describe("customer-facing menu and historical records", () => {
  it("the four-package door shows exactly the canonical four at canonical prices", () => {
    const door = [
      clipRepurposingPackageDetail,
      shortFormVideoEditingPackageDetail,
      socialAndPromoGraphicsPackageDetail,
      campaignLaunchKitPackageDetail,
    ];
    expect(door.map((pkg) => pkg.priceCents)).toEqual(truth.packages.map((pkg) => pkg.listPriceCents));
  });

  it("old-shelf configs keep history but claim no current authority", () => {
    for (const stamp of [studioInternalSellNowRegisterV1, studioPublicShelfHonestyV1, studioMenuReadinessAndDemandFreezeV1]) {
      expect(stamp.role).toBe("HISTORICAL_INTERNAL_REFERENCE");
      expect(stamp.launchAuthority).toBe(truth.id);
      expect(stamp.definesCurrentLaunchCount).toBe(false);
      expect(stamp.definesCurrentLaunchPrices).toBe(false);
      expect(stamp.drivesCustomerFacingAvailability).toBe(false);
      expect(stamp.overridesCanonicalLaunchAuthority).toBe(false);
    }
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(LAUNCH_MENU_FROZEN_PRICES_CENTS["v2-rtu-clip-repurposing"]).toBe(54900);
    expect(LAUNCH_MENU_FROZEN_PRICES_CENTS["v2-rtu-short-form-video-edit"]).toBe(34900);
  });

  it("historical catalog definitions and legacy price math are preserved, not rewritten", () => {
    const byId = new Map(ROUTE_MAP_V2_LAUNCH_SERVICES.map((service) => [service.id, service]));
    expect(byId.get("v2-rtu-clip-repurposing")?.priceCents).toBe(54900);
    expect(byId.get("v2-rtu-short-form-video-edit")?.priceCents).toBe(34900);
    expect(byId.get("v2-rtu-flyer")?.priceCents).toBe(6900);
    expect(typeof deriveCheckoutAmountCents).toBe("function");
  });
});
