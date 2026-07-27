/**
 * COMM-2 — Project communication domain types.
 * Separate from complaint/refund, owner-decision, job outbox, intake, and activity events.
 */

/** Truthful sender roles only — no host, voice, or AI staff. */
export type ProjectCommunicationSenderRole = "customer" | "studio_staff";

/**
 * Smallest truthful status: the Studio system accepted the record into durable storage.
 * Does not claim a human read the message or that a reply exists.
 */
export type ProjectCommunicationRecordStatus = "accepted";

/**
 * All records in this domain are customer-visible project communication.
 * Internal notes must never live here.
 */
export type ProjectCommunicationVisibility = "customer_visible";

export type ProjectCommunicationCreationChannel =
  | "customer_board_form"
  | "studio_staff_reply";

export type ProjectCommunicationSourceContext = "project_communication";

export type ProjectCommunicationMessage = {
  id: string;
  campaignId: string;
  /**
   * Owning customer account when known.
   * Null only when the campaign is not yet bound to an account — Auth package binds ownership.
   */
  customerUserId: string | null;
  senderRole: ProjectCommunicationSenderRole;
  senderUserId: string;
  senderDisplayName?: string;
  /** Trimmed plain text body. */
  body: string;
  createdAt: string;
  status: ProjectCommunicationRecordStatus;
  visibility: ProjectCommunicationVisibility;
  /**
   * Staff replies set this to the same-campaign **customer** message id being answered.
   * This is not a generic parent-message tree; customer roots use null.
   * Continuing threads stay chronological in the campaign stream.
   */
  replyToMessageId: string | null;
  /** Client- or staff-supplied key; scoped per campaign + senderUserId. */
  idempotencyKey: string;
  creationChannel: ProjectCommunicationCreationChannel;
  sourceContext: ProjectCommunicationSourceContext;
};

export type ProjectCommunicationEnvelope = {
  campaignId: string;
  messages: ProjectCommunicationMessage[];
  updatedAt: string;
  version: number;
};

/** Approved future UI strings — not rendered by COMM-2. */
export const PROJECT_COMMUNICATION_COPY = {
  messageSent: "Message sent to The Studio.",
  awaitingReply: "The Studio has not replied yet.",
} as const;

/** Plain-text Customer-One body limit. */
export const PROJECT_COMMUNICATION_BODY_MAX_LENGTH = 4000;

export const PROJECT_COMMUNICATION_ENVELOPE_VERSION = 1;
