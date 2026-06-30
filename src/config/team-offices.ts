import type { ProductionRole } from "@/lib/campaign-tasks/types";

/** Team Office route slugs — exact ProductionRole values (V1: copy only). */
export const TEAM_OFFICE_ROLE_SLUGS = [
  "producer_dispatcher",
  "strategy",
  "copy",
  "creative_production",
  "qa",
] as const;

export type TeamOfficeRoleSlug = (typeof TEAM_OFFICE_ROLE_SLUGS)[number];

/** Offices implemented in V1 — all other slugs return not-built. */
export const TEAM_OFFICE_V1_LIVE_SLUGS: readonly TeamOfficeRoleSlug[] = ["copy"];

export const teamOffices = {
  copyOfficeTitle: "Copy Office",
  copyOfficeLead: "Copy production queue for this campaign.",
  notBuiltTitle: "Office not available",
  notBuiltBody: "This team office is not built yet. Use File Room or Copy Office for Kitchen V1.",
  wrongRoleReadOnlyLabel: "Read-only — this work belongs to another production role.",
  waitingForQaLabel: "Waiting for QA review in File Room.",
  qaStatusLabel: "QA status",
  strategyContextTitle: "Strategy context",
  strategyContextEmpty: "No strategy direction saved yet.",
  downstreamTitle: "Downstream status",
  downstreamEmpty: "Creative stage not started.",
  queueTitle: "Copy queue",
  queueEmpty: "No copy tasks in this campaign.",
  activeWorkTitle: "Active work",
  contextRailTitle: "Campaign context",
  backToCampaignLabel: "Campaign detail",
  openCopyOfficeLabel: "Copy Office",
} as const;

export function isTeamOfficeRoleSlug(value: string): value is TeamOfficeRoleSlug {
  return (TEAM_OFFICE_ROLE_SLUGS as readonly string[]).includes(value);
}

export function isTeamOfficeV1Live(slug: TeamOfficeRoleSlug): boolean {
  return (TEAM_OFFICE_V1_LIVE_SLUGS as readonly string[]).includes(slug);
}

export function officeRoleFromSlug(slug: TeamOfficeRoleSlug): ProductionRole {
  return slug;
}

export function teamOfficePath(campaignId: string, slug: TeamOfficeRoleSlug): string {
  return `/file-room/${campaignId}/office/${slug}`;
}

export const teamOfficeRoleLabels: Record<TeamOfficeRoleSlug, string> = {
  producer_dispatcher: "Producer",
  strategy: "Strategy",
  copy: "Copy",
  creative_production: "Creative",
  qa: "QA",
};
