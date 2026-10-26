/**
 * Domain + branded email readiness.
 * Does not send production customer email. Does not resume live Resend inbox proof.
 */

export const STUDIO_DOMAIN_AND_BRANDED_EMAIL_READINESS_PACKAGE_ID =
  "STUDIO-OPERATING-DOMAIN-AND-BRANDED-EMAIL-READINESS-1" as const;

export const studioDomainAndBrandedEmailReadinessV1 = {
  packageId: STUDIO_DOMAIN_AND_BRANDED_EMAIL_READINESS_PACKAGE_ID,
  authorizedAt: "2026-09-26" as const,
  domain: "thestudiocompany7.com" as const,
  verdict: "READY_BUT_BLOCKED" as const,
  liveSendCertified: false as const,
  productionCustomerEmailSent: false as const,
  resumeParkedResendPackage: "STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1" as const,
  parkedCheckpoint: "d6974eb" as const,
  recommendedAddresses: {
    primaryAndSupport: "hello@thestudiocompany7.com",
    transactionalFrom: "The Studio <noreply@thestudiocompany7.com>",
    replyTo: "hello@thestudiocompany7.com",
  } as const,
  recommendedInbound: "namecheap_email_forwarding_to_one_owner_inbox" as const,
  recommendedOutbound: "resend_verified_domain" as const,
  paidMailboxSeatsRequired: false as const,
  websiteHostingRequiredForEmailDns: false as const,
  doNotStartCapacity: true as const,
  doNotStartWebsite: true as const,
  doNotStartTesters: true as const,
  doNotStartAdvertising: true as const,
  doNotStartLiveStripe: true as const,
} as const;
