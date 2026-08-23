import type { ServiceId } from "@/catalog/types";
import type {
  MaterialCategory,
  MaterialContentKind,
  MaterialRequirementLevel,
} from "@/lib/materials/types";
import type { CopyQualityQaPayload } from "@/lib/studio-kitchen-production/copy-quality/types";
import type { DesignQualityQaPayload } from "@/lib/studio-kitchen-production/design-quality/types";
import type { LandingPageQaPayload } from "@/lib/studio-kitchen-production/landing-page/types";
import type { VideoQualityQaPayload } from "@/lib/studio-kitchen-production/video-production/types";
import type { AudioQualityQaPayload } from "@/lib/studio-kitchen-production/voice-production/types";

import type { OwnerDecisionFolderPatchBody } from "./owner-decision-folder-patch-types";
import type { CampaignExceptionClientRequestDraft, CampaignExceptionKind } from "./exceptions-types";
import type {
  HandoffPayload,
  ProductionRole,
  QaBlockCategory,
  QaFailCategory,
  ReassignmentFlags,
  TaskWorkflowState,
} from "./types";

export type TasksPatchBody =
  | {
      action: "claim";
      taskId: string;
      from: "unstarted" | "needs_revision";
      claimVersion: string | null;
    }
  | {
      action: "submit_for_handoff";
      taskId: string;
      from: "in_progress";
      claimVersion: string | null;
      handoff: HandoffPayload & { workVersionId?: string };
    }
  | {
      action: "release_claim";
      taskId: string;
      from: "in_progress";
      claimVersion: string | null;
      handoff: HandoffPayload & { workVersionId?: string };
    }
  | {
      action: "reassign";
      taskId: string;
      from: TaskWorkflowState;
      claimVersion: string | null;
      toUserId: string;
      toRole: ProductionRole;
      handoff: HandoffPayload & { workVersionId?: string };
      reason?: string;
      reassignmentFlags?: ReassignmentFlags;
    }
  | {
      action: "qa_pass";
      taskId: string;
      from: "ready_for_qa";
      claimVersion: string | null;
      checks: string[];
      notes?: string;
      workVersionId?: string;
      copyQuality?: CopyQualityQaPayload;
      designQuality?: DesignQualityQaPayload;
      audioQuality?: AudioQualityQaPayload;
      videoQuality?: VideoQualityQaPayload;
      landingPageQa?: LandingPageQaPayload;
    }
  | {
      action: "qa_fail";
      taskId: string;
      from: "ready_for_qa";
      claimVersion: string | null;
      category: QaFailCategory;
      notes?: string;
      missingFactDescription?: string;
      missingFactReason?: string;
      workVersionId?: string;
    }
  | {
      action: "qa_block";
      taskId: string;
      from: "ready_for_qa";
      claimVersion: string | null;
      category: QaBlockCategory;
      notes?: string;
      workVersionId?: string;
    }
  | {
      action: "raise_exception";
      kind: CampaignExceptionKind;
      title: string;
      description?: string;
      taskId?: string;
      clientRequestDraft?: CampaignExceptionClientRequestDraft;
    }
  | {
      action: "assign_exception";
      exceptionId: string;
      assignToUserId?: string;
      notes?: string;
    }
  | {
      action: "resolve_exception";
      exceptionId: string;
      resolutionNotes?: string;
    }
  | {
      action: "approve_client_request";
      exceptionId: string;
      category: MaterialCategory;
      contentKind?: MaterialContentKind;
      clientFacingLabel: string;
      clientFacingPrompt: string;
      whyNeeded: string;
      requirementLevel: MaterialRequirementLevel;
      relatedServiceIds?: readonly ServiceId[];
      existingMaterialItemIds?: readonly string[];
    }
  | {
      action: "decline_promotion";
      exceptionId: string;
      notes?: string;
    }
  | {
      action: "owner_clear_compliance_hold";
      exceptionId: string;
      ownerNotes?: string;
    }
  | {
      action: "owner_hold_compliance_hold";
      exceptionId: string;
      note: string;
      ownerNotes?: string;
    }
  | {
      action: "owner_ask_team_compliance_hold";
      exceptionId: string;
      note: string;
      ownerNotes?: string;
      assignToUserId?: string;
    }
  | {
      action: "owner_assign_compliance_hold";
      exceptionId: string;
      assignToUserId: string;
      ownerNotes?: string;
      note?: string;
    }
  | {
      action: "owner_confirm_direction_disagreement";
      exceptionId: string;
      ownerNotes?: string;
    }
  | {
      action: "owner_hold_direction_disagreement";
      exceptionId: string;
      note: string;
      ownerNotes?: string;
    }
  | {
      action: "owner_ask_team_direction_disagreement";
      exceptionId: string;
      note: string;
      ownerNotes?: string;
      assignToUserId?: string;
    }
  | {
      action: "owner_assign_direction_disagreement";
      exceptionId: string;
      assignToUserId: string;
      ownerNotes?: string;
      note?: string;
    }
  | {
      action: "complete_internal_owner_follow_up";
      exceptionId?: string;
      interactionId?: string;
      jobId?: string;
      note: string;
      outcome: "needs_owner_judgment" | "resolved_without_owner";
      resolutionNotes?: string;
    }
  | {
      action: "owner_apply_project_change_scope";
      exceptionId: string;
      change: { kind: string; serviceId: string };
      ownerNotes?: string;
    }
  | OwnerDecisionFolderPatchBody;
