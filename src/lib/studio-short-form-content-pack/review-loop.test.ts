import { describe, expect, it } from "vitest";

import { studioShortFormContentPackFactoryReviewLoopV1 as loop } from "@/config/studio-short-form-content-pack-factory-review-loop-v1";
import { studioShortFormContentPackFactoryV1 as factory } from "@/config/studio-short-form-content-pack-factory-v1";
import { SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT } from "@/catalog/v2/short-form-video-edit-publish";

import { machineDecideCorrection } from "./machine-corrections";
import {
  evaluateQualityFromEvidence,
  type QualityFrameSample,
  type RenderedShortEvidence,
} from "./quality-review";

function w(word: string, start: number, end: number) {
  return { word: word.replace(/[.,!?]/g, ""), start, end, punctuatedWord: word };
}

function frame(
  role: QualityFrameSample["role"],
  atSeconds: number,
  overlay: boolean,
  extra?: Partial<QualityFrameSample>,
): QualityFrameSample {
  return {
    atSeconds,
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
    renderedAbsolutePath: "C:/tmp/fixture.mp4",
    durationSeconds: 18,
    words: [
      w("My", 0, 0.2),
      w("name", 0.2, 0.4),
      w("is", 0.4, 0.5),
      w("Daniel.", 0.5, 0.9),
    ],
    openingText: "My name is Daniel.",
    endingText: "My name is Daniel.",
    spokenText: "My name is Daniel.",
    frames: [
      frame("opening", 0.2, false),
      frame("ending", 17.6, false),
    ],
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

describe("Short-Form Content Pack factory review loop", () => {
  it("keeps Scout and Owner out of routine review and does not public-switch", () => {
    expect(loop.roles.scoutIsNotRoutineEditor).toBe(true);
    expect(loop.roles.scoutIsNotRoutineQuality).toBe(true);
    expect(loop.roles.ownerIsNotFirstLineQa).toBe(true);
    expect(loop.qualityMustInspect).toContain("rendered_mp4");
    expect(loop.qualityDoesNotAcceptAlone).toContain("transcript_timestamps");
    expect(loop.rules.brollIsOptional).toBe(true);
    expect(loop.doNotHaveScoutPickTimestamps).toBe(true);
    expect(loop.maxInternalCorrectionLoops).toBe(2);
    expect(factory.factoryReviewLoop.ownerIsNotFirstLineQa).toBe(true);
    expect(factory.publicCatalogSwitched).toBe(false);
    expect(SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT.includedDeliverables[0]?.quantity).toBe(1);
    expect(loop.doNotStartClip).toBe(true);
  });

  it("refuses a Quality pass without a rendered MP4", () => {
    const review = evaluateQualityFromEvidence(
      evidence({ renderedAbsolutePath: "", frames: [], words: [] }),
    );
    expect(review.pass).toBe(false);
    expect(review.findings.map((finding) => finding.code)).toContain(
      "inspect_not_rendered_mp4",
    );
  });

  it("detects Owner complete-thought and Clip 3 keyword-flash classes from rendered evidence", () => {
    const hanging = evaluateQualityFromEvidence(
      evidence({
        openingText: "My favorite word in English is cherries, which means",
        endingText: "My favorite word in English is cherries, which means",
        spokenText: "My favorite word in English is cherries, which means",
        frames: [
          frame("opening", 0.2, false),
          frame("thought_start", 5.6, true),
          frame("thought_last_word", 16.8, false),
          frame("keyword", 5.8, true),
          frame("ending", 18, false),
        ],
      }),
    );
    expect(hanging.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "end_not_complete_thought",
        "trailing_fragment",
        "broll_left_before_thought_finished",
      ]),
    );

    const clip3 = evaluateQualityFromEvidence(
      evidence({
        openingText: "And I am speaking the English language.",
        endingText: "I learned this language from my parents, my family, and my neighbors and at school.",
        spokenText:
          "And I am speaking the English language. I learned this language from my parents, my family, and my neighbors and at school.",
        frames: [
          frame("opening", 0.2, false),
          frame("thought_start", 1.2, false),
          frame("keyword", 2.4, true),
          frame("thought_last_word", 4.3, false),
          frame("next_thought", 4.8, false),
          frame("ending", 17, false),
        ],
      }),
    );
    expect(clip3.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "broll_keyword_only",
        "broll_left_before_thought_finished",
      ]),
    );
  });

  it("routes ordinary defects to Production, not Owner or Scout", () => {
    const review = evaluateQualityFromEvidence(
      evidence({
        endingText: "I learned this language",
        spokenText: "My name is Daniel. I learned this language",
        frames: [
          frame("opening", 0.2, false),
          frame("thought_start", 11, true),
          frame("thought_last_word", 14.4, false),
          frame("ending", 20, false),
        ],
      }),
    );
    const decision = machineDecideCorrection({
      review,
      loopIndex: 0,
      previousKinds: [],
    });
    expect(decision.route).toBe("production");
    if (decision.route !== "production") return;
    expect(decision.owner).toBe(false);
    expect(decision.scout).toBe(false);
    expect(decision.instruction.kinds).toEqual(
      expect.arrayContaining(["snap_complete_thoughts", "retime_broll_to_thought"]),
    );
  });

  it("omits B-roll on the second loop and escalates to Owner only after the allowed loop", () => {
    const review = evaluateQualityFromEvidence(
      evidence({
        openingText: "And I am speaking the English language.",
        endingText: "I learned this language from my parents, my family, and my neighbors and at school.",
        spokenText:
          "And I am speaking the English language. I learned this language from my parents, my family, and my neighbors and at school.",
        frames: [
          frame("opening", 0.2, false),
          frame("thought_start", 1.2, false),
          frame("keyword", 2.4, true),
          frame("thought_last_word", 4.3, false),
          frame("next_thought", 4.8, false),
          frame("ending", 17, false),
        ],
      }),
    );
    const second = machineDecideCorrection({
      review,
      loopIndex: 1,
      previousKinds: ["retime_broll_to_thought"],
    });
    expect(second.route).toBe("production");
    if (second.route === "production") {
      expect(second.instruction.omitBroll).toBe(true);
    }
    const exhausted = machineDecideCorrection({
      review,
      loopIndex: 2,
      previousKinds: ["retime_broll_to_thought", "omit_broll"],
    });
    expect(exhausted.route).toBe("escalate_owner");
    if (exhausted.route !== "escalate_owner") return;
    expect(exhausted.reason).toBe("factory_cannot_resolve_after_allowed_loop");
    expect(loop.escalateToOwnerOnlyFor).toContain("factory_cannot_resolve_after_allowed_loop");
    expect(loop.escalateToOwnerOnlyFor).not.toContain("ordinary_broll_timing");
  });

  it("does not treat a lone next-thought overlay as B-roll running over", () => {
    const review = evaluateQualityFromEvidence(
      evidence({
        openingText: "And I am speaking the English language.",
        endingText:
          "I learned this language from my parents, my family, and my neighbors and at school.",
        spokenText:
          "And I am speaking the English language. I learned this language from my parents, my family, and my neighbors and at school.",
        frames: [
          frame("opening", 0.2, false),
          frame("thought_start", 1.2, false),
          frame("keyword", 2.4, false),
          frame("thought_last_word", 4.3, false),
          frame("next_thought", 4.8, true),
          frame("ending", 17, false),
        ],
      }),
    );
    expect(review.pass).toBe(true);
    expect(review.findings.map((finding) => finding.code)).not.toContain(
      "broll_into_next_thought",
    );
  });

  it("does not invent a required B-roll when talking-head-only already passes", () => {
    const review = evaluateQualityFromEvidence(evidence({}));
    expect(review.pass).toBe(true);
    expect(review.brollSeenInRender).toBe(false);
    expect(machineDecideCorrection({ review, loopIndex: 0, previousKinds: [] }).route).toBe(
      "pass",
    );
  });
});
