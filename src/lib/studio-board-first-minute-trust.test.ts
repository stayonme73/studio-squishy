import { describe, expect, it } from "vitest";

import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { SAFE_RETURN_PATHS } from "@/lib/auth/safe-return-path";
import {
  BOARD_NEUTRAL_GREETING,
  resolveBoardCustomerDisplayName,
  resolveBoardHeaderGreeting,
  resolveStudioNoteGreetingLine,
} from "@/lib/studio-board-customer-greeting";
import {
  MATERIALS_STILL_NEED_AWAITING_REQUESTS,
  MATERIALS_STILL_NEED_INCOMPLETE_INTAKE,
  MATERIALS_STILL_NEED_NONE_CURRENTLY_NEEDED,
  resolveMaterialsStillNeedEmptyState,
} from "@/lib/studio-board-client-copy";

const GENERIC_SIGN_IN_LEAD =
  "Use the account connected to your Studio work to open your Board, Review Room, Project Record, and Final Delivery.";

/** Mirrors SignInScene — explicit allowlisted Board `from` only, not navigational fallback. */
function resolveSignInLeadFromFromParam(from: string | null): string {
  if (!from) return GENERIC_SIGN_IN_LEAD;
  const [pathname] = from.split("?");
  const isExplicitBoard =
    pathname === "/studio-board" &&
    pathname.startsWith("/") &&
    !pathname.startsWith("//") &&
    SAFE_RETURN_PATHS.has(pathname);
  return isExplicitBoard
    ? conversationRoomGuideV1.boardHandoffSignInLead
    : GENERIC_SIGN_IN_LEAD;
}

describe("studio-board-customer-greeting", () => {
  it("trims display names and rejects blanks", () => {
    expect(resolveBoardCustomerDisplayName("  Recert Walker  ")).toBe("Recert Walker");
    expect(resolveBoardCustomerDisplayName("   ")).toBeNull();
    expect(resolveBoardCustomerDisplayName(null)).toBeNull();
    expect(resolveBoardCustomerDisplayName(undefined)).toBeNull();
  });

  it("named greeting after session + period resolve", () => {
    expect(
      resolveBoardHeaderGreeting({
        displayName: "Cert Walker",
        greetingPeriod: "evening",
        sessionResolved: true,
      }),
    ).toEqual({
      kind: "named",
      period: "evening",
      name: "Cert Walker",
      busy: false,
    });
  });

  it("blank-name fallback is always the neutral Board greeting", () => {
    expect(
      resolveBoardHeaderGreeting({
        displayName: null,
        greetingPeriod: "morning",
        sessionResolved: true,
      }),
    ).toEqual({
      kind: "neutral",
      text: BOARD_NEUTRAL_GREETING,
      busy: false,
    });
    expect(
      resolveBoardHeaderGreeting({
        displayName: "   ",
        greetingPeriod: "afternoon",
        sessionResolved: true,
      }),
    ).toEqual({
      kind: "neutral",
      text: BOARD_NEUTRAL_GREETING,
      busy: false,
    });
  });

  it("never leaves an empty loading shell before session settles", () => {
    expect(
      resolveBoardHeaderGreeting({
        displayName: null,
        greetingPeriod: null,
        sessionResolved: false,
      }),
    ).toEqual({
      kind: "neutral",
      text: BOARD_NEUTRAL_GREETING,
      busy: true,
    });

    expect(
      resolveBoardHeaderGreeting({
        displayName: "Cert Walker",
        greetingPeriod: null,
        sessionResolved: true,
      }),
    ).toEqual({
      kind: "neutral",
      text: BOARD_NEUTRAL_GREETING,
      busy: true,
    });
  });

  it("builds Studio Note greeting without config userName", () => {
    expect(resolveStudioNoteGreetingLine("Ada")).toBe("Hi Ada,");
    expect(resolveStudioNoteGreetingLine("")).toBe("Hello,");
    expect(resolveStudioNoteGreetingLine(null)).toBe("Hello,");
  });
});

describe("resolveMaterialsStillNeedEmptyState", () => {
  it("instructs Intake only when Intake is incomplete", () => {
    expect(
      resolveMaterialsStillNeedEmptyState({
        intakeComplete: false,
        materialsLoaded: true,
        actionCardCount: 0,
        blockingRequiredCount: 0,
        affirmativelyNoMaterialsNeeded: false,
      }),
    ).toEqual({
      kind: "incomplete_intake",
      message: MATERIALS_STILL_NEED_INCOMPLETE_INTAKE,
    });
  });

  it("uses neutral waiting copy when Intake is complete but no requests are posted", () => {
    expect(
      resolveMaterialsStillNeedEmptyState({
        intakeComplete: true,
        materialsLoaded: true,
        actionCardCount: 0,
        blockingRequiredCount: 0,
        affirmativelyNoMaterialsNeeded: false,
      }),
    ).toEqual({
      kind: "awaiting_requests",
      message: MATERIALS_STILL_NEED_AWAITING_REQUESTS,
    });
  });

  it("says no materials currently needed only when affirmatively known", () => {
    expect(
      resolveMaterialsStillNeedEmptyState({
        intakeComplete: true,
        materialsLoaded: true,
        actionCardCount: 0,
        blockingRequiredCount: 0,
        affirmativelyNoMaterialsNeeded: true,
      }),
    ).toEqual({
      kind: "none_currently_needed",
      message: MATERIALS_STILL_NEED_NONE_CURRENTLY_NEEDED,
    });
  });

  it("returns null when specific material cards should render", () => {
    expect(
      resolveMaterialsStillNeedEmptyState({
        intakeComplete: true,
        materialsLoaded: true,
        actionCardCount: 2,
        blockingRequiredCount: 1,
        affirmativelyNoMaterialsNeeded: false,
      }),
    ).toBeNull();
  });
});

describe("Sign In lead from safe from=", () => {
  it("uses project-created lead for Board return path", () => {
    expect(resolveSignInLeadFromFromParam("/studio-board")).toBe(
      conversationRoomGuideV1.boardHandoffSignInLead,
    );
    expect(resolveSignInLeadFromFromParam("/studio-board?x=1")).toBe(
      conversationRoomGuideV1.boardHandoffSignInLead,
    );
    expect(conversationRoomGuideV1.boardHandoffSignInLead).toMatch(/project has been created/i);
    expect(conversationRoomGuideV1.boardHandoffSignInLead).toMatch(/Help Center/i);
  });

  it("uses generic lead for other origins", () => {
    expect(resolveSignInLeadFromFromParam("/studio-lobby")).toBe(GENERIC_SIGN_IN_LEAD);
    expect(resolveSignInLeadFromFromParam(null)).toBe(GENERIC_SIGN_IN_LEAD);
    expect(resolveSignInLeadFromFromParam("https://evil.example/studio-board")).toBe(
      GENERIC_SIGN_IN_LEAD,
    );
  });
});

describe("first-minute Voice / handoff truth", () => {
  it("avoids all-set and messaging promises", () => {
    const lines = [
      conversationRoomGuideV1.intakeSubmitSuccessVoiceSignedOut,
      conversationRoomGuideV1.intakeSubmitSuccessVoiceSignedIn,
      conversationRoomGuideV1.boardHandoffAccountChoiceLead,
      conversationRoomGuideV1.boardHandoffSignInLead,
      conversationRoomGuideV1.boardArrivalWelcomeVoice,
    ];
    for (const line of lines) {
      expect(line).not.toMatch(/you.?re all set/i);
      expect(line).not.toMatch(/everything required has been collected/i);
      expect(line).not.toMatch(/communicate with the Studio/i);
      expect(line).toMatch(/set up|project has been created/i);
    }
  });
});

describe("production behavior without certification overrides", () => {
  it("greeting never invents Tagia or an empty shell", () => {
    expect(BOARD_NEUTRAL_GREETING).toBe("Welcome to your Studio Board.");
    expect(BOARD_NEUTRAL_GREETING).not.toMatch(/Tagia/);
    const unsettled = resolveBoardHeaderGreeting({
      displayName: undefined,
      greetingPeriod: null,
      sessionResolved: false,
    });
    expect(unsettled.kind).toBe("neutral");
    expect(unsettled.text).toBe(BOARD_NEUTRAL_GREETING);
  });

  it("empty materials requests without production start stay awaiting, not none-needed", () => {
    const emptyButNotAffirmed = resolveMaterialsStillNeedEmptyState({
      intakeComplete: true,
      materialsLoaded: true,
      actionCardCount: 0,
      blockingRequiredCount: 0,
      affirmativelyNoMaterialsNeeded: false,
    });
    expect(emptyButNotAffirmed?.kind).toBe("awaiting_requests");
    expect(emptyButNotAffirmed?.message).not.toMatch(/currently needed/i);
  });
});
