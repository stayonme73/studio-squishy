import { describe, expect, it } from "vitest";

import { studioShortFormContentPackFactoryV1 as factory } from "@/config/studio-short-form-content-pack-factory-v1";
import { studioVideoCreativeDirectionBenchmarkV1 as bench } from "@/config/studio-video-creative-direction-benchmark-v1";

import {
  applyCreativeDirectionPatch,
  emptyCreativeDirection,
  mapOrdinaryLanguageToDirectionPatch,
  machineCanExecutePatch,
  ORDINARY_LANGUAGE_DIRECTION_PHRASES,
} from "./contract";

describe("STUDIO-VIDEO-CREATIVE-DIRECTION-BENCHMARK-1", () => {
  it("stays inventory-only and does not weaken the $349 factory", () => {
    expect(bench.kind).toBe("inventory_architecture");
    expect(bench.protected349State).toBe("FACTORY_READY_WITH_EXPLICIT_LIMITS");
    expect(bench.publicCatalogSwitched).toBe(false);
    expect(bench.doNotBuildClip).toBe(true);
    expect(bench.doNotWeaken349ReviewLoop).toBe(true);
    expect(bench.qualityJudgesRenderedMp4).toBe(true);
    expect(factory.factoryReviewLoop.qualityInspectsRenderedMp4).toBe(true);
    expect(factory.publicCatalogSwitched).toBe(false);
  });

  it("classifies all 18 benchmark capabilities", () => {
    expect(bench.capabilities).toHaveLength(18);
    expect(bench.capabilities.map((row) => row.id)).toEqual([
      "rough_cut_filler",
      "complete_thought",
      "context_broll",
      "word_synced_captions",
      "kinetic_captions",
      "reframe",
      "punch_ins",
      "transitions",
      "voice_cleanup",
      "music_fit",
      "meaning_sfx",
      "brand_kit",
      "cta_ending",
      "conversational_revision",
      "one_source_several_shorts",
      "platform_variants",
      "quality_rendered_mp4",
      "machine_correction_loop",
    ]);
    expect(bench.capabilities.every((row) => row.status)).toBe(true);
  });

  it("maps Owner ordinary-language examples onto the Creative-Direction Contract", () => {
    expect(ORDINARY_LANGUAGE_DIRECTION_PHRASES).toHaveLength(7);
    const music = mapOrdinaryLanguageToDirectionPatch("Remove the music.");
    expect(music).toEqual({ musicUse: false });
    const direction = applyCreativeDirectionPatch(
      emptyCreativeDirection({ spokenIdea: "cherries are a small fruit." }),
      music as { musicUse: false },
    );
    expect(direction.music.use).toBe(false);
    expect(direction.music.tone).toBe("omit");

    expect(mapOrdinaryLanguageToDirectionPatch("hold the B-roll through this sentence")).toEqual({
      brollUse: true,
      holdBrollThroughSpokenIdea: true,
    });
    expect(mapOrdinaryLanguageToDirectionPatch("remove B-roll")).toEqual({
      brollUse: false,
      brollTreatment: "none",
    });
    expect(mapOrdinaryLanguageToDirectionPatch("tighten the ending")).toEqual({
      tightenEnding: true,
    });
    expect(mapOrdinaryLanguageToDirectionPatch("use a different CTA")).toEqual({
      ok: false,
      reason: "needs_owner_value",
    });
    const bigger = mapOrdinaryLanguageToDirectionPatch("make the captions bigger");
    expect(bigger).toEqual({ captionTreatment: "larger" });
    if (!("ok" in bigger)) {
      expect(machineCanExecutePatch(bigger).executableNow).toBe(false);
    }
    expect(mapOrdinaryLanguageToDirectionPatch("make it more cinematic")).toEqual({
      ok: false,
      reason: "unknown_phrase",
    });
  });
});
