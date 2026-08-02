import { describe, expect, it } from "vitest";

import { conversationRoomGuideV1, routeVoiceBridge } from "@/config/conversation-room-guide-v1";
import { recommendRouteFromProjectNeed } from "@/config/conversation-room-route-recommendation-v1";
import { studioBoard } from "@/config/studio-board";
import { studioGuide } from "@/config/studio-guide";
import { studioPolicies } from "@/config/policies";

const OVERCLAIM =
  /WE RECOMMEND|recommend the best path|best path for your business|intelligent recommendation|AI recommend|personalized recommendation|Confirm your recommended services|before we\s+recommend a route/i;

describe("GATE-3-RECOMMENDATION-TRUTH-CERT-1", () => {
  it("Conversation Room route chrome uses suggested-starting-point language", () => {
    expect(conversationRoomGuideV1.routeRecommendedBadge).toBe("Suggested starting point");
    expect(conversationRoomGuideV1.routePanelLead).toMatch(/good place to start/i);
    expect(conversationRoomGuideV1.routePanelLead).not.toMatch(OVERCLAIM);
    const bridge = routeVoiceBridge("Alex", "Get My Business Started");
    expect(bridge).toMatch(/good place to start/i);
    expect(bridge).not.toMatch(/best (service|path)|intelligent|AI recommend/i);
  });

  it("keyword route helper is a match, not an intelligent engine claim in customer CR badge", () => {
    expect(recommendRouteFromProjectNeed("business setup")).toBeTruthy();
    expect(recommendRouteFromProjectNeed("")).toBeNull();
    expect(conversationRoomGuideV1.routeRecommendedBadge).not.toMatch(/recommend/i);
  });

  it("Help Me Choose copy no longer claims best-path recommendation", () => {
    expect(studioGuide.helpCard.description).not.toMatch(OVERCLAIM);
    expect(studioGuide.helpCard.description).toMatch(/suggest a starting package/i);
    expect(studioGuide.questionnaire.resultPrefix).toBe("SUGGESTED STARTING POINT:");
    expect(studioGuide.questionnaire.resultPrefix).not.toMatch(/WE RECOMMEND/i);
  });

  it("Board discovery-complete next steps do not invent recommended services", () => {
    const steps = studioBoard.statusContent.DISCOVERY_COMPLETE.whatHappensNextSteps.join(" ");
    expect(steps).not.toMatch(/recommended services/i);
    expect(steps).toMatch(/Confirm the services on your Studio Plan/i);
  });

  it("Help Center / policies keep starting-route honesty without AI recommendation claims", () => {
    const philosophy = studioPolicies.faq.philosophy.blocks
      .filter((b) => b.kind === "p")
      .map((b) => ("text" in b ? b.text : ""))
      .join(" ");
    expect(philosophy).toMatch(/suggests a starting route/i);
    expect(philosophy).not.toMatch(/intelligent recommendation|AI recommend|best path for your business/i);
  });
});
