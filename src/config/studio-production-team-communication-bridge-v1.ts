/**
 * Production Team — Roster, Role Certification + Communication Bridge.
 * Authorized by Tagia 2026-09-22. One package. Machine is the bridge. Scout builds it.
 *
 * Authority:
 * docs/launch/studio-operating-production-team-roster-role-certification-and-communication-bridge-1/
 */

export const STUDIO_PRODUCTION_TEAM_COMMUNICATION_BRIDGE_PACKAGE_ID =
  "STUDIO-OPERATING-PRODUCTION-TEAM-ROSTER-ROLE-CERTIFICATION-AND-COMMUNICATION-BRIDGE-1" as const;

export const studioProductionTeamCommunicationBridgeV1 = {
  packageId: STUDIO_PRODUCTION_TEAM_COMMUNICATION_BRIDGE_PACKAGE_ID,
  schemaVersion: 1 as const,
  owner: "Tagia",
  authorizedAt: "2026-09-22",
  title: "Production Team — Roster, Role Certification + Communication Bridge" as const,
  question:
    "Is the Studio AI team actually assembled, briefed, able to communicate, and ready to receive production work?" as const,
  machineIsTheBridge: true as const,
  scoutBuildsTheBridge: true as const,
  scoutIsNotRoutineProducer: true as const,
  ownerIsNotTheMachine: true as const,
  ownerDoesNotRelayTeamMessages: true as const,
  ordinaryWorkNeverGoesToOwner: true as const,
  ordinaryBusinessDecisionsNeverGoToScout: true as const,
  oneSharedJobTruth: true as const,
  actorsDoNotWanderForWork: true as const,
  doNotAssumeReadyBecauseOrgChartExists: true as const,
  doNotExpandMenu: true as const,
  doNotStartRoom5: true as const,
  doNotRemintMaya: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  roster: [
    "studio_voice",
    "machine",
    "design_production",
    "copy_production",
    "video_production",
    "print_file_production",
    "quality_team",
    "supervisor",
    "studio_manager",
    "owner",
    "scout",
  ] as const,
  customerFacingChain: [
    "customer",
    "studio_voice",
    "machine",
    "production_or_qa",
  ] as const,
  exceptionChannels: [
    "machine_supervisor",
    "machine_studio_manager",
    "machine_owner_console_owner",
  ] as const,
  ownerDecisionReturnChain: [
    "owner",
    "machine",
    "correct_team_actor",
    "studio_voice_if_customer_must_hear",
  ] as const,
  scoutOutsideCustomerProductionChain: true as const,
  preservedRules: [
    "docs/studio-owner-resolve-once-teach-forward-v1-locked.md",
    "docs/studio-materials-and-substitute-asset-v1-locked.md",
    "docs/launch/studio-operating-daily-operating-bridge-1/PROJECT-ALPHA-WORK-STATE-NOTIFICATION-PROTOCOL.md",
  ] as const,
  communicationRules: [
    "Voice talks to customer.",
    "Machine routes.",
    "Production produces.",
    "QA checks.",
    "Supervisor watches execution.",
    "Studio Manager resolves non-routine production/quality forks.",
    "Owner handles true Owner exceptions.",
    "Scout engineers the factory.",
  ] as const,
  handoffMustAnswer: [
    "What did I receive?",
    "What did I do?",
    "What is the result?",
    "Is anything blocking me?",
    "Who should receive it next?",
  ] as const,
  certTests: ["A_normal_production", "B_missing_materials", "C_owner_exception", "D_qa_defect", "E_stall"] as const,
  authorityDoc:
    "docs/launch/studio-operating-production-team-roster-role-certification-and-communication-bridge-1/STUDIO-OPERATING-PRODUCTION-TEAM-ROSTER-ROLE-CERTIFICATION-AND-COMMUNICATION-BRIDGE-PACKAGE-CONTRACT.md" as const,
} as const;

export type StudioTeamRoleId =
  (typeof studioProductionTeamCommunicationBridgeV1.roster)[number];

export type StudioTeamProducerRoleId = Extract<
  StudioTeamRoleId,
  | "design_production"
  | "copy_production"
  | "video_production"
  | "print_file_production"
>;
