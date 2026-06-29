import type {
  ProductionTaskFamilyId,
  TaskEffectiveStatus,
  TaskPhase,
} from "@/lib/campaign-tasks/types";

/** Production task plan — File Room read-only section (Slice 3a). */

export type TaskDisplayStatus = "not_ready" | "ready" | "blocked";

export const campaignTasksConfig = {
  sectionTitle: "Production task plan",
  sectionLead:
    "Server-generated tasks from the approved Studio Plan. Read-only in Slice 3a — no assignment or status updates.",
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
