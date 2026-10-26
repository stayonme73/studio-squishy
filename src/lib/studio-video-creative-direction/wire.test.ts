import { execFileSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { studioShortFormContentPackFactoryReviewLoopV1 as loop } from "@/config/studio-short-form-content-pack-factory-review-loop-v1";
import { studioShortFormContentPackFactoryV1 as factory } from "@/config/studio-short-form-content-pack-factory-v1";
import { studioVideoCreativeDirectionContractWireV1 as wire } from "@/config/studio-video-creative-direction-contract-wire-v1";
import { SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT } from "@/catalog/v2/short-form-video-edit-publish";
import { inspectFlagshipRender } from "@/lib/studio-flagship-short-form-edit/inspect";
import { machineDecideCorrection } from "@/lib/studio-short-form-content-pack/machine-corrections";
import {
  evaluateQualityFromEvidence,
  type QualityFrameSample,
  type RenderedShortEvidence,
} from "@/lib/studio-short-form-content-pack/quality-review";
import { contentPackCertIntake } from "@/lib/studio-short-form-content-pack/scenario";

import {
  applyCreativeDirectionToProduction,
  clipCorrectionFromDirection,
} from "./apply-to-production";
import {
  applyCreativeDirectionPatch,
  emptyCreativeDirection,
  mapOrdinaryLanguageToDirectionPatch,
  machineCanExecutePatch,
} from "./contract";
import { creativeDirectionFromPackIntake } from "./from-intake";
import { routeOrdinaryLanguageToMachine } from "./machine-route";

const repoRoot = process.cwd();
const stampDir = path.join(repoRoot, wire.stampDir);
const proofDir = path.join(stampDir, "proof");

function frame(
  role: QualityFrameSample["role"],
  atSeconds: number,
  overlay: boolean,
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
  };
}

function evidence(partial: Partial<RenderedShortEvidence>): RenderedShortEvidence {
  return {
    renderedAbsolutePath: path.join(proofDir, "tiny-source.mp4"),
    durationSeconds: 18,
    words: [{ word: "hello", start: 0, end: 0.3, punctuatedWord: "Hello." }],
    openingText: "Hello there.",
    endingText: "I learned this language",
    spokenText: "Hello there. I learned this language",
    frames: [frame("opening", 0.2, false), frame("ending", 17, false)],
    meanVolumeDb: -18,
    midVolumeDb: -16,
    endingVolumeDb: -22,
    darkBandDb: null,
    brightBandDb: null,
    voiceBandDb: null,
    peakMinusMeanDb: 2,
    ...partial,
  };
}

function writeProof(name: string, value: unknown) {
  mkdirSync(proofDir, { recursive: true });
  writeFileSync(path.join(proofDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function makeTinyPortraitMp4(absolutePath: string) {
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=0x1a1a1a:s=1080x1920:d=3",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=3",
      "-shortest",
      "-pix_fmt",
      "yuv420p",
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      absolutePath,
    ],
    { stdio: "pipe" },
  );
}

describe("STUDIO-VIDEO-CREATIVE-DIRECTION-CONTRACT-WIRE-1", () => {
  it("does not rebuild the factory, Clip, or public $349 copy", () => {
    expect(wire.doNotRebuild349Factory).toBe(true);
    expect(wire.doNotBuildClip).toBe(true);
    expect(wire.publicPriceCentsUnchanged).toBe(34900);
    expect(wire.doNotChangePublicCopyUnlessMismatch).toBe(true);
    expect(factory.publicPriceCentsUnchanged).toBe(34900);
    expect(SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT.clientFacingName).toBe(
      "Short-Form Content Pack",
    );
    expect(SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT.priceCents).toBe(34900);
    expect(loop.maxInternalCorrectionLoops).toBe(2);
    expect(loop.roles.qualityInspectsRenderedMp4).toBe(true);
  });

  it("builds durable contract fields from pack intake without changing first-run Production", () => {
    const intake = contentPackCertIntake();
    const direction = creativeDirectionFromPackIntake(intake, intake.clips[1]!);
    expect(direction.customerGoal).toBe("Favorite English word: cherries");
    expect(direction.purpose).toBe("teach");
    expect(direction.spokenIdea).toBe("Favorite English word: cherries");
    expect(direction.cta.text).toBe(intake.ctaText);
    expect(direction.broll.use).toBe(true);
    expect(direction.broll.holdThroughSpokenIdea).toBe(true);
    expect(direction.music.use).toBe(true);
    expect(direction.captions.treatment).toBe("word_synced_exact");
    expect(direction.visualEmphasis.hookPunchIn).toBe(true);
    expect(direction.cta.tightenEnding).toBe(false);
    expect(clipCorrectionFromDirection(direction)).toBeNull();
  });

  it("routes remove music, remove B-roll, different CTA with wording, and tighten ending to Production", () => {
    const current = creativeDirectionFromPackIntake(
      contentPackCertIntake(),
      contentPackCertIntake().clips[1]!,
    );

    const music = routeOrdinaryLanguageToMachine({
      current,
      text: "remove the music",
    });
    expect(music.route).toBe("production");
    if (music.route === "production") {
      expect(music.nextDirection.music.use).toBe(false);
      expect(music.plan.correction.omitMusic).toBe(true);
      expect(music.plan.kinds).toContain("omit_music");
    }

    const broll = routeOrdinaryLanguageToMachine({
      current,
      text: "remove B-roll",
    });
    expect(broll.route).toBe("production");
    if (broll.route === "production") {
      expect(broll.nextDirection.broll.use).toBe(false);
      expect(broll.plan.correction.omitBroll).toBe(true);
      expect(broll.plan.kinds).toContain("omit_broll");
    }

    const cta = routeOrdinaryLanguageToMachine({
      current,
      text: "use a different CTA",
      replacementCta: "Visit thestudiocompany7.com",
    });
    expect(cta.route).toBe("production");
    if (cta.route === "production") {
      expect(cta.nextDirection.cta.text).toBe("Visit thestudiocompany7.com");
      expect(cta.plan.nextCtaText).toBe("Visit thestudiocompany7.com");
    }

    const ending = routeOrdinaryLanguageToMachine({
      current,
      text: "tighten the ending",
    });
    expect(ending.route).toBe("production");
    if (ending.route === "production") {
      expect(ending.nextDirection.cta.tightenEnding).toBe(true);
      expect(ending.plan.kinds).toContain("finish_ending");
    }

    writeProof("ordinary-language-routing.json", { music, broll, cta, ending });
  });

  it("fails closed on CTA without wording, unknown instructions, and captions bigger", () => {
    const current = emptyCreativeDirection({ cta: { text: "Start here", tightenEnding: false } });
    const missingCta = routeOrdinaryLanguageToMachine({
      current,
      text: "use a different CTA",
    });
    expect(missingCta).toMatchObject({
      route: "fail_closed",
      reason: "needs_cta_wording",
      escalate: "none",
    });

    const unknown = routeOrdinaryLanguageToMachine({
      current,
      text: "make it more cinematic",
    });
    expect(unknown).toMatchObject({
      route: "fail_closed",
      reason: "unknown_phrase",
      escalate: "none",
    });

    const bigger = mapOrdinaryLanguageToDirectionPatch("make the captions bigger");
    expect(bigger).toEqual({ captionTreatment: "larger" });
    if (!("ok" in bigger)) {
      expect(machineCanExecutePatch(bigger).executableNow).toBe(false);
    }
    const biggerRoute = routeOrdinaryLanguageToMachine({
      current,
      text: "make the captions bigger",
    });
    expect(biggerRoute).toMatchObject({
      route: "fail_closed",
      reason: "not_executable",
      escalate: "scout",
    });

    writeProof("fail-closed.json", { missingCta, unknown, biggerRoute });
  });

  it(
    "applies a contract CTA change to a rendered MP4 and Quality re-watches it",
    async () => {
    const source = path.join(proofDir, "tiny-source.mp4");
    const output = path.join(proofDir, "tiny-cta-revised.mp4");
    makeTinyPortraitMp4(source);
    const direction = applyCreativeDirectionPatch(
      emptyCreativeDirection({
        customerGoal: "Prove CTA wording reaches Production",
        spokenIdea: "This is a complete thought.",
        cta: { text: "Start at thestudiocompany7.com", tightenEnding: false },
      }),
      { ctaText: "Visit thestudiocompany7.com" },
    );
    const applied = await applyCreativeDirectionToProduction({
      repoRoot,
      direction,
      videoAbsolutePath: source,
      outputAbsolutePath: output,
      workDirectory: path.join(proofDir, "cta-work"),
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.qualityRewatchedRenderedMp4).toBe(true);
    expect(applied.renderedAbsolutePath && existsSync(applied.renderedAbsolutePath)).toBe(true);
    expect(applied.inspect?.durationSeconds).toBeGreaterThan(1);
    expect(applied.inspect?.width).toBe(1080);
    expect(applied.inspect?.height).toBe(1920);
    const inspect =
      applied.inspect ??
      inspectFlagshipRender({
        repoRoot,
        videoAbsolutePath: output,
        workDirectory: path.join(proofDir, "quality-watch"),
      });
    expect(inspect.hasAudio).toBe(true);
    const refused = evaluateQualityFromEvidence(
      evidence({ renderedAbsolutePath: "", frames: [], words: [] }),
    );
    expect(refused.pass).toBe(false);
    expect(refused.findings.map((finding) => finding.code)).toContain(
      "inspect_not_rendered_mp4",
    );
    writeProof("cta-quality-rewatch.json", {
      applied,
      inspect,
      qualityRefusesEmptyPath: refused.findings.map((finding) => finding.code),
    });
    },
    60_000,
  );

  it("keeps Quality → Machine 2-loop routing for ordinary rendered defects", () => {
    const review = evaluateQualityFromEvidence(evidence({}));
    const first = machineDecideCorrection({
      review,
      loopIndex: 0,
      previousKinds: [],
    });
    expect(first.route).toBe("production");
    const exhausted = machineDecideCorrection({
      review,
      loopIndex: loop.maxInternalCorrectionLoops,
      previousKinds: ["snap_complete_thoughts"],
    });
    expect(exhausted.route).toBe("escalate_owner");
    expect(loop.maxInternalCorrectionLoops).toBe(2);
  });
});
