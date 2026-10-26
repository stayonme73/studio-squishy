/**
 * Step 3 Studio Voice certification stamp.
 * Authority: docs/launch/studio-operating-studio-voice-certification-1/STUDIO-OPERATING-STUDIO-VOICE-CERTIFICATION.md
 */

export const STUDIO_VOICE_CERTIFICATION_PACKAGE_ID =
  "STUDIO-OPERATING-STUDIO-VOICE-CERTIFICATION-1" as const;

export const studioVoiceCertificationV1 = {
  packageId: STUDIO_VOICE_CERTIFICATION_PACKAGE_ID,
  certifiedAt: "2026-09-26" as const,
  canCarryFullRelationship: false as const,
  package4VoiceHost: "discontinued_not_rebuilt" as const,
  doNotStartWebsite: true as const,
  doNotStartBeta: true as const,
  doNotStartMarketing: true as const,
} as const;
