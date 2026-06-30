import type { ProductionRole } from "@/lib/campaign-tasks/types";

/** Team Office route slugs — exact ProductionRole values. */
export const TEAM_OFFICE_ROLE_SLUGS = [
  "producer_dispatcher",
  "strategy",
  "copy",
  "creative_production",
  "qa",
] as const;

export type TeamOfficeRoleSlug = (typeof TEAM_OFFICE_ROLE_SLUGS)[number];

/** Offices implemented in V1. */
export const TEAM_OFFICE_V1_LIVE_SLUGS: readonly TeamOfficeRoleSlug[] = [
  "strategy",
  "copy",
  "creative_production",
  "qa",
  "producer_dispatcher",
];

export const teamOffices = {
  notBuiltTitle: "Office not available",
  notBuiltBody: "This team office is not built yet. Use File Room for Kitchen V1.",
  wrongRoleReadOnlyLabel: "Read-only — this work belongs to another production role.",
  waitingForQaLabel: "Waiting for QA review in File Room.",
  qaStatusLabel: "QA status",
  strategyContextTitle: "Strategy context",
  strategyContextEmpty: "No strategy direction saved yet.",
  copyContextTitle: "Copy draft",
  copyContextEmpty: "No copy draft saved yet.",
  discoverySnippetTitle: "Discovery",
  discoverySnippetEmpty: "No discovery answers on file.",
  downstreamTitle: "Downstream status",
  downstreamCopyEmpty: "Copy stage not started.",
  downstreamCreativeEmpty: "Creative stage not started.",
  activeWorkTitle: "Active work",
  contextRailTitle: "Campaign context",
  backToCampaignLabel: "Campaign detail",
  producerDispatchTitle: "Dispatch board",
  producerHandoffFeedTitle: "Recent handoffs",
  producerHandoffFeedEmpty: "No handoffs recorded yet.",
  producerExceptionsTitle: "Open exceptions",
  producerBlockedTitle: "Blocked",
  producerStalledTitle: "Stalled",
  producerReadyForQaTitle: "Ready for QA",
  producerNeedsRevisionTitle: "Needs revision",
  producerUnclaimedReadyTitle: "Unclaimed ready",
  producerDispatchEmpty: "No dispatch items for this campaign.",
  officeLeads: {
    strategy: "Strategy production queue for this campaign.",
    copy: "Copy production queue for this campaign.",
    creative_production: "Creative production queue for this campaign.",
    qa: "QA review queue for this campaign.",
    producer_dispatcher: "Producer dispatch view for this campaign.",
  } satisfies Record<TeamOfficeRoleSlug, string>,
  queueTitles: {
    strategy: "Strategy queue",
    copy: "Copy queue",
    creative_production: "Creative queue",
    qa: "QA queue",
    producer_dispatcher: "Dispatch queue",
  } satisfies Record<TeamOfficeRoleSlug, string>,
  queueEmpty: {
    strategy: "No strategy tasks in this campaign.",
    copy: "No copy tasks in this campaign.",
    creative_production: "No creative tasks in this campaign.",
    qa: "No tasks awaiting QA in this campaign.",
    producer_dispatcher: "No dispatch items in this campaign.",
  } satisfies Record<TeamOfficeRoleSlug, string>,
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
