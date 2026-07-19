import { describe, expect, it } from "vitest";

import {
  mayApplyFinalTranscript,
  reduceGuideSpeechState,
} from "@/lib/studio-guide-speech-state";

describe("reduceGuideSpeechState", () => {
  it("starts listen path from idle on mic tap", () => {
    const next = reduceGuideSpeechState("idle", { type: "MIC_TAP" });
    expect(next.state).toBe("requesting_permission");
    expect(next.shouldStartListening).toBe(true);
  });

  it("stops listening on second mic tap", () => {
    const next = reduceGuideSpeechState("listening", { type: "MIC_TAP" });
    expect(next.state).toBe("idle");
    expect(next.shouldStopListening).toBe(true);
  });

  it("stops when customer types while listening", () => {
    const next = reduceGuideSpeechState("listening", { type: "CUSTOMER_TYPED" });
    expect(next.state).toBe("idle");
    expect(next.shouldStopListening).toBe(true);
  });

  it("applies final transcript when customer has not edited", () => {
    const next = reduceGuideSpeechState("listening", {
      type: "FINAL_TRANSCRIPT",
      customerEdited: false,
      text: "New brand",
    });
    expect(next.state).toBe("transcript_ready");
    expect(next.applyFinal).toBe("New brand");
  });

  it("rejects final transcript when customer edited", () => {
    const next = reduceGuideSpeechState("listening", {
      type: "FINAL_TRANSCRIPT",
      customerEdited: true,
      text: "Ignored",
    });
    expect(next.state).toBe("idle");
    expect(next.applyFinal).toBeNull();
  });

  it("force stop returns to idle", () => {
    const next = reduceGuideSpeechState("listening", { type: "FORCE_STOP" });
    expect(next.state).toBe("idle");
    expect(next.shouldStopListening).toBe(true);
  });

  it("unsupported is terminal for mic", () => {
    const next = reduceGuideSpeechState("unsupported", { type: "MIC_TAP" });
    expect(next.state).toBe("unsupported");
    expect(next.shouldStartListening).toBe(false);
  });

  it("retry from error starts listening again", () => {
    const next = reduceGuideSpeechState("error", { type: "RETRY" });
    expect(next.state).toBe("requesting_permission");
    expect(next.shouldStartListening).toBe(true);
  });
});

describe("mayApplyFinalTranscript", () => {
  it("allows when customer has not edited", () => {
    expect(mayApplyFinalTranscript(false)).toBe(true);
  });
  it("blocks when customer has edited", () => {
    expect(mayApplyFinalTranscript(true)).toBe(false);
  });
});
