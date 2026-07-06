import type { DecisionDetermination } from "@/decision-core";

export const CONFIDENCE_COPY = {
  ownerEscalation:
    "This needs your review. I have placed it on your Owner Desk.",
  ownerHandoff:
    "I have routed this to Tagia for a judgment call.",
  clientReviewing:
    "The Studio is reviewing this. You will hear from us shortly.",
  clientWaitingOnStudio:
    "The Studio is handling your request. You will hear from us shortly.",
  clientRoutineAck:
    "Your update has been recorded. The Studio will continue with your project.",
  ownerActionRecorded:
    "Your decision has been recorded. I am coordinating the next steps.",
} as const;

export function resolveClientConfidenceMessage(input: {
  determination: DecisionDetermination;
  humanReviewRequired: boolean;
}): string {
  if (input.humanReviewRequired || input.determination === "escalate") {
    return CONFIDENCE_COPY.clientReviewing;
  }
  if (input.determination === "defer") {
    return CONFIDENCE_COPY.clientWaitingOnStudio;
  }
  if (input.determination === "no_action") {
    return CONFIDENCE_COPY.clientRoutineAck;
  }
  return CONFIDENCE_COPY.clientRoutineAck;
}

export function resolveOwnerConfidenceMessage(input: {
  humanReviewRequired: boolean;
}): string {
  if (input.humanReviewRequired) {
    return CONFIDENCE_COPY.ownerEscalation;
  }
  return CONFIDENCE_COPY.clientRoutineAck;
}
