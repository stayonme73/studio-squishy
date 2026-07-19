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
