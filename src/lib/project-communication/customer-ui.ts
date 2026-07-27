import { PROJECT_COMMUNICATION_CUSTOMER_V1 as copy } from "@/config/project-communication-customer-v1";

export type CustomerCommunicationSenderRole = "customer" | "studio_staff";

export function customerCommunicationSenderLabel(
  role: CustomerCommunicationSenderRole,
): string {
  return role === "customer" ? copy.youLabel : copy.studioLabel;
}

export function assertCustomerCommunicationCopyContract(): {
  successCopy: string;
  awaitingReplyLabel: string;
  emptyState: string;
} {
  return {
    successCopy: copy.successCopy,
    awaitingReplyLabel: copy.awaitingReplyLabel,
    emptyState: copy.emptyState,
  };
}
