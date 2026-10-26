/**
 * Security / data / backup launch-minimum certification.
 * Not enterprise security. Not disaster recovery. Not a privacy-policy rewrite.
 */

export const STUDIO_SECURITY_DATA_BACKUP_LAUNCH_MINIMUM_PACKAGE_ID =
  "STUDIO-OPERATING-SECURITY-DATA-BACKUP-LAUNCH-MINIMUM-1" as const;

export const studioSecurityDataBackupLaunchMinimumV1 = {
  packageId: STUDIO_SECURITY_DATA_BACKUP_LAUNCH_MINIMUM_PACKAGE_ID,
  authorizedAt: "2026-09-27" as const,
  verdict: "PASS_WITH_EXPLICIT_LIMITS" as const,
  launchMinimumOnly: true as const,
  doNotClaimEnterpriseSecurity: true as const,
  doNotClaimOffsiteDisasterRecovery: true as const,
  doNotInventEncryptionOrRetentionGuarantees: true as const,
  ownerConsoleParked: true as const,
  room3Closed: true as const,
  doNotReopenHarborBusinessCard: true as const,
  doNotStartOutsideTrial: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  areaClassifications: {
    customerDataHandling: "PASS_WITH_EXPLICIT_LIMITS" as const,
    accessSecrets: "PASS_WITH_EXPLICIT_LIMITS" as const,
    dataIsolation: "PASS_WITH_EXPLICIT_LIMITS" as const,
    fileDeliverySafety: "PASS_WITH_EXPLICIT_LIMITS" as const,
    backupRecovery: "PASS_WITH_EXPLICIT_LIMITS" as const,
    failureRecovery: "PASS_WITH_EXPLICIT_LIMITS" as const,
    customerFacingSecurityTruth: "PASS_WITH_EXPLICIT_LIMITS" as const,
  },
  defectFixed: "unowned_paid_claim_required_session_current_campaign" as const,
  provenBackup: [
    "git_reproducible_code_and_catalog",
    "atomic_campaign_json_writes",
    "paid_activation_recovery_resume",
  ] as const,
  notProven: [
    "offsite_backup_of_data_directory",
    "encrypted_at_rest_guarantee",
    "retention_schedule",
    "cross_region_disaster_recovery",
  ] as const,
  nextPackageId: "STUDIO-OPERATING-CAPACITY-QUEUE-DEADLINE-OVERLOAD-1" as const,
  nextPackageStarted: false as const,
  doNotStartNextFromThisStamp: true as const,
  guideSectionTNextRemains: "controlled_outside_customer_trial" as const,
  outsideTrialGateAfterThisStamp: "NOT_READY_REQUIRED_PACKAGE_FIRST" as const,
  stampDoc:
    "docs/launch/studio-operating-security-data-backup-launch-minimum-1/STUDIO-OPERATING-SECURITY-DATA-BACKUP-LAUNCH-MINIMUM.md" as const,
  proofJson:
    "docs/launch/studio-operating-security-data-backup-launch-minimum-1/proof.json" as const,
} as const;
