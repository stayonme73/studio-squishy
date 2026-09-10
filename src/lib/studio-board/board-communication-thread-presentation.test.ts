import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  LOCAL_BUILDER_QA_COMMUNICATION_MARKER,
  awaitingReplyPresentation,
  isLocalBuilderQaCommunicationArtifact,
  lastUnansweredCustomerMessageId,
  messagesForOwnerPresentation,
  shouldShowMachineAskState,
} from "@/lib/studio-board/board-communication-thread-presentation";

describe("board communication thread presentation", () => {
  it("recognizes local Builder-QA check-ins without hiding ordinary customer copy", () => {
    expect(
      isLocalBuilderQaCommunicationArtifact(
        "Hi, this is Maya at Maya’s Mobile Boutique. Checking in on the flyer.",
      ),
    ).toBe(true);
    expect(
      isLocalBuilderQaCommunicationArtifact(
        "Hi, this is Maya at Maya's Mobile Boutique. Checking in on the flyer 1788987653365.",
      ),
    ).toBe(true);
    expect(
      isLocalBuilderQaCommunicationArtifact(
        `${LOCAL_BUILDER_QA_COMMUNICATION_MARKER} persist-check 123`,
      ),
    ).toBe(true);
    expect(isLocalBuilderQaCommunicationArtifact("When will the flyer be ready?")).toBe(false);
    expect(
      isLocalBuilderQaCommunicationArtifact(
        "Hi, this is Maya at Maya’s Mobile Boutique. I have a new logo to send.",
      ),
    ).toBe(false);
  });

  it("omits Builder-QA artifacts only while the local fixture gate is on", () => {
    const messages = [
      { body: "When will the flyer be ready?" },
      { body: "Hi, this is Maya at Maya’s Mobile Boutique. Checking in on the flyer." },
      { body: `${LOCAL_BUILDER_QA_COMMUNICATION_MARKER} persist-check 9` },
    ];
    expect(messagesForOwnerPresentation(messages, false)).toEqual(messages);
    expect(messagesForOwnerPresentation(messages, true)).toEqual([
      { body: "When will the flyer be ready?" },
    ]);
  });

  it("drops the answered ask-state line that restates the project-record label", () => {
    expect(shouldShowMachineAskState("answered")).toBe(false);
    expect(shouldShowMachineAskState("waiting_for_studio")).toBe(true);
    expect(shouldShowMachineAskState("stalled")).toBe(true);
  });

  it("keeps one awaiting-reply line on the latest unanswered customer message", () => {
    const thread = [
      { id: "a", senderRole: "customer" as const, studioHasReplied: false },
      { id: "b", senderRole: "customer" as const, studioHasReplied: false },
      { id: "c", senderRole: "studio_staff" as const, studioHasReplied: null },
    ];
    expect(lastUnansweredCustomerMessageId(thread)).toBe("b");
    expect(
      awaitingReplyPresentation({
        senderRole: "customer",
        studioHasReplied: false,
        hasMachineAnswer: true,
        isLastCustomerWithoutStaffReply: false,
      }),
    ).toBe("none");
    expect(
      awaitingReplyPresentation({
        senderRole: "customer",
        studioHasReplied: false,
        hasMachineAnswer: true,
        isLastCustomerWithoutStaffReply: true,
      }),
    ).toBe("staff");
    expect(
      awaitingReplyPresentation({
        senderRole: "customer",
        studioHasReplied: false,
        hasMachineAnswer: false,
        isLastCustomerWithoutStaffReply: true,
      }),
    ).toBe("studio");
  });

  it("does not change persisted communication storage or the customer API list", () => {
    const actions = readFileSync(
      join(process.cwd(), "src/lib/project-communication/actions.ts"),
      "utf8",
    );
    const route = readFileSync(
      join(
        process.cwd(),
        "src/app/api/campaigns/[campaignId]/project-communication/customer/route.ts",
      ),
      "utf8",
    );
    expect(actions).not.toContain("messagesForOwnerPresentation");
    expect(route).not.toContain("messagesForOwnerPresentation");
    expect(route).not.toContain("isLocalBuilderQaCommunicationArtifact");
  });
});
