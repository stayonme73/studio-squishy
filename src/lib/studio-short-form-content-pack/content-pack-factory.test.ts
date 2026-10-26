import { describe, expect, it } from "vitest";

import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";
import { studioShortFormContentPackFactoryV1 as factory } from "@/config/studio-short-form-content-pack-factory-v1";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";
import { SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT } from "@/catalog/v2/short-form-video-edit-publish";
import { pickApprovedStudioStock } from "@/lib/studio-flagship-short-form-edit/studio-stock";

import { planFlagshipMusicFade } from "@/lib/studio-flagship-short-form-edit/music";
import {
  distinctiveBrollTokens,
  isCompleteThought,
  planBrollForSemanticThought,
  planSurroundingReviewWindow,
} from "./editorial-completeness";
import { decidePackEndingTreatment, planPackCueAtSeconds } from "./ending-audio";
import { parseAssSpeechCaptions } from "./opening-caption-remaster";
import { stabilizeOpeningCaptionPresentation } from "@/lib/studio-short-form-video-editing/caption-burn";
import { wrapCoverLines } from "./covers";
import { writePackPostCaption, writePackUseGuide } from "./extras";
import { chunkSpokenCaptionWords } from "@/lib/studio-short-form-video-editing/edl";
import { wordGapForFontSize } from "@/lib/studio-short-form-video-editing/caption-burn";
import { evaluateContentPackIntake } from "./intake";
import { decidePackMusic } from "./music-decision";
import {
  emptyPackRevisionLedger,
  evaluatePackRevision,
} from "./revision";
import { contentPackCertIntake } from "./scenario";

function w(word: string, start: number, end: number) {
  return { word: word.replace(/[.,!?]/g, ""), start, end, punctuatedWord: word };
}

describe("Short-Form Content Pack factory", () => {
  it("does not change prices, Clip, or the live public promise", () => {
    expect(factory.publicPriceCentsUnchanged).toBe(34900);
    expect(studioShortFormVideoEditingBuildV1.sku.priceCents).toBe(34900);
    expect(studioClipRepurposingBuildV1.sku.priceCents).toBe(54900);
    expect(factory.doNotStartClip).toBe(true);
    expect(factory.discovery.surroundingReviewMaxSeconds).toBe(240);
    expect(factory.discovery.notLongFormContentDiscovery).toBe(true);
    expect(factory.discovery.doNotSearchEntireRecording).toBe(true);
    expect(factory.discovery.deeperDiscoveryBelongsToClip).toBe(true);
    expect(factory.endingAudio.endCueIsOptional).toBe(true);
    expect(factory.endingAudio.doNotStampSameCueOnEveryShort).toBe(true);
    expect(factory.endingAudio.decideFromFinishedAudioEnding).toBe(true);
    expect(factory.endingAudio.brollDoesNotDecideCue).toBe(true);
    expect(factory.endingAudio.subtleCueFromSameBed).toBe(false);
    expect(factory.endingAudio.subtleCueUsesDedicatedSting).toBe(true);
    expect(factory.endingAudio.subtleCueAfterSpeechSeconds).toBe(0.4);
    expect(factory.endingAudio.subtleCueMixDb).toBe(-3);
    expect(factory.publicCatalogSwitched).toBe(false);
    expect(factory.standaloneShortQa.beginOnCleanThought).toBe(true);
    expect(factory.standaloneShortQa.endOnCompleteThought).toBe(true);
    expect(factory.standaloneShortQa.synchronizeStoryBrollToSpokenIdea).toBe(
      true,
    );
    expect(factory.doNotStartClip).toBe(true);
    expect(SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT.includedDeliverables[0]?.quantity).toBe(1);
    expect(SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT.clientFacingName).toBe(
      "Short-Form Content Pack",
    );
  });

  it("accepts up to 3 identified clips and refuses a long-recording search", () => {
    expect(evaluateContentPackIntake(contentPackCertIntake())).toBeNull();
    const search = contentPackCertIntake();
    search.customerAsksStudioToFindBestMoments = true;
    expect(evaluateContentPackIntake(search)?.code).toBe("LONG_RECORDING_SEARCH");
    const tooMany = contentPackCertIntake();
    tooMany.clips = [...tooMany.clips, { ...tooMany.clips[0]!, id: "clip-04" }];
    expect(evaluateContentPackIntake(tooMany)?.code).toBe("TOO_MANY_CLIPS");
    const long = contentPackCertIntake();
    long.clips = [
      {
        ...long.clips[0]!,
        startSeconds: 0,
        endSeconds: 120,
      },
    ];
    expect(evaluateContentPackIntake(long)?.code).toBe("SEGMENT_TOO_LONG");
  });

  it("reviews at most 4 minutes around a marked clip and does not become a long-form search", () => {
    const cherries = planSurroundingReviewWindow({
      identifiedStartSeconds: 85.6,
      identifiedEndSeconds: 101.5,
      sourceDurationSeconds: 180,
    });
    expect(cherries.startSeconds).toBeGreaterThanOrEqual(65.6);
    expect(cherries.endSeconds).toBeLessThanOrEqual(121.5);
    expect(cherries.reviewSeconds).toBeLessThanOrEqual(240);
    expect(cherries.startSeconds).toBeLessThanOrEqual(85.6);
    expect(cherries.endSeconds).toBeGreaterThanOrEqual(101.5);
    const wide = planSurroundingReviewWindow({
      identifiedStartSeconds: 10,
      identifiedEndSeconds: 40,
      sourceDurationSeconds: 1800,
    });
    expect(wide.reviewSeconds).toBeLessThanOrEqual(240);
    expect(wide.endSeconds - wide.startSeconds).toBeLessThan(300);
  });

  it("keeps one set revision and blocks the exhausted second request", () => {
    const first = evaluatePackRevision(emptyPackRevisionLedger(), {
      kind: "change_set_cta",
      note: "Change the ending on the set.",
      nextCtaText: "Visit thestudiocompany7.com",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.nextLedger.used).toBe(1);
    expect(first.nextLedger.exhausted).toBe(true);
    const second = evaluatePackRevision(first.nextLedger, {
      kind: "different_opening",
      note: "Now change the intro opening too.",
      clipId: "clip-01-intro",
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.code).toBe("REVISION_EXHAUSTED");
  });

  it("writes post captions and a use guide from supported facts only", () => {
    const intake = contentPackCertIntake();
    const caption = writePackPostCaption({
      clipId: "clip-02-cherries",
      spokenIdea: "My favorite word in English is cherries.",
      facts: intake.supportedFacts,
      ctaText: intake.ctaText,
    });
    expect("ok" in caption && caption.ok === false).toBe(false);
    if ("ok" in caption) return;
    expect(caption.text).toMatch(/cherries/i);
    expect(caption.text).toContain(intake.ctaText);
    expect(caption.text).toMatch(/\n\n/);
    expect(caption.text.indexOf("\n\n")).toBeLessThan(caption.text.indexOf(intake.ctaText));
    expect(caption.text).not.toMatch(/cherries\.? Start at/i);
    expect(caption.text).not.toMatch(/analytics|going viral|guaranteed/i);
    const invented = writePackPostCaption({
      clipId: "x",
      spokenIdea: "This is guaranteed to go viral with best time analytics.",
      facts: intake.supportedFacts,
      ctaText: intake.ctaText,
    });
    expect("ok" in invented && invented.ok === false).toBe(true);
    const guide = writePackUseGuide({
      clipLabels: intake.clips.map((clip) => ({
        clipId: clip.id,
        label: clip.label,
        spokenIdea: clip.label,
      })),
      ctaText: intake.ctaText,
    });
    expect("ok" in guide && guide.ok === false).toBe(false);
    if ("ok" in guide) return;
    expect(guide.doNotInvent).toContain("best posting times");
    const longIdea =
      "My name is Daniel. I am from The United States Of America, and I am speaking the English language. I learned this language from my parents as well as my community.";
    const fullGuide = writePackUseGuide({
      clipLabels: [{ clipId: "clip-01-intro", label: "Introduce myself", spokenIdea: longIdea }],
      ctaText: "Visit thestudiocompany7.com",
    });
    expect("ok" in fullGuide && fullGuide.ok === false).toBe(false);
    if ("ok" in fullGuide) return;
    expect(fullGuide.clips[0]?.purpose).toContain("as well as my community.");
    expect(fullGuide.ctaGuidance).toContain("Visit thestudiocompany7.com");
    const wrapped = wrapCoverLines(longIdea, 28);
    expect(wrapped.join(" ")).toBe(longIdea);
    expect(wrapped.some((line) => /[a-zA-Z]$/.test(line) && line.endsWith(" l"))).toBe(false);
    expect(wordGapForFontSize(44)).toBeGreaterThanOrEqual(28);
    const chunks = chunkSpokenCaptionWords(
      [
        { word: "Every", punctuatedWord: "Every" },
        { word: "language", punctuatedWord: "language" },
        { word: "in", punctuatedWord: "in" },
        { word: "the", punctuatedWord: "the" },
        { word: "world", punctuatedWord: "world." },
        { word: "My", punctuatedWord: "My" },
      ],
      6,
    );
    expect(chunks[0]?.map((row) => row.punctuatedWord).join(" ")).toBe(
      "Every language in the world.",
    );
    expect(chunks[1]?.map((row) => row.punctuatedWord).join(" ")).toBe("My");
  });

  it("keeps a short ending on the same line and does not end a line on a dangling word", () => {
    const spoken = (text: string) =>
      text.split(" ").map((word) => ({ word: word.replace(/[.,]/g, ""), punctuatedWord: word }));
    const lines = (text: string) =>
      chunkSpokenCaptionWords(spoken(text)).map((chunk) =>
        chunk.map((word) => word.punctuatedWord).join(" "),
      );
    const door = lines(
      "The studio is designed to make creative work easier for business owners. You should be able to choose what you need, provide the information, and let the studio handle the production.",
    );
    expect(door).not.toContain("production.");
    expect(door.some((line) => line.endsWith(" the"))).toBe(false);
    expect(door.some((line) => line.endsWith(" to make"))).toBe(false);
    expect(door.join(" ")).toContain("handle the production.");
    const cherry = lines(
      "My favorite word in English is cherries, which means a small fruit that is delicious.",
    );
    expect(cherry.some((line) => line.endsWith(" is") || line.endsWith(" in"))).toBe(false);
    expect(lines("I learned this language from my parents as well as my community.").some((line) => line.endsWith(" as"))).toBe(false);
    expect(cherry.join(" ")).toBe(
      "My favorite word in English is cherries, which means a small fruit that is delicious.",
    );
  });

  it("lands the optional sting after a pause from the last spoken word", () => {
    expect(planPackCueAtSeconds(17.08)).toBeCloseTo(17.48, 3);
  });

  it("treats end cue as optional from the finished fade, not from B-roll", () => {
    expect(decidePackEndingTreatment({ fadeMeanDb: -27 }).treatment).toBe("fade_only");
    expect(decidePackEndingTreatment({ fadeMeanDb: -48 }).treatment).toBe("fade_only");
    expect(decidePackEndingTreatment({ fadeMeanDb: -59 }).treatment).toBe(
      "fade_plus_subtle_cue",
    );
  });

  it("fades music through the CTA instead of dropping it before the last words", () => {
    const fade = planFlagshipMusicFade(20);
    expect(fade.fadeOutStartSeconds).toBe(20);
    expect(fade.musicEndsAtSeconds).toBeCloseTo(20.9);
    expect(fade.cueAtSeconds).toBeGreaterThan(fade.musicEndsAtSeconds);
    expect(fade.fadeOutStartSeconds).toBeGreaterThan(18);
  });

  it("parses ASS opening captions and holds the first line from frame zero", () => {
    const captions = parseAssSpeechCaptions(
      "Dialogue: 0,0:00:00.08,0:00:04.56,Speech,,0,0,0,,My name is Daniel. I am\n",
    );
    const stable = stabilizeOpeningCaptionPresentation(captions);
    expect(captions[0]?.start).toBeCloseTo(0.08);
    expect(stable[0]?.start).toBe(0);
    expect(stable[0]?.text).toBe("My name is Daniel. I am");
  });

  it("omits generic language stock and keeps cherries as a distinctive token", () => {
    expect(
      distinctiveBrollTokens(
        "english learn language phrase teach vocabulary dictionary speaking",
      ),
    ).toEqual([]);
    expect(distinctiveBrollTokens("cherries fruit english language")).toEqual([
      "cherries",
      "fruit",
    ]);
  });

  it("prefers cherries B-roll over generic English-dictionary stock", () => {
    expect(
      pickApprovedStudioStock(
        "Every language in the world. My favorite word in English is cherries.",
      )?.id,
    ).toBe("pexels-1307111");
    expect(
      pickApprovedStudioStock("I learned this language from my parents at school.")?.id,
    ).toBe("pexels-267669");
  });

  it("locks standalone-short and semantic-thought B-roll QA", () => {
    expect(factory.standaloneShortQa.beginOnCleanThought).toBe(true);
    expect(factory.standaloneShortQa.endOnCompleteThought).toBe(true);
    expect(factory.standaloneShortQa.brollFollowsCompleteSemanticThought).toBe(
      true,
    );
    expect(isCompleteThought("I learned this language")).toBe(false);
    expect(isCompleteThought("which means")).toBe(false);
    expect(
      isCompleteThought(
        "My favorite word in English is cherries, which means a small fruit that is delicious.",
      ),
    ).toBe(true);
    expect(isCompleteThought("I am speaking the English language.")).toBe(true);
    expect(isCompleteThought("And I am speaking the English language.")).toBe(
      true,
    );
    expect(isCompleteThought("Every language in the world.")).toBe(false);
  });

  it("times B-roll to the complete spoken thought, not a keyword flash", () => {
    const cherries = planBrollForSemanticThought({
      words: [
        w("My", 0, 0.2),
        w("favorite", 0.2, 0.5),
        w("word", 0.5, 0.7),
        w("in", 0.7, 0.8),
        w("English", 0.8, 1.1),
        w("is", 1.1, 1.2),
        w("cherries,", 1.2, 1.8),
        w("which", 1.8, 2),
        w("means", 2, 2.2),
        w("a", 2.2, 2.3),
        w("small", 2.3, 2.5),
        w("fruit", 2.5, 2.8),
        w("that", 2.8, 3),
        w("is", 3, 3.15),
        w("delicious.", 3.15, 3.8),
        w("Thanks", 4.2, 4.5),
        w("again.", 4.5, 4.8),
      ],
      tokens: ["cherries", "fruit"],
      rangeStart: 0,
      speechEnd: 6,
    });
    expect(cherries.ok).toBe(true);
    if (!cherries.ok) return;
    expect(cherries.start).toBeCloseTo(1.2, 1);
    expect(cherries.end).toBeGreaterThan(3.15);
    expect(cherries.end).toBeLessThan(4.2);
    expect(cherries.thoughtText).toMatch(/delicious/i);

    const english = planBrollForSemanticThought({
      words: [
        w("I", 0, 0.1),
        w("am", 0.1, 0.2),
        w("speaking", 0.2, 0.6),
        w("the", 0.6, 0.7),
        w("English", 0.7, 1.1),
        w("language.", 1.1, 1.7),
        w("I", 2, 2.1),
        w("learned", 2.1, 2.4),
        w("this", 2.4, 2.55),
        w("later.", 2.55, 3),
      ],
      tokens: ["english", "language"],
      rangeStart: 0,
      speechEnd: 5,
    });
    expect(english.ok).toBe(true);
    if (!english.ok) return;
    expect(english.start).toBeCloseTo(0.2, 1);
    expect(english.end).toBeGreaterThan(1.6);
    expect(english.end).toBeLessThan(2);
    expect(english.thoughtText).toMatch(/English language/i);
  });

  it("does not blindly reuse one bed when the clips are not a musical set", () => {
    const shared = decidePackMusic({
      spokenIdeas: [
        "Favorite English word is cherries",
        "How I learned English",
        "Introduce myself",
      ],
      coordinatedSet: true,
    });
    expect(shared.mode).toBe("shared_set_bed");
    const split = decidePackMusic({
      spokenIdeas: [
        "Favorite English word is cherries",
        "Our memorial service is Saturday",
      ],
      coordinatedSet: false,
    });
    expect(split.mode).toBe("omit");
    const per = decidePackMusic({
      spokenIdeas: ["Launch-day hype for the sale", "Quiet bedtime reading"],
      coordinatedSet: false,
    });
    expect(per.mode).toBe("per_clip");
  });
});
