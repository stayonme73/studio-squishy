/**
 * Studio Voice ↔ Machine ↔ customer communication loop.
 * Authority: STUDIO-OPERATING-VOICE-MACHINE-AND-CUSTOMER-COMMUNICATION-1
 *
 * Room 1 only. Board remains the customer truth surface. Voice explains
 * that same Machine record. It must not invent facts or impersonate staff.
 */

export const studioVoiceMachineCustomerCommunicationV1 = {
  packageId: "STUDIO-OPERATING-VOICE-MACHINE-AND-CUSTOMER-COMMUNICATION-1",
  schemaVersion: 1 as const,
  routineOwnerAction: "NONE" as const,
  /** Unanswered unknown questions become stalled after this window. Not an SLA promise. */
  unansweredQuestionStallMs: 24 * 60 * 60 * 1000,

  customerCopy: {
    lookupFailed:
      "I could not reach the live project record just now, so I will not guess. Please ask again in a moment, or check your Studio Board.",
    messageReceivedAnswered:
      "We received your question and answered it from the project record.",
    messageReceivedUnknown:
      "We received your question and attached it to this project. The project record does not have that answer yet, so the Studio will not guess.",
    messageReceivedLookupFailed:
      "We received your message and attached it to this project. The Studio could not look up the live record just now, so it will not guess. Please ask again in a moment.",
    recordAnswerLabel: "Answer from the project record",
    awaitingStaffReply: "A person on The Studio team has not written a separate reply yet.",
    studioRequestHeading: "The Studio needs something from you",
    intakeRequest:
      "We still need your Project Intake. Payment and your flyer project are already on the record. Please complete Project Intake so the next step can continue. You do not need to repeat facts the Studio already has.",
    materialsRequest:
      "The Studio still needs a required material from you before this job can move forward.",
    unusableFileRequest:
      "We received a file, and it is still being checked for use. Please send a usable version if the Studio asked for one. Received is not the same as approved for use.",
    responseAckRecorded:
      "We received your reply and attached it to this project.",
    responseAckStillWaiting:
      "We received your reply and attached it to this project. The Studio still needs the missing step itself before that waiting state can clear. You do not need to repeat facts already on the record.",
    responseAckCleared:
      "Thank you. The Studio has what it needed for this step. The project can continue from the current record.",
    askStateAnswered: "Answered from the project record.",
    askStateWaitingCustomer: "Waiting on you.",
    askStateWaitingStudio: "Waiting on The Studio.",
    askStateStalled: "Still unanswered. This question did not disappear.",
  },
} as const;

export type CustomerCommunicationAskState =
  | "answered"
  | "waiting_for_customer"
  | "waiting_for_studio"
  | "stalled";
