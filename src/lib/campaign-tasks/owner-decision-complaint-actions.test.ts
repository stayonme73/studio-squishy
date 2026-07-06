import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import {
  applyOwnerEscalateComplaintScope,
  applyOwnerResolveComplaint,
} from "./owner-decision-complaint-actions";
import type { OwnerDecisionInteractionRecord } from "./owner-decision-interaction-types";
import type { ServerTasksEnvelope } from "./types";

const now = "2026-07-06T20:00:00.000Z";

const owner: StudioUser = {
  id: "owner-1",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: {},
  staffCapabilities: {},
};

const INTERACTION_ID = "interaction-complaint-1";

function complaintInteraction(): OwnerDecisionInteractionRecord {
  return {
    id: INTERACTION_ID,
    campaignId: "complaint-folder-3",
    jobId: "complaint-folder-3:sm-001",
    interactionKind: "complaint",
    status: "waiting_owner",
    clientMessage: "I am frustrated with the timeline.",
    createdAt: now,
    updatedAt: now,
  };
}

function envelope(
  interaction: OwnerDecisionInteractionRecord = complaintInteraction(),
): ServerTasksEnvelope {
  return {
    campaignId: "complaint-folder-3",
    tasks: [],
    planFingerprint: "fp",
    updatedAt: now,
    version: 11,
    syncedAt: now,
    exceptionRecords: [],
    exceptionEvents: [],
    ownerDecisionInteractions: [interaction],
    qaRecords: [],
  };
}

describe("owner-decision-complaint-actions", () => {
  it("owner_resolve_complaint closes interaction", () => {
    const result = applyOwnerResolveComplaint(
      envelope(),
      {
        interactionId: INTERACTION_ID,
        clientReply: "Here is a status summary for you.",
        ownerNotes: "Resolved with timeline update.",
      },
      owner,
      assignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.interaction.status).toBe("resolved");
    expect(result.interaction.resolutionNotes).toContain("status summary");
  });

  it("owner_escalate_complaint_scope creates scope exception", () => {
    const result = applyOwnerEscalateComplaintScope(
      envelope(),
      { interactionId: INTERACTION_ID, ownerNotes: "Real issue is scope." },
      owner,
      assignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.interaction.status).toBe("resolved");
    expect(result.envelope.exceptionRecords?.some((entry) => entry.kind === "scope_change")).toBe(
      true,
    );
  });
});
