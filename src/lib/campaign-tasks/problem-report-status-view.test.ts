import { describe, expect, it } from "vitest";

import type { OwnerDecisionInteractionRecord } from "./owner-decision-interaction-types";
import { toProblemReportCustomerStatus, toProblemReportCustomerView } from "./problem-report-status-view";

const NOW = "2026-07-31T20:00:00.000Z";

function interaction(
  status: OwnerDecisionInteractionRecord["status"],
): OwnerDecisionInteractionRecord {
  return {
    id: "interaction-complaint-c1-1",
    campaignId: "c1",
    interactionKind: "complaint",
    status,
    clientMessage: "Something went wrong.",
    createdAt: NOW,
    updatedAt: NOW,
    resolutionNotes: "Owner escalate (complaint -> refund folder)",
  };
}

describe("toProblemReportCustomerStatus", () => {
  it("maps waiting_owner to received", () => {
    expect(toProblemReportCustomerStatus("waiting_owner")).toBe("received");
  });

  it("maps waiting_internal to received (no stronger truthful claim available)", () => {
    expect(toProblemReportCustomerStatus("waiting_internal")).toBe("received");
  });

  it("maps waiting_client to additional_information_requested", () => {
    expect(toProblemReportCustomerStatus("waiting_client")).toBe("additional_information_requested");
  });

  it("maps resolved to closed", () => {
    expect(toProblemReportCustomerStatus("resolved")).toBe("closed");
  });
});

describe("toProblemReportCustomerView", () => {
  it("never surfaces internal resolutionNotes or clientMessage to the customer view", () => {
    const view = toProblemReportCustomerView(interaction("resolved"));
    expect(view).toEqual({
      status: "closed",
      statusLabel: "Closed",
      submittedAt: NOW,
      updatedAt: NOW,
    });
    expect(JSON.stringify(view)).not.toContain("Owner escalate");
    expect(JSON.stringify(view)).not.toContain("Something went wrong");
  });

  it("produces the exact truthful label set — no assigned/escalated/SLA language", () => {
    const labels = (
      ["waiting_owner", "waiting_internal", "waiting_client", "resolved"] as const
    ).map((status) => toProblemReportCustomerView(interaction(status)).statusLabel);

    expect(labels).toEqual([
      "Received by the Studio system",
      "Received by the Studio system",
      "Additional information requested",
      "Closed",
    ]);

    const forbidden = ["Assigned", "specialist", "Escalated", "investigat", "due", "notified"];
    for (const label of labels) {
      for (const word of forbidden) {
        expect(label.toLowerCase()).not.toContain(word.toLowerCase());
      }
    }
  });
});
