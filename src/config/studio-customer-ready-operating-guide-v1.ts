/**
 * Scout’s Customer-Ready Operating Guide — standing doctrine (LOCKED 2026-09-16).
 *
 * Authority: `docs/studio-customer-ready-operating-guide-v1-locked.md`
 * Cursor pointer: `.cursor/rules/customer-ready-operating-guide.mdc`
 *
 * This is not permission to start later steps. One package at a time.
 * Voice and team communication are launch requirements, not decoration.
 */

export const STUDIO_CUSTOMER_READY_OPERATING_GUIDE_PACKAGE_ID =
  "STUDIO-OPERATING-CUSTOMER-READY-OPERATING-GUIDE-1" as const;

export const studioCustomerReadyOperatingGuideV1 = {
  packageId: STUDIO_CUSTOMER_READY_OPERATING_GUIDE_PACKAGE_ID,
  schemaVersion: 1 as const,
  locked: true as const,
  owner: "Tagia",
  lockedAt: "2026-09-16",
  authorityDoc: "docs/studio-customer-ready-operating-guide-v1-locked.md",
  menuInventoryCheckpoint:
    "docs/launch/studio-operating-customer-ready-operating-guide-1/CURRENT-MENU-INVENTORY-CHECKPOINT.md",
  dailyOperatingBridge: "docs/launch/PROJECT-ALPHA-DAILY-OPERATING-BRIDGE.md",
  workingIsNotAvailable: true as const,
  bridgeMustTimestampStatusChanges: true as const,
  doNotClaimUnattendedWorkWhenIdle: true as const,
  workStates: [
    "ACTIVE_WORK",
    "WAITING_ON_OWNER",
    "WAITING_ON_SYSTEM",
    "IDLE",
    "STALLED_HUNG",
    "STOPPED",
  ] as const,
  workHeartbeatHtml: "docs/launch/PROJECT-ALPHA-WORK-HEARTBEAT.html" as const,
  ownerConsoleHtml: "docs/launch/PROJECT-ALPHA-OWNER-CONSOLE.html" as const,
  workHeartbeatStateJson: "docs/launch/project-alpha-work-heartbeat.json" as const,
  workHeartbeatScriptPath: "scripts/work-heartbeat-pulse.mjs" as const,
  workHeartbeatStaleAfterMs: 600_000 as const,
  workHeartbeatDoNotAnimateWithoutFreshActivity: true as const,
  workHeartbeatSeparateFromAttentionColor: true as const,
  attentionAndWorkStateAreIndependent: true as const,
  yellowDoesNotReplaceHeartbeat: true as const,
  ownerAttentionHtml: "docs/launch/PROJECT-ALPHA-OWNER-ATTENTION.html",
  ownerAttentionStateJson: "docs/launch/project-alpha-attention-state.json",
  threeMenuSurfacesDecision: "CLOSED" as const,
  launchReadinessAuthority: "launch_now_v2_rtu_production_menu" as const,
  routeMapRole: "separate_navigation_discovery_surface" as const,
  leftoverLiveCatalogGreens: "not_automatically_launch_authorized" as const,
  menuContradictionsBlockCurrentPackage: false as const,
  doNotDefaultToSurgicalFixes: true as const,
  doNotModifyWithoutTagia: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  scoutIsFactoryEngineer: true as const,
  scoutIsNotAutomaticVisualArtist: true as const,
  voiceIsLaunchRequirement: true as const,
  teamCommunicationIsLaunchRequirement: true as const,
  reduceScopeBeforeReducingQuality: true as const,
  menuInventoryIsReportNotAuthorization: true as const,
  ownerDecisionsBecomeStudioTruthImmediately: true as const,
  ownerDecisionsDoctrineAt: "2026-10-10" as const,
  decisionBriefs: [
    "docs/launch/studio-decision-brief-1/STUDIO-DECISION-BRIEF-1.md",
  ] as const,
  ownerConsole:
    {
      room3Closed: true as const,
      closeTip: "cd2a1e2",
      step5Meaning:
        "certify_existing_closed_desk_as_decision_desk" as const,
      step5Status: "COMPLETE_BY_EVIDENCE_REUSE" as const,
      step5AcceptedAt: "2026-09-27" as const,
      step5Acceptance: "owner_evidence_reuse" as const,
      step5Stamp:
        "STUDIO-OPERATING-STEP-5-OWNER-CONSOLE-LAUNCH-CERTIFICATION-1" as const,
      doNotRebuild: true as const,
      doNotReopenWithoutDemonstratedRegression: true as const,
      parkedAttentionConsole:
        "STUDIO-OPERATING-SINGLE-PAGE-OWNER-WORK-AND-ATTENTION-CONSOLE-1" as const,
      parkedAttentionConsoleStatus: "PARKED / HOLD" as const,
    },
  fourGates: [
    "quality",
    "timely_production",
    "communication",
    "capacity",
  ] as const,
  timelyProductionSeriousAttempts: { min: 1, max: 3 } as const,
  packageEndVerdicts: [
    "PASS",
    "PASS_WITH_EXPLICIT_LIMITS",
    "FAIL_BLOCKED",
  ] as const,
  currentStep: 5 as const,
  currentStepId: "owner_console_launch_certification" as const,
  currentStepStatus: "COMPLETE_BY_EVIDENCE_REUSE" as const,
  nextUnfinishedStep: 10 as const,
  nextUnfinishedStepId: "controlled_outside_customer_trial" as const,
  nextUnfinishedStepStatus: "NOT_STARTED" as const,
  doNotStartNextStepFromThisStamp: true as const,
  doNotStartStep2WithoutAuthorization: true as const,
  step2AuthorizedAt: "2026-09-16" as const,
  doNotStartStep3WithoutAuthorization: true as const,
  step3AuthorizedAt: "2026-09-16" as const,
  doNotStartStep4WithoutAuthorization: true as const,
  executionSteps: [
    "static_creative_lane",
    "work_supervision_and_incident_escalation",
    "real_phone_mobile_certification",
    "close_shared_live_production_gates",
    "owner_console_launch_certification",
    "team_roster_role_boundaries_orientation",
    "voice_machine_team_communication_stress",
    "menu_readiness_and_demand_freeze",
    "owner_as_customer_real_campaign",
    "controlled_outside_customer_trial",
    "public_opening_work",
  ] as const,
  alertHeadings: [
    "QUESTION BEFORE PROCEEDING",
    "OWNER DECISION REQUIRED",
    "STUDIO MANAGER REVIEW REQUIRED",
    "SPEND AUTHORIZATION REQUIRED",
    "OWNER DEPENDENCY INTRODUCED",
    "RED FLAG",
  ] as const,
} as const;

export type StudioCustomerReadyOperatingGuideV1 =
  typeof studioCustomerReadyOperatingGuideV1;
