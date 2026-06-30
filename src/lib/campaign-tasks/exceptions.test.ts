import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";

import {
  canApproveClientRequest,
  canRaiseExceptionKind,
  canResolveException,
  initialStatusForKind,
  isOpenExceptionStatus,
  validateRaiseException,
} from "./exceptions";
import type { CampaignExceptionRecord } from "./exceptions-types";

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

const producer: StudioUser = {
  id: "staff-producer",
  email: "producer@local.dev",
  displayName: "Producer",
  roles: ["staff"],
};

const qaStaff: StudioUser = {
  id: "staff-qa",
  email: "qa@local.dev",
  displayName: "QA",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: {
    "staff-producer": ["campaign-1"],
    "staff-qa": ["campaign-1"],
  },
  staffCapabilities: {
    "staff-producer": ["producer_dispatcher"],
    "staff-qa": ["qa"],
  },
};

function exception(
  overrides: Partial<CampaignExceptionRecord> = {},
): CampaignExceptionRecord {
  return {
    id: "exc-1",
    campaignId: "campaign-1",
    kind: "routine_internal",
    status: "open",
    title: "Test",
    createdAt: "2026-06-29T12:00:00.000Z",
    updatedAt: "2026-06-29T12:00:00.000Z",
    raisedByUserId: "staff-producer",
    raisedByDisplayName: "Producer",
    raisedByRole: "producer_dispatcher",
    ...overrides,
  };
}

describe("exceptions validation and status", () => {
  it("owner-held kinds start waiting_owner", () => {
    expect(initialStatusForKind("compliance_hold")).toBe("waiting_owner");
    expect(initialStatusForKind("scope_change")).toBe("waiting_owner");
    expect(initialStatusForKind("revision_exhausted")).toBe("waiting_owner");
  });

  it("missing_client_fact starts waiting_owner", () => {
    expect(initialStatusForKind("missing_client_fact")).toBe("waiting_owner");
  });

  it("client_request starts waiting_owner", () => {
    expect(initialStatusForKind("client_request")).toBe("waiting_owner");
  });

  it("routine_internal starts open", () => {
    expect(initialStatusForKind("routine_internal")).toBe("open");
  });

  it("validateRaiseException requires title", () => {
    const result = validateRaiseException({ kind: "routine_internal", title: "  " });
    expect(result.ok).toBe(false);
  });

  it("terminal statuses are not open", () => {
    expect(isOpenExceptionStatus("resolved")).toBe(false);
    expect(isOpenExceptionStatus("open")).toBe(true);
  });
});

describe("exception permissions", () => {
  it("producer can resolve routine_internal", () => {
    expect(
      canResolveException(producer, exception({ kind: "routine_internal" }), assignments),
    ).toBe(true);
  });

  it("producer cannot resolve compliance_hold", () => {
    expect(
      canResolveException(producer, exception({ kind: "compliance_hold" }), assignments),
    ).toBe(false);
  });

  it("owner can resolve compliance_hold", () => {
    expect(
      canResolveException(owner, exception({ kind: "compliance_hold" }), assignments),
    ).toBe(true);
  });

  it("only owner can approve promotable exceptions in waiting_owner and waiting_internal", () => {
    const clientReq = exception({ kind: "client_request", status: "waiting_owner" });
    const missingFact = exception({ kind: "missing_client_fact", status: "waiting_owner" });
    const onHold = exception({ kind: "missing_client_fact", status: "waiting_internal" });
    const compliance = exception({ kind: "compliance_hold", status: "waiting_owner" });

    expect(canApproveClientRequest(owner, clientReq)).toBe(true);
    expect(canApproveClientRequest(owner, missingFact)).toBe(true);
    expect(canApproveClientRequest(owner, onHold)).toBe(true);
    expect(canApproveClientRequest(owner, compliance)).toBe(false);
    expect(canApproveClientRequest(producer, clientReq)).toBe(false);
    expect(canApproveClientRequest(qaStaff, clientReq)).toBe(false);
  });

  it("only owner or producer can raise client_request", () => {
    expect(canRaiseExceptionKind(owner, assignments, "client_request")).toBe(true);
    expect(canRaiseExceptionKind(producer, assignments, "client_request")).toBe(true);
    expect(canRaiseExceptionKind(qaStaff, assignments, "client_request")).toBe(false);
    expect(canRaiseExceptionKind(qaStaff, assignments, "deadline_risk")).toBe(true);
  });
});
