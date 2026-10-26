import { describe, expect, it } from "vitest";

import { machineDecideCorrection } from "./machine-corrections";
import {
  classifyBrollVisualFromPixels,
  classifyHeardMusic,
  decideBrollHelpfulness,
  decideMusicFit,
  spokenVisualNeed,
  visualMatchDecision,
} from "./quality-creative";
import {
  evaluateQualityFromEvidence,
  pipInsertNotSpeakerBody,
  type QualityFrameSample,
  type RenderedShortEvidence,
} from "./quality-review";

function w(word: string, start: number, end: number) {
  return { word: word.replace(/[.,!?]/g, ""), start, end, punctuatedWord: word };
}

function frame(
  role: QualityFrameSample["role"],
  overlay: boolean,
  extra?: Partial<QualityFrameSample>,
): QualityFrameSample {
  return {
    atSeconds: 1,
    role,
    overlayPresent: overlay,
    overlayWidth: overlay ? 520 : 0,
    overlayHeight: overlay ? 360 : 0,
    faceOccupied: false,
    captionBright: true,
    champagnePresent: role === "ending",
    visualKind: overlay ? "paper_or_print" : "talking_head",
    overlayLeft: overlay ? 524 : 0,
    overlayTop: overlay ? 1320 : 0,
    ...extra,
  };
}

function evidence(partial: Partial<RenderedShortEvidence>): RenderedShortEvidence {
  return {
    renderedAbsolutePath: "C:/tmp/eyes.mp4",
    durationSeconds: 16,
    words: [w("My", 0, 0.2), w("favorite", 0.2, 0.5), w("is", 0.5, 0.6), w("cherries.", 0.6, 1.2)],
    openingText: "My favorite word in English is cherries, which means a small fruit that is delicious.",
    endingText: "My favorite word in English is cherries, which means a small fruit that is delicious.",
    spokenText: "My favorite word in English is cherries, which means a small fruit that is delicious.",
    frames: [frame("opening", false), frame("ending", false)],
    meanVolumeDb: -18,
    midVolumeDb: -16,
    endingVolumeDb: -28,
    darkBandDb: -22,
    brightBandDb: -20,
    voiceBandDb: -19,
    peakMinusMeanDb: 2,
    heardMusicKind: "warm_or_conversational",
    ...partial,
  };
}

describe("Quality creative eyes", () => {
  it("matches cherries to fruit pixels and rejects dictionary paper", () => {
    expect(spokenVisualNeed("My favorite word is cherries.")).toBe("specific_object");
    expect(
      classifyBrollVisualFromPixels({
        brightRatio: 0.2,
        colorfulRatio: 0.3,
        fruitRatio: 0.22,
        plate: true,
      }),
    ).toBe("fruit_or_produce");
    expect(
      classifyBrollVisualFromPixels({
        brightRatio: 0.12,
        colorfulRatio: 0.18,
        fruitRatio: 0.052,
        plate: true,
        skinRatio: 0.17,
      }),
    ).toBe("fruit_or_produce");
    expect(
      classifyBrollVisualFromPixels({
        brightRatio: 0.62,
        colorfulRatio: 0.01,
        fruitRatio: 0.01,
        plate: true,
      }),
    ).toBe("paper_or_print");
    expect(
      classifyBrollVisualFromPixels({
        brightRatio: 0.26,
        colorfulRatio: 0,
        fruitRatio: 0.01,
        plate: false,
        skinRatio: 0.42,
      }),
    ).toBe("talking_head");
    expect(
      classifyBrollVisualFromPixels({
        brightRatio: 0.62,
        colorfulRatio: 0.01,
        fruitRatio: 0.01,
        plate: true,
        skinRatio: 0.32,
      }),
    ).toBe("talking_head");
    expect(
      pipInsertNotSpeakerBody({
        speakerPresent: true,
        overlayLikely: true,
        pipSkinRatio: 0.22,
        pipFruitRatio: 0.073,
      }),
    ).toBe(false);
    expect(
      pipInsertNotSpeakerBody({
        speakerPresent: true,
        overlayLikely: true,
        pipSkinRatio: 0.117,
        pipFruitRatio: 0.081,
      }),
    ).toBe(false);
    expect(
      pipInsertNotSpeakerBody({
        speakerPresent: true,
        overlayLikely: true,
        pipSkinRatio: 0.05,
        pipFruitRatio: 0.22,
      }),
    ).toBe(true);
    expect(
      visualMatchDecision({
        spokenText: "cherries are delicious fruit",
        visualKind: "fruit_or_produce",
      }),
    ).toBe("match");
    expect(
      visualMatchDecision({
        spokenText: "cherries are delicious fruit",
        visualKind: "paper_or_print",
      }),
    ).toBe("mismatch");
  });

  it("omits weak or mismatched B-roll instead of keeping a feature", () => {
    expect(
      decideBrollHelpfulness({
        visualDecision: "mismatch",
        presentationDefects: [],
        timingDefects: [],
      }),
    ).toBe("omit");
    expect(
      decideBrollHelpfulness({
        visualDecision: "match",
        presentationDefects: ["broll_visually_heavy"],
        timingDefects: [],
      }),
    ).toBe("switch_treatment");
    const review = evaluateQualityFromEvidence(
      evidence({
        frames: [
          frame("thought_start", true, { visualKind: "paper_or_print" }),
          frame("thought_last_word", true, { visualKind: "paper_or_print" }),
          frame("ending", false),
        ],
      }),
    );
    expect(review.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["broll_visual_mismatch", "broll_does_not_improve"]),
    );
    const decision = machineDecideCorrection({
      review,
      loopIndex: 0,
      previousKinds: [],
    });
    expect(decision.route).toBe("production");
    if (decision.route === "production") {
      expect(decision.instruction.omitBroll).toBe(true);
      expect(decision.owner).toBe(false);
    }
  });

  it("rejects bouncing or heavy presentation and asks for a treatment switch first", () => {
    const review = evaluateQualityFromEvidence(
      evidence({
        spokenText: "I am speaking the English language.",
        openingText: "I am speaking the English language.",
        endingText: "I am speaking the English language.",
        frames: [
          frame("thought_start", true, {
            visualKind: "paper_or_print",
            overlayLeft: 400,
            overlayWidth: 700,
            overlayHeight: 900,
          }),
          frame("thought_last_word", true, {
            visualKind: "paper_or_print",
            overlayLeft: 620,
            overlayTop: 900,
            overlayWidth: 700,
            overlayHeight: 900,
          }),
          frame("ending", false),
        ],
      }),
    );
    expect(review.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["broll_bouncing", "broll_visually_heavy"]),
    );
    const decision = machineDecideCorrection({
      review,
      loopIndex: 0,
      previousKinds: [],
    });
    expect(decision.route).toBe("production");
    if (decision.route === "production") {
      expect(decision.instruction.kinds).toContain("switch_broll_treatment");
    }

    const treatmentFirst = evaluateQualityFromEvidence(
      evidence({
        spokenText: "My favorite word in English is cherries, which means a small fruit that is delicious.",
        openingText: "My favorite word in English is cherries, which means a small fruit that is delicious.",
        endingText: "My favorite word in English is cherries, which means a small fruit that is delicious.",
        frames: [
          frame("thought_start", true, {
            visualKind: "fruit_or_produce",
            faceOccupied: true,
            overlayWidth: 900,
            overlayHeight: 720,
            overlayLeft: 80,
          }),
          frame("thought_last_word", false),
          frame("ending", false),
        ],
      }),
    );
    const treatmentDecision = machineDecideCorrection({
      review: treatmentFirst,
      loopIndex: 0,
      previousKinds: [],
    });
    expect(treatmentDecision.route).toBe("production");
    if (treatmentDecision.route === "production") {
      expect(treatmentDecision.instruction.kinds).toContain("switch_broll_treatment");
      expect(treatmentDecision.instruction.kinds).not.toContain("retime_broll_to_thought");
    }
  });

  it("does not invent B-roll findings from an off-idea talking-head frame", () => {
    const review = evaluateQualityFromEvidence(
      evidence({
        spokenText: "A button in the wrong place can make the whole page feel awkward.",
        openingText: "A button in the wrong place can make the whole page feel awkward.",
        endingText: "A button in the wrong place can make the whole page feel awkward.",
        frames: [
          frame("opening", false),
          frame("next_thought", true, { visualKind: "fruit_or_produce" }),
          frame("ending", false),
        ],
      }),
    );
    expect(review.brollSeenInRender).toBe(false);
    expect(review.findings.map((finding) => finding.code)).not.toEqual(
      expect.arrayContaining(["broll_weak_generic", "broll_does_not_improve"]),
    );
  });

  it("keeps a stable matching cherries PiP", () => {
    const review = evaluateQualityFromEvidence(
      evidence({
        frames: [
          frame("thought_start", true, { visualKind: "fruit_or_produce" }),
          frame("thought_last_word", true, { visualKind: "fruit_or_produce" }),
          frame("keyword", true, { visualKind: "fruit_or_produce" }),
          frame("ending", false),
        ],
      }),
    );
    expect(review.pass).toBe(true);
    expect(review.brollVisualKind).toBe("fruit_or_produce");
    expect(review.brollHelpDecision).toBe("keep");
  });

  it("rejects obvious somber music under instructional speech and omits it", () => {
    expect(classifyHeardMusic({
      meanDb: -20,
      darkBandDb: -12,
      brightBandDb: -28,
      voiceBandDb: -20,
      peakMinusMeanDb: 3,
    })).toBe("somber_or_memorial");
    expect(classifyHeardMusic({
      meanDb: -16,
      darkBandDb: -25,
      brightBandDb: -33,
      voiceBandDb: -21,
      peakMinusMeanDb: 2,
    })).toBe("warm_or_conversational");
    expect(
      decideMusicFit({
        spokenTone: "warm_instructional",
        heard: "somber_or_memorial",
      }),
    ).toBe("mismatch");
    expect(
      decideMusicFit({
        spokenTone: "warm_instructional",
        heard: "unknown",
      }),
    ).toBe("insufficient");
    const review = evaluateQualityFromEvidence(
      evidence({
        spokenText: "I learned this language from my parents at school.",
        openingText: "I learned this language from my parents at school.",
        endingText: "I learned this language from my parents at school.",
        heardMusicKind: "somber_or_memorial",
        frames: [frame("opening", false), frame("ending", false)],
      }),
    );
    expect(review.findings.map((finding) => finding.code)).toContain("music_wrong_tone");
    const decision = machineDecideCorrection({
      review,
      loopIndex: 0,
      previousKinds: [],
    });
    expect(decision.route).toBe("production");
    if (decision.route === "production") {
      expect(decision.instruction.omitMusic).toBe(true);
      expect(decision.owner).toBe(false);
    }
  });

  it("still rejects an ending with no CTA treatment", () => {
    const review = evaluateQualityFromEvidence(
      evidence({
        frames: [
          frame("opening", false),
          frame("ending", false, { champagnePresent: false, ctaTreatmentPresent: false }),
        ],
      }),
    );
    expect(review.findings.map((finding) => finding.code)).toContain("ending_missing_cta");
  });

  it("accepts the Clip teal-and-white CTA card without champagne pixels", () => {
    const review = evaluateQualityFromEvidence(
      evidence({
        frames: [
          frame("opening", false),
          frame("ending", false, { champagnePresent: false, ctaTreatmentPresent: true }),
        ],
      }),
    );
    expect(review.findings.map((finding) => finding.code)).not.toContain("ending_missing_cta");
  });
});
