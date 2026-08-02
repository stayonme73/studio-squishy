import type {
  ProductionRole,
  ProductionTaskFamilyId,
  QaAction,
  QaBlockCategory,
  QaFailCategory,
  TaskEffectiveStatus,
  TaskPhase,
} from "@/lib/campaign-tasks/types";

/** Production task plan — File Room section (Slice 3b-b-b controls). */

export type TaskDisplayStatus = "not_ready" | "ready" | "blocked";

export const campaignTasksConfig = {
  sectionTitle: "Production task plan",
  sectionLead:
    "Server-generated tasks from the approved Studio Plan. Claim, hand off, and reassign work inline when you are authorized.",
  claimLabel: "Claim",
  releaseLabel: "Release claim",
  submitHandoffLabel: "Submit handoff",
  reassignLabel: "Reassign",
  confirmSubmitLabel: "Confirm submit",
  confirmReleaseLabel: "Confirm release",
  confirmReassignLabel: "Confirm reassign",
  cancelLabel: "Cancel",
  claimedByLabel: "Claimed by",
  /** Gate #15 — always visible when no claimer (never leave ownership blank). */
  unclaimedLabel: "Unclaimed",
  responsibleRoleLabel: "Responsible role",
  handoffHistoryLabel: "Handoffs",
  conflictMessage: "This task was updated elsewhere. Refreshing to the latest state.",
  updateFailedMessage: "Update failed. Try again.",
  forbiddenActionMessage: "You don't have permission for this action.",
  reassignStaffLabel: "Assign to",
  reassignRoleLabel: "Role",
  reassignRiskLabels: {
    changesPriority: "Changes priority",
    changesDeadlineCommitment: "Changes deadline commitment",
    changesClientFacingScope: "Changes client-facing scope",
    createsMaterialRisk: "Creates material risk",
  },
  productionRoleLabels: {
    producer_dispatcher: "Producer / dispatcher",
    strategy: "Strategy",
    copy: "Copy",
    creative_production: "Creative production",
    qa: "QA",
    owner: "Owner",
    client_input: "Client input",
  } satisfies Record<ProductionRole, string>,
  emptyTitle: "No production tasks yet",
  emptyBody: "Tasks appear once an approved Studio Plan is on the server record.",
  familyLabels: {
    brand_identity_messaging: "Brand Identity / Brand Messaging",
    campaign_launch_monthly: "Campaign Launch / Monthly Support",
    social: "Social",
    copy_channels: "Email / SMS / Marketing Copy / Content Writing",
    video_audio: "Video / AI Voice Over",
    landing_page: "Landing Page Content",
    optimization: "Optimization",
    marketing_assets: "Marketing Assets",
  } satisfies Record<ProductionTaskFamilyId, string>,
  displayStatusLabels: {
    not_ready: "Not ready",
    ready: "Ready",
    blocked: "Blocked",
  } satisfies Record<TaskDisplayStatus, string>,
  effectiveStatusLabels: {
    not_ready: "Not ready",
    ready: "Ready",
    in_progress: "In progress",
    ready_for_qa: "Ready for QA",
    needs_revision: "Needs revision",
    blocked: "Blocked",
    complete: "Complete",
    cancelled: "Cancelled",
  } satisfies Record<TaskEffectiveStatus, string>,
  phaseLabels: {
    strategy: "Strategy",
    strategy_content_direction: "Content direction",
    review_strategy: "Review & strategy",
    copy: "Copy",
    creative: "Creative",
    creative_copy: "Creative & copy",
    creative_production: "Creative & production",
    qa: "QA",
    delivery_prep: "Delivery prep",
  } satisfies Record<TaskPhase, string>,
  handoffFieldLabels: {
    completedSummary: "Completed summary",
    sourceContext: "Source / context",
    nextSteps: "Next steps",
    openQuestions: "Open questions",
    risks: "Risks",
    workRef: "Work reference",
    internalNotes: "Internal notes (team only)",
    reassignmentReason: "Reassignment reason",
  },
  qaReviewLabel: "QA review",
  qaPassLabel: "Pass QA",
  qaFailLabel: "Fail QA",
  qaBlockLabel: "Block",
  qaHistoryLabel: "QA history",
  qaNotesLabel: "QA notes",
  qaCategoryLabel: "Disposition category",
  requiredCorrectionLabel: "Required correction",
  missingFactDescriptionLabel: "Missing client fact",
  missingFactReasonLabel: "Why this blocks production",
  scopeChangeHelperText:
    "Scope-changing feedback requires an exception workflow — not available in QA review.",
  scopeChangeRejectMessage:
    "Scope-changing feedback requires an exception, not QA revision.",
  qaActionLabels: {
    qa_pass: "Passed",
    qa_fail: "Failed",
    qa_block: "Blocked",
  } satisfies Record<QaAction, string>,
  qaFailCategoryLabels: {
    production_correction: "Production correction",
    missing_client_fact: "Missing client fact",
  } satisfies Record<Exclude<QaFailCategory, "scope_change">, string>,
  qaBlockCategoryLabels: {
    compliance_concern: "Compliance concern",
    direction_disagreement: "Direction disagreement",
  } satisfies Record<QaBlockCategory, string>,
  workflowBlockedReasonLabels: {
    compliance_hold: "Compliance hold — Owner review required",
    owner_escalation: "Direction hold — Owner review required",
    plan_change: "Plan change — Owner review required",
  },
  qaChecklistLabels: {
    scope_match: "Approved scope and quantity match",
    factual_accuracy: "Facts, links, dates, names, and offers are accurate",
    direction_match: "Work matches approved direction and brand context",
    usability: "Work is usable and internally consistent",
    client_safe_packaging: "Client-facing package is clean with no internal-only content",
    strategy_alignment: "Strategy aligns with approved plan",
    scope_clarity: "Scope is clear and bounded",
    direction_alignment: "Direction matches approved brief",
    brand_fit: "Brand fit verified",
    review_complete: "Review is complete",
    recommendations_clear: "Recommendations are clear",
    copy_accuracy: "Copy accuracy verified",
    brand_voice: "Brand voice consistent",
    grammar: "Grammar and spelling checked",
    visual_quality: "Visual quality meets standards",
    brand_alignment: "Brand alignment verified",
    specs_met: "Specs met",
    production_quality: "Production quality verified",
    deliverable_complete: "Deliverable complete",
    production_complete: "Production complete",
    deliverable_specs: "Deliverable specs verified",
    client_requirements: "Client requirements met",
    package_complete: "Package complete",
    fingerprint_match: "Plan fingerprint matches",
    no_internal_leaks: "No internal-only content in package",
  },
} as const;

/** Map effective status to the three display buckets used by File Room UI. */
export function toDisplayStatus(status: TaskEffectiveStatus): TaskDisplayStatus {
  switch (status) {
    case "not_ready":
    case "needs_revision":
      return "not_ready";
    case "ready":
    case "in_progress":
    case "ready_for_qa":
    case "complete":
      return "ready";
    case "blocked":
    case "cancelled":
      return "blocked";
    default:
      return "not_ready";
  }
}

export function effectiveStatusLabel(status: TaskEffectiveStatus): string {
  return campaignTasksConfig.effectiveStatusLabels[status];
}

/** @deprecated Use effectiveStatusLabel — maps display bucket for legacy UI. */
export function taskStatusLabel(status: TaskDisplayStatus): string {
  return campaignTasksConfig.displayStatusLabels[status];
}

export function taskPhaseLabel(phase: TaskPhase): string {
  return campaignTasksConfig.phaseLabels[phase];
}

export function productionRoleLabel(role: ProductionRole): string {
  return campaignTasksConfig.productionRoleLabels[role];
}

const WORKFLOW_BLOCKED_TOKENS = Object.keys(
  campaignTasksConfig.workflowBlockedReasonLabels,
) as (keyof typeof campaignTasksConfig.workflowBlockedReasonLabels)[];

/** Map internal workflow tokens to customer-facing File Room labels. */
export function formatBlockedReasonDisplay(reason: string | null | undefined): string | null {
  if (!reason) return null;
  const trimmed = reason.trim();
  if (!trimmed) return null;

  const exact =
    campaignTasksConfig.workflowBlockedReasonLabels[
      trimmed as keyof typeof campaignTasksConfig.workflowBlockedReasonLabels
    ];
  if (exact) return exact;

  for (const token of WORKFLOW_BLOCKED_TOKENS) {
    if (trimmed.includes(token)) {
      return campaignTasksConfig.workflowBlockedReasonLabels[token];
    }
  }

  if (trimmed.startsWith("missing_client_fact:")) {
    const detail = trimmed.slice("missing_client_fact:".length).trim();
    return detail
      ? `Missing client fact — ${detail}`
      : "Missing client fact — Owner input required";
  }

  return trimmed;
}
