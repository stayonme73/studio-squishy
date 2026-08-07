/**
 * Studio Kitchen Communication V1 — internal operational communication spine config.
 *
 * Authority: docs/studio-internal-communication-doctrine-v1-locked.md
 * Motto: Multiple instruments. One sound.
 */

export const STUDIO_KITCHEN_COMMS_VERSION = "1.0.0" as const;

export const studioKitchenComms = {
  version: STUDIO_KITCHEN_COMMS_VERSION,
  sectionTitle: "Operational communication",
  sectionLead:
    "Who needs to know what happened — routed from existing production records. Not a chat product.",
  activeTitle: "Action needed",
  historyTitle: "Communication history",
  emptyActive: "No active internal actions from current production state.",
  emptyHistory: "No operational communication history recorded yet.",
  ownerNotRequiredLabel: "Owner not required",
  ownerRequiredLabel: "Owner decision required",
  ownerUnclearLabel: "Owner authority unclear",
  awaitingTransportLabel: "Authorized communication awaiting delivery transport",
  deferred: [
    "Studio Voice live Kitchen connection",
    "Voice customer Q&A",
    "Owner Console redesign",
    "Make integration",
    "Canva / CapCut integration",
    "Live email / SMS sending",
    "Supabase migration",
    "Broad Squishy cleanup",
  ],
} as const;

/**
 * Outbox disposition authority is NOT defined here.
 *
 * Kitchen Comms must derive `awaiting_authorized_transport` from existing Studio
 * authorities only:
 * - `JOB_COMMUNICATION_TEMPLATES` + `syncJobCommunicationRecords` (`src/lib/job-control/communication.ts`)
 * - `JOB_CONTROL_POLICY` reminder / waiting / refund windows (`src/config/job-control.ts`)
 * - Decision Core outgoing communication evaluator (`humanReviewRequired: false`; effect ≠ decision)
 * - Owner Console responsibility map: template + rule outcomes are not Owner Desk decisions
 *
 * See `classifyOutboxDisposition` in `src/lib/studio-kitchen-comms/outbox-disposition.ts`.
 */
