/**
 * Work Supervision and Incident Escalation.
 * OPEN 2026-08-23. Opening artifacts only. Not implemented. Not certified.
 * Base: mobile park tip bc458931. Room 4 only. Do not assign Room 4D / 4E.
 * Do not merge. Do not start Room 5. Do not unpark mobile until this package closes.
 */

export const studioWorkSupervisionAndIncidentEscalationV1 = {
  packageId:
    "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1" as const,
  schemaVersion: 1 as const,
  room: 4 as const,
  roomId: "full-business-rehearsal" as const,
  sectionId: "work-supervision-and-incident-escalation" as const,
  title: "Work Supervision and Incident Escalation" as const,
  status: "OPEN" as const,
  progress: "IN_PROGRESS" as const,
  sectionClosed: false as const,
  openingArtifactsOnly: true as const,
  implementationAuthorized: false as const,
  baseCommit: "bc458931c46ed845b982f62a4c70f8a312c169c8" as const,
  baseBranch:
    "operating/mobile-customer-journey-certification-1" as const,
  openedAt: "2026-08-23" as const,
  branch: "operating/work-supervision-and-incident-escalation-1" as const,
  mobilePackageId:
    "STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1" as const,
  mobilePackageStatus: "PARKED" as const,
  mobileReadinessTip: "b35c8aa2c2fdc7b1f1f5161d38479fdded0e5361" as const,
  mobileParkTip: "bc458931c46ed845b982f62a4c70f8a312c169c8" as const,
  resumeMobileAfterThisPackageCloses: true as const,

  doNotMerge: true as const,
  doNotStartRoom5: true as const,
  doNotAssignRoom4dOr4eLabel: true as const,
  doNotChangeLaunchNowMenu: true as const,
  doNotReopenRoom4bWithoutDefect: true as const,
  doNotReopenRoom4cWithoutDefect: true as const,
  doNotReopenGateXWithoutDefect: true as const,
  doNotUnparkMobileInOpening: true as const,
  doNotClaimClaudeConnected: true as const,
  doNotClaimBuildABotConnected: true as const,
  doNotClaimResendLive: true as const,
  doNotUseRealCustomerData: true as const,
  room4RemainsOpen: true as const,
  room5RemainsNotStarted: true as const,
  frozenLaunchNowServices: {
    carousel: "NOT ON LAUNCH MENU" as const,
  },

  squishyWatchkeeperAsset:
    "public/squishy/squishy-studio-guide-v1.png" as const,
  squishyForbiddenOnSecurityIncidents: true as const,

  packageContractDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-PACKAGE-CONTRACT.md" as const,
  connectionMatrixDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/CURRENT-TRUTH-CONNECTION-MATRIX.md" as const,
  incidentSchemaDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/MACHINE-INCIDENT-SCHEMA.md" as const,
  severityMatrixDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/SEVERITY-AND-ESCALATION-MATRIX.md" as const,
  heartbeatContractDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/SUPERVISION-AND-HEARTBEAT-CONTRACT.md" as const,
  automationContractDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/PROVIDER-INDEPENDENT-AUTOMATION-CONTRACT.md" as const,
  buildABotPlanDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/BUILD-A-BOT-CAPABILITY-AND-CONNECTOR-PLAN.md" as const,
  claudePlanDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/CLAUDE-VERIFIER-CONNECTION-AND-CERTIFICATION-PLAN.md" as const,
  ownerConsoleContractDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/OWNER-CONSOLE-INCIDENT-INFORMATION-CONTRACT.md" as const,
  alertPlanDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/OUT-OF-BAND-ALERT-CERTIFICATION-PLAN.md" as const,
  squishyWatchkeeperDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/SQUISHY-WATCHKEEPER-USAGE-CONTRACT.md" as const,
  scenarioPlanDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/CONTROLLED-INCIDENT-SCENARIO-PLAN.md" as const,
  defectLedgerDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/DEFECT-AND-LIMIT-LEDGER.md" as const,
  packageAgentsDoc:
    "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/AGENTS.md" as const,
} as const;
