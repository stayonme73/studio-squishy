/**
 * PROJECT ALPHA — Work State Notification Protocol (LOCKED 2026-09-17).
 *
 * Authority: `docs/launch/studio-operating-daily-operating-bridge-1/PROJECT-ALPHA-WORK-STATE-NOTIFICATION-PROTOCOL.md`
 * Cursor pointer: `.cursor/rules/work-state-notification-protocol.mdc`
 *
 * Operational telemetry. Not a customer-site feature. Not the Owner Console.
 * Tagia authorized this as a standing Project Alpha rule.
 */

export const STUDIO_WORK_STATE_NOTIFICATION_PACKAGE_ID =
  "STUDIO-OPERATING-DAILY-OPERATING-BRIDGE-1" as const;

export const studioWorkStateNotificationV1 = {
  packageId: STUDIO_WORK_STATE_NOTIFICATION_PACKAGE_ID,
  schemaVersion: 3 as const,
  locked: true as const,
  owner: "Tagia",
  lockedAt: "2026-09-17",
  authorityDoc:
    "docs/launch/studio-operating-daily-operating-bridge-1/PROJECT-ALPHA-WORK-STATE-NOTIFICATION-PROTOCOL.md",
  glancePage: "docs/launch/PROJECT-ALPHA-WORK-HEARTBEAT.html" as const,
  ownerConsolePage: "docs/launch/PROJECT-ALPHA-OWNER-CONSOLE.html" as const,
  oneOwnerPage: true as const,
  noNewTabsForAlerts: true as const,
  stateJson: "docs/launch/project-alpha-work-heartbeat.json" as const,
  transitionLog: "docs/launch/project-alpha-work-state-transitions.jsonl" as const,
  pulseScript: "scripts/work-heartbeat-pulse.mjs" as const,
  watchdogScript: "scripts/work-heartbeat-watchdog.mjs" as const,
  workStates: [
    "ACTIVE_WORK",
    "WAITING_ON_OWNER",
    "WAITING_ON_SYSTEM",
    "IDLE",
    "STALLED_HUNG",
    "STOPPED",
  ] as const,
  staleAfterMs: 600_000 as const,
  noSilentStateChanges: true as const,
  activeProgressIsVisualOnly: true as const,
  sliceCompleteMustNotify: true as const,
  stopStallHungMustNotify: true as const,
  watchdogDeclaresStaleActive: true as const,
  anyLeaveActiveMustNotify: true as const,
  resumeIsVisibleNotSiren: true as const,
  idleForbiddenWhenSafeWorkRemains: true as const,
  finishingSliceDoesNotPermitIdle: true as const,
  staleActiveBecomesStalledHung: true as const,
  intentionalStopIsNotAStall: true as const,
  listeningAfterStopIsWhite: true as const,
  quietAfterListeningIsNotTrouble: true as const,
  failedToolCallIsNotScoutTrouble: true as const,
  progressPulseDoesNotRearmListening: true as const,
  progressAfterListeningShowsWorking: true as const,
  workingStanceAlwaysSetsActiveWork: false as const,
  workingStanceSetsActiveUnlessPackageStopped: true as const,
  chatHooksDoNotLeavePackageStop: true as const,
  chatHooksDoNotLeaveOwnerWait: true as const,
  watchdogOnlyWhenExpectedToContinue: true as const,
  watchdogMonitoringOwnerControlled: true as const,
  muteAlarmDoesNotChangeColor: true as const,
  refreshDoesNotManufactureAlert: true as const,
  stopListeningNeverAlarms: true as const,
  audibleOnlyWhenMonitoringOnAndConfirmedStall: true as const,
  activeMeansAuthorizedPackageWork: true as const,
  telemetryMaintenanceIsNotActiveWork: true as const,
  currentAuthorizedPackageWork: "none" as const,
  forbiddenActiveTaskPatterns: [
    "heartbeat",
    "watchdog",
    "work-state",
    "alert",
    "status page",
    "status-page",
    "documentation",
  ] as const,
  doNotDisplayActiveWithDeadHeartbeat: true as const,
  attentionStates: ["GREEN", "YELLOW", "RED"] as const,
  attentionAndWorkStateAreIndependent: true as const,
  yellowDoesNotReplaceHeartbeat: true as const,
  afterYellowAckReturnToHeartbeat: true as const,
  redInterruptUntilAcknowledged: true as const,
  afterRedAckReturnToHeartbeatIfWorkResumes: true as const,
  glanceQuestions: [
    "is_scout_working",
    "what_is_he_doing",
    "how_long",
    "last_completed_action",
    "waiting_on_owner",
    "waiting_on_system",
    "is_he_stuck",
    "did_work_stop",
    "attention_badge",
  ] as const,
  alert: {
    ACTIVE_WORK: "visual_heartbeat_only",
    SLICE_COMPLETE: "audible_open_glance_even_if_still_active",
    WAITING_ON_OWNER: "red_audible_exact_owner_action",
    WAITING_ON_SYSTEM: "yellow_show_system_and_next_check",
    IDLE: "alert_immediately_explain_why",
    STALLED_HUNG: "red_audible_open_attention_show_gap",
    STOPPED: "white_silent_listening_not_alarm",
  } as const,
  doNotMerge: true as const,
  doNotPush: true as const,
} as const;

export type StudioWorkStateNotificationV1 =
  typeof studioWorkStateNotificationV1;

export type StudioNotifiedWorkState =
  (typeof studioWorkStateNotificationV1.workStates)[number];
