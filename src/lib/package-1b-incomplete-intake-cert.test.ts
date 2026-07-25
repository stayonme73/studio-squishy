import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioBoard } from "@/config/studio-board";
import { resolveActivityFeed } from "@/lib/campaign-record";
import { resolveCustomerJourneySteps } from "@/lib/customer-journey";
import { resolveIntakeEditHref } from "@/lib/intake-edit";
import { isIntakeComplete } from "@/lib/studio-board-campaign";
import { resolveBoardNextStepPanelMessage } from "@/lib/studio-board-client-copy";
import { resolveCampaignProgressSteps, resolveStudioBoardView } from "@/lib/studio-board-view";

/** Package 1b recert — paid incomplete Project Intake Board communication truth. */
function paidIncompleteIntakeCampaign(): CampaignRecord {
  const now = "2026-07-13T23:40:00.000Z";
  return {
    campaignId: "pkg1b-revise-cert",
    campaignName: "Make My Social Media Posts",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "We received your payment.",
    estimatedCompletion: "Approximately 7 business days",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
    studioNotes: [{ date: "Today", message: "Payment received." }],
    deliverablesDelivered: {},
    routeMapContext: {
      roadId: "i20",
      jobId: "v2-rtu-social-posts",
      selectedServiceIds: ["v2-rtu-social-posts"],
      selectedAt: now,
      currentStep: "intake",
    },
  };
}

describe("Package 1b incomplete Project Intake Board cert", () => {
  it("exposes one primary Complete Project Intake action with supporting reinforcement only", () => {
    const campaign = paidIncompleteIntakeCampaign();
    expect(campaign.campaignStatus).toBe("PAYMENT_RECEIVED");
    expect(isIntakeComplete(campaign)).toBe(false);

    const next = studioBoard.nextAction;
    expect(next.waitingOnProjectIntakeLabel).toBe("Waiting on Project Intake");
    expect(next.completeProjectDetails).toBe("Complete Project Intake");
    expect(next.completeProjectDetailsHint).toBe(
      "Tell us what we need for the services in your approved Studio Plan.",
    );
    expect(resolveIntakeEditHref(campaign, campaign.packageId)).toBe(
      "/studio-conversation-room?stage=intake",
    );

    const materialsNext = resolveBoardNextStepPanelMessage({
      campaign,
      blockingRequiredCount: 0,
      stillNeededLabels: [],
    });
    expect(materialsNext).toBe(
      "Finish Project Intake first. Material requests will appear here afterward.",
    );
    expect(materialsNext).not.toBe(next.completeProjectDetails);
    expect(studioBoard.empty.board.materials.awaitingProjectDetails).toBe(
      "Material requests will appear here after you complete Project Intake.",
    );
  });

  it("does not claim Intake was received before submit", () => {
    const campaign = paidIncompleteIntakeCampaign();
    const feed = resolveActivityFeed(campaign);
    expect(feed.some((entry) => entry.message === "We received your payment")).toBe(true);
    expect(feed.some((entry) => /We received your Project Intake/i.test(entry.message))).toBe(false);
    expect(feed.some((entry) => /We received your project details/i.test(entry.message))).toBe(false);

    const poisoned = {
      ...campaign,
      studioNotes: [{ date: "Today", message: "Vision Intake Received" }],
    };
    const poisonedFeed = resolveActivityFeed(poisoned);
    expect(
      poisonedFeed.some((entry) => /We received your Project Intake|project details/i.test(entry.message)),
    ).toBe(false);
  });

  it("keeps Journey and Production status from marking Intake complete", () => {
    const campaign = paidIncompleteIntakeCampaign();
    const journey = resolveCustomerJourneySteps(campaign);
    const intake = journey.find((step) => step.id === "intake");
    expect(intake?.label).toBe("Project Intake");
    expect(intake?.state).toBe("current");
    expect(intake?.state).not.toBe("complete");

    const progress = resolveCampaignProgressSteps(campaign);
    const intakeProgress = progress.find((step) => step.id === "DRAFT_RECEIVED");
    expect(intakeProgress?.label).toBe("Project Intake");
    expect(intakeProgress?.state).not.toBe("complete");
  });

  it("keeps Overview Campaign Stage aligned with Waiting on Project Intake", () => {
    const campaign = paidIncompleteIntakeCampaign();
    const view = resolveStudioBoardView(campaign);
    expect(view.campaignProgressLabel).toBe(studioBoard.nextAction.waitingOnProjectIntakeLabel);
    expect(view.campaignProgressLabel).not.toBe("Campaign Queued");
    expect(view.statusLabel).toBe("Payment Received");
  });
});
