import { describe, expect, it } from "vitest";

import {
  clipRepurposingIoFreezeContractV1,
  clipRepurposingIoFreezeFindings,
  studio549ClipRepurposingIoFreezeV1 as freeze,
} from "@/config/studio-549-clip-repurposing-io-freeze-v1";
import { studio549ClipRepurposingBuildV1 as nextBuild } from "@/config/studio-549-clip-repurposing-build-v1";
import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";
import { clipRepurposingBoundaryContractV1 } from "@/config/studio-short-form-content-pack-v1";
import { SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT } from "@/catalog/v2/short-form-video-edit-publish";
import { CLIP_REPURPOSING_PUBLISH_DRAFT } from "@/catalog/v2/clip-repurposing-publish";

describe("STUDIO-$549-CLIP-REPURPOSING-IO-FREEZE-1", () => {
  it("is contract-only and does not build, publish, or reopen $349", () => {
    expect(freeze.kind).toBe("io_freeze");
    expect(freeze.classification).toBe("OWNER_FROZEN");
    expect(freeze.ownerAuthorizedFreeze).toBe(true);
    expect(freeze.doNotBuildClip).toBe(true);
    expect(freeze.doNotPublish).toBe(true);
    expect(freeze.doNotChangePublicCatalog).toBe(true);
    expect(freeze.doNotReopen349).toBe(true);
    expect(freeze.doNotCreateSecondFinishingFactory).toBe(true);
    expect(freeze.publicPriceCents).toBe(54900);
    expect(freeze.customerFacingName).toBe("Clip Repurposing");
    expect(clipRepurposingIoFreezeFindings()).toEqual([]);
    expect(SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT.priceCents).toBe(34900);
    expect(SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT.clientFacingName).toBe(
      "Short-Form Content Pack",
    );
  });

  it("resolves the 3-vs-5 and finish conflicts without mutating the historical factory stamp", () => {
    expect(studioClipRepurposingBuildV1.certifiedScope.finishedVerticalShorts).toBe(
      3,
    );
    expect(studioClipRepurposingBuildV1.notInThisService).toEqual(
      expect.arrayContaining(["b_roll_sourcing", "music_selection_or_licensing"]),
    );
    expect(freeze.upToFive.maximumDelivered).toBe(5);
    expect(freeze.upToFive.notAGuarantee).toBe(true);
    expect(freeze.upToFive.fulfillAt549WhenCount).toEqual([3, 4, 5]);
    expect(freeze.finishingInheritance.inherit).toEqual(
      expect.arrayContaining([
        "relevant_broll_where_appropriate",
        "music_where_appropriate",
        "quality_review_of_rendered_mp4",
      ]),
    );
    expect(freeze.historicalThreeClipFactoryRemainsHistorical).toBe(true);
    expect(CLIP_REPURPOSING_PUBLISH_DRAFT.includedDeliverables[0]?.quantity).toBe(
      3,
    );
  });

  it("splits $349 vs Clip by who finds the moments, not by duration", () => {
    expect(freeze.distinction.decidedBy).toBe("who_identifies_the_moments");
    expect(freeze.distinction.notDecidedBy).toBe("source_duration");
    expect(freeze.distinction.tenMinuteFindTheBestIsClip).toBe(true);
    expect(freeze.distinction.unmarkedSourceIsNever349BecauseItIsShort).toBe(
      true,
    );
    expect(freeze.sourceEligibility.underFifteenMinutesDoesNotBelongTo349).toBe(
      true,
    );
    expect(freeze.sourceEligibility.minSourceMinutes).toBe(2);
    expect(freeze.sourceEligibility.maxSourceMinutes).toBe(60);
  });

  it("does not reuse historical $349 / $449 shortfall prices", () => {
    expect(freeze.shortfall.doNotReuseHistorical349or449).toBe(true);
    expect(freeze.shortfall.doNotCharge549ForFewerThan3).toBe(true);
    expect(freeze.shortfall.noPublishedOneOrTwoClipPrice).toBe(true);
    expect(freeze.shortfall.stopBeforeProductionWhenBelow3).toBe(true);
    expect(freeze.shortfall.outcomes.firstSource0).toBe(
      "stop_before_finishing_offer_one_replacement_source",
    );
    expect(freeze.shortfall.outcomes.firstSource1).toBe(
      "stop_before_finishing_offer_one_replacement_source",
    );
    expect(freeze.shortfall.outcomes.firstSource2).toBe(
      "stop_before_finishing_offer_one_replacement_source",
    );
    expect(freeze.shortfall.outcomes.replacement0).toBe("stop_and_full_refund");
    expect(freeze.shortfall.outcomes.replacement1).toBe("stop_and_full_refund");
    expect(freeze.shortfall.outcomes.replacement2).toBe("stop_and_full_refund");
    expect(freeze.shortfall.outcomes[3]).toBe("fulfill_clip_repurposing_at_549");
    expect(freeze.shortfall.outcomes[4]).toBe("fulfill_clip_repurposing_at_549");
    expect(freeze.shortfall.outcomes[5]).toBe("fulfill_clip_repurposing_at_549");
    expect(freeze.shortfall.outcomes.over5).toBe(
      "select_strongest_5_fulfill_at_549",
    );
  });

  it("keeps discovery, revision, and Creative Direction locks", () => {
    expect(freeze.sourceEligibility.speakerRule).toBe(
      "one_primary_on_camera_speaker",
    );
    expect(freeze.sourceEligibility.noSoldDenoiseGuarantee).toBe(true);
    expect(freeze.discovery.studioFindsTheMoments).toBe(true);
    expect(freeze.antiFiller.doNotManufactureWeakFiller).toBe(true);
    expect(freeze.antiCannibalization.sameSpokenIdeaCannotAppearTwice).toBe(true);
    expect(freeze.revision.included).toBe(1);
    expect(freeze.revision.supported).not.toContain("make_the_captions_bigger");
    expect(freeze.creativeDirection.ctaWordingRequired).toBe(true);
    expect(freeze.creativeDirection.captionsBiggerNotExecutable).toBe(true);
    expect(clipRepurposingIoFreezeContractV1).toEqual(
      clipRepurposingBoundaryContractV1,
    );
    expect(clipRepurposingIoFreezeContractV1.studioDelivers.join(" ")).toMatch(
      /up to 5/i,
    );
    expect(clipRepurposingIoFreezeContractV1.important).toMatch(
      /not 5 guaranteed/i,
    );
  });

  it("adds one replacement-source window without locking the Heavy producing slot", () => {
    expect(freeze.sourceQualityResubmission.oneReplacementSource).toBe(true);
    expect(freeze.sourceQualityResubmission.windowBusinessDays).toBe(2);
    expect(freeze.sourceQualityResubmission.windowIsHard).toBe(true);
    expect(
      freeze.sourceQualityResubmission.historicalThreeToFiveDaysAfterIntake,
    ).toBe("stale_superseded_not_capacity_proven");
    expect(freeze.sourceQualityResubmission.lateSourceOnClosedOrder).toBe(
      "refused_must_place_new_order",
    );
    expect(freeze.sourceQualityResubmission.paymentHeldDuringWindow).toBe(true);
    expect(freeze.capacityReservation.reserved).toBe("heavy_queue_priority_only");
    expect(freeze.capacityReservation.doNotOccupyHeavyProducingSlotWhileWaiting).toBe(
      true,
    );
    expect(freeze.capacityReservation.onTimeReplacementCanDisplaceAnotherCustomer).toBe(
      false,
    );
    expect(freeze.capacityReservation.lateReplacement).toBe(
      "job_closed_full_refund_no_late_source_on_this_order",
    );
  });

  it("prepared the next build without starting it from the freeze stamp", () => {
    expect(freeze.nextPackagePrepared).toBe(
      "STUDIO-$549-CLIP-REPURPOSING-BUILD-1",
    );
    expect(freeze.nextPackageAuthorizedToStart).toBe(false);
    expect(nextBuild.prepared).toBe(true);
    expect(nextBuild.ioAuthority).toBe(
      "STUDIO-$549-CLIP-REPURPOSING-IO-FREEZE-1",
    );
    expect(nextBuild.doNotPublish).toBe(true);
    expect(nextBuild.ioStatus).toBe("OWNER_FROZEN");
  });
});
