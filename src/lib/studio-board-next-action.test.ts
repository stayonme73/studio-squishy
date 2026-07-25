import { describe, expect, it } from "vitest";

import type { CampaignRecord, CampaignStatus } from "@/config/studio-board";
import { CAMPAIGN_STATUSES, studioBoard } from "@/config/studio-board";
import { resolveIntakeEditHref } from "@/lib/intake-edit";
import {
  BOARD_ACTIONABLE_CAMPAIGN_MESSAGE_KEY,
  DISCOVERY_COMPLETE_HINT,
  DISCOVERY_COMPLETE_LEAD,
  DISCOVERY_COMPLETE_STATUS,
  MATERIALS_SUPPORT_INCOMPLETE_INTAKE,
  isCampaignMessageStillNeededLabel,
  resolveBoardNextActionPresentation,
} from "@/lib/studio-board-next-action";
import { CONVERSATION_ROOM_INTAKE_HREF } from "@/config/legacy-route-quarantine-v1";

function baseCampaign(status: CampaignStatus, overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = "2026-07-24T12:00:00.000Z";
  return {
    campaignId: `next-action-${status}`,
    campaignName: "Make My Social Media Posts",
    campaignStatus: status,
    campaignDescription: "Test campaign",
    estimatedCompletion: "Approximately 7 business days",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    createdAt: now,
    updatedAt: now,
    studioNotes: [],
    deliverablesDelivered: {},
    ...overrides,
  };
}

describe("resolveBoardNextActionPresentation", () => {
  it("resolves non-null guidance for every active campaign status", () => {
    for (const status of CAMPAIGN_STATUSES) {
      const campaign = baseCampaign(status, {
        paymentReceivedAt:
          status === "DISCOVERY_COMPLETE" || status === "DRAFT_RECEIVED" ? undefined : "2026-07-24T12:00:00.000Z",
        projectDetailsSubmittedAt:
          status === "PAYMENT_RECEIVED" ? undefined : "2026-07-24T13:00:00.000Z",
      });
      const presentation = resolveBoardNextActionPresentation({ campaign });
      expect(presentation.lead.trim().length).toBeGreaterThan(0);
      expect(presentation.materialsSupportLine.trim().length).toBeGreaterThan(0);
    }
  });

  it("shows Discovery Complete as a truthful neutral wait with no CTA", () => {
    const presentation = resolveBoardNextActionPresentation({
      campaign: baseCampaign("DISCOVERY_COMPLETE"),
    });
    expect(presentation.statusLabel).toBe(DISCOVERY_COMPLETE_STATUS);
    expect(presentation.lead).toBe(DISCOVERY_COMPLETE_LEAD);
    expect(presentation.hint).toBe(DISCOVERY_COMPLETE_HINT);
    expect(presentation.action).toBeNull();
    expect(presentation.materialsSupportLine).toBe(DISCOVERY_COMPLETE_HINT);
  });

  it("keeps DRAFT_RECEIVED navigate destination as Conversation Room", () => {
    const presentation = resolveBoardNextActionPresentation({
      campaign: baseCampaign("DRAFT_RECEIVED"),
    });
    expect(presentation.action).toEqual({
      type: "navigate",
      label: studioBoard.nextAction.choosePackage,
      href: "/studio-conversation-room",
    });
  });

  it("keeps incomplete Intake primary and Materials guidance in agreement", () => {
    const campaign = baseCampaign("PAYMENT_RECEIVED", {
      paymentReceivedAt: "2026-07-24T12:00:00.000Z",
      routeMapContext: {
        roadId: "i20",
        jobId: "v2-rtu-social-posts",
        selectedServiceIds: ["v2-rtu-social-posts"],
        selectedAt: "2026-07-24T12:00:00.000Z",
        currentStep: "intake",
      },
    });
    const presentation = resolveBoardNextActionPresentation({ campaign });
    expect(presentation.statusLabel).toBe(studioBoard.nextAction.waitingOnProjectIntakeLabel);
    expect(presentation.lead).toBe(studioBoard.nextAction.completeProjectDetailsHint);
    expect(presentation.action).toEqual({
      type: "navigate",
      label: studioBoard.nextAction.completeProjectDetails,
      href: resolveIntakeEditHref(campaign, campaign.packageId),
    });
    expect(presentation.action && "href" in presentation.action ? presentation.action.href : null).toBe(
      CONVERSATION_ROOM_INTAKE_HREF,
    );
    expect(presentation.materialsSupportLine).toBe(MATERIALS_SUPPORT_INCOMPLETE_INTAKE);
    expect(presentation.materialsSupportLine).toMatch(/Project Intake/i);
    expect(presentation.materialsSupportLine).not.toBe(studioBoard.nextAction.completeProjectDetails);
  });

  it("produces a real Campaign Message CTA only when that control is actionable", () => {
    const campaign = baseCampaign("BUILDING_CONCEPTS", {
      paymentReceivedAt: "2026-07-24T12:00:00.000Z",
      projectDetailsSubmittedAt: "2026-07-24T13:00:00.000Z",
    });
    const withAction = resolveBoardNextActionPresentation({
      campaign,
      displayFacts: {
        blockingRequiredCount: 1,
        stillNeededLabel: "Campaign goal/message",
        movedToProduction: false,
      },
      actionableMaterialKeys: [BOARD_ACTIONABLE_CAMPAIGN_MESSAGE_KEY],
    });
    expect(withAction.action).toEqual({
      type: "open-material",
      label: "Provide Campaign Goal",
      materialKey: BOARD_ACTIONABLE_CAMPAIGN_MESSAGE_KEY,
    });
    expect(isCampaignMessageStillNeededLabel("Campaign goal/message")).toBe(true);

    const withoutAction = resolveBoardNextActionPresentation({
      campaign,
      displayFacts: {
        blockingRequiredCount: 1,
        stillNeededLabel: "Destination link / CTA",
        movedToProduction: false,
      },
      actionableMaterialKeys: [BOARD_ACTIONABLE_CAMPAIGN_MESSAGE_KEY],
    });
    expect(withoutAction.action).toBeNull();
    expect(withoutAction.statusLabel).toMatch(/destination link/i);
  });

  it("does not invent customer actions while Studio is in progress", () => {
    const awaiting = resolveBoardNextActionPresentation({
      campaign: baseCampaign("BUILDING_CONCEPTS", {
        paymentReceivedAt: "2026-07-24T12:00:00.000Z",
        projectDetailsSubmittedAt: "2026-07-24T13:00:00.000Z",
      }),
      displayFacts: {
        blockingRequiredCount: 0,
        movedToProduction: false,
        productionGatePassed: false,
      },
    });
    expect(awaiting.action).toBeNull();
    expect(awaiting.statusLabel).toBe("Project Intake Received");

    const building = resolveBoardNextActionPresentation({
      campaign: baseCampaign("BUILDING_CONCEPTS", {
        paymentReceivedAt: "2026-07-24T12:00:00.000Z",
        projectDetailsSubmittedAt: "2026-07-24T13:00:00.000Z",
      }),
      displayFacts: {
        blockingRequiredCount: 0,
        movedToProduction: true,
        productionGatePassed: true,
      },
    });
    expect(building.action).toBeNull();
    expect(building.statusLabel).toBe(studioBoard.nextAction.buildingConceptsLabel);
  });

  it("keeps review and delivery navigate actions unchanged", () => {
    const review = resolveBoardNextActionPresentation({
      campaign: baseCampaign("READY_FOR_REVIEW", {
        paymentReceivedAt: "2026-07-24T12:00:00.000Z",
        projectDetailsSubmittedAt: "2026-07-24T13:00:00.000Z",
      }),
    });
    expect(review.action).toEqual({
      type: "navigate",
      label: studioBoard.nextAction.reviewMyConcepts,
      href: studioBoard.routes.feedbackStudio,
    });

    const delivered = resolveBoardNextActionPresentation({
      campaign: baseCampaign("DELIVERED", {
        paymentReceivedAt: "2026-07-24T12:00:00.000Z",
        projectDetailsSubmittedAt: "2026-07-24T13:00:00.000Z",
      }),
    });
    expect(delivered.action).toEqual({
      type: "navigate",
      label: studioBoard.nextAction.openFinalDelivery,
      href: studioBoard.routes.deliverables,
    });
  });
});
