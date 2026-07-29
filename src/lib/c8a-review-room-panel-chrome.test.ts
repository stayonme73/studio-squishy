import { describe, expect, it } from "vitest";

import { feedbackStudio } from "@/config/feedback-studio";
import {
  C8A_HANDOFF_PRESENTATION_LABEL,
  resolveC8aHandoffPresentationLabel,
} from "@/config/c8a-review-handoff-presentation-v1";
import { PROJECT_COMMUNICATION_CUSTOMER_V1 } from "@/config/project-communication-customer-v1";

describe("C8a Review Room panel chrome", () => {
  it("labels the tools rail REVIEW TOOLS", () => {
    expect(feedbackStudio.feedbackPanel.title).toBe("REVIEW TOOLS");
  });

  it("labels Review Room communication PROJECT COMMUNICATION", () => {
    expect(PROJECT_COMMUNICATION_CUSTOMER_V1.reviewRoomSectionTitle).toBe(
      "PROJECT COMMUNICATION",
    );
  });

  it("maps 7A stages to handoff wording without inventing receive tracking", () => {
    expect(
      resolveC8aHandoffPresentationLabel({
        stageId: "studio-working",
        stageLabel: "Studio Working",
      }),
    ).toEqual({
      handoffLabel: C8A_HANDOFF_PRESENTATION_LABEL.updateInProgress,
      usedMappedHandoff: true,
    });
    expect(
      resolveC8aHandoffPresentationLabel({
        stageId: "customer-reviewing",
        stageLabel: "Customer Reviewing",
      }),
    ).toEqual({
      handoffLabel: C8A_HANDOFF_PRESENTATION_LABEL.customerReviewing,
      usedMappedHandoff: true,
    });
    expect(
      resolveC8aHandoffPresentationLabel({
        stageId: "waiting-on-you",
        stageLabel: "Waiting on You",
      }),
    ).toEqual({
      handoffLabel: "Waiting on You",
      usedMappedHandoff: false,
    });
  });
});
