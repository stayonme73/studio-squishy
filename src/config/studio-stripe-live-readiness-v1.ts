/**
 * Stripe live readiness + certification.
 * Test-mode success is not live certification. Do not invent merchant credentials.
 */

export const STUDIO_STRIPE_LIVE_READINESS_PACKAGE_ID =
  "STUDIO-OPERATING-STRIPE-LIVE-READINESS-AND-CERTIFICATION-1" as const;

export const studioStripeLiveReadinessV1 = {
  packageId: STUDIO_STRIPE_LIVE_READINESS_PACKAGE_ID,
  authorizedAt: "2026-09-26" as const,
  liveCertified: false as const,
  verdict: "READY_BUT_BLOCKED" as const,
  doNotFakeLive: true as const,
  doNotInventMerchantCredentials: true as const,
  doNotPutSecretsInGit: true as const,
  /** Owner 2026-10-10: canonical guarded full-refund path, Stripe test mode only. */
  stripeRefundsApiImplemented: "test_mode_only" as const,
  stripeLiveRefundsEnabled: false as const,
  webhookAuthoritative: true as const,
  browserReturnIsNotPaymentProof: true as const,
  codedLaneCapacityNotThisPackage: true as const,
  doNotStartBrandedEmail: true as const,
  doNotStartCapacityCertification: true as const,
  doNotStartWebsite: true as const,
  doNotStartBeta: true as const,
  doNotStartMarketing: true as const,
} as const;
