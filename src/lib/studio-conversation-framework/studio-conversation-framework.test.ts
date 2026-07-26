import { describe, expect, it } from "vitest";

import {
  CONVERSATION_FLOW_STEPS,
  CONVERSATION_JOURNEY_PHASES,
  CONVERSATION_SPINE,
  studioConversationFrameworkV1,
} from "@/config/studio-conversation-framework-v1";
import {
  createConversationRoomState,
  navigateSpineForward,
  navigateToSpinePhase,
  reduceConversationRoomState,
  resolvePresentationSurface,
  resolveVoiceController,
  restoreSessionFromLobby,
  returnToLobby,
  runConversationController,
  setFlowStep,
  type LobbySessionStorage,
} from "@/lib/studio-conversation-framework";

function memoryStorage(seed: Record<string, string> = {}): LobbySessionStorage {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe("conversation room framework", () => {
  it("protects the customer spine order", () => {
    expect([...CONVERSATION_SPINE]).toEqual([
      "conversation",
      "payment",
      "intake",
      "studio-board",
    ]);
  });

  it("does not treat help, review, or lobby as journey phases", () => {
    expect(CONVERSATION_JOURNEY_PHASES).not.toContain("help");
    expect(CONVERSATION_JOURNEY_PHASES).not.toContain("review");
    expect(CONVERSATION_JOURNEY_PHASES).not.toContain("lobby");
  });

  it("lists continuous conversation flow steps without implying dialogue", () => {
    expect(CONVERSATION_FLOW_STEPS[0]).toBe("greeting");
    expect(CONVERSATION_FLOW_STEPS.at(-1)).toBe("project-created");
  });

  it("starts in conversation / greeting with stub Hello.", () => {
    const state = createConversationRoomState();
    expect(state.journeyPhase).toBe("conversation");
    expect(state.flowStep).toBe("greeting");
    expect(runConversationController(state).text).toBe(
      studioConversationFrameworkV1.stubGreeting,
    );
  });

  it("routes stub conversation through the Presentation Manager", () => {
    const state = createConversationRoomState();
    const conversation = runConversationController(state);
    const surface = resolvePresentationSurface(state, conversation);
    expect(surface).toEqual({ kind: "message", message: "Hello." });
  });

  it("prefers Discovery Presentation when Discovery payload is active", () => {
    const state = createConversationRoomState({ flowStep: "understanding" });
    const conversation = runConversationController(state);
    const surface = resolvePresentationSurface(state, conversation, {
      stageLabel: "Discovery",
      currentTitle: "Your Situation",
      currentQuestion: "Where are you in your journey?",
      currentSummary: null,
      captured: [],
      progressLabel: "Question 1 of 9",
      discoveryComplete: false,
    });
    expect(surface.kind).toBe("discovery");
    expect(surface.discovery?.currentTitle).toBe("Your Situation");
  });

  it("advances Navigation Controller along the spine without leaving the room", () => {
    let state = createConversationRoomState();
    state = navigateSpineForward(state);
    expect(state.journeyPhase).toBe("payment");
    state = navigateSpineForward(state);
    expect(state.journeyPhase).toBe("intake");
    state = navigateToSpinePhase(state, "studio-board");
    expect(state.journeyPhase).toBe("studio-board");
  });

  it("keeps Help as an overlay that preserves journey phase and flow step", () => {
    let state = createConversationRoomState();
    state = navigateToSpinePhase(state, "payment");
    state = setFlowStep(state, "confirmation");
    state = reduceConversationRoomState(state, { type: "open-help" });

    expect(state.helpOpen).toBe(true);
    expect(state.journeyPhase).toBe("payment");
    expect(state.flowStep).toBe("confirmation");

    state = reduceConversationRoomState(state, { type: "close-help" });
    expect(state.helpOpen).toBe(false);
    expect(state.journeyPhase).toBe("payment");
    expect(state.flowStep).toBe("confirmation");
  });

  it("keeps Review as a temporary mode that preserves journey phase and flow step", () => {
    let state = createConversationRoomState();
    state = navigateToSpinePhase(state, "intake");
    state = setFlowStep(state, "summary");
    state = reduceConversationRoomState(state, {
      type: "open-review",
      targetId: "answer-budget",
      targetKind: "answer",
    });

    expect(state.review.open).toBe(true);
    expect(state.review.targetId).toBe("answer-budget");
    expect(state.review.targetKind).toBe("answer");
    expect(state.journeyPhase).toBe("intake");
    expect(state.flowStep).toBe("summary");

    state = reduceConversationRoomState(state, { type: "close-review" });
    expect(state.review.open).toBe(false);
    expect(state.review.targetId).toBeNull();
    expect(state.journeyPhase).toBe("intake");
    expect(state.flowStep).toBe("summary");
  });

  it("keeps Help and Review from corrupting each other's return state", () => {
    let state = createConversationRoomState();
    state = navigateToSpinePhase(state, "payment");
    state = setFlowStep(state, "confirmation");
    state = reduceConversationRoomState(state, {
      type: "open-review",
      targetId: "terms-v1",
      targetKind: "terms",
    });
    state = reduceConversationRoomState(state, { type: "open-help" });

    expect(state.helpOpen).toBe(true);
    expect(state.review.open).toBe(true);
    expect(state.review.targetId).toBe("terms-v1");
    expect(state.journeyPhase).toBe("payment");
    expect(state.flowStep).toBe("confirmation");

    state = reduceConversationRoomState(state, { type: "close-help" });
    expect(state.helpOpen).toBe(false);
    expect(state.review.open).toBe(true);
    expect(state.review.targetId).toBe("terms-v1");
    expect(state.journeyPhase).toBe("payment");
    expect(state.flowStep).toBe("confirmation");

    state = reduceConversationRoomState(state, { type: "close-review" });
    expect(state.review.open).toBe(false);
    expect(state.helpOpen).toBe(false);
    expect(state.journeyPhase).toBe("payment");
    expect(state.flowStep).toBe("confirmation");
  });

  it("restores Conversation → Lobby → Conversation when no temporary mode is active", () => {
    const storage = memoryStorage();
    let state = createConversationRoomState();
    state = navigateToSpinePhase(state, "intake");
    state = setFlowStep(state, "project-scope");
    expect(state.helpOpen).toBe(false);
    expect(state.review.open).toBe(false);

    const exit = returnToLobby(state, storage);
    expect(exit.lobbyRoute).toBe("/studio-lobby?lobbyEntry=reset");
    expect(exit.state.journeyPhase).toBe("intake");
    expect(exit.state.flowStep).toBe("project-scope");
    expect(exit.state.journeyPhase).not.toBe("cancelled");
    expect(exit.state.journeyPhase).not.toBe("completed");

    const restored = restoreSessionFromLobby(storage);
    expect(restored).not.toBeNull();
    expect(restored?.journeyPhase).toBe("intake");
    expect(restored?.flowStep).toBe("project-scope");
    expect(restored?.helpOpen).toBe(false);
    expect(restored?.review.open).toBe(false);
  });

  it("defaults Conversation Driver to Studio Voice and switches the baton", () => {
    let state = createConversationRoomState();
    expect(state.conversationDriver).toBe("studio-voice");
    state = reduceConversationRoomState(state, {
      type: "set-conversation-driver",
      driver: "customer",
    });
    expect(state.conversationDriver).toBe("customer");
    state = reduceConversationRoomState(state, {
      type: "set-conversation-driver",
      driver: "studio-voice",
    });
    expect(state.conversationDriver).toBe("studio-voice");
  });

  it("maps Voice Controller intent to the Presence System (light + activity)", () => {
    const state = createConversationRoomState();
    const listening = resolveVoiceController(state, "listening");
    expect(listening.lightState).toBe("listening");
    expect(listening.presence.activity).toBe("customer-speaking");
    expect(listening.presence.activityLabel).toBe("Listening...");

    const speaking = resolveVoiceController(state, "speaking");
    expect(speaking.lightState).toBe("speaking");
    expect(speaking.presence.activity).toBe("studio-speaking");
    expect(speaking.presence.activityLabel).toBe("Studio speaking...");

    const captured = resolveVoiceController(
      state,
      "captured",
      "I need a flyer for my grand opening.",
    );
    expect(captured.presence.activity).toBe("captured");
    expect(captured.presence.capturedConfirmed).toBe(true);
    expect(captured.presence.capturedTranscript).toBe(
      "I need a flyer for my grand opening.",
    );

    expect(resolveVoiceController(state, "idle").lightState).toBe("idle");
  });

  it("documents customer mobile as Presentation-first with inspect-only Workspace", () => {
    expect(studioConversationFrameworkV1.hardwareInspectQuery).toBe("inspect");
    expect(studioConversationFrameworkV1.hardwareInspectValue).toBe("1");
  });
});
