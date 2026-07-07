/**
 * Client refund request channels — V1 intake gate.
 * All channels must submit structured text fields through the same intake gate.
 * @see docs/refund-request-intake-v1.md
 */

/** Where the client initiated a refund request. */
export type RefundRequestSourceChannel =
  | "squishy_chat_post_payment"
  | "studio_board_help"
  | "review_room_message"
  | "final_delivery_help"
  | "structured_customer_form";

export type RefundRequestChannelDefinition = {
  id: RefundRequestSourceChannel;
  label: string;
  /** Customer-facing room / surface */
  customerSurface: string;
  /** Default Decision Core event when channel does not send refund_request explicitly */
  defaultEventType:
    | "refund_request"
    | "payment_question"
    | "general_inquiry"
    | "revision_message"
    | "support_request";
  /** V1 — client must type; voice notes are not accepted for refund intake */
  clientInputMode: "text_only";
};

export const REFUND_REQUEST_CHANNELS: Record<
  RefundRequestSourceChannel,
  RefundRequestChannelDefinition
> = {
  squishy_chat_post_payment: {
    id: "squishy_chat_post_payment",
    label: "Squishy chat (post-payment)",
    customerSurface: "Squishy chat after Secure Checkout",
    defaultEventType: "refund_request",
    clientInputMode: "text_only",
  },
  studio_board_help: {
    id: "studio_board_help",
    label: "Studio Board help / update",
    customerSurface: "Studio Board — help and project update area",
    defaultEventType: "payment_question",
    clientInputMode: "text_only",
  },
  review_room_message: {
    id: "review_room_message",
    label: "Review Room message",
    customerSurface: "Review Room — client message to The Studio",
    defaultEventType: "revision_message",
    clientInputMode: "text_only",
  },
  final_delivery_help: {
    id: "final_delivery_help",
    label: "Final Delivery help",
    customerSurface: "Final Delivery — help and support area",
    defaultEventType: "general_inquiry",
    clientInputMode: "text_only",
  },
  structured_customer_form: {
    id: "structured_customer_form",
    label: "Structured customer interaction form",
    customerSurface: "Any structured customer interaction form",
    defaultEventType: "refund_request",
    clientInputMode: "text_only",
  },
};

export const REFUND_REQUEST_CHANNEL_IDS = Object.keys(
  REFUND_REQUEST_CHANNELS,
) as RefundRequestSourceChannel[];

export function isRefundRequestSourceChannel(
  value: unknown,
): value is RefundRequestSourceChannel {
  return (
    typeof value === "string" &&
    REFUND_REQUEST_CHANNEL_IDS.includes(value as RefundRequestSourceChannel)
  );
}

export function resolveRefundRequestChannel(
  value: unknown,
): RefundRequestSourceChannel {
  if (isRefundRequestSourceChannel(value)) return value;
  return "structured_customer_form";
}
