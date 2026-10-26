/**
 * Work Supervision + Incident Escalation (AUTHORIZED 2026-09-16).
 *
 * Authority: Customer-Ready Operating Guide §N §O §Q
 * Package: STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1
 *
 * Shared layer. Not six SKU patches. Does not rebuild Room 3.
 * Does not start mobile certification. Does not reopen Static Creative Lane.
 * Does not authorize spend. Does not treat Owner as first-line QA.
 */

import { studioAutonomousProductionLoopV1 } from "@/config/studio-autonomous-production-loop-v1";
import { studioCustomerReadyOperatingGuideV1 as guide } from "@/config/studio-customer-ready-operating-guide-v1";

export const STUDIO_WORK_SUPERVISION_PACKAGE_ID =
  "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1" as const;

export const studioWorkSupervisionV1 = {
  packageId: STUDIO_WORK_SUPERVISION_PACKAGE_ID,
  schemaVersion: 1 as const,
  owner: "Tagia",
  authorizedAt: "2026-09-16",
  lockedGuide: guide.authorityDoc,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotRebuildOwnerConsole: true as const,
  doNotStartMobileCertification: true as const,
  doNotReopenStaticCreativeLane: true as const,
  doNotAuthorizeSpend: true as const,
  ownerIsNotFirstLineQa: true as const,
  oneActiveActorPerJob: true as const,
  maxSeriousRecoveryAttempts: studioAutonomousProductionLoopV1.maxInternalProductionAttempts,
  supervisorAutoRecoveryPasses: 1 as const,
  stallMs: 2 * 60 * 60 * 1000,
  substituteSolMediumStampAccepted: false as const,
  substituteReviewAcceptedForSequencingOnly: true as const,
  staticCreativeLaneFrozen: {
    flyer: "HOLD",
    otherFive: "NOT_CERTIFIED",
    lane: "NOT_CERTIFIED",
  } as const,
  roles: [
    "studio_voice",
    "machine",
    "production_team_qa",
    "supervisor",
    "studio_manager",
    "owner",
    "customer",
  ] as const,
  incidentClasses: [
    "routine_policy",
    "studio_production_defect",
    "system_stall",
    "recovery_exhausted",
    "customer_action_required",
    "studio_manager_review",
    "owner_judgment",
    "owner_unavailable_hold",
    "security_privacy_rights",
  ] as const,
  ownerJudgmentReasons: [
    "price_refund_or_exception",
    "brand_or_public_identity",
    "service_or_menu_inclusion",
    "unapproved_spend",
    "security_privacy_rights",
    "protected_history_change",
    "customer_stranded_after_exhaust",
    "defective_work_could_ship_after_exhaust",
  ] as const,
  studioManagerReasons: [
    "quality_interpretation",
    "competing_approaches",
    "suspected_rabbit_hole",
    "architectural_customer_quality",
    "roadmap_sequencing",
  ] as const,
} as const;

export type StudioSupervisionRole =
  (typeof studioWorkSupervisionV1.roles)[number];

export type StudioIncidentClass =
  (typeof studioWorkSupervisionV1.incidentClasses)[number];
