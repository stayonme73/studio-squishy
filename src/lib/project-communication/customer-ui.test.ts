import { describe, expect, it } from "vitest";

import { PROJECT_COMMUNICATION_CUSTOMER_V1 as copy } from "@/config/project-communication-customer-v1";

import {
  assertCustomerCommunicationCopyContract,
  customerCommunicationSenderLabel,
} from "./customer-ui";

describe("customer project communication UI contract", () => {
  it("maps sender roles to You / The Studio", () => {
    expect(customerCommunicationSenderLabel("customer")).toBe("You");
    expect(customerCommunicationSenderLabel("studio_staff")).toBe("The Studio");
  });

  it("keeps protected COMM-1 success and awaiting copy", () => {
    const contract = assertCustomerCommunicationCopyContract();
    expect(contract.successCopy).toBe("Message sent to The Studio.");
    expect(contract.awaitingReplyLabel).toBe("The Studio has not replied yet.");
    expect(contract.emptyState).toBe("No project messages yet.");
  });

  it("does not include deferred delivery / chat / agent claims", () => {
    const blob = JSON.stringify(copy).toLowerCase();
    expect(blob).not.toMatch(/delivered|read receipt|\bseen\b|email sent|live chat|typing|host|voice|ai agent/);
  });
});
