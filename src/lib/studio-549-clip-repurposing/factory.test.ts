import { existsSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { CLIP_REPURPOSING_PUBLISH_DRAFT } from "@/catalog/v2/clip-repurposing-publish";
import { studio549ClipRepurposingBuildV1 as build } from "@/config/studio-549-clip-repurposing-build-v1";
import { studio549ClipRepurposingIoFreezeV1 as freeze } from "@/config/studio-549-clip-repurposing-io-freeze-v1";
import { studioShortFormContentPackFactoryReviewLoopV1 as loop } from "@/config/studio-short-form-content-pack-factory-review-loop-v1";
import { SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT } from "@/catalog/v2/short-form-video-edit-publish";
import { runContentPackClip } from "@/lib/studio-short-form-content-pack/clip";
import { machineDecideCorrection } from "@/lib/studio-short-form-content-pack/machine-corrections";
import type { RenderedShortEvidence } from "@/lib/studio-short-form-content-pack/quality-review";

import { discoverClip549Set, sameIdea } from "./discovery";
import { estimateClip549WorstCaseEconomics } from "./economics";
import { evaluateClip549SourceEligibility } from "./eligibility";
import { clip549HonestTimingCopy, runClip549Factory } from "./factory";
import { finishClip549Set, identifiedClipFromCandidate } from "./finishing";
import {
  eligibleFacts,
  fixtureCannibalSource,
  fixtureFiveSource,
  fixtureFourSource,
  fixtureMoreThanFiveSource,
  fixtureOneSource,
  fixtureSixtyMinuteSource,
  fixtureThreeSource,
  fixtureTwoMinuteSource,
  fixtureTwoSource,
  fixtureZeroSource,
} from "./fixtures";
import { resolveClip549Outcome } from "./outcome";
import {
  CLIP_549_MAX_QUALITY_LOOPS,
  clip549QualityLoopExhausted,
  reviewClip549RenderedMp4,
} from "./quality";
import {
  acceptOnTimeReplacement,
  CLIP_549_HEAVY_CAPACITY,
  createClip549HeavyLane,
  declareFirstSourceShortfall,
  expireReplacementAndClose,
  finishingMayBegin,
  finishProducing,
  heavySlotIsIdleWhileShortfallHold,
  onTimeReplacementBumpsProducing,
  preservedPriorityMeans,
} from "./queue";
import {
  addBusinessDays,
  evaluateClip549ReplacementWindow,
  laterReturnIsNewOrder,
} from "./replacement";
import {
  emptyClip549RevisionLedger,
  evaluateClip549Revision,
} from "./revision";

const REPO = path.resolve(__dirname, "../../..");

function evidence(partial: Partial<RenderedShortEvidence>): RenderedShortEvidence {
  return {
    renderedAbsolutePath: path.join(REPO, loop.fixtureClips[0]!.sourceRelativePath),
    durationSeconds: 20,
    words: [
      { word: "the", start: 0, end: 0.2, punctuatedWord: "The" },
      { word: "secret", start: 0.2, end: 0.5, punctuatedWord: "secret" },
    ],
    openingText: "The secret to pricing a custom cake is charging for the sketch.",
    endingText: "I never give the drawing away.",
    spokenText:
      "The secret to pricing a custom cake is charging for the sketch. I never give the drawing away.",
    frames: [
      {
        atSeconds: 0.2,
        role: "opening",
        overlayPresent: false,
        overlayWidth: 0,
        overlayHeight: 0,
        faceOccupied: false,
        captionBright: true,
        champagnePresent: false,
        visualKind: "talking_head",
        overlayLeft: 0,
        overlayTop: 0,
      },
      {
        atSeconds: 19.4,
        role: "ending",
        overlayPresent: false,
        overlayWidth: 0,
        overlayHeight: 0,
        faceOccupied: false,
        captionBright: true,
        champagnePresent: true,
        visualKind: "talking_head",
        overlayLeft: 0,
        overlayTop: 0,
      },
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

describe("STUDIO-$549-CLIP-REPURPOSING-BUILD-1", () => {
  it("uses the frozen I/O and does not publish or change the public catalog", () => {
    expect(build.started).toBe(true);
    expect(build.authorizedToStart).toBe(true);
    expect(build.ioStatus).toBe("OWNER_FROZEN");
    expect(build.ioAuthority).toBe("STUDIO-$549-CLIP-REPURPOSING-IO-FREEZE-1");
    expect(build.doNotPublish).toBe(true);
    expect(build.doNotChangePublicCatalog).toBe(true);
    expect(build.laneCertified).toBe("VIDEO_QUALITY");
    expect(build.classification).toBe(
      "VIDEO_QUALITY_OWNER_CERTIFIED_WITH_EXPLICIT_LIMITS",
    );
    expect(build.videoQualityClassification).toBe(
      "OWNER_CERTIFIED_WITH_EXPLICIT_LIMITS",
    );
    expect(build.videoQualitySectionClosed).toBe(true);
    expect(build.readyForOwnerUnusualCertification).toBe(false);
    expect(build.productValueDeliveryPackage.status).toBe("STARTED");
    expect(build.productValueDeliveryPackage.packageId).toBe(
      "STUDIO-$549-CLIP-REPURPOSING-VALUE-DELIVERY-1",
    );
    expect(build.productValueDeliveryPackage.authorizedToStart).toBe(true);
    expect(build.published).toBe(false);
    expect(build.acceptedClipIds).toEqual([
      "c-56-423",
      "c-17-127",
      "c-82-641",
      "c-97-723",
      "c-50-377",
    ]);
    expect(build.doNotAlterFactoryUnlessRegression).toBe(true);
    expect(build.livePaidFiveClipRender).toBe(false);
    expect(build.hitchhikesFinishingLane).toBe("v2-rtu-short-form-video-edit");
    expect(freeze.classification).toBe("OWNER_FROZEN");
    expect(CLIP_REPURPOSING_PUBLISH_DRAFT.includedDeliverables[0]?.quantity).toBe(3);
    expect(CLIP_REPURPOSING_PUBLISH_DRAFT.turnaround).toBe(
      "3–5 business days after intake",
    );
    expect(SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT.priceCents).toBe(34900);
  });

  it("refuses an unmarked source under 2 minutes without routing it to $349", () => {
    const under = evaluateClip549SourceEligibility(eligibleFacts(90));
    expect(under.ok).toBe(false);
    if (under.ok) return;
    expect(under.code).toBe("SOURCE_UNDER_TWO_MINUTES");
    expect(under.routeTo349Automatically).toBe(false);
    expect(evaluateClip549SourceEligibility(eligibleFacts(120)).ok).toBe(true);
    expect(evaluateClip549SourceEligibility(eligibleFacts(3600)).ok).toBe(true);
    expect(evaluateClip549SourceEligibility(eligibleFacts(3601)).ok).toBe(false);
    expect(
      evaluateClip549SourceEligibility(eligibleFacts(180, { ctaText: "" })).ok,
    ).toBe(true);
  });

  it("discovers a 2-minute source and a 60-minute source", () => {
    const two = discoverClip549Set(fixtureTwoMinuteSource());
    expect(two.sourceDurationSeconds).toBe(120);
    expect(two.viableDistinctCount).toBeGreaterThanOrEqual(3);
    expect(two.productionAllowed).toBe(true);
    const hour = discoverClip549Set(fixtureSixtyMinuteSource());
    expect(hour.sourceDurationSeconds).toBe(3600);
    expect(hour.viableDistinctCount).toBeGreaterThanOrEqual(3);
    expect(hour.selected.some((clip) => clip.windowStart >= 3500)).toBe(true);
  });

  it("stops on first-source 0/1/2 and refunds a failed replacement", () => {
    expect(discoverClip549Set(fixtureZeroSource()).viableDistinctCount).toBe(0);
    expect(discoverClip549Set(fixtureOneSource()).viableDistinctCount).toBe(1);
    expect(discoverClip549Set(fixtureTwoSource()).viableDistinctCount).toBe(2);
    const first = resolveClip549Outcome({
      sourcePass: "first",
      viableDistinctCount: 2,
    });
    expect(first.treatment).toBe(
      "stop_before_finishing_offer_one_replacement_source",
    );
    expect(first.productionAllowed).toBe(false);
    expect(first.paymentHeld).toBe(true);
    expect(first.manufactureFiller).toBe(false);
    const replacement = resolveClip549Outcome({
      sourcePass: "replacement",
      viableDistinctCount: 1,
    });
    expect(replacement.treatment).toBe("stop_and_full_refund");
    expect(replacement.settlementPriceCents).toBe(0);
  });

  it("keeps a hard 2-business-day replacement window", () => {
    const notice = "2026-09-29T16:00:00.000Z";
    const open = evaluateClip549ReplacementWindow({
      shortfallNoticedAt: notice,
      now: "2026-09-30T16:00:00.000Z",
    });
    expect(open.status).toBe("open");
    expect(open.deadlineAt).toBe(addBusinessDays(notice, 2));
    const onTime = evaluateClip549ReplacementWindow({
      shortfallNoticedAt: notice,
      now: "2026-10-01T15:00:00.000Z",
      replacementReceivedAt: "2026-10-01T15:00:00.000Z",
    });
    expect(onTime.status).toBe("received_on_time");
    const expired = evaluateClip549ReplacementWindow({
      shortfallNoticedAt: notice,
      now: "2026-10-02T16:00:01.000Z",
    });
    expect(expired.status).toBe("expired_close_refund");
    const late = evaluateClip549ReplacementWindow({
      shortfallNoticedAt: notice,
      now: "2026-10-03T12:00:00.000Z",
      replacementReceivedAt: "2026-10-03T12:00:00.000Z",
    });
    expect(late.status).toBe("late_refused_new_order");
    expect(laterReturnIsNewOrder().inheritedPriority).toBe(false);
  });

  it("fulfills 3, 4, and 5 at $549 and ranks more than 5", () => {
    const three = discoverClip549Set(fixtureThreeSource());
    const four = discoverClip549Set(fixtureFourSource());
    const five = discoverClip549Set(fixtureFiveSource());
    const more = discoverClip549Set(fixtureMoreThanFiveSource());
    expect(three.viableDistinctCount).toBe(3);
    expect(three.selected).toHaveLength(3);
    expect(four.viableDistinctCount).toBe(4);
    expect(four.selected).toHaveLength(4);
    expect(five.viableDistinctCount).toBe(5);
    expect(five.selected).toHaveLength(5);
    expect(more.viableDistinctCount).toBeGreaterThan(5);
    expect(more.selected).toHaveLength(5);
    expect(more.productionAllowed).toBe(true);
    expect(
      resolveClip549Outcome({
        sourcePass: "first",
        viableDistinctCount: more.viableDistinctCount,
      }).treatment,
    ).toBe("select_strongest_5_fulfill_at_549");
    expect(
      resolveClip549Outcome({
        sourcePass: "first",
        viableDistinctCount: 4,
      }).settlementPriceCents,
    ).toBe(54900);
  });

  it("refuses to deliver the same spoken idea twice", () => {
    const cannibal = discoverClip549Set(fixtureCannibalSource());
    expect(cannibal.viableDistinctCount).toBeLessThan(3);
    expect(cannibal.productionAllowed).toBe(false);
    const more = discoverClip549Set(fixtureMoreThanFiveSource());
    for (const [index, clip] of more.selected.entries()) {
      for (const [otherIndex, other] of more.selected.entries()) {
        if (index === otherIndex) continue;
        expect(sameIdea(clip, other)).toBe(false);
      }
    }
  });

  it("hitchhikes the certified $349 finishing lane and excludes pack extras", async () => {
    const discovered = discoverClip549Set(fixtureThreeSource());
    expect(runContentPackClip).toBeTypeOf("function");
    const mapped = identifiedClipFromCandidate(
      discovered.selected[0]!,
      "source.mp4",
    );
    expect(mapped.startSeconds).toBe(discovered.selected[0]!.windowStart);
    expect(mapped.endSeconds).toBe(discovered.selected[0]!.windowEnd);
    const finished = await finishClip549Set({
      repoRoot: REPO,
      stampDir: "docs/launch/studio-549-clip-repurposing-build-1/work",
      sourceAbsolutePath: path.join(REPO, "source.mp4"),
      sourceRelativePath: "source.mp4",
      selected: discovered.selected,
      ctaText: "Start at thestudiocompany7.com",
      produceClip: async (input) => ({
        ok: true,
        clipId: input.clip.id,
        label: input.clip.label,
        spokenIdea: input.clip.label,
        outputRelativePath: input.outputRelativePath,
        musicUsed: true,
        musicMethod: "shared_set_bed",
        musicShared: true,
        brollUsed: false,
        brollReason: "none",
        brollTreatment: null,
        brollStartSeconds: null,
        brollEndSeconds: null,
        brollToken: null,
        brollThoughtText: null,
        openingText: "The secret to pricing a custom cake is charging for the sketch.",
        endingText: "I never give the drawing away.",
        inspect: {
          width: 1080,
          height: 1920,
          durationSeconds: 20,
        } as never,
        spend: { deepgramUsd: 0.01, elevenCredits: 0, stockMediaUsd: 0, elapsedMs: 1 },
      }),
    });
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    expect(finished.hitchhikedLane).toBe("v2-rtu-short-form-video-edit");
    expect(finished.files).toHaveLength(3);
    expect(finished.files.every((file) => file.extrasIncluded.postCaptions === false)).toBe(
      true,
    );
    const refused = await finishClip549Set({
      repoRoot: REPO,
      stampDir: "docs/launch/studio-549-clip-repurposing-build-1/work",
      sourceAbsolutePath: path.join(REPO, "source.mp4"),
      sourceRelativePath: "source.mp4",
      selected: discovered.selected.slice(0, 2),
      ctaText: "Start at thestudiocompany7.com",
    });
    expect(refused.ok).toBe(false);
    expect(build.doNotCreateSecondFinishingFactory).toBe(true);
    expect(freeze.finishingInheritance.doNotInheritPackExtras).toEqual([
      "post_captions",
      "cover_graphics",
      "use_guide",
    ]);
  });

  it("covers five-clip worst-case vendor economics without changing price or quality", () => {
    const economics = estimateClip549WorstCaseEconomics();
    expect(economics.clipCount).toBe(5);
    expect(economics.discoveryMinutes).toBe(60);
    expect(economics.transcribePassesPerClip).toBe(3);
    expect(economics.coversFiveClipWorstCase).toBe(true);
    expect(economics.vendorWorstUsd).toBeLessThan(549);
    expect(economics.qualityReduced).toBe(false);
    expect(economics.scopeNarrowed).toBe(false);
    expect(economics.priceChanged).toBe(false);
    expect(economics.reusedHistorical349or449).toBe(false);
    expect(economics.ownerRoutineQa).toBe(false);
  });

  it("preserves queue place without idling or bumping Heavy", () => {
    expect(CLIP_549_HEAVY_CAPACITY).toBe(1);
    let lane = createClip549HeavyLane([
      { jobId: "producing", phase: "heavy_producing" },
      { jobId: "waiting-b", phase: "waiting_heavy" },
      { jobId: "clip-c", phase: "waiting_heavy" },
    ]);
    expect(lane.producingJobId).toBe("producing");
    const clipPlace = lane.jobs.find((job) => job.jobId === "clip-c")!.queuePlace;
    lane = declareFirstSourceShortfall(lane, "clip-c");
    expect(lane.jobs.find((job) => job.jobId === "clip-c")?.phase).toBe(
      "shortfall_hold",
    );
    expect(lane.jobs.find((job) => job.jobId === "clip-c")?.shortfallDeclaredPlace).toBe(
      clipPlace,
    );
    expect(lane.producingJobId).toBe("producing");
    lane = finishProducing(lane, "producing");
    expect(lane.producingJobId).toBe("waiting-b");
    expect(heavySlotIsIdleWhileShortfallHold(lane)).toBe(false);
    lane = acceptOnTimeReplacement(lane, "clip-c");
    expect(lane.jobs.find((job) => job.jobId === "clip-c")?.queuePlace).toBe(
      clipPlace,
    );
    expect(lane.producingJobId).toBe("waiting-b");
    expect(onTimeReplacementBumpsProducing(lane)).toBe(false);
    lane = finishProducing(lane, "waiting-b");
    expect(lane.producingJobId).toBe("clip-c");
    expect(finishingMayBegin({
      acceptedSourceYieldsAtLeast3: true,
      heavySlotAvailable: false,
    })).toBe(false);
    expect(preservedPriorityMeans()).toMatch(/never interrupts/);
    const closed = expireReplacementAndClose(
      createClip549HeavyLane([{ jobId: "late", phase: "shortfall_hold" }]),
      "late",
    );
    expect(closed.jobs[0]?.phase).toBe("closed_refunded");
  });

  it("reviews rendered MP4s through the shared 2-loop Quality path", () => {
    for (const fixture of loop.fixtureClips) {
      expect(existsSync(path.join(REPO, fixture.sourceRelativePath))).toBe(true);
    }
    const review = reviewClip549RenderedMp4(evidence({}));
    expect(review.inspectedRenderedMp4).toBe(true);
    const missing = reviewClip549RenderedMp4(
      evidence({ renderedAbsolutePath: "", words: [], frames: [] }),
    );
    expect(missing.pass).toBe(false);
    expect(missing.findings.some((finding) => finding.code === "inspect_not_rendered_mp4")).toBe(
      true,
    );
    expect(CLIP_549_MAX_QUALITY_LOOPS).toBe(2);
    expect(clip549QualityLoopExhausted(2)).toBe(true);
    const fail = reviewClip549RenderedMp4(
      evidence({
        openingText: "Um, okay so",
        endingText: "and then",
      }),
    );
    const first = machineDecideCorrection({
      review: fail,
      loopIndex: 0,
      previousKinds: [],
    });
    expect(first.route === "production" || first.route === "escalate_owner").toBe(
      true,
    );
    const exhausted = machineDecideCorrection({
      review: fail,
      loopIndex: 2,
      previousKinds: ["snap_complete_thoughts"],
    });
    expect(exhausted.route).not.toBe("production");
  });

  it("supports one set revision and refuses the frozen out-of-scope asks", () => {
    const first = evaluateClip549Revision(emptyClip549RevisionLedger(), {
      kind: "replace_one_selected_with_next_ranked_distinct_alternate",
      note: "Use the next ranked alternate.",
      removeId: "a",
      addId: "b",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = evaluateClip549Revision(first.nextLedger, {
      kind: "remove_the_music",
      note: "Now also remove music.",
    });
    expect(second.ok).toBe(false);
    expect(
      evaluateClip549Revision(emptyClip549RevisionLedger(), {
        kind: "make_the_captions_bigger",
        note: "Bigger captions.",
      }).ok,
    ).toBe(false);
  });

  it("runs the factory path for shortfall and fulfillment without inventing dates", () => {
    const shortfall = runClip549Factory({
      facts: eligibleFacts(18 * 60),
      source: fixtureTwoSource(),
      sourcePass: "first",
      shortfallNoticedAt: "2026-09-29T16:00:00.000Z",
      now: "2026-09-30T16:00:00.000Z",
      heavySlotAvailable: true,
    });
    expect(shortfall.outcome?.treatment).toBe(
      "stop_before_finishing_offer_one_replacement_source",
    );
    expect(shortfall.finishingAllowed).toBe(false);
    expect(shortfall.replacementWindow?.status).toBe("open");
    expect(shortfall.inventedDeliveryDate).toBe(false);
    expect(clip549HonestTimingCopy()).toMatch(/will not invent a start date/i);

    const fulfill = runClip549Factory({
      facts: eligibleFacts(24 * 60),
      source: fixtureFiveSource(),
      sourcePass: "first",
      heavySlotAvailable: true,
    });
    expect(fulfill.outcome?.treatment).toBe("fulfill_clip_repurposing_at_549");
    expect(fulfill.outcome?.deliveredCount).toBe(5);
    expect(fulfill.finishingAllowed).toBe(true);
    expect(fulfill.published).toBe(false);
  });
});
