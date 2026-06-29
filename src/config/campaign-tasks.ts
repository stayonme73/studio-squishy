import type { ProductionTaskFamilyId, TaskPhase, TaskStatus } from "@/lib/campaign-tasks/types";

/** Production task plan — File Room read-only section (Slice 3a). */

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
  statusLabels: {
    not_ready: "Not ready",
    ready: "Ready",
    blocked: "Blocked",
  } satisfies Record<TaskStatus, string>,
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
} as const;

export function taskStatusLabel(status: TaskStatus): string {
  return campaignTasksConfig.statusLabels[status];
}

export function taskPhaseLabel(phase: TaskPhase): string {
  return campaignTasksConfig.phaseLabels[phase];
}
