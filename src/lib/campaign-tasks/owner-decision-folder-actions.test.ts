import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import {
  applyOwnerAllowRevision,
  applyOwnerApproveScopeChange,
  applyOwnerCommitDeadline,
  applyOwnerDeclineScopeChange,
  applyOwnerHoldFirmRevision,
} from "./owner-decision-folder-actions";
import type { CampaignExceptionRecord, CampaignTaskItem, ServerTasksEnvelope } from "./types";

const now = "2026-07-06T20:00:00.000Z";

const owner: StudioUser = {
  id: "owner-1",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "staff-producer": ["owner-folder-3"] },
  staffCapabilities: { "staff-producer": ["producer_dispatcher"] },
};

function exception(
  id: string,
  kind: CampaignExceptionRecord["kind"],
): CampaignExceptionRecord {
  return {
    id,
    campaignId: "owner-folder-3",
    kind,
    status: "waiting_owner",
    title: `${kind} test`,
    createdAt: now,
    updatedAt: now,
    raisedByUserId: "staff-producer",
    raisedByDisplayName: "Producer",
    raisedByRole: "producer_dispatcher",
  };
}

function envelope(records: CampaignExceptionRecord[]): ServerTasksEnvelope {
  return {
    campaignId: "owner-folder-3",
    tasks: [] as CampaignTaskItem[],
    planFingerprint: "fp",
    updatedAt: now,
    version: 11,
    syncedAt: now,
    exceptionRecords: records,
    exceptionEvents: [],
    qaRecords: [],
  };
}

describe("owner-decision-folder-actions", () => {
  it("owner_commit_deadline resolves deadline exception", () => {
    const exc = exception("exc-deadline", "deadline_commitment");
    const result = applyOwnerCommitDeadline(
      envelope([exc]),
      { exceptionId: exc.id, ownerNotes: "Committed Friday." },
      owner,
      assignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.exception.status).toBe("resolved");
    expect(result.exception.resolutionNotes).toContain("Committed Friday");
  });

  it("owner_allow_revision resolves revision exception", () => {
    const exc = exception("exc-revision", "revision_exhausted");
    const result = applyOwnerAllowRevision(
      envelope([exc]),
      { exceptionId: exc.id, ownerNotes: "One more round." },
      owner,
      assignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.exception.status).toBe("resolved");
  });

  it("owner_hold_firm_revision resolves with firm suffix", () => {
    const exc = exception("exc-revision-firm", "revision_exhausted");
    const result = applyOwnerHoldFirmRevision(
      envelope([exc]),
      { exceptionId: exc.id, ownerNotes: "Held firm." },
      owner,
      assignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.exception.resolutionNotes).toContain("held Studio boundary");
  });

  it("owner_approve_scope_change resolves scope exception", () => {
    const exc = exception("exc-scope", "scope_change");
    const result = applyOwnerApproveScopeChange(
      envelope([exc]),
      { exceptionId: exc.id, ownerNotes: "Approved add-on." },
      owner,
      assignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.exception.status).toBe("resolved");
  });

  it("owner_decline_scope_change resolves scope exception", () => {
    const exc = exception("exc-scope-decline", "scope_change");
    const result = applyOwnerDeclineScopeChange(
      envelope([exc]),
      { exceptionId: exc.id },
      owner,
      assignments,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.exception.resolutionNotes).toContain("declined scope change");
  });
});
