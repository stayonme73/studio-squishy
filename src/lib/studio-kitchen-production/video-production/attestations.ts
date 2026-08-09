import type { VideoQualityJudgmentAttestations } from "./types";

/** Full visual/listening pass attestations bound to an exact artifact hash. */
export function fullVideoPassAttestations(notes: string): VideoQualityJudgmentAttestations {
  return {
    pacingReviewed: true,
    visualHierarchyReviewed: true,
    textLegibilityReviewed: true,
    captionAccuracyReviewed: true,
    timingReviewed: true,
    transitionsReviewed: true,
    compositionReviewed: true,
    brandingReviewed: true,
    imageVideoQualityReviewed: true,
    audioBalanceReviewed: true,
    voiceIntelligibilityReviewed: true,
    musicAppropriatenessReviewed: true,
    noAwkwardCutsReviewed: true,
    noAccidentalBlackFramesReviewed: true,
    noStretchedCroppedAssetsReviewed: true,
    noUnreadableMobileTextReviewed: true,
    noMisleadingContentReviewed: true,
    commercialUsabilityReviewed: true,
    viewingMatchesBoundArtifact: true,
    notes,
  };
}

export function viewingNotesForHash(hash: string, note: string): string {
  return `boundSha256=${hash}; ${note}`;
}
