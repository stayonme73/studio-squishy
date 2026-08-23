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
  | { action: "owner_approve_pricing_exception"; exceptionId: string; ownerNotes?: string }
  | { action: "owner_decline_pricing_exception"; exceptionId: string; ownerNotes?: string }
  | { action: "owner_hold_pricing_exception"; exceptionId: string; note: string; ownerNotes?: string }
  | {
      action: "owner_ask_team_pricing_exception";
      exceptionId: string;
      note: string;
      ownerNotes?: string;
      assignToUserId?: string;
    }
  | {
      action: "owner_ask_client_info_pricing_exception";
      exceptionId: string;
      clientMessage: string;
      ownerNotes?: string;
    }
  | {
      action: "owner_ask_client_approval_pricing_exception";
      exceptionId: string;
      clientMessage: string;
      ownerNotes?: string;
    }
  | {
      action: "owner_assign_pricing_exception";
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
