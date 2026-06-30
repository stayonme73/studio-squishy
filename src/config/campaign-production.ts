import type {
  ProductionVersionReason,
  ProductionWorkUnitStatus,
} from "@/lib/campaign-production/types";
import type { KitchenV1ProductionPhase } from "@/lib/campaign-production/types";

/** Kitchen V1 — File Room production work panel copy. */
export const campaignProductionConfig = {
  panelTitle: "Production work",
  panelLead:
    "Draft and version text work for this production stage. Handoffs and QA pin the current work version.",
  deliverableKeysLabel: "Deliverable scope",
  currentVersionLabel: "Current version",
  saveVersionLabel: "Save version",
  savingLabel: "Saving…",
  emptyBodyPlaceholder: "Write production work for this stage…",
  versionHistoryLabel: "Version history",
  noVersionsLabel: "No versions yet — save the first draft.",
  workVersionIdHelper:
    "Handoffs and QA use the current work version ID shown above.",
  noWorkUnitMessage: "Production work unit not initialized for this service.",
  blockedPlanChangeMessage:
    "Plan changed — this work unit is blocked. A new work unit will be created for the updated scope.",
  supersededMessage: "This work unit was superseded when the plan changed.",
  wrongStageMessage: "Work unit is at a different production stage.",
  updateFailedMessage: "Failed to save production work.",
  versionReasonLabels: {
    initial: "Initial draft",
    internal_revision: "Internal revision",
    qa_revision: "QA revision",
    client_revision: "Client revision",
  } satisfies Record<ProductionVersionReason, string>,
  workUnitStatusLabels: {
    active: "Active",
    blocked_plan_change: "Blocked — plan change",
    superseded: "Superseded",
    complete: "Complete",
  } satisfies Record<ProductionWorkUnitStatus, string>,
  stageLabels: {
    strategy_content_direction: "Content direction",
    copy: "Copy",
    creative: "Creative",
  } satisfies Record<KitchenV1ProductionPhase, string>,
  qaPinActionLabels: {
    qa_pass: "QA passed",
    qa_fail: "QA failed",
  },
} as const;
