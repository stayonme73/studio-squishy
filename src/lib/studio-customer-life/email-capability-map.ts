/**
 * Current customer-communication transport map.
 * STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1
 * Authorized job-control templates may use the existing Resend adapter.
 * pending_owner_send is transport, not an Owner send duty.
 */

import { JOB_COMMUNICATION_TEMPLATES } from "@/lib/job-control/communication";

export const studioCustomerCommunicationEmailMapV1 = {
  packageId: "STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1",
  /**
   * pending_owner_send is a job-outbox transport fact.
   * It must not mean Tagia is responsible for sending routine notices by hand.
   */
  pendingOwnerSendMeans: "awaiting_authorized_transport" as const,
  pendingOwnerSendIsOwnerRoutine: false as const,
  reachesResendToday: [
    {
      kind: "email-verification",
      source: "src/lib/auth/email-verification.ts",
      customerLoop: false,
    },
    {
      kind: "email-verification-resend",
      source: "src/lib/auth/email-verification.ts",
      customerLoop: false,
    },
    {
      kind: "password-reset",
      source: "src/lib/auth/password-recovery.ts",
      customerLoop: false,
    },
    {
      kind: "project-claim-recovery",
      source: "src/lib/studio-project-claim/send-claim-email.ts",
      customerLoop: false,
    },
    {
      kind: "customer-lifecycle",
      source: "src/lib/studio-lifecycle-email/deliver.ts",
      customerLoop: true,
    },
  ] as const,
  durableInAppNotices: Object.keys(JOB_COMMUNICATION_TEMPLATES),
  inAppOutboxChannel: "in_app_outbox" as const,
  routineProjectLifeEmail: "authorized_templates_via_resend" as const,
  missingWiringForLaterEmailSection: [
    "COME BACK LATER: branded sender, real inbox proof, and live provider reject/retry against the final Studio sender are parked until The Studio has a purchased and verified business domain and business-email identity. Do not fake. Do not call that package CLOSED. Protected checkpoint d6974eb.",
    "Studio Voice / Board Machine answers are not emailed as a chat transcript.",
    "pending_owner_send remains the storage fact for queued notices until transport succeeds.",
  ] as const,
} as const;
