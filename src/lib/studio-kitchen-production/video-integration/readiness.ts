/**
 * Readiness language for KITCHEN-VIDEO-INTEGRATION-1.
 * Selection alone ≠ integration. Integration ≠ certification.
 */

export const VIDEO_INTEGRATION_PACKAGE_ID =
  "KITCHEN-VIDEO-INTEGRATION-1" as const;

export const VIDEO_INTEGRATION_STARTING_CONTROL =
  "fb2c3b8324453480e98ac9e2ca29033a98288389" as const;

export const VIDEO_INTEGRATION_SKU = "v2-rtu-short-video" as const;

/** Until live Shotstack MP4 is bound. */
export const READINESS_BEFORE_LIVE_PROOF =
  "INTEGRATION REQUIRED / NOT CUSTOMER READY / NOT CERTIFIED" as const;

/** Only after real owner-independent Shotstack MP4 bound at QA READY. */
export const READINESS_AFTER_LIVE_PROOF =
  "INTEGRATED / QA READY / NOT CUSTOMER READY / NOT CERTIFIED" as const;

/**
 * After KITCHEN-PRODUCTION-CERT-VIDEO-1 Owner close.
 * Integration package language above remains historical for that package.
 */
export const READINESS_AFTER_VIDEO_CERT =
  "CUSTOMER READY WITH LIMITS — MP4" as const;

export const CAPCUT_STATUS_CLOSED =
  "CLOSED — OWNER-INDEPENDENCE FAIL" as const;

export type IntegrationVerdict =
  | "SHOTSTACK INTEGRATION: PROVEN"
  | "SHOTSTACK INTEGRATION: NOT PROVEN"
  | "SHOTSTACK INTEGRATION: BLOCKED — OWNER API SETUP REQUIRED";

export function integrationVerdictFromEvidence(input: {
  credentialsPresent: boolean;
  v1Bound: boolean;
}): IntegrationVerdict {
  if (!input.credentialsPresent) {
    return "SHOTSTACK INTEGRATION: BLOCKED — OWNER API SETUP REQUIRED";
  }
  if (input.v1Bound) {
    return "SHOTSTACK INTEGRATION: PROVEN";
  }
  return "SHOTSTACK INTEGRATION: NOT PROVEN";
}

export function readinessForEvidence(input: {
  v1Bound: boolean;
}): typeof READINESS_BEFORE_LIVE_PROOF | typeof READINESS_AFTER_LIVE_PROOF {
  return input.v1Bound
    ? READINESS_AFTER_LIVE_PROOF
    : READINESS_BEFORE_LIVE_PROOF;
}
