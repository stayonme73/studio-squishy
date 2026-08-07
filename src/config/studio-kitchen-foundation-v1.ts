/**
 * Studio Kitchen Foundation V1 — production-truth projection config.
 *
 * Authority: docs/studio-kitchen-foundation-v1-locked.md
 * Motto: One production truth. Kitchen projects; it does not invent.
 */

export const STUDIO_KITCHEN_FOUNDATION_VERSION = "1.0.0" as const;

/** Staff demo query — fixtures only when explicitly requested. Never mixes into live truth. */
export const KITCHEN_FIXTURE_DEMO_QUERY = "demo";

export const studioKitchenFoundation = {
  version: STUDIO_KITCHEN_FOUNDATION_VERSION,
  page: {
    eyebrow: "Internal production",
    title: "Studio Kitchen",
    lead:
      "Internal operating view of real Studio production state — Campaign Record, jobs, tasks, QA, blockers, and exceptions.",
    phaseNote:
      "Foundation — Kitchen projects existing File Room / job-control / campaign-tasks truth. It does not maintain a parallel production world.",
    liveBadge: "Live production",
    fixtureBadge: "Fixture / demo — not live production",
    emptyTitle: "No live production campaigns yet",
    emptyBody:
      "When a purchased campaign has a Campaign Record on the server, it will appear here from real production state. Nothing is invented to fill this screen.",
    emptyFixtureHint:
      "Staff demo fixtures are available with ?demo=1. Fixture folders are labeled and never treated as live jobs.",
    unavailableLabel: "Not yet recorded",
    unknownCampaignTitle: "Campaign unavailable",
    unknownCampaignBody:
      "That campaign ID is not available as live production truth in the Kitchen. No fixture was substituted.",
    noTasksTitle: "No production tasks recorded yet",
    noTasksBody:
      "Tasks appear after the approved Studio Plan generates a task envelope in File Room. Viewing Kitchen does not create tasks.",
    noJobsTitle: "No purchased jobs recorded yet",
    noJobsBody:
      "Job spine records appear from the approved plan and task envelope. Kitchen does not invent jobs.",
    openFileRoomLabel: "Open File Room",
    projectionNote:
      "Bucket placement is a Kitchen presentation projection from the job spine — not a second status ledger.",
  },
  deferred: [
    "Studio Voice live production connection",
    "Owner Console refinement",
    "Make integration",
    "Canva integration",
    "CapCut integration",
    "Service-specific production certification",
    "Supabase production system-of-record migration",
    "Broad Squishy cleanup",
  ],
} as const;
