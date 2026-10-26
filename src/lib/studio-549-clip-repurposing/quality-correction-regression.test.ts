import path from "path";
import { describe, expect, it } from "vitest";

import { inspectQualityPng } from "@/lib/studio-short-form-content-pack/quality-review";
import { machineDecideCorrection } from "@/lib/studio-short-form-content-pack/machine-corrections";

const REPO = path.resolve(__dirname, "../../..");
const CLIP = "c-56-423";
const QUALITY = path.join(
  REPO,
  "docs/launch/studio-549-clip-repurposing-build-1/live-five-e2e/quality",
  CLIP,
);

describe("Clip 549 Quality B-roll false positive", () => {
  it("does not treat talking-head pixels as B-roll on first or remastered frames", async () => {
    const firstOpening = await inspectQualityPng(
      path.join(QUALITY, "quality-0", "q-0-opening.png"),
    );
    const firstNext = await inspectQualityPng(
      path.join(QUALITY, "quality-0", "q-2-next_thought.png"),
    );
    const remasterOpening = await inspectQualityPng(
      path.join(QUALITY, "quality-2", "q-0-opening.png"),
    );
    const remasterNext = await inspectQualityPng(
      path.join(QUALITY, "quality-2", "q-2-next_thought.png"),
    );
    expect(firstOpening.speakerPresent).toBe(true);
    expect(firstOpening.pipSkin).toBeGreaterThan(0.08);
    expect(firstOpening.overlayPresent).toBe(false);
    expect(firstNext.overlayPresent).toBe(false);
    expect(remasterOpening.speakerPresent).toBe(true);
    expect(remasterOpening.overlayPresent).toBe(false);
    expect(remasterNext.overlayPresent).toBe(false);
    expect(firstOpening.visualKind).toBe("talking_head");
    expect(remasterOpening.visualKind).toBe("talking_head");
    const hand = await inspectQualityPng(
      path.join(
        REPO,
        "docs/launch/studio-549-clip-repurposing-build-1/live-five-e2e/quality/c-82-641/quality-2/q-0-opening.png",
      ),
    );
    expect(hand.speakerPresent).toBe(true);
    expect(hand.overlayPresent).toBe(false);
    expect(hand.visualKind).toBe("talking_head");
    const paid = await inspectQualityPng(
      path.join(
        REPO,
        "docs/launch/studio-549-clip-repurposing-build-1/owner-cert-stable-open/quality-rewatch/c-50-377/q-1-thought_last_word.png",
      ),
    );
    expect(paid.overlayPresent).toBe(false);
    expect(paid.visualKind).toBe("talking_head");
  });

  it("does not issue omit_broll when Quality no longer sees B-roll", () => {
    const decision = machineDecideCorrection({
      review: {
        pass: true,
        findings: [],
        inspectedRenderedMp4: true,
        openingText: "They think a bigger menu looks more impressive.",
        endingText: "I do not.",
        brollSeenInRender: false,
        brollVisualKind: "talking_head",
        brollHelpDecision: "keep",
        heardMusicKind: "warm_or_conversational",
      },
      loopIndex: 0,
      previousKinds: [],
    });
    expect(decision.route).toBe("pass");
  });
});
