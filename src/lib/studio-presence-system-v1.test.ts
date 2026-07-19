import { describe, expect, it } from "vitest";

import {
  presenceActivityLabel,
  studioPresenceSystemV1,
} from "@/config/studio-presence-system-v1";
import {
  presenceFloor,
  presenceGlowBias,
  presentationHaloStrength,
  resolveStudioPresence,
  workspaceHaloStrength,
} from "@/lib/studio-conversation-framework";

describe("studio presence system", () => {
  it("locks the continuous multi-cue principle", () => {
    expect(studioPresenceSystemV1.principle).toContain(
      "multiple coordinated cues",
    );
    expect(studioPresenceSystemV1.hierarchy).toEqual([
      "presentation-conversation",
      "presentation-captured",
      "voice-activity-bar",
      "communication-glow",
    ]);
    expect(studioPresenceSystemV1.batonPrinciple).toContain("conversational baton");
  });

  it("labels Studio vs customer turn-taking on the Activity Bar", () => {
    expect(presenceActivityLabel("studio-speaking")).toBe("Studio speaking...");
    expect(presenceActivityLabel("customer-speaking")).toBe("Listening...");
    expect(presenceActivityLabel("customer-answering")).toBeNull();
    expect(presenceActivityLabel("idle")).toBeNull();
  });

  it("keeps listening confidence from jumping ahead", () => {
    expect(studioPresenceSystemV1.listeningConfidence.showTranscriptBeforeAdvance).toBe(
      true,
    );
    const captured = resolveStudioPresence({
      intent: "captured",
      capturedTranscript: "I need a flyer for my grand opening.",
    });
    expect(captured.capturedConfirmed).toBe(true);
    expect(captured.activityLabel).toBe("Captured");
    expect(captured.capturedTranscript).toContain("flyer");
  });

  it("lights the one tablet gold for Studio and teal for the customer", () => {
    expect(presenceFloor("studio-speaking")).toBe("studio");
    expect(presenceFloor("thinking")).toBe("studio");
    expect(presenceFloor("customer-answering")).toBe("customer");
    expect(presenceFloor("captured")).toBe("customer");
    expect(workspaceHaloStrength("studio")).toBe("primary");
    expect(workspaceHaloStrength("customer")).toBe("primary");
    expect(presentationHaloStrength("customer")).toBe("primary");
    expect(presentationHaloStrength("studio")).toBe("primary");
    expect(presenceGlowBias("thinking")).toBe("studio");

    const awaiting = resolveStudioPresence({ intent: "awaiting" });
    expect(awaiting.floor).toBe("customer");
    expect(awaiting.activity).toBe("customer-answering");
  });

  it("maps Customer driver to customer floor without a mode label", () => {
    const presence = resolveStudioPresence({
      intent: "idle",
      driver: "customer",
    });
    expect(presence.activity).toBe("customer-answering");
    expect(presence.floor).toBe("customer");
    expect(presence.activityLabel).toBeNull();
  });

  it("stays scaffold-scope until live Voice / mic certification", () => {
    expect(studioPresenceSystemV1.certificationScope).toBe("scaffold");
  });
});
