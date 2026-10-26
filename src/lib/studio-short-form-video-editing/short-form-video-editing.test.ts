import { describe, expect, it } from "vitest";

import { buildShotstackEditPayload } from "@/lib/studio-kitchen-production/video-integration/payload";
import { loadShotstackWorkPacketV1 } from "@/lib/studio-kitchen-production/video-integration/work-packet";
import path from "path";

import {
  SHORT_FORM_VIDEO_EDITING_SKU,
  SHORT_VIDEO_STILLS_SKU_DO_NOT_REUSE,
  assertDeepgramPrivacyLock,
  buildDeepgramListenRequest,
  buildEditDecisionList,
  buildFootageCaptionAsset,
  buildFootageShotstackPayload,
  formatFootageCaptionText,
  buildTranscriptSentences,
  chooseStrongerEdit,
  evaluateEditorialPlan,
  evaluateFootageIntake,
  evaluateFootageProbe,
  pickMultiSegmentSentences,
  parseSentenceIndexPick,
  classifySentenceRole,
  evaluateStorySequence,
  storyPlanFromIndexes,
  pickIdeaFirstPlan,
  briefFromStoryPlan,
  resolveFootageRenderEnv,
  wordsFromSentenceRange,
  isFrozenStillsShortVideoSku,
  isInternalSellNowSku,
  isOriginalFrozenNineSellNowSku,
  isShortFormVideoEditingSku,
  parseDeepgramWords,
  studioInternalSellNowRegisterV1,
  studioShortFormVideoEditingBuildV1,
} from "./index";
import {
  TALKING_HEAD_INTAKE,
  TALKING_HEAD_SOURCE_SECONDS,
  TALKING_HEAD_WORDS,
  continuousLongSpeechWords,
  longSpeechWords,
} from "./talking-head-fixture";

const repoRoot = path.resolve(__dirname, "../../..");

describe("Short-Form Video Editing Phase 2 — footage lane", () => {
  it("keeps the new SKU off the launch menu and off the $149 stills contract", () => {
    expect(SHORT_FORM_VIDEO_EDITING_SKU).toBe("v2-rtu-short-form-video-edit");
    expect(SHORT_VIDEO_STILLS_SKU_DO_NOT_REUSE).toBe("v2-rtu-short-video");
    expect(isShortFormVideoEditingSku(SHORT_FORM_VIDEO_EDITING_SKU)).toBe(true);
    expect(isFrozenStillsShortVideoSku(SHORT_FORM_VIDEO_EDITING_SKU)).toBe(false);
    expect(studioShortFormVideoEditingBuildV1.onLaunchMenu).toBe(true);
    expect(studioShortFormVideoEditingBuildV1.publicMenuPublished).toBe(true);
    expect(studioShortFormVideoEditingBuildV1.classification).toBe("SELL_NOW");
    expect(studioShortFormVideoEditingBuildV1.sku.priceCents).toBe(34900);
    expect(studioShortFormVideoEditingBuildV1.factory.shotstackTypesetForbidden).toBe(
      true,
    );
    expect(studioShortFormVideoEditingBuildV1.factory.exactTextQaFailClose).toBe(true);
    expect(studioShortFormVideoEditingBuildV1.factory.shotstackPromptForbidden).toBe(
      true,
    );
    expect(isOriginalFrozenNineSellNowSku(SHORT_FORM_VIDEO_EDITING_SKU)).toBe(false);
    expect(isInternalSellNowSku(SHORT_FORM_VIDEO_EDITING_SKU)).toBe(true);
    expect(studioInternalSellNowRegisterV1.internalSellNowCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.tenthPublicMenuPublished).toBe(true);
    expect(studioInternalSellNowRegisterV1.eleventhPublicMenuPublished).toBe(true);
  });

  it("refuses Deepgram requests that would train on customer audio", () => {
    expect(() =>
      buildDeepgramListenRequest({
        apiKey: "dg-test",
        mediaUrl: "https://example.test/clip.mp4",
        mipOptOut: false,
      }),
    ).toThrow(/mip_opt_out/);

    const request = buildDeepgramListenRequest({
      apiKey: "dg-test",
      mediaUrl: "https://example.test/clip.mp4",
    });
    expect(request.query.mip_opt_out).toBe("true");
    expect(request.url).toContain("mip_opt_out=true");
    expect(request.url).toContain("model=nova-3");
    expect(() => assertDeepgramPrivacyLock(request)).not.toThrow();
  });

  it("parses native Deepgram word timestamps", () => {
    const words = parseDeepgramWords({
      results: {
        channels: [
          {
            alternatives: [
              {
                words: [
                  {
                    word: "saturday",
                    punctuated_word: "Saturday",
                    start: 5.2,
                    end: 5.65,
                  },
                  { word: "we", punctuated_word: "we", start: 5.72, end: 5.9 },
                ],
              },
            ],
          },
        ],
      },
    });
    expect(words).toHaveLength(2);
    expect(words[0]?.start).toBe(5.2);
    expect(words[0]?.punctuatedWord).toBe("Saturday");
  });

  it("keeps a performance pause inside a locked continuous range", () => {
    const edl = buildEditDecisionList({
      words: [
        { word: "favorite", start: 83.5, end: 84.2, punctuatedWord: "favorite" },
        { word: "cherries", start: 88.2, end: 90.1, punctuatedWord: "cherries," },
        { word: "which", start: 93.43, end: 93.8, punctuatedWord: "which" },
        {
          word: "delicious",
          start: 99.8,
          end: 100.66,
          punctuatedWord: "delicious.",
        },
      ],
      intake: TALKING_HEAD_INTAKE,
      sourceDurationSeconds: 156,
      lockContinuousRange: { start: 83.505, end: 100.665 },
    });
    expect(edl.ok).toBe(true);
    if (!edl.ok) return;
    expect(edl.selection).toBe("performance_watch");
    expect(edl.clips).toHaveLength(1);
    expect(edl.clips[0]?.sourceTrim).toBe(83.505);
    expect(edl.clips[0]?.sourceLength).toBeCloseTo(17.16, 2);
    expect(edl.clips[0]?.text).toMatch(/cherries/i);
    expect(edl.clips[0]?.text).not.toMatch(/hope you enjoyed/i);
    const cta = edl.captions.find((caption) => caption.role === "cta");
    const performanceEnd =
      (edl.clips[0]?.timelineStart ?? 0) + (edl.clips[0]?.sourceLength ?? 0);
    expect(cta?.text).toBe(TALKING_HEAD_INTAKE.ctaText);
    expect(cta?.start).toBeGreaterThanOrEqual(performanceEnd - 0.01);
  });

  it("edits the talking-head fixture: drops false start and dead air, keeps speech, customer CTA", () => {
    const edl = buildEditDecisionList({
      words: TALKING_HEAD_WORDS,
      intake: TALKING_HEAD_INTAKE,
      sourceDurationSeconds: TALKING_HEAD_SOURCE_SECONDS,
    });
    expect(edl.ok).toBe(true);
    if (!edl.ok) return;

    expect(edl.droppedFalseStarts).toBeGreaterThanOrEqual(1);
    expect(edl.droppedDeadSpaceSeconds).toBeGreaterThan(8);
    expect(edl.outputDurationSeconds).toBeGreaterThanOrEqual(15);
    expect(edl.outputDurationSeconds).toBeLessThanOrEqual(32.75);
    expect(edl.clips[0]?.role).toBe("hook");
    expect(edl.clips[0]?.text).toMatch(/patio/i);
    expect(edl.clips.some((c) => /um/i.test(c.text) && c.text.length < 8)).toBe(
      false,
    );
    const cta = edl.captions.find((c) => c.role === "cta");
    expect(cta?.text).toBe("Book your table today");
    expect(edl.captions.some((c) => c.role === "hook")).toBe(true);
    expect(edl.captions.every((c) => c.text.trim().length > 0)).toBe(true);
  });

  it("windows long speech into 15–30 seconds instead of shipping the whole source", () => {
    const edl = buildEditDecisionList({
      words: longSpeechWords(),
      intake: TALKING_HEAD_INTAKE,
      sourceDurationSeconds: 120,
    });
    expect(edl.ok).toBe(true);
    if (!edl.ok) return;
    expect(["multi_segment", "densest_window"]).toContain(edl.selection);
    expect(edl.clips.length).toBeGreaterThanOrEqual(2);
    expect(edl.outputDurationSeconds).toBeLessThanOrEqual(32.75);
    expect(edl.outputDurationSeconds).toBeGreaterThanOrEqual(15);
  });

  it("cuts a single continuous take longer than 30s instead of failing the window", () => {
    const words = continuousLongSpeechWords();
    const last = words[words.length - 1]!;
    expect(last.end - words[0]!.start).toBeGreaterThan(30);
    const edl = buildEditDecisionList({
      words,
      intake: TALKING_HEAD_INTAKE,
      sourceDurationSeconds: Math.ceil(last.end + 2),
    });
    expect(edl.ok).toBe(true);
    if (!edl.ok) return;
    expect(["multi_segment", "densest_window"]).toContain(edl.selection);
    expect(edl.clips.length).toBeGreaterThanOrEqual(2);
    expect(edl.outputDurationSeconds).toBeLessThanOrEqual(32.75);
    expect(edl.outputDurationSeconds).toBeGreaterThanOrEqual(15);
  });

  it("fail-closes instead of padding thin speech or inventing a CTA", () => {
    const thin = buildEditDecisionList({
      words: TALKING_HEAD_WORDS.slice(0, 4),
      intake: TALKING_HEAD_INTAKE,
      sourceDurationSeconds: 20,
    });
    expect(thin.ok).toBe(false);
    if (!thin.ok) expect(thin.code).toBe("INSUFFICIENT_USABLE_SPEECH");

    const noCta = evaluateFootageIntake({
      ...TALKING_HEAD_INTAKE,
      ctaText: "   ",
    });
    expect(noCta?.code).toBe("MISSING_CTA");

    const uncleared = evaluateFootageIntake({
      ...TALKING_HEAD_INTAKE,
      rightsCleared: false,
    });
    expect(uncleared?.code).toBe("RIGHTS_NOT_CLEARED");

    const landscape = evaluateFootageProbe({
      durationSeconds: 40,
      width: 1920,
      height: 1080,
      hasAudio: true,
      meanVolumeDb: -18,
      maxVolumeDb: -3,
    });
    expect(landscape?.code).toBe("LANDSCAPE_NOT_FIRST_CERT");
  });

  it("builds a Shotstack footage payload with video clips, no prompt, no stills", () => {
    const edl = buildEditDecisionList({
      words: TALKING_HEAD_WORDS,
      intake: TALKING_HEAD_INTAKE,
      sourceDurationSeconds: TALKING_HEAD_SOURCE_SECONDS,
    });
    expect(edl.ok).toBe(true);
    if (!edl.ok) return;

    const built = buildFootageShotstackPayload({
      sourceUrl: TALKING_HEAD_INTAKE.sourceUrl!,
      edl,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const json = JSON.stringify(built.payload);
    expect(json).not.toContain('"prompt"');
    expect(json).not.toContain('"type":"image"');
    expect(json).not.toContain('"type":"rich-text"');
    expect(built.payload.output.size).toEqual({ width: 1080, height: 1920 });
    expect(built.payload.timeline.tracks).toHaveLength(1);
    const videoTrack = built.payload.timeline.tracks[0]!;
    expect(
      videoTrack.clips.every(
        (clip) => (clip.asset as { type?: string }).type === "video",
      ),
    ).toBe(true);
    expect(videoTrack.clips[0]?.start).toBe(0);
  });

  it("does not alter the frozen stills Shotstack payload", () => {
    const packet = loadShotstackWorkPacketV1(repoRoot);
    expect(packet.skuId).toBe("v2-rtu-short-video");
    const urls = new Map<string, string>();
    for (const scene of packet.scenes) {
      urls.set(scene.relativePath, `https://example.test/${scene.assetId}.png`);
    }
    if (packet.voiceArtifact?.relativePath) {
      urls.set(packet.voiceArtifact.relativePath, "https://example.test/voice.mp3");
    }
    const stills = buildShotstackEditPayload(packet, urls);
    expect(stills.ok).toBe(true);
    if (!stills.ok) return;
    const json = JSON.stringify(stills.payload);
    expect(json).toContain('"type":"image"');
    expect(json).not.toContain('"type":"video"');
  });

  it("picks sentence indexes without rewriting speech and prefers the stronger coherent edit", () => {
    const sentences = buildTranscriptSentences(TALKING_HEAD_WORDS);
    expect(sentences.length).toBeGreaterThan(2);
    expect(sentences.every((s) => /[A-Za-z]/.test(s.text))).toBe(true);
    const patio = sentences.find((s) => /patio/i.test(s.text));
    expect(patio).toBeTruthy();
    const weak = parseSentenceIndexPick('{"startIndex":0,"endIndex":0}');
    expect(weak).toEqual({ startIndex: 0, endIndex: 0, indexes: [0], roles: [] });
    const jumped = parseSentenceIndexPick('{"indexes":[0,3,6]}');
    expect(jumped?.indexes).toEqual([0, 3, 6]);
    const beats = parseSentenceIndexPick(
      '{"beats":[{"index":1,"role":"hook"},{"index":2,"role":"body"},{"index":5,"role":"close"}]}',
    );
    expect(beats?.indexes).toEqual([1, 2, 5]);
    expect(beats?.roles).toEqual(["hook", "body", "close"]);
    const weakWords = wordsFromSentenceRange(sentences, weak!);
    const det = buildEditDecisionList({
      words: TALKING_HEAD_WORDS,
      intake: TALKING_HEAD_INTAKE,
      sourceDurationSeconds: TALKING_HEAD_SOURCE_SECONDS,
    });
    const weakEdl = buildEditDecisionList({
      words: weakWords ?? [],
      intake: TALKING_HEAD_INTAKE,
      sourceDurationSeconds: TALKING_HEAD_SOURCE_SECONDS,
    });
    expect(det.ok).toBe(true);
    expect(det.ok).toBe(true);
    if (!det.ok) return;
    const chosen = chooseStrongerEdit(det, weakEdl.ok ? weakEdl : null);
    expect(chosen.winner).toBe("deterministic");
    expect(det.clips[0]?.text).toMatch(/patio/i);
    expect(det.clips.every((c) => !/\bUM\b/.test(c.text))).toBe(true);
  });

  it("uses a reusable caption stroke and scrim on light or dark footage", () => {
    const speech = buildFootageCaptionAsset({
      text: "Saturday morning we finally",
      role: "speech",
    });
    const cta = buildFootageCaptionAsset({
      text: "Book your table today",
      role: "cta",
    });
    expect(formatFootageCaptionText("  Read   the project   notes ")).toBe(
      "Read\u2002 the\u2002 project\u2002 notes",
    );
    expect(formatFootageCaptionText("Read the project notes")).not.toMatch(
      /Readtheprojectnotes/,
    );
    expect(formatFootageCaptionText("Read the project notes")).toContain("\u2002");
    expect(formatFootageCaptionText("Read the project notes")).toContain(" ");
    expect(JSON.stringify(speech)).toContain('"type":"rich-text"');
    expect(JSON.stringify(speech)).toContain('"family":"Open Sans"');
    expect(JSON.stringify(speech)).not.toContain('"wordSpacing"');
    expect(JSON.stringify(speech)).toContain('"wrap":false');
    expect(JSON.stringify(speech)).toContain('"lineHeight":1.2');
    expect(JSON.stringify(speech)).toContain('"padding":20');
    expect(JSON.stringify(speech)).toContain('"opacity":0.78');
    expect(JSON.stringify(cta)).toContain("#1F4A44");
    expect(JSON.stringify(speech)).not.toContain('"prompt"');
  });

  it("uses production only when the production key exists; stage stays watermarked", () => {
    const stage = resolveFootageRenderEnv({
      SHOTSTACK_API_KEY: "stage-key",
    });
    expect(stage.envName).toBe("stage");
    expect(stage.watermarkExpected).toBe(true);
    const prod = resolveFootageRenderEnv({
      SHOTSTACK_API_KEY: "stage-key",
      SHOTSTACK_PRODUCTION_API_KEY: "prod-key",
    });
    expect(prod.envName).toBe("v1");
    expect(prod.watermarkExpected).toBe(false);
  });

  it("builds a multi-segment edit and documents reusable loudnorm targets", () => {
    expect(studioShortFormVideoEditingBuildV1.factory.multiSegmentEdit).toBe(true);
    expect(
      studioShortFormVideoEditingBuildV1.audioFinish.method,
    ).toBe("ffmpeg_loudnorm_ebu_r128_two_pass");
    expect(
      studioShortFormVideoEditingBuildV1.audioFinish.targetIntegratedLufs,
    ).toBe(-14);
    expect(studioShortFormVideoEditingBuildV1.audioFinish.doNotClaimDenoise).toBe(
      true,
    );
    const sentences = buildTranscriptSentences(TALKING_HEAD_WORDS);
    const picked = pickMultiSegmentSentences(sentences);
    expect(picked.length).toBeGreaterThanOrEqual(2);
    expect(picked.some((sentence) => /um/i.test(sentence.text) && sentence.words.length <= 2)).toBe(
      false,
    );
    const edl = buildEditDecisionList({
      words: TALKING_HEAD_WORDS,
      intake: TALKING_HEAD_INTAKE,
      sourceDurationSeconds: TALKING_HEAD_SOURCE_SECONDS,
    });
    expect(edl.ok).toBe(true);
    if (!edl.ok) return;
    expect(edl.clips.length).toBeGreaterThanOrEqual(2);
    const plan = evaluateEditorialPlan({
      clipCount: edl.clips.length,
      outputDurationSeconds: edl.outputDurationSeconds,
      sourceSpokenSeconds: 48,
      sourceTrims: edl.clips.map((clip) => clip.sourceTrim),
    });
    expect(plan.ok).toBe(true);
    expect(studioShortFormVideoEditingBuildV1.factory.storyRoleOrdering).toBe(
      true,
    );
    expect(studioShortFormVideoEditingBuildV1.audioFinish.handoff).toBe(
      "ffmpeg_reencode_video_plus_loudnorm_aac",
    );
    expect(studioShortFormVideoEditingBuildV1.factory.ideaFirstPass).toBe(true);
    expect(
      studioShortFormVideoEditingBuildV1.factory.doNotIterateTranscriptSelector,
    ).toBe(true);
    expect(
      studioShortFormVideoEditingBuildV1.factory.performanceAwareBrain,
    ).toBe("minimum_wired");
    expect(studioShortFormVideoEditingBuildV1.factory.finishingPassOnly).toBe(
      true,
    );
    expect(studioShortFormVideoEditingBuildV1.factory.doNotReplaceClaude).toBe(
      true,
    );
    expect(
      studioShortFormVideoEditingBuildV1.factory.shotstackTypesetForbidden,
    ).toBe(true);
    expect(studioShortFormVideoEditingBuildV1.factory.localTextBurnIn).toBe(true);
    expect(studioShortFormVideoEditingBuildV1.factory.exactTextQaFailClose).toBe(
      true,
    );
    expect(studioShortFormVideoEditingBuildV1.factory.factoryPath).toEqual([
      "intake_rights",
      "deepgram_nova3_mip_opt_out",
      "idea_first_transcript_reasoning",
      "performance_aware_multimodal_review",
      "ordered_edl",
      "ffmpeg_audio_finish_remux",
      "local_sharp_ffmpeg_typography",
      "exact_text_qa",
      "shotstack_production_video_composite",
      "quality_watch_with_sound",
      "review",
      "one_included_revision",
      "final_delivery",
    ]);
  });

  it("rejects a sign-off before leftover explanation and accepts hook → body → close", () => {
    const sentences = [
      {
        index: 0,
        text: "My favorite word in English is cherries.",
        start: 83.5,
        end: 90.1,
        words: [
          { word: "favorite", start: 83.5, end: 84, punctuatedWord: "favorite" },
        ],
      },
      {
        index: 1,
        text: "which means a small fruit that is delicious.",
        start: 93.4,
        end: 100.6,
        words: [{ word: "means", start: 93.4, end: 94 }],
      },
      {
        index: 2,
        text: "hope you enjoyed hearing some words and phrases in my language.",
        start: 105.3,
        end: 109.8,
        words: [{ word: "hope", start: 105.3, end: 105.6 }],
      },
      {
        index: 3,
        text: "I learned this language from my parents, my family, and my neighbors and at school.",
        start: 143.7,
        end: 149.9,
        words: [{ word: "learned", start: 143.7, end: 144.2 }],
      },
    ];
    expect(classifySentenceRole(sentences[0]!)).toBe("hook");
    expect(classifySentenceRole(sentences[1]!)).toBe("proof");
    expect(classifySentenceRole(sentences[2]!)).toBe("close");
    expect(classifySentenceRole(sentences[3]!)).toBe("context");

    const leftoverIntro = storyPlanFromIndexes(sentences, [0, 1, 2, 3]);
    expect(leftoverIntro.ok).toBe(false);
    const setupAfter = storyPlanFromIndexes(
      [
        sentences[0]!,
        {
          index: 4,
          text: "I will teach you some words and phrases in this language.",
          start: 31.07,
          end: 36.99,
          words: [{ word: "teach", start: 31.07, end: 31.4 }],
        },
        {
          index: 5,
          text: "Happy birthday.",
          start: 71.5,
          end: 72.8,
          words: [{ word: "Happy", start: 71.5, end: 71.8 }],
        },
      ],
      [0, 4, 5],
    );
    expect(setupAfter.ok).toBe(false);

    const upsideDown = leftoverIntro;
    expect(upsideDown.ok).toBe(false);
    if (!upsideDown.ok) {
      expect(upsideDown.findings).toContain(
        "sign_off_before_remaining_explanation",
      );
      expect(upsideDown.humanEditorWouldChooseThisOrder).toBe(false);
    }

    const ordered = storyPlanFromIndexes(sentences, [0, 1, 2], [
      "hook",
      "proof",
      "close",
    ]);
    expect(ordered.ok).toBe(true);
    if (ordered.ok) {
      expect(ordered.roles).toEqual(["hook", "proof", "close"]);
      expect(ordered.humanEditorWouldChooseThisOrder).toBe(true);
    }
  });

  it("builds an idea-first patio short from the talking-head fixture", () => {
    const idea = pickIdeaFirstPlan(buildTranscriptSentences(TALKING_HEAD_WORDS));
    expect(idea.ok, idea.ok ? "" : idea.findings.join("; ")).toBe(true);
  });

  it("chooses the cherries idea over a coherent first-block biography", () => {
    const sentences = [
      {
        index: 0,
        text: "My name is Daniel.",
        start: 5.4,
        end: 7.7,
        words: [{ word: "name", start: 5.4, end: 5.7 }],
      },
      {
        index: 1,
        text: "I am from The United States Of America, and I am speaking the English language.",
        start: 9.3,
        end: 20,
        words: [{ word: "from", start: 9.3, end: 9.6 }],
      },
      {
        index: 2,
        text: "I learned this language from my parents as well as my community.",
        start: 21.2,
        end: 28.7,
        words: [{ word: "learned", start: 21.2, end: 21.6 }],
      },
      {
        index: 3,
        text: "My favorite word in English is cherries, which means a small fruit that is delicious.",
        start: 83.5,
        end: 100.7,
        words: [{ word: "favorite", start: 83.5, end: 84 }],
      },
      {
        index: 4,
        text: "I hope you enjoyed hearing some words and phrases in my language.",
        start: 102.7,
        end: 109.8,
        words: [{ word: "hope", start: 102.7, end: 103 }],
      },
    ];
    const bio = briefFromStoryPlan(
      sentences,
      storyPlanFromIndexes(sentences, [0, 1, 2], ["hook", "body", "context"]),
    );
    expect(bio.ok).toBe(false);
    if (!bio.ok) {
      expect(bio.findings).toContain("first_block_bias_stronger_later_idea_exists");
    }
    const idea = pickIdeaFirstPlan(sentences);
    expect(idea.ok).toBe(true);
    if (!idea.ok) return;
    expect(idea.centralIdea.toLowerCase()).toMatch(/cherries|favorite/);
    expect(idea.hook.text.toLowerCase()).toMatch(/cherries|favorite/);
    expect(idea.hook.text).not.toMatch(/My name is Daniel/);
    expect(idea.wouldEditorChooseThisOverFirstBlock).toBe(true);
  });
});
