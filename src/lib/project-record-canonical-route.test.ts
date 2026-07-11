import { describe, expect, it } from "vitest";

import { customerJourneyStepRoute } from "@/config/customer-journey-v1";
import { deliverables } from "@/config/deliverables";
import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";
import { studioPolicies } from "@/config/policies";
import { studioBoard } from "@/config/studio-board";
import { kitchenStageDefinitions } from "@/config/studio-kitchen";
import { kitchenFileBuckets } from "@/config/studio-kitchen-file-room";

const CANONICAL_PROJECT_RECORD_ROUTE = "/campaign-details";

describe("canonical Project Record route", () => {
  it("customer-journey-v1's project-record step is the canonical route", () => {
    expect(customerJourneyStepRoute("project-record")).toBe(CANONICAL_PROJECT_RECORD_ROUTE);
  });

  it("studio-board's central route config matches the canonical route", () => {
    expect(studioBoard.routes.campaignDetails).toBe(CANONICAL_PROJECT_RECORD_ROUTE);
  });

  it("legacy-route-quarantine-v1's activeProjectRecord is updated (kept as a literal — see file comment on why it can't import studio-board.ts)", () => {
    expect(legacyRouteQuarantineV1.activeProjectRecord).toBe(CANONICAL_PROJECT_RECORD_ROUTE);
  });

  it("policies' campaignHistory link derives from the central route config", () => {
    expect(studioPolicies.routes.campaignHistory).toBe(studioBoard.routes.campaignDetails);
  });

  it("deliverables' campaignDetails link derives from the central route config", () => {
    expect(deliverables.routes.campaignDetails).toBe(studioBoard.routes.campaignDetails);
  });

  it("Studio Kitchen's 'new campaign' action opens the canonical page, not the drawer", () => {
    const newCampaignStage = kitchenStageDefinitions.find((stage) => stage.id === "new-campaign");
    expect(newCampaignStage?.action?.href).toBe(studioBoard.routes.campaignDetails);
  });

  it("Studio Kitchen File Room's 'intake received' action opens the canonical page, not the drawer", () => {
    const intakeBucket = kitchenFileBuckets.find((bucket) => bucket.id === "intake-received");
    const openBriefAction = intakeBucket?.actions.find((action) => action.label === "Open Campaign Brief");
    expect(openBriefAction?.href).toBe(studioBoard.routes.campaignDetails);
  });

  it("no canonical navigation source still points at the drawer's ?record=open path", () => {
    const canonicalHrefs = [
      studioBoard.routes.campaignDetails,
      legacyRouteQuarantineV1.activeProjectRecord,
      studioPolicies.routes.campaignHistory,
      deliverables.routes.campaignDetails,
      kitchenStageDefinitions.find((stage) => stage.id === "new-campaign")?.action?.href,
      kitchenFileBuckets
        .find((bucket) => bucket.id === "intake-received")
        ?.actions.find((action) => action.label === "Open Campaign Brief")?.href,
    ];
    for (const href of canonicalHrefs) {
      expect(href).not.toContain("record=open");
    }
  });
});
