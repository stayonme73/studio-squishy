import type { AudioQualityJudgmentAttestations } from "./types";

/** Full listening attestation set — used only when every judgment is true. */
export function fullListeningPassAttestations(
  notes: string,
): AudioQualityJudgmentAttestations {
  return {
    scriptFidelityReviewed: true,
    pronunciationReviewed: true,
    namesReviewed: true,
    numbersReviewed: true,
    priceReviewed: true,
    dateReviewed: true,
    timeReviewed: true,
    phoneReviewed: true,
    urlReviewed: true,
    acronymReviewed: true,
    pacingReviewed: true,
    naturalnessReviewed: true,
    intelligibilityReviewed: true,
    emphasisReviewed: true,
    unwantedArtifactsReviewed: true,
    excessiveSilenceReviewed: true,
    clippingReviewed: true,
    usableVolumeReviewed: true,
    beginningEndCompleteReviewed: true,
    commercialUsabilityReviewed: true,
    listeningMatchesBoundArtifact: true,
    pacingNaturalnessReviewed: true,
    artifactsClippingSilenceReviewed: true,
    notes,
  };
}

export function listeningNotesForHash(hash: string, commercialVerdict: string): string {
  return (
    `Listened to bound file sha256=${hash}. ` +
    `Reviewed script fidelity, names, numbers, price, date, time, phone, URL, acronym, ` +
    `pacing, naturalness, intelligibility, emphasis, artifacts, silence, clipping, volume, ` +
    `and beginning/end completeness. Commercial usability: ${commercialVerdict}.`
  );
}
