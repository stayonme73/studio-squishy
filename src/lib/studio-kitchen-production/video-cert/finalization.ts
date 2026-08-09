/**
 * KITCHEN-PRODUCTION-CERT-VIDEO-1 — Owner-authorized close.
 * CUSTOMER READY WITH LIMITS — MP4. Final A/V beat sync remains mandatory per-artifact QA.
 */

export const CERT_VIDEO_PACKAGE_ID = "KITCHEN-PRODUCTION-CERT-VIDEO-1" as const;

export const CERT_VIDEO_CUSTOMER_READY_STATUS =
  "CUSTOMER READY WITH LIMITS — MP4" as const;

export const CERT_VIDEO_CERTIFIED_SKU = "v2-rtu-short-video" as const;

/** Exact Owner-reviewed V5 candidate used to close the package. */
export const CERT_VIDEO_V5_ARTIFACT = {
  relativePath:
    "docs/launch/kitchen-production-cert-video-1/artifacts/v5/v2-rtu-short-video_cert-video-1-cedar-lane_wp-v5_sb-v5.mp4",
  contentSha256:
    "6223a8f016f53021172768d1a97b25376b9b18e2421d8bfef29647ecaf51f190",
  byteLength: 6659088,
  durationSeconds: 23.2,
  providerRenderId: "9d6ff47e-7b0b-4a7a-8c96-77788a6a21fa",
  scriptVersionId: "cert-video-narration-v1",
  voiceRelativePath:
    "docs/launch/kitchen-production-cert-video-1/artifacts/voice/cert-video-1-cedar-lane/ap-001_cert-video-narration-v1_f0d811bc5d10.mp3",
  voiceContentSha256:
    "f0d811bc5d10490b108fe58edad55d7d97001e799e34534c3e716186f4bf86c7",
} as const;

export const CERT_VIDEO_OWNER_VERDICT = {
  productionCapability: "PASS",
  ownerIndependence: "PASS",
  visualMessageQuality: "PASS WITH MINOR TIMING LIMIT",
  customerReadyStatus: CERT_VIDEO_CUSTOMER_READY_STATUS,
  furtherRenderAuthorized: false,
} as const;

/**
 * Explicit production limit — do not treat as cosmetic polish debt for another paid cert render.
 */
export const CERT_VIDEO_KNOWN_LIMITATION =
  "Topic-card / scene transitions can lag narration slightly (observed on Sessions begin and Call… beats in V5). Final A/V beat synchronization is a mandatory per-artifact QA check before customer delivery; regenerate on fail. Do not burn provider credits to re-prove fractional timing shifts on internal fixtures." as const;

export const CERT_VIDEO_MANDATORY_QA_RULE_ID =
  "av_beat_synchronization_per_artifact" as const;

export const CERT_VIDEO_MANDATORY_QA_RULE = {
  id: CERT_VIDEO_MANDATORY_QA_RULE_ID,
  label: "Final A/V beat synchronization (per artifact)",
  requirement:
    "Watch the exact bound MP4 with sound. Confirm brand, offer/$99, deadline, session time, contact, and CTA visuals land with their spoken beats. If A/V beat-sync QA fails, regenerate before delivery. No customer artifact may inherit readiness from a prior video/hash.",
  regenerationOnFail: true,
  readinessInheritanceForbidden: true,
  source: "KITCHEN-PRODUCTION-CERT-VIDEO-1 Owner close",
} as const;
