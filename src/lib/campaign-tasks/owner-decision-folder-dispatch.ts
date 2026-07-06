import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import type { ExceptionActionResult } from "./exceptions-actions";
import type { ComplaintActionResult } from "./owner-decision-complaint-actions";
import {
  applyOwnerAssignComplaint,
  applyOwnerAskClientComplaint,
  applyOwnerAskTeamComplaint,
  applyOwnerDeclineComplaintEscalation,
  applyOwnerEscalateComplaintRefund,
  applyOwnerEscalateComplaintRevision,
  applyOwnerEscalateComplaintScope,
  applyOwnerHoldComplaint,
  applyOwnerResolveComplaint,
} from "./owner-decision-complaint-actions";
import {
  applyOwnerAllowRevision,
  applyOwnerAskClientDeadline,
  applyOwnerAskClientRevision,
  applyOwnerAskTeamDeadline,
  applyOwnerAskTeamRevision,
  applyOwnerAskTeamScopeChange,
  applyOwnerAskClientApprovalScopeChange,
  applyOwnerAskClientInfoScopeChange,
  applyOwnerAssignDeadline,
  applyOwnerAssignRevision,
  applyOwnerAssignScopeChange,
  applyOwnerApproveScopeChange,
  applyOwnerCommitDeadline,
  applyOwnerDeclineScopeChange,
  applyOwnerHoldDeadline,
  applyOwnerHoldFirmRevision,
  applyOwnerHoldRevision,
  applyOwnerHoldScopeChange,
} from "./owner-decision-folder-actions";
import type { ServerTasksEnvelope } from "./types";

export type OwnerDecisionFolderPatchBody =
  | { action: "owner_commit_deadline"; exceptionId: string; ownerNotes?: string }
  | { action: "owner_hold_deadline"; exceptionId: string; note: string; ownerNotes?: string }
  | {
      action: "owner_ask_team_deadline";
      exceptionId: string;
      note: string;
      ownerNotes?: string;
      assignToUserId?: string;
    }
  | {
      action: "owner_ask_client_deadline";
      exceptionId: string;
      clientMessage: string;
      ownerNotes?: string;
    }
  | {
      action: "owner_assign_deadline";
      exceptionId: string;
      assignToUserId: string;
      ownerNotes?: string;
      note?: string;
    }
  | { action: "owner_allow_revision"; exceptionId: string; ownerNotes?: string }
  | { action: "owner_hold_firm_revision"; exceptionId: string; ownerNotes?: string }
  | { action: "owner_hold_revision"; exceptionId: string; note: string; ownerNotes?: string }
  | {
      action: "owner_ask_team_revision";
      exceptionId: string;
      note: string;
      ownerNotes?: string;
      assignToUserId?: string;
    }
  | {
      action: "owner_ask_client_revision";
      exceptionId: string;
      clientMessage: string;
      ownerNotes?: string;
    }
  | {
      action: "owner_assign_revision";
      exceptionId: string;
      assignToUserId: string;
      ownerNotes?: string;
      note?: string;
    }
  | { action: "owner_approve_scope_change"; exceptionId: string; ownerNotes?: string }
  | { action: "owner_decline_scope_change"; exceptionId: string; ownerNotes?: string }
  | { action: "owner_hold_scope_change"; exceptionId: string; note: string; ownerNotes?: string }
  | {
      action: "owner_ask_team_scope_change";
      exceptionId: string;
      note: string;
      ownerNotes?: string;
      assignToUserId?: string;
    }
  | {
      action: "owner_ask_client_info_scope_change";
      exceptionId: string;
      clientMessage: string;
      ownerNotes?: string;
    }
  | {
      action: "owner_ask_client_approval_scope_change";
      exceptionId: string;
      clientMessage: string;
      ownerNotes?: string;
    }
  | {
      action: "owner_assign_scope_change";
      exceptionId: string;
      assignToUserId: string;
      ownerNotes?: string;
      note?: string;
    }
  | {
      action: "owner_resolve_complaint";
      interactionId: string;
      clientReply: string;
      ownerNotes?: string;
    }
  | { action: "owner_escalate_complaint_refund"; interactionId: string; ownerNotes?: string }
  | {
      action: "owner_escalate_complaint_scope";
      interactionId: string;
      ownerNotes?: string;
      taskId?: string;
    }
  | {
      action: "owner_escalate_complaint_revision";
      interactionId: string;
      ownerNotes?: string;
      taskId?: string;
    }
  | { action: "owner_hold_complaint"; interactionId: string; note: string; ownerNotes?: string }
  | {
      action: "owner_ask_team_complaint";
      interactionId: string;
      note: string;
      ownerNotes?: string;
    }
  | {
      action: "owner_ask_client_complaint";
      interactionId: string;
      clientMessage: string;
      ownerNotes?: string;
    }
  | {
      action: "owner_assign_complaint";
      interactionId: string;
      ownerNotes?: string;
      note?: string;
    }
  | {
      action: "owner_decline_complaint_escalation";
      interactionId: string;
      clientReply: string;
      ownerNotes?: string;
    };

export type OwnerDecisionFolderDispatchResult =
  | ExceptionActionResult
  | ComplaintActionResult;

export function dispatchOwnerDecisionFolderAction(
  envelope: ServerTasksEnvelope,
  body: OwnerDecisionFolderPatchBody,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  targetUser?: StudioUser,
): OwnerDecisionFolderDispatchResult {
  switch (body.action) {
    case "owner_commit_deadline":
      return applyOwnerCommitDeadline(envelope, body, user, assignments);
    case "owner_hold_deadline":
      return applyOwnerHoldDeadline(envelope, body, user, assignments);
    case "owner_ask_team_deadline":
      return applyOwnerAskTeamDeadline(envelope, body, user, assignments, targetUser);
    case "owner_ask_client_deadline":
      return applyOwnerAskClientDeadline(envelope, body, user, assignments);
    case "owner_assign_deadline":
      if (!targetUser) return { ok: false, error: "Assignee not found.", status: 404 };
      return applyOwnerAssignDeadline(envelope, body, user, assignments, targetUser);
    case "owner_allow_revision":
      return applyOwnerAllowRevision(envelope, body, user, assignments);
    case "owner_hold_firm_revision":
      return applyOwnerHoldFirmRevision(envelope, body, user, assignments);
    case "owner_hold_revision":
      return applyOwnerHoldRevision(envelope, body, user, assignments);
    case "owner_ask_team_revision":
      return applyOwnerAskTeamRevision(envelope, body, user, assignments, targetUser);
    case "owner_ask_client_revision":
      return applyOwnerAskClientRevision(envelope, body, user, assignments);
    case "owner_assign_revision":
      if (!targetUser) return { ok: false, error: "Assignee not found.", status: 404 };
      return applyOwnerAssignRevision(envelope, body, user, assignments, targetUser);
    case "owner_approve_scope_change":
      return applyOwnerApproveScopeChange(envelope, body, user, assignments);
    case "owner_decline_scope_change":
      return applyOwnerDeclineScopeChange(envelope, body, user, assignments);
    case "owner_hold_scope_change":
      return applyOwnerHoldScopeChange(envelope, body, user, assignments);
    case "owner_ask_team_scope_change":
      return applyOwnerAskTeamScopeChange(envelope, body, user, assignments, targetUser);
    case "owner_ask_client_info_scope_change":
      return applyOwnerAskClientInfoScopeChange(envelope, body, user, assignments);
    case "owner_ask_client_approval_scope_change":
      return applyOwnerAskClientApprovalScopeChange(envelope, body, user, assignments);
    case "owner_assign_scope_change":
      if (!targetUser) return { ok: false, error: "Assignee not found.", status: 404 };
      return applyOwnerAssignScopeChange(envelope, body, user, assignments, targetUser);
    case "owner_resolve_complaint":
      return applyOwnerResolveComplaint(envelope, body, user, assignments);
    case "owner_escalate_complaint_refund":
      return applyOwnerEscalateComplaintRefund(envelope, body, user, assignments);
    case "owner_escalate_complaint_scope":
      return applyOwnerEscalateComplaintScope(envelope, body, user, assignments);
    case "owner_escalate_complaint_revision":
      return applyOwnerEscalateComplaintRevision(envelope, body, user, assignments);
    case "owner_hold_complaint":
      return applyOwnerHoldComplaint(envelope, body, user, assignments);
    case "owner_ask_team_complaint":
      return applyOwnerAskTeamComplaint(envelope, body, user, assignments);
    case "owner_ask_client_complaint":
      return applyOwnerAskClientComplaint(envelope, body, user, assignments);
    case "owner_assign_complaint":
      return applyOwnerAssignComplaint(envelope, body, user, assignments);
    case "owner_decline_complaint_escalation":
      return applyOwnerDeclineComplaintEscalation(envelope, body, user, assignments);
    default:
      return { ok: false, error: "Unknown action", status: 400 };
  }
}
