/**
 * C8c — Explicit correction-use ledger + write-once included allowance.
 * Ledger is historical authority; mutable revisionRoundsUsed is compatibility only.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { getPackageRevisionRounds } from "@/config/studio-guide";
import {
  campaignUsesCustomStudioPlan,
  resolveApprovedPlanRevisionRounds,
  resolveCampaignRevisionRounds,
} from "@/lib/approved-plan-display";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

import type { JobReviewFeedback } from "./review-feedback-types";
import type { JobActivityActor, JobActivityEvent } from "./types";

export type RevisionAllowanceSource =
  | "campaign_field"
  | "approved_plan"
  | "package_snapshot"
  | "legacy_package_config";

export type CorrectionConsumptionKind = "included" | "owner_extra";

/** Immutable formal correction-use row — append-only. */
export type CorrectionUseRecord = {
  id: string;
  campaignId: string;
  jobId: string;
  /** Preferred: `${jobId}:${submittedAt}` */
  idempotencyKey: string;
  packageId: string;
  submittedAt: string;
  submissionType: "revision_requested";
  releaseActivityId: string | null;
  versionLabel: string | null;
  actorUserId: string;
  actorDisplayName: string;
  occurredAt: string;
  ordinal: number;
  consumptionKind: CorrectionConsumptionKind;
  extraGrantId?: string;
  stickyNoteCount: number;
  voiceNoteCount: number;
  drawSectionCount: number;
  sectionStatuses: Record<string, string>;
};

/** Owner/admin grant of extra correction uses — does not alter included allowance. */
export type CorrectionExtraGrantRecord = {
  id: string;
  campaignId: string;
  jobId?: string;
  quantity: number;
  approvedByUserId: string;
  approvedByDisplayName: string;
  approvedAt: string;
  reason: string;
  exceptionId?: string;
};

export type CorrectionAccountingView = {
  included: number;
  includedSource: RevisionAllowanceSource;
  used: number;
  provisionalLegacyUsed: number;
  effectiveUsed: number;
  extraGranted: number;
  extraUsed: number;
  extraRemaining: number;
  remainingIncluded: number;
  remaining: number;
  exhausted: boolean;
  history: readonly CorrectionUseRecord[];
  grants: readonly CorrectionExtraGrantRecord[];
};

export function buildCorrectionUseIdempotencyKey(
  jobId: string,
  submittedAt: string,
): string {
  return `${jobId}:${submittedAt}`;
}

export function findCorrectionUseByKey(
  envelope: Pick<ServerTasksEnvelope, "jobCorrectionUses">,
  idempotencyKey: string,
): CorrectionUseRecord | undefined {
  return (envelope.jobCorrectionUses ?? []).find(
    (entry) => entry.idempotencyKey === idempotencyKey,
  );
}

export function listCorrectionUses(
  envelope: Pick<ServerTasksEnvelope, "jobCorrectionUses">,
  jobId?: string,
): CorrectionUseRecord[] {
  const rows = envelope.jobCorrectionUses ?? [];
  if (!jobId) return [...rows];
  return rows.filter((entry) => entry.jobId === jobId);
}

export function listCorrectionExtraGrants(
  envelope: Pick<ServerTasksEnvelope, "jobCorrectionExtraGrants">,
): CorrectionExtraGrantRecord[] {
  return [...(envelope.jobCorrectionExtraGrants ?? [])];
}

/**
 * Write-once included allowance. Never overwrites an existing campaign field
 * from live package configuration.
 */
export function ensureWriteOnceRevisionAllowance(
  campaign: CampaignRecord,
  occurredAt = new Date().toISOString(),
): {
  campaign: CampaignRecord;
  included: number;
  source: RevisionAllowanceSource;
  didSnapshot: boolean;
} {
  if (campaign.revisionRoundsIncluded != null) {
    return {
      campaign,
      included: campaign.revisionRoundsIncluded,
      source: campaign.revisionRoundsIncludedSource ?? "campaign_field",
      didSnapshot: false,
    };
  }

  let included: number;
  let source: RevisionAllowanceSource;

  if (campaign.approvedStudioPlan?.lineItems?.length) {
    included = resolveApprovedPlanRevisionRounds(campaign.approvedStudioPlan);
    source = "approved_plan";
  } else if (campaign.packageId && !campaignUsesCustomStudioPlan(campaign)) {
    included = getPackageRevisionRounds(campaign.packageId);
    source = "legacy_package_config";
  } else {
    included = resolveCampaignRevisionRounds(campaign);
    source =
      campaign.approvedStudioPlan != null ? "approved_plan" : "package_snapshot";
  }

  return {
    campaign: {
      ...campaign,
      revisionRoundsIncluded: included,
      revisionRoundsIncludedSource: source,
      updatedAt: occurredAt,
    },
    included,
    source,
    didSnapshot: true,
  };
}

export function deriveCorrectionAccounting(input: {
  campaign: CampaignRecord;
  envelope: Pick<
    ServerTasksEnvelope,
    "jobCorrectionUses" | "jobCorrectionExtraGrants"
  >;
}): CorrectionAccountingView {
  const snapshot = ensureWriteOnceRevisionAllowance(input.campaign);
  const included = snapshot.included;
  const history = listCorrectionUses(input.envelope);
  const grants = listCorrectionExtraGrants(input.envelope);

  const used = history.length;
  const includedUsed = history.filter((row) => row.consumptionKind === "included")
    .length;
  const extraUsed = history.filter((row) => row.consumptionKind === "owner_extra")
    .length;
  const extraGranted = grants.reduce((sum, grant) => sum + grant.quantity, 0);
  const extraRemaining = Math.max(0, extraGranted - extraUsed);

  const counterUsed = input.campaign.revisionRoundsUsed ?? 0;
  const provisionalLegacyUsed =
    used === 0 && counterUsed > 0 ? counterUsed : 0;
  const effectiveUsed = Math.max(used, provisionalLegacyUsed);

  const remainingIncluded = Math.max(
    0,
    included - Math.max(includedUsed, provisionalLegacyUsed),
  );
  const remaining = remainingIncluded + extraRemaining;

  return {
    included,
    includedSource: snapshot.source,
    used,
    provisionalLegacyUsed,
    effectiveUsed,
    extraGranted,
    extraUsed,
    extraRemaining,
    remainingIncluded,
    remaining,
    exhausted: remaining <= 0,
    history,
    grants,
  };
}

export function findCorrectionUseByPackageId(
  envelope: Pick<ServerTasksEnvelope, "jobCorrectionUses">,
  packageId: string,
): CorrectionUseRecord | undefined {
  return (envelope.jobCorrectionUses ?? []).find(
    (entry) => entry.packageId === packageId,
  );
}

export function appendCorrectionUseIdempotent(
  envelope: ServerTasksEnvelope,
  record: CorrectionUseRecord,
): { envelope: ServerTasksEnvelope; created: boolean; record: CorrectionUseRecord } {
  const byKey = findCorrectionUseByKey(envelope, record.idempotencyKey);
  if (byKey) {
    return { envelope, created: false, record: byKey };
  }
  const byPackage = findCorrectionUseByPackageId(envelope, record.packageId);
  if (byPackage) {
    return { envelope, created: false, record: byPackage };
  }

  const uses = [...(envelope.jobCorrectionUses ?? []), record];
  return {
    envelope: {
      ...envelope,
      jobCorrectionUses: uses,
      updatedAt: record.occurredAt,
    },
    created: true,
    record,
  };
}

export function appendCorrectionExtraGrant(
  envelope: ServerTasksEnvelope,
  grant: CorrectionExtraGrantRecord,
): ServerTasksEnvelope {
  const existing = (envelope.jobCorrectionExtraGrants ?? []).find(
    (entry) => entry.id === grant.id,
  );
  if (existing) return envelope;

  return {
    ...envelope,
    jobCorrectionExtraGrants: [
      ...(envelope.jobCorrectionExtraGrants ?? []),
      grant,
    ],
    updatedAt: grant.approvedAt,
  };
}

export function buildCorrectionUseRecord(input: {
  campaignId: string;
  jobId: string;
  packageId: string;
  submittedAt: string;
  releaseActivityId: string | null;
  versionLabel: string | null;
  actor: JobActivityActor;
  occurredAt: string;
  ordinal: number;
  consumptionKind: CorrectionConsumptionKind;
  extraGrantId?: string;
  feedback: JobReviewFeedback;
}): CorrectionUseRecord {
  const idempotencyKey = buildCorrectionUseIdempotencyKey(
    input.jobId,
    input.submittedAt,
  );
  return {
    id: `correction-use:${idempotencyKey}`,
    campaignId: input.campaignId,
    jobId: input.jobId,
    idempotencyKey,
    packageId: input.packageId,
    submittedAt: input.submittedAt,
    submissionType: "revision_requested",
    releaseActivityId: input.releaseActivityId,
    versionLabel: input.versionLabel,
    actorUserId: input.actor.userId ?? "client",
    actorDisplayName: input.actor.displayName ?? "Customer",
    occurredAt: input.occurredAt,
    ordinal: input.ordinal,
    consumptionKind: input.consumptionKind,
    extraGrantId: input.extraGrantId,
    stickyNoteCount: input.feedback.stickyNotes.length,
    voiceNoteCount: input.feedback.voiceNotes.length,
    drawSectionCount: input.feedback.drawSections.length,
    sectionStatuses: { ...input.feedback.sectionStatuses },
  };
}

export function pickExtraGrantToConsume(
  grants: readonly CorrectionExtraGrantRecord[],
  uses: readonly CorrectionUseRecord[],
  jobId: string,
): CorrectionExtraGrantRecord | null {
  const usedByGrant = new Map<string, number>();
  for (const use of uses) {
    if (use.consumptionKind !== "owner_extra" || !use.extraGrantId) continue;
    usedByGrant.set(
      use.extraGrantId,
      (usedByGrant.get(use.extraGrantId) ?? 0) + 1,
    );
  }

  const sorted = [...grants].sort((a, b) =>
    a.approvedAt.localeCompare(b.approvedAt),
  );
  for (const grant of sorted) {
    if (grant.jobId && grant.jobId !== jobId) continue;
    const consumed = usedByGrant.get(grant.id) ?? 0;
    if (consumed < grant.quantity) return grant;
  }
  return null;
}

/** Reconstruct ledger rows only from recoverable locked revision packages. */
export function reconstructCorrectionUsesFromLockedPackages(
  envelope: ServerTasksEnvelope,
  campaignId: string,
): CorrectionUseRecord[] {
  const existing = envelope.jobCorrectionUses ?? [];
  if (existing.length > 0) return [...existing];

  const locked = (envelope.jobReviewFeedback ?? []).filter(
    (entry) =>
      entry.campaignId === campaignId &&
      entry.submittedAt &&
      entry.submissionType === "revision_requested",
  );

  return locked
    .slice()
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""))
    .map((feedback, index) => {
      const submittedAt = feedback.submittedAt!;
      const idempotencyKey = buildCorrectionUseIdempotencyKey(
        feedback.jobId,
        submittedAt,
      );
      return {
        id: `correction-use:${idempotencyKey}`,
        campaignId,
        jobId: feedback.jobId,
        idempotencyKey,
        packageId: feedback.packageId,
        submittedAt,
        submissionType: "revision_requested" as const,
        releaseActivityId: feedback.releaseActivityId ?? null,
        versionLabel: null,
        actorUserId: "client",
        actorDisplayName: "Customer",
        occurredAt: submittedAt,
        ordinal: index + 1,
        consumptionKind: "included" as const,
        stickyNoteCount: feedback.stickyNotes.length,
        voiceNoteCount: feedback.voiceNotes.length,
        drawSectionCount: feedback.drawSections.length,
        sectionStatuses: { ...feedback.sectionStatuses },
      };
    });
}

export function mergeReconstructedCorrectionUses(
  envelope: ServerTasksEnvelope,
  campaignId: string,
): ServerTasksEnvelope {
  if ((envelope.jobCorrectionUses ?? []).length > 0) return envelope;
  const reconstructed = reconstructCorrectionUsesFromLockedPackages(
    envelope,
    campaignId,
  );
  if (reconstructed.length === 0) return envelope;
  return {
    ...envelope,
    jobCorrectionUses: reconstructed,
  };
}

/** Prefer release activity id from latest Studio review release event. */
export function resolveReleaseActivityIdForJob(
  events: readonly JobActivityEvent[],
  jobId: string,
): string | null {
  const release = [...events]
    .reverse()
    .find(
      (event) =>
        event.jobId === jobId &&
        ((event.kind === "status_change" &&
          event.spineStatus === "ready_for_review") ||
          event.kind === "approval"),
    );
  return release?.id ?? null;
}
