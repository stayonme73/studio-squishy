/** Studio Self-Test V1 — internal campaign harness (The Studio as first client). */

/** Canonical server-backed campaign ID — visible in File Room (not a hidden fixture). */
export const STUDIO_SELF_TEST_CAMPAIGN_ID = "studio-self-test";

export const STUDIO_SELF_TEST_CAMPAIGN_NAME = "The Studio Self-Test Campaign";

/** Primary seeded service — social pipeline (Strategy → Copy → Creative → QA → Delivery). */
export const STUDIO_SELF_TEST_PRIMARY_SERVICE_ID = "sm-001";

/** Green launch services referenced in matrix rows (not all seeded in V1). */
export const STUDIO_SELF_TEST_GREEN_SERVICE_IDS = [
  "bf-001",
  "sm-001",
  "em-001",
  "cc-001",
  "ma-001",
  "ap-001",
] as const;

export const STUDIO_SELF_TEST_ROUTE = "/file-room/studio-self-test";

export const STUDIO_SELF_TEST_RESULTS_RELATIVE_PATH = "data/studio-self-test-results.json";

export const studioSelfTest = {
  pageTitle: "Studio Self-Test",
  pageLead:
    "Internal scoreboard for The Studio's own campaign — Discovery through Final Delivery. Run seed + runner scripts to refresh state.",
  campaignLinkLabel: "Open campaign in File Room",
  lastSeededLabel: "Last seeded",
  lastRunLabel: "Last run",
  runHint: "node scripts/run-studio-self-test.mjs",
  seedHint: "node scripts/seed-studio-self-test.mjs",
  summaryPass: "Pass",
  summaryFail: "Fail",
  summaryPending: "Pending",
  summaryNotRun: "Not run",
} as const;
