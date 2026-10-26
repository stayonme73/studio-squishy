/**
 * STUDIO-ORGANIZATION-SYSTEM-1
 * Operating roster, subscription register, reminder calendar, daily brief.
 * Not Owner Console. Does not start product work. Does not publish.
 */

export const STUDIO_ORGANIZATION_SYSTEM_PACKAGE_ID =
  "STUDIO-ORGANIZATION-SYSTEM-1" as const;

export const studioOrganizationSystemV1 = {
  packageId: STUDIO_ORGANIZATION_SYSTEM_PACKAGE_ID,
  authorizedAt: "2026-09-30" as const,
  started: true as const,
  kind: "owner_operating_system" as const,
  ownerConsoleUntouched: true as const,
  doNotReopenOwnerConsole: true as const,
  doNotBuildDashboard: true as const,
  doNotStartProductWork: true as const,
  currentActiveProductWork:
    "STUDIO-$549-CLIP-REPURPOSING-VALUE-DELIVERY-1" as const,
  doNotStartMenuCleanup: true as const,
  doNotStartAdCreative: true as const,
  doNotStartAiLocalVisibility: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  noSecretsInRegister: true as const,
  doNotInventCostsOrDates: true as const,
  launchReadinessChecklistPath:
    "STUDIO-LAUNCH-READINESS-CHECKLIST.md" as const,
  launchReadinessChecklistPresent: false as const,
  stampDir: "docs/launch/studio-organization-system-1" as const,
} as const;
