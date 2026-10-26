/**
 * STUDIO-CLIP-SOURCE-AUDIO-GATE-HARDENING-1
 * Material-damage clipping gate. Does not whitelist a file. Does not publish.
 */

export const STUDIO_CLIP_SOURCE_AUDIO_GATE_HARDENING_PACKAGE_ID =
  "STUDIO-CLIP-SOURCE-AUDIO-GATE-HARDENING-1" as const;

export const studioClipSourceAudioGateHardeningV1 = {
  packageId: STUDIO_CLIP_SOURCE_AUDIO_GATE_HARDENING_PACKAGE_ID,
  authorizedAt: "2026-10-03" as const,
  evidenceSourceRelativePath:
    "docs/launch/studio-clip-source-ingest-1/The Studio Long Video.mp4" as const,
  oldRule: "maxVolumeDb >= 0 => REPLACEMENT_REQUIRED" as const,
  newRule: "reject_material_clipping_allow_isolated_needles" as const,
  doNotWhitelistThisFile: true as const,
  doNotBypassForCertification: true as const,
  doNotPublish: true as const,
  doNotChangeMenu: true as const,
  doNotChangePrice: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  resumeRecertOnlyIfGateAndSourcePass: true as const,
  recertPackageId: "STUDIO-CLIP-REPURPOSING-FRESH-SOLD-CONTRACT-RECERT-1" as const,
  stampDir: "docs/launch/studio-clip-source-audio-gate-hardening-1" as const,
} as const;
