import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  persistAddService,
  persistSelectedRoute,
  readSelectedRoute,
  readSelectedServices,
} from "@/lib/conversation-room-draft";
import { resolveIntakeEditHref } from "@/lib/intake-edit";
import {
  canOpenIntakeForCampaign,
  hydrateWorkingDraftFromPaidIntakeCampaign,
  intakeCampaignIdFromSearch,
  paymentReturnOwnsDifferentCampaign,
} from "@/lib/studio-intake-resume";
import {
  clearWorkingDraft,
  ensureWorkingDraft,
} from "@/lib/studio-working-draft";

const FRESH_ID = "2577b971-d0f9-4f3f-a03c-7d73bbcbdc2b";
const MAYA_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    key: (index: number) => [...map.keys()][index] ?? null,
  };
}

function paidFlyerCampaign(id: string): CampaignRecord {
  const now = "2026-09-12T18:28:05.420Z";
  return {
    campaignId: id,
    campaignName: "Make Me a Flyer",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "We received your payment.",
    estimatedCompletion: "Approximately 7 business days",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
    studioNotes: [],
    deliverablesDelivered: {},
    routeMapContext: {
      roadId: "i20",
      jobId: "v2-rtu-flyer",
      selectedServiceIds: ["v2-rtu-flyer"],
      selectedAt: now,
      currentStep: "intake",
    },
    approvedStudioPlan: {
      selectedServiceIds: ["v2-rtu-flyer"],
      includedServiceIds: ["v2-rtu-flyer"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 6900,
      monthlyTotalCents: 0,
      amountDueTodayCents: 6900,
      lineItems: [],
      approvedAt: now,
    },
    routeMapIntakeDraft: {
      answers: {
        "v2-rtu-flyer:flyerPurpose": "Grand opening",
      },
      savedAt: "2026-09-12T18:30:40.000Z",
    },
  };
}

describe("studio intake resume from Board", () => {
  beforeEach(() => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: storage,
        dispatchEvent: () => true,
      },
      configurable: true,
      writable: true,
    });
    vi.stubGlobal(
      "CustomEvent",
      class CustomEvent {
        type: string;
        detail: unknown;
        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type;
          this.detail = init?.detail;
        }
      },
    );
    clearWorkingDraft(storage);
  });

  it("puts the paid campaign id on the Complete Project Intake href", () => {
    const campaign = paidFlyerCampaign(FRESH_ID);
    expect(resolveIntakeEditHref(campaign)).toBe(
      `/studio-conversation-room?stage=intake&campaignId=${FRESH_ID}`,
    );
    expect(resolveIntakeEditHref(campaign)).not.toContain(MAYA_ID);
  });

  it("reads campaignId from the intake search", () => {
    expect(
      intakeCampaignIdFromSearch(
        `?stage=intake&campaignId=${FRESH_ID}&studioPaymentSandbox=1`,
      ),
    ).toBe(FRESH_ID);
  });

  it("opens Intake for a paid incomplete campaign even without a leftover draft", () => {
    const campaign = paidFlyerCampaign(FRESH_ID);
    expect(canOpenIntakeForCampaign(campaign)).toBe(true);
    expect(
      canOpenIntakeForCampaign({
        ...campaign,
        paymentReceivedAt: null,
      }),
    ).toBe(false);
    expect(
      canOpenIntakeForCampaign({
        ...campaign,
        routeMapIntakeSubmittedAt: "2026-09-09T00:00:00.000Z",
        approvedStudioPlan: {
          ...campaign.approvedStudioPlan!,
          selectedServiceIds: ["v2-rtu-social-posts"],
        },
        routeMapContext: {
          ...campaign.routeMapContext!,
          jobId: "v2-rtu-social-posts",
          selectedServiceIds: ["v2-rtu-social-posts"],
        },
      }),
    ).toBe(false);
  });

  it("hydrates route and flyer service from the paid campaign, not a new campaign", () => {
    const campaign = paidFlyerCampaign(FRESH_ID);
    const empty = ensureWorkingDraft();
    expect(readSelectedRoute(empty)).toBeNull();
    expect(readSelectedServices(empty)).toHaveLength(0);

    const next = hydrateWorkingDraftFromPaidIntakeCampaign(empty, campaign);
    expect(readSelectedRoute(next)?.roadId).toBe("i20");
    expect(readSelectedServices(next).map((service) => service.jobId)).toEqual([
      "v2-rtu-flyer",
    ]);
  });

  it("replaces leftover Maya services with the paid campaign services", () => {
    const campaign = paidFlyerCampaign(FRESH_ID);
    let draft = ensureWorkingDraft();
    draft = persistSelectedRoute(draft, "i20", "system");
    draft = persistAddService(draft, "v2-rtu-social-posts", "i20", "system");

    const next = hydrateWorkingDraftFromPaidIntakeCampaign(draft, campaign);
    expect(readSelectedServices(next).map((service) => service.jobId)).toEqual([
      "v2-rtu-flyer",
    ]);
  });

  it("holds Intake when a payment return names a different campaign", () => {
    const search =
      "?stage=intake&payment=return&campaignId=cert-social&session_id=cs_test_present";
    expect(paymentReturnOwnsDifferentCampaign(search, "cert-clip")).toBe(true);
    expect(paymentReturnOwnsDifferentCampaign(search, "cert-social")).toBe(false);
    expect(paymentReturnOwnsDifferentCampaign(search, null)).toBe(true);
    expect(
      paymentReturnOwnsDifferentCampaign(
        "?stage=intake&campaignId=cert-social",
        "cert-clip",
      ),
    ).toBe(false);
  });
});
