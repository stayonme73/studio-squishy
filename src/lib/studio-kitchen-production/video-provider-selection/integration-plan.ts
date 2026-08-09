/**
 * KITCHEN-VIDEO-PROVIDER-SELECTION-1 — integration architecture for winner.
 * Planning only. No provider adapter implementation in this package.
 */

export const WINNER_PROVIDER_ID = "shotstack" as const;

/** Proposed env vars for KITCHEN-VIDEO-INTEGRATION-1 (do not create accounts here). */
export const PROPOSED_ENV_VARS = [
  "SHOTSTACK_API_KEY",
  "SHOTSTACK_API_BASE_URL",
  "SHOTSTACK_ENV",
  "SHOTSTACK_WEBHOOK_SECRET",
  "STUDIO_VIDEO_ASSET_BASE_URL",
  "STUDIO_VIDEO_RENDER_WEBHOOK_URL",
] as const;

export type ProposedEnvVar = (typeof PROPOSED_ENV_VARS)[number];

export const PROVIDER_ADAPTER_BOUNDARY = {
  packageHint: "src/lib/studio-kitchen-production/video-integration/",
  responsibilities: [
    "Map Studio work packet → Shotstack Edit JSON (timeline + output)",
    "Submit render job via Shotstack API (server-side only)",
    "Poll status and/or accept webhook callback",
    "Download rendered MP4 bytes",
    "Never expose SHOTSTACK_API_KEY to browser/client",
  ],
  nonResponsibilities: [
    "Catalog pricing / service expansion",
    "Studio Voice / browser TTS",
    "CapCut desktop paths",
    "QA READY business gate (Kitchen bind owns that)",
  ],
} as const;

export const RENDER_JOB_RECORD_FIELDS = [
  "jobId",
  "provider",
  "providerRenderId",
  "campaignId",
  "skuId",
  "workPacketId",
  "workPacketVersion",
  "status",
  "submittedAt",
  "completedAt",
  "failureCode",
  "failureMessage",
  "requestHash",
  "outputUrl",
  "retryCount",
] as const;

export const OUTPUT_ARTIFACT_RECORD_FIELDS = [
  "artifactId",
  "jobId",
  "localPath",
  "sha256",
  "byteLength",
  "mimeType",
  "width",
  "height",
  "durationSeconds",
  "container",
  "boundAt",
  "campaignId",
  "skuId",
  "workPacketId",
] as const;

export const FAILURE_STATES = [
  "submit_rejected",
  "render_failed",
  "render_timeout",
  "download_failed",
  "probe_failed",
  "hash_mismatch_on_retry_compare",
  "webhook_auth_failed",
] as const;

export const RETRY_BEHAVIOR = {
  submitTransient: "retry with backoff; new providerRenderId; preserve work packet",
  renderFailed:
    "no auto-rewrite of creative; operator/system may resubmit corrected work packet as new version",
  downloadFailed: "retry download from provider URL before marking failed",
  correctionPath:
    "V1 artifact preserved; V2 = new job + new SHA-256; never overwrite prior bind",
} as const;

export const SECRET_ISOLATION = {
  apiKey: "server env only; never logged; never returned to client",
  webhookSecret: "verify Shotstack/callback signatures if configured",
  assetUrls:
    "prefer short-lived signed URLs for Studio assets; avoid permanent public customer PII in filenames",
  renderUrls:
    "treat provider output URLs as ephemeral pickup; persist Studio copy immediately",
} as const;

export const INTEGRATION_FLOW = [
  "Studio work packet (scenes, captions, CTA, asset refs, certified MP3 hash/path)",
  "provider adapter builds Shotstack timeline/output JSON",
  "render job submitted → RENDER_QUEUED",
  "poll and/or webhook → RENDER_SUCCEEDED | RENDER_FAILED",
  "artifact download → Studio storage",
  "persist exact MP4 bytes",
  "SHA-256 bind + ffprobe metadata",
  "campaign / SKU / work-packet binding",
  "QA READY gate (existing Kitchen contract)",
] as const;

export const ACCOUNT_PLAN_RECOMMENDATION = {
  minimumForNextIntegrationTest:
    "Shotstack free developer account + sandbox/stage API key + included 10 free credits (30-day validity per pricing FAQ). No paid subscription required for first integration smoke renders of 15–30s clips.",
  commercialProductionFloor:
    "Before any customer deliverable: paid path — either PAYG credit pack or lowest subscription that covers 1080p commercial renders. Do not purchase in this package.",
  doNotPurchaseInThisPackage: true,
} as const;
