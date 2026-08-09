/**
 * Owner/Manager listening approval for the exact CERT-VOICE-1 bound MP3.
 * Applies only to this artifact/hash — never to other files.
 */

import type { AudioQualityJudgmentAttestations } from "../voice-production/types";
import {
  fullListeningPassAttestations,
  listeningNotesForHash,
} from "../voice-production/attestations";

export const CERT_VOICE_APPROVED_ARTIFACT = {
  relativePath:
    "docs/launch/kitchen-production-cert-voice-1/artifacts/cert-voice-1-cedar-lane/ap-001_cert-voice-script-v1_d283144563a6.mp3",
  contentSha256:
    "d283144563a6fe2075be956fd144fe1c0bb4de29ec55ca308c5b8060c94647e4",
  byteLength: 631998,
  scriptVersionId: "cert-voice-script-v1",
  campaignId: "cert-voice-1-cedar-lane",
  skuId: "ap-001" as const,
  format: "mp3_44100_128" as const,
} as const;

export const CERT_VOICE_OWNER_LISTENING_APPROVAL = {
  artifactRelativePath: CERT_VOICE_APPROVED_ARTIFACT.relativePath,
  contentSha256: CERT_VOICE_APPROVED_ARTIFACT.contentSha256,
  verdict: "PASS" as const,
  ownerListeningApproval: "pass" as const,
  qaState: "qa_pass" as const,
  approvedByRole: "Owner/Manager" as const,
  approvedAt: "2026-08-09T14:43:00.000Z",
  commercialUsability: "PASS" as const,
  formatCertified: "mp3" as const,
  wavCertified: false,
  customerReadinessLabel: "CUSTOMER READY WITH LIMITS — MP3" as const,
  judgments: {
    scriptFidelity: "PASS",
    pronunciation: "PASS",
    names: "PASS",
    priceDateTime: "PASS",
    phone: "PASS",
    urlSpokenForm: "PASS",
    acronym: "PASS",
    pronunciationSensitiveWord: "PASS",
    pacingNaturalnessIntelligibility: "PASS",
    clippingArtifactsSilenceVolume: "PASS",
    commercialUsability: "PASS",
  },
  notes:
    "Owner/Manager listening review: audio is very clear. Approval applies only to the exact bound SHA-256 artifact.",
} as const;

/** Attestations matching Owner PASS for the exact certified hash only. */
export function ownerListeningPassAttestationsForCertifiedArtifact(): AudioQualityJudgmentAttestations {
  return fullListeningPassAttestations(
    listeningNotesForHash(
      CERT_VOICE_APPROVED_ARTIFACT.contentSha256,
      "PASS — Owner/Manager approved commercially usable for CUSTOMER READY WITH LIMITS — MP3",
    ),
  );
}

export function gateCertVoiceListeningApproval(input: {
  artifactRelativePath: string;
  contentSha256: string;
  attestations: AudioQualityJudgmentAttestations;
}):
  | { ok: true; approval: typeof CERT_VOICE_OWNER_LISTENING_APPROVAL }
  | { ok: false; error: string } {
  const expected = CERT_VOICE_APPROVED_ARTIFACT.contentSha256.toLowerCase();
  const actual = input.contentSha256.trim().toLowerCase();
  if (actual !== expected) {
    return {
      ok: false,
      error:
        "Owner listening approval applies only to the exact certified artifact hash — hash mismatch",
    };
  }
  if (
    input.artifactRelativePath.replace(/\\/g, "/") !==
    CERT_VOICE_APPROVED_ARTIFACT.relativePath
  ) {
    return {
      ok: false,
      error:
        "Owner listening approval applies only to the exact certified artifact path",
    };
  }
  if (input.attestations.commercialUsabilityReviewed !== true) {
    return { ok: false, error: "commercialUsabilityReviewed must be true for Owner PASS" };
  }
  if (input.attestations.listeningMatchesBoundArtifact !== true) {
    return { ok: false, error: "listeningMatchesBoundArtifact must be true" };
  }
  if (!input.attestations.notes.includes(CERT_VOICE_APPROVED_ARTIFACT.contentSha256)) {
    return {
      ok: false,
      error: "Listening notes must include the exact certified contentSha256",
    };
  }
  const requiredTrue: Array<keyof AudioQualityJudgmentAttestations> = [
    "scriptFidelityReviewed",
    "pronunciationReviewed",
    "namesReviewed",
    "numbersReviewed",
    "priceReviewed",
    "dateReviewed",
    "timeReviewed",
    "phoneReviewed",
    "urlReviewed",
    "acronymReviewed",
    "pacingReviewed",
    "naturalnessReviewed",
    "intelligibilityReviewed",
    "emphasisReviewed",
    "unwantedArtifactsReviewed",
    "excessiveSilenceReviewed",
    "clippingReviewed",
    "usableVolumeReviewed",
    "beginningEndCompleteReviewed",
    "commercialUsabilityReviewed",
  ];
  for (const key of requiredTrue) {
    if (input.attestations[key] !== true) {
      return { ok: false, error: `Missing Owner listening PASS attestation: ${key}` };
    }
  }
  return { ok: true, approval: CERT_VOICE_OWNER_LISTENING_APPROVAL };
}

export const CERT_VOICE_CUSTOMER_READY_SKUS = ["ap-001", "v2-rtu-voice"] as const;

export const CERT_VOICE_CUSTOMER_READY_STATUS =
  "CUSTOMER READY WITH LIMITS — MP3" as const;
