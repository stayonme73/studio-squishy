import { describe, expect, it } from "vitest";

import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { helpCenter } from "@/config/help-center";
import { studioPolicies } from "@/config/policies";
import { PROJECT_BUILDER_V1 } from "@/config/project-builder-v1";
import { REFUND_REQUEST_CHANNELS } from "@/config/refund-request-channels";
import { studioBoard } from "@/config/studio-board";
import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioLobbyEntryV1 } from "@/config/studio-lobby-entry-v1";
import { studioRoom2CustomerFacingTruthAndFrictionEntryV1 } from "@/config/studio-room-2-customer-facing-truth-and-friction-entry-v1";
import { studioRoom2ReturningCustomerBoardAndHelpCenterTruthV1 as cfg } from "@/config/studio-room-2-returning-customer-board-and-help-center-truth-v1";
import { campaignJourneyMap } from "@/config/campaign-journey-map";
import { REFUND_INTAKE_CASUAL_PROMPT } from "@/lib/campaign-tasks/refund-request-intake";

const SQUISHY = /squishy/i;
const THIS_VERSION = /this version|this build/i;

describe("STUDIO-OPERATING-ROOM-2-RETURNING-CUSTOMER-BOARD-AND-HELP-CENTER-TRUTH-1", () => {
  it("starts only after Section 1 is CLOSED and parks for Manager", () => {
    expect(cfg.packageId).toBe(
      "STUDIO-OPERATING-ROOM-2-RETURNING-CUSTOMER-BOARD-AND-HELP-CENTER-TRUTH-1",
    );
    expect(cfg.priorSection.sectionClosed).toBe(true);
    expect(cfg.priorSection.closeTip).toBe("45b09b1");
    expect(studioRoom2CustomerFacingTruthAndFrictionEntryV1.sectionClosed).toBe(true);
    expect(cfg.sectionClosed).toBe(false);
    expect(cfg.parkForManager).toBe(true);
    expect(cfg.doNotAutoAdvance).toBe(true);
    expect(cfg.doNotStartOwnerConsole).toBe(true);
    expect(cfg.doNotReopenResend).toBe(true);
    expect(cfg.doNotReopenSection1UnlessNewDefect).toBe(true);
    expect(cfg.visualRedesign).toBe(false);
    expect(studioLaunchReadinessExecutionOrderV1.room2Section2.packageId).toBe(cfg.packageId);
    expect([...cfg.scopedSpine]).toEqual([
      "returning-client",
      "studio-board",
      "help-center",
      "stale-ask-squishy-and-legacy-labels",
      "project-builder-companion-redirect",
      "communication-control-clarity",
    ]);
  });

  it("keeps Returning Client as Sign In / Board, not a first-time start", () => {
    expect(studioLobbyEntryV1.copy.returningSignedOut.cta).toBe("SIGN IN");
    expect(studioLobbyEntryV1.copy.returningSignedOut.description).toMatch(/studio board/i);
    expect(studioLobbyEntryV1.copy.returningSignedIn.cta).toBe("OPEN MY STUDIO BOARD");
    expect(JSON.stringify(studioLobbyEntryV1.copy.returningSignedOut)).not.toMatch(SQUISHY);
    expect(studioLobbyEntryV1.routes.signInFromBoard).toBe("/sign-in?from=/studio-board");
  });

  it("removes Ask Squishy and Campaign jargon from customer Board / Project Record copy", () => {
    expect(studioBoard.campaignDetails.squishy.title).toBe("Ask the Studio");
    expect(studioBoard.campaignDetails.squishy.askLabel).toBe("Ask the Studio");
    expect(studioBoard.campaignDetails.squishy.lead).not.toMatch(SQUISHY);
    expect(studioBoard.campaignDetails.squishy.title).not.toMatch(SQUISHY);
    expect(studioBoard.sidebar.newCampaign).toBe("New Project");
    expect(studioBoard.currentCampaign.heading).toBe("Current Project");
    expect(studioBoard.currentCampaign.campaignStage).toBe("Project Stage");
    expect(studioBoard.progressCard.journeyHeading).toBe("Your Project Journey");
    expect(studioBoard.progressCard.heading).toBe("Project Progress");
    expect(studioBoard.campaignBrief.editLabel).toBe("Edit project details");
    expect(studioBoard.statusContent.PAYMENT_RECEIVED.campaignProgressLabel).not.toMatch(
      /campaign queued/i,
    );
    expect(studioBoard.statusContent.DISCOVERY_COMPLETE.primaryCta).toBe("START A NEW PROJECT");
    expect(studioBoard.statusContent.PAYMENT_RECEIVED.primaryCta).toBe("OPEN PROJECT RECORD");
    expect(campaignJourneyMap.title).toBe("Your Project Journey");
    expect(studioBoard.campaignDetails.overviewLabels.name).toBe("Project Name");
  });

  it("keeps Help Center email FAQ aligned with Board as source of truth", () => {
    const emailFaq = studioPolicies.faq.items.find((item) => item.id === "email-notifications");
    expect(emailFaq).toBeDefined();
    const text = emailFaq?.blocks.map((block) => ("text" in block ? block.text : "")).join(" ");
    expect(text).not.toMatch(THIS_VERSION);
    expect(text).not.toMatch(/test or external tool/i);
    expect(text).toMatch(/studio board is the source of truth/i);
    expect(text).toMatch(/courtesy/i);
    expect(helpCenter.backLabels.studioBoard).toBe("Back to Studio Board");
    expect(JSON.stringify(helpCenter)).not.toMatch(SQUISHY);
  });

  it("does not advertise Squishy chat on refund or Project Builder customer labels", () => {
    expect(REFUND_REQUEST_CHANNELS.squishy_chat_post_payment.label).not.toMatch(SQUISHY);
    expect(REFUND_REQUEST_CHANNELS.squishy_chat_post_payment.customerSurface).not.toMatch(
      SQUISHY,
    );
    expect(REFUND_INTAKE_CASUAL_PROMPT).not.toMatch(/tagia/i);
    expect(PROJECT_BUILDER_V1.squishyLabel).toBe("Studio");
    expect(PROJECT_BUILDER_V1.squishyLabel).not.toMatch(SQUISHY);
  });

  it("keeps Speak / Type on the permanent dock and quarantines the old Project Builder door", () => {
    expect(conversationRoomGuideV1.communicationLabel).toBe("Talk with the Studio");
    expect(conversationRoomGuideV1.askAnythingPlaceholder).toMatch(/ask a question/i);
    expect(studioBoard.routes.newCampaign).toBe("/studio-conversation-room");
    expect(cfg.outOfScope).toEqual(
      expect.arrayContaining([
        "owner_console",
        "section_1_front_door_replay",
        "merge",
      ]),
    );
  });
});
