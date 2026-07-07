import type { IncomingCustomerEventType } from "@/decision-core";
import {
  REFUND_REQUEST_CHANNELS,
  type RefundRequestSourceChannel,
  isRefundRequestSourceChannel,
  resolveRefundRequestChannel,
} from "@/config/refund-request-channels";

import {
  REFUND_INTAKE_CASUAL_PROMPT,
  REFUND_INTAKE_MISSING_OUTCOME,
  isRefundIntakeComplete,
  refundIntakeFromFacts,
  type RefundIntakePayload,
} from "./refund-request-intake";

export const REFUND_VOICE_INPUT_REJECTED_PROMPT =
  "Refund requests must be typed in text. Please type your refund reason and what outcome you want — voice notes cannot start a refund review.";

export type RefundClientInputMode = "text" | "voice";

export type RefundChannelRequestInput = {
  eventType: IncomingCustomerEventType;
  message?: string;
  inputMode?: RefundClientInputMode;
  sourceChannel?: unknown;
  facts?: Record<string, unknown>;
};

export type RefundChannelRoutingResult =
  | { kind: "not_refund" }
  | { kind: "reject_voice"; squishyMessage: string; sourceChannel: RefundRequestSourceChannel }
  | {
      kind: "intake_required";
      squishyMessage: string;
      sourceChannel: RefundRequestSourceChannel;
      intake: RefundIntakePayload;
    }
  | {
      kind: "submit";
      sourceChannel: RefundRequestSourceChannel;
      intake: Required<Pick<RefundIntakePayload, "reason" | "requestedOutcome">> &
        Pick<RefundIntakePayload, "supportingDetails" | "sourceChannel">;
    };

const CASUAL_REFUND_PATTERNS = [
  /\b(i\s+)?want\s+(a\s+)?refund\b/i,
  /\brequest(ing)?\s+(a\s+)?refund\b/i,
  /\bget\s+(my\s+)?money\s+back\b/i,
  /\bneed\s+(a\s+)?refund\b/i,
  /\brefund\s+my\s+(payment|order|project)\b/i,
];

export function messageMentionsRefundCasually(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  return CASUAL_REFUND_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function resolveSourceChannelFromEvent(
  eventType: IncomingCustomerEventType,
  explicit?: unknown,
): RefundRequestSourceChannel {
  if (isRefundRequestSourceChannel(explicit)) return explicit;
  switch (eventType) {
    case "refund_request":
      return "squishy_chat_post_payment";
    case "payment_question":
      return "studio_board_help";
    case "revision_message":
    case "revision_request":
      return "review_room_message";
    case "delivery_approval":
    case "general_inquiry":
    case "support_request":
      return "final_delivery_help";
    default:
      return resolveRefundRequestChannel(explicit);
  }
}

export function shouldRouteEventThroughRefundIntake(
  eventType: IncomingCustomerEventType,
  message?: string,
): boolean {
  if (eventType === "refund_request") return true;
  if (!message?.trim()) return false;
  return messageMentionsRefundCasually(message);
}

export function evaluateClientRefundChannelRequest(
  input: RefundChannelRequestInput,
): RefundChannelRoutingResult {
  const message =
    input.message?.trim() ||
    (typeof input.facts?.message === "string" ? input.facts.message.trim() : undefined);

  if (!shouldRouteEventThroughRefundIntake(input.eventType, message)) {
    return { kind: "not_refund" };
  }

  const sourceChannel = resolveSourceChannelFromEvent(input.eventType, input.sourceChannel);
  const channel = REFUND_REQUEST_CHANNELS[sourceChannel];
  const inputMode: RefundClientInputMode =
    input.inputMode === "voice" || input.facts?.inputMode === "voice" ? "voice" : "text";

  if (channel.clientInputMode === "text_only" && inputMode === "voice") {
    return {
      kind: "reject_voice",
      squishyMessage: REFUND_VOICE_INPUT_REJECTED_PROMPT,
      sourceChannel,
    };
  }

  const intake: RefundIntakePayload = {
    ...refundIntakeFromFacts(input.facts),
    sourceChannel,
  };

  if (!isRefundIntakeComplete(intake)) {
    const squishyMessage = !intake.reason?.trim()
      ? REFUND_INTAKE_CASUAL_PROMPT
      : REFUND_INTAKE_MISSING_OUTCOME;
    return { kind: "intake_required", squishyMessage, sourceChannel, intake };
  }

  return {
    kind: "submit",
    sourceChannel,
    intake: {
      reason: intake.reason!.trim(),
      requestedOutcome: intake.requestedOutcome!.trim(),
      supportingDetails: intake.supportingDetails?.trim(),
      sourceChannel,
    },
  };
}
