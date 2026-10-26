/**
 * PROJECT ALPHA — Owner Attention Signal (LOCKED 2026-09-16).
 *
 * Authority: `docs/studio-customer-ready-operating-guide-v1-locked.md` §Z
 * Correction: `docs/launch/studio-operating-daily-operating-bridge-1/2026-09-16-ATTENTION-SYSTEM-CORRECTION.md`
 * Daily Operating Bridge: `docs/launch/PROJECT-ALPHA-DAILY-OPERATING-BRIDGE.md`
 * Red page: `docs/launch/PROJECT-ALPHA-OWNER-ATTENTION.html`
 *
 * Visual states stay GREEN / YELLOW / RED.
 * Operating kinds: CONTINUE · WATCH · OWNER_ACTION_REQUIRED_NOW ·
 * OWNER_ACTION_REQUIRED_DEFERRED.
 *
 * Scout waiting on Tagia is RED — OWNER ACTION REQUIRED NOW.
 * That is not silent YELLOW. GREEN and ordinary YELLOW stay silent.
 * Test the audible alert before relying on it.
 */

export const STUDIO_OWNER_ATTENTION_PACKAGE_ID =
  "STUDIO-OPERATING-DAILY-OPERATING-BRIDGE-1" as const;

export const studioOwnerAttentionV1 = {
  packageId: STUDIO_OWNER_ATTENTION_PACKAGE_ID,
  schemaVersion: 2 as const,
  locked: true as const,
  owner: "Tagia",
  lockedAt: "2026-09-16",
  correctedAt: "2026-09-16" as const,
  states: ["GREEN", "YELLOW", "RED"] as const,
  kinds: [
    "CONTINUE",
    "WATCH",
    "OWNER_ACTION_REQUIRED_NOW",
    "OWNER_ACTION_REQUIRED_DEFERRED",
  ] as const,
  greenLabel: "CONTINUE",
  yellowLabel: "WATCH",
  redLabel: "OWNER ACTION REQUIRED NOW",
  deferredLabel: "OWNER ACTION REQUIRED — DEFERRED",
  redBannerText: "OWNER ATTENTION REQUIRED",
  redNowBannerText: "RED — OWNER ACTION REQUIRED NOW",
  redHtmlPath: "docs/launch/PROJECT-ALPHA-OWNER-ATTENTION.html",
  stateJsonPath: "docs/launch/project-alpha-attention-state.json",
  alertTestProofPath:
    "docs/launch/project-alpha-attention-alert-test.json" as const,
  alertScriptPath: "scripts/owner-attention-alert.mjs" as const,
  dailyOperatingBridgePath: "docs/launch/PROJECT-ALPHA-DAILY-OPERATING-BRIDGE.md",
  doNotRecolorCursor: true as const,
  doNotTouchCustomerSite: true as const,
  doNotTouchOwnerConsole: true as const,
  audibleUsesWindowsConsoleBeep: true as const,
  scoutWaitingOnOwnerIsNeverSilentYellow: true as const,
  greenAndOrdinaryYellowRemainSilent: true as const,
  audibleAppliesDuringMobileCertification: true as const,
  attentionDoesNotReplaceWorkState: true as const,
  yellowIsBadgeNotFullScreenAfterAck: true as const,
  afterYellowAckReturnToHeartbeat: true as const,
  redInterruptUntilAcknowledged: true as const,
  afterRedAckReturnToHeartbeatIfWorkResumes: true as const,
  liveHeartbeatPath: "docs/launch/PROJECT-ALPHA-WORK-HEARTBEAT.html" as const,
  ownerConsolePath: "docs/launch/PROJECT-ALPHA-OWNER-CONSOLE.html" as const,
  oneOwnerPage: true as const,
  doNotOpenExtraAlertTabs: true as const,
  acknowledgeStopsReplay: true as const,
  testAudibleBeforeRelying: true as const,
  responders: ["OWNER_TAGIA", "STUDIO_MANAGER_CHATGPT", "BOTH"] as const,
  redIsMandatoryFor: [
    "owner_business_decision",
    "studio_manager_architectural_or_customer_quality_decision",
    "unapproved_spend",
    "customer_facing_facts_at_risk",
    "revision_entitlement_at_risk",
    "customer_may_be_stranded",
    "defective_work_could_ship",
    "owner_becomes_routine_production_dependency",
    "security_privacy_rights",
    "protected_history_unexpectedly_changes",
    "major_launch_timeline_impact",
    "material_scope_expansion",
    "guessing_a_roadmap_path_would_affect_customers",
    "scout_cannot_continue_without_owner_action",
  ] as const,
  pendingIndependentReviewIsYellowNotRed: true as const,
} as const;

export type StudioOwnerAttentionState =
  (typeof studioOwnerAttentionV1.states)[number];

export type StudioOwnerAttentionKind =
  (typeof studioOwnerAttentionV1.kinds)[number];

export type StudioOwnerAttentionResponder =
  (typeof studioOwnerAttentionV1.responders)[number];
