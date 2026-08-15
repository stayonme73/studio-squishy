/**
 * Current customer-communication transport map.
 * Inspect-only for STUDIO-OPERATING-VOICE-MACHINE-AND-CUSTOMER-COMMUNICATION-1.
 * Does not add a new email provider or the full lifecycle email package.
 */

import { JOB_COMMUNICATION_TEMPLATES } from "@/lib/job-control/communication";

export const studioCustomerCommunicationEmailMapV1 = {
  packageId: "STUDIO-OPERATING-VOICE-MACHINE-AND-CUSTOMER-COMMUNICATION-1",
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
  ] as const,
  durableInAppNotices: Object.keys(JOB_COMMUNICATION_TEMPLATES),
  inAppOutboxChannel: "in_app_outbox" as const,
  routineProjectLifeEmail: "missing" as const,
  missingWiringForLaterEmailSection: [
    "Job-control notices enqueue to the in-app outbox as pending_owner_send; they do not call Resend.",
    "Studio Voice / Board Machine answers are not emailed.",
    "Customer Board messages are stored on the project communication ledger and are not emailed.",
    "pending_owner_send is transport, not an Owner Desk send task.",
  ] as const,
} as const;
