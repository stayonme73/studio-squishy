import { describe, expect, it } from "vitest";

import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { studioBoard } from "@/config/studio-board";
import {
  isExplicitStudioBoardFrom,
  safeReturnPath,
} from "@/lib/auth/safe-return-path";

const GENERIC_SIGN_IN_LEAD =
  "Use the account connected to your Studio work to open your Board, Review Room, Project Record, and Final Delivery.";

/** Mirrors SignInScene lead selection from server-passed props. */
function resolveSignInLead(showProjectCreatedLead: boolean): string {
  return showProjectCreatedLead
    ? conversationRoomGuideV1.boardHandoffSignInLead
    : GENERIC_SIGN_IN_LEAD;
}

/**
 * Board first-paint truth — scene uses `ready` before claiming no project.
 * Pure predicates kept here so they stay locked without mounting React.
 */
export function resolveBoardProjectPaintState(input: {
  ready: boolean;
  accessState: "ready" | "no-active-project" | "auth-required" | "denied" | "error";
  hasCampaign: boolean;
}): "loading" | "active" | "empty" | "blocked" {
  if (!input.ready) return "loading";
  if (
    input.accessState === "auth-required" ||
    input.accessState === "denied" ||
    input.accessState === "error"
  ) {
    return "blocked";
  }
  if (input.accessState === "no-active-project" || !input.hasCampaign) return "empty";
  return "active";
}

describe("Journey hydration — Board project paint", () => {
  it("does not claim no-project while campaign lookup is unresolved", () => {
    expect(
      resolveBoardProjectPaintState({
        ready: false,
        accessState: "ready",
        hasCampaign: false,
      }),
    ).toBe("loading");
    expect(studioBoard.empty.loading.campaignNamePlaceholder).not.toMatch(/No Active Project/i);
    expect(studioBoard.empty.loading.campaignDescription).not.toMatch(/Route Map/i);
  });

  it("renders truthful empty only after resolution with no campaign", () => {
    expect(
      resolveBoardProjectPaintState({
        ready: true,
        accessState: "no-active-project",
        hasCampaign: false,
      }),
    ).toBe("empty");
    expect(studioBoard.empty.campaignDescription).toMatch(/Conversation Room/i);
    expect(studioBoard.empty.campaignDescription).not.toMatch(/Route Map/i);
    expect(studioBoard.empty.board.materials.nextStep).toMatch(/Conversation Room/i);
    expect(studioBoard.clientAccess.noActiveProject.message).toMatch(/Conversation Room/i);
    expect(studioBoard.routes.newCampaign).toBe("/studio-conversation-room");
  });

  it("keeps active campaign paint after resolution", () => {
    expect(
      resolveBoardProjectPaintState({
        ready: true,
        accessState: "ready",
        hasCampaign: true,
      }),
    ).toBe("active");
  });
});

describe("Journey hydration — Sign In from prop", () => {
  it("project-created lead only for explicit safe /studio-board", () => {
    expect(isExplicitStudioBoardFrom("/studio-board")).toBe(true);
    expect(isExplicitStudioBoardFrom("/studio-board?x=1")).toBe(true);
    expect(isExplicitStudioBoardFrom(null)).toBe(false);
    expect(isExplicitStudioBoardFrom("/studio-lobby")).toBe(false);
    expect(resolveSignInLead(isExplicitStudioBoardFrom("/studio-board"))).toBe(
      conversationRoomGuideV1.boardHandoffSignInLead,
    );
    expect(resolveSignInLead(isExplicitStudioBoardFrom(null))).toBe(GENERIC_SIGN_IN_LEAD);
  });

  it("allowlists return continuity for Sign In / Sign Up", () => {
    expect(safeReturnPath("/studio-board")).toBe("/studio-board");
    expect(safeReturnPath("/help-center")).toBe("/help-center");
    expect(safeReturnPath("https://evil.example/studio-board")).toBe("/studio-board");
  });
});

describe("Journey hydration — Account Handoff redirect target", () => {
  it("signed-in redirect uses allowlisted Board destination", () => {
    expect(safeReturnPath("/studio-board")).toBe("/studio-board");
    expect(safeReturnPath(null)).toBe("/studio-board");
    expect(safeReturnPath("/studio-conversation-room")).toBe("/studio-board");
  });
});
