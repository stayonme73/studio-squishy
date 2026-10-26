import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CONVERSATION_ROOM_STAGES,
  STAGE_DEFAULT_PANEL,
  isActivitySlidePanel,
  stageFromLocation,
  stageLocation,
} from "@/config/conversation-room-stage-v1";
import {
  bridgeConversationPlanToCampaign,
  ensureConversationIntakeCampaign,
  openingFromGuideDraft,
  persistAddService,
  persistConversationStage,
  persistOpeningAnswers,
  persistRemoveService,
  persistRouteRecommendation,
  persistSelectedRoute,
  prefillIntakeAnswersFromOpening,
  readConversationStage,
  readOpeningAnswers,
  readRouteRecommendation,
  readSelectedRoute,
  readSelectedServices,
} from "@/lib/conversation-room-draft";
import {
  createCampaignFromRouteMapJob,
} from "@/lib/route-map-campaign";
import { createEmptyGuideCaptureDraft } from "@/lib/studio-guide-capture";
import type { CampaignRecord } from "@/config/studio-board";
import {
  readCurrentCampaign,
  saveCurrentCampaign,
} from "@/lib/studio-board-campaign";
import {
  clearWorkingDraft,
  createEmptyWorkingDraft,
} from "@/lib/studio-working-draft";

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

describe("conversation room stage + draft consolidation", () => {
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

  it("orders stages opening → route → services → plan → checkout → intake → complete", () => {
    expect([...CONVERSATION_ROOM_STAGES]).toEqual([
      "opening",
      "route",
      "services",
      "plan",
      "checkout",
      "intake",
      "complete",
    ]);
  });

  it("keeps Help out of the slide shell but still a panel id", () => {
    expect(isActivitySlidePanel("route")).toBe(true);
    expect(isActivitySlidePanel("builder")).toBe(true);
    expect(isActivitySlidePanel("help")).toBe(false);
    expect(STAGE_DEFAULT_PANEL.route).toBe("none");
    expect(STAGE_DEFAULT_PANEL.services).toBe("builder");
  });

  it("writes opening, route, and services into one working draft", () => {
    let draft = createEmptyWorkingDraft();
    const guide = {
      ...createEmptyGuideCaptureDraft(),
      preferredName: "Tagia",
      projectNeed: "Need a flyer",
      businessName: "Home Chef",
      requestedDeadline: "Friday",
      deadlineStatus: "unconfirmed" as const,
      existingMaterialsNote: "Logo file",
      confirmedAt: "2026-07-19T00:00:00.000Z",
    };

    draft = persistOpeningAnswers(draft, openingFromGuideDraft(guide));
    draft = persistConversationStage(draft, "route");
    draft = persistRouteRecommendation(draft, "i75", guide.projectNeed);
    draft = persistSelectedRoute(draft, "i75");
    draft = persistConversationStage(draft, "services");
    draft = persistAddService(draft, "ma-flyer-v2" as never, "i75");
    draft = persistAddService(draft, "ma-business-card-v2" as never, "i75");
    draft = persistRemoveService(draft, "ma-flyer-v2" as never);

    expect(readOpeningAnswers(draft).preferredName).toBe("Tagia");
    expect(readOpeningAnswers(draft).projectNeed).toBe("Need a flyer");
    expect(readOpeningAnswers(draft).businessName).toBe("Home Chef");
    expect(readConversationStage(draft)).toBe("services");
    expect(readRouteRecommendation(draft)?.roadId).toBe("i75");
    expect(readSelectedRoute(draft)?.roadId).toBe("i75");
    expect(readSelectedServices(draft).map((s) => s.jobId)).toEqual([
      "ma-business-card-v2",
    ]);
    expect(stageFromLocation(stageLocation("services"))).toBe("services");
  });

  it("bridges plan selections into an unpaid campaign for checkout", () => {
    const ok = bridgeConversationPlanToCampaign("i75", [
      "v2-rtu-flyer",
      "v2-rtu-social-posts",
    ]);
    expect(ok).toBe(true);
    const campaign = readCurrentCampaign();
    expect(campaign?.paymentReceivedAt).toBeFalsy();
    expect(campaign?.routeMapContext?.selectedServiceIds).toEqual([
      "v2-rtu-flyer",
      "v2-rtu-social-posts",
    ]);
    expect(campaign?.routeMapContext?.currentStep).toBe("checkout");
    expect(campaign?.approvedStudioPlan?.selectedServiceIds).toEqual([
      "v2-rtu-flyer",
      "v2-rtu-social-posts",
    ]);
  });

  it("rebuilds a missing campaign pointer from the working draft so Intake can continue", () => {
    let draft = createEmptyWorkingDraft();
    draft = persistSelectedRoute(draft, "i20");
    draft = persistAddService(draft, "v2-rtu-flyer", "i20");
    window.localStorage.removeItem("studio-squishy:current-campaign");
    expect(readCurrentCampaign()).toBeNull();
    const restored = ensureConversationIntakeCampaign();
    expect(restored?.routeMapContext?.jobId).toBe("v2-rtu-flyer");
    expect(restored?.routeMapContext?.roadId).toBe("i20");
    expect(restored?.approvedStudioPlan?.selectedServiceIds).toEqual([
      "v2-rtu-flyer",
    ]);
  });

  it("keeps a paid condensed campaign when an older draft names another package", () => {
    let draft = createEmptyWorkingDraft();
    draft = persistSelectedRoute(draft, "i20");
    draft = persistAddService(draft, "v2-rtu-flyer", "i20");
    saveCurrentCampaign({
      campaignId: "cert-social",
      campaignName: "Cedar Lane",
      campaignStatus: "PAYMENT_RECEIVED",
      campaignDescription: "Paid",
      estimatedCompletion: "After intake",
      packageId: "custom-studio-plan",
      packageLabel: "Social & Promo Graphics",
      paymentReceivedAt: "2026-10-06T02:14:50.318Z",
      createdAt: "2026-10-06T02:14:00.000Z",
      updatedAt: "2026-10-06T02:14:50.318Z",
      revisionRoundsIncluded: 3,
      revisionRoundsUsed: 0,
      deliverablesDelivered: {},
      routeMapContext: {
        roadId: "random-exit",
        jobId: "social_and_promo_graphics",
        selectedServiceIds: [],
        selectedAt: "2026-10-06T02:14:00.000Z",
        currentStep: "checkout",
      },
      condensedOffer: {
        packageId: "social_and_promo_graphics",
        name: "Social & Promo Graphics",
        priceCents: 19900,
        revisionRounds: 3,
        customerName: "Ada Stone",
        customerEmail: "ada.social@example.com",
        company: "Cedar Lane",
        projectNeed: "Promote the spring open house",
        materialsNote: "Logo described",
        support: {},
      },
      approvedStudioPlan: {
        selectedServiceIds: [],
        includedServiceIds: [],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 19900,
        monthlyTotalCents: 0,
        amountDueTodayCents: 19900,
        lineItems: [],
        approvedAt: "2026-10-06T02:14:00.000Z",
      },
    } as CampaignRecord);

    const kept = ensureConversationIntakeCampaign();
    expect(kept?.campaignId).toBe("cert-social");
    expect(kept?.condensedOffer?.name).toBe("Social & Promo Graphics");
    expect(kept?.routeMapContext?.jobId).toBe("social_and_promo_graphics");
  });

  it("prefills empty intake businessName from opening answers only", () => {
    expect(
      prefillIntakeAnswersFromOpening(null, { businessName: "Home Chef" }),
    ).toEqual({ businessName: "Home Chef" });
    expect(
      prefillIntakeAnswersFromOpening(
        { businessName: "Already set", offer: "Sale" },
        { businessName: "Home Chef" },
      ),
    ).toEqual({ businessName: "Already set", offer: "Sale" });
  });

  it("replaces a stale paid campaign so Conversation Room can open checkout again", () => {
    const paid = createCampaignFromRouteMapJob("v2-rtu-menu", "i20", {
      currentStep: "intake",
    });
    expect(paid).toBeTruthy();
    saveCurrentCampaign({
      ...paid!,
      paymentReceivedAt: "2026-07-18T12:00:00.000Z",
      routeMapIntakeSubmittedAt: "2026-07-18T12:05:00.000Z",
    });

    const ok = bridgeConversationPlanToCampaign("i75", ["v2-rtu-flyer"]);
    expect(ok).toBe(true);
    const campaign = readCurrentCampaign();
    expect(campaign?.paymentReceivedAt).toBeFalsy();
    expect(campaign?.routeMapIntakeSubmittedAt).toBeFalsy();
    expect(campaign?.campaignId).not.toBe(paid!.campaignId);
    expect(campaign?.routeMapContext?.roadId).toBe("i75");
    expect(campaign?.approvedStudioPlan?.selectedServiceIds).toEqual([
      "v2-rtu-flyer",
    ]);
  });
});
