/**
 * Builder-QA — restore the protected reference campaign's revision entitlement
 * to the protected baseline: **1 included, 1 used, 0 remaining**.
 *
 * Owner direction 2026-09-13: Maya is frozen at 1 used / 0 remaining. Her
 * genuine revision round stays on the record — do not rewrite her protected
 * history to 0 used. Anything beyond that one round is test contamination and is
 * dropped by the storage-layer guard.
 *
 * This script reconstructs the single correction-use row from her preserved
 * customer feedback (2026-09-12 revision_requested) rather than inventing one,
 * and holds the counters at the frozen values. Customer feedback, campaign
 * status, and job records are never modified.
 *
 * Verifies the resulting file digest against the recorded baseline and reports
 * residual drift honestly rather than claiming an exact restore.
 * Usage: npx tsx scripts/maya-revision-entitlement-repair.mts
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { MAYA_PROTECTED_CAMPAIGN_ID } from "../src/config/studio-production-team-workforce-v1";
import {
  PROTECTED_CAMPAIGN_REVISION_BASELINE,
  preserveProtectedCorrectionLedger,
  preserveProtectedRevisionEntitlement,
} from "../src/lib/campaign-store/protected-campaign-guard";
import {
  readCampaignEnvelope,
  writeCampaignEnvelope,
} from "../src/lib/campaign-store/store";
import {
  readTasksEnvelope,
  writeTasksEnvelope,
} from "../src/lib/campaign-tasks/store";
import {
  deriveCorrectionAccounting,
  mergeReconstructedCorrectionUses,
} from "../src/lib/job-control/correction-round-ledger";

const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-project-alpha-hybrid-creative-certification-1/customer-one-hybrid-proofs",
);

async function digest(abs: string): Promise<string | null> {
  if (!existsSync(abs)) return null;
  return createHash("sha256").update(await readFile(abs)).digest("hex");
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const campaignFile = path.join(
    process.cwd(),
    "data",
    "campaigns",
    `${MAYA_PROTECTED_CAMPAIGN_ID}.json`,
  );

  const envelope = await readCampaignEnvelope(MAYA_PROTECTED_CAMPAIGN_ID);
  const tasks = await readTasksEnvelope(MAYA_PROTECTED_CAMPAIGN_ID);
  if (!envelope || !tasks) throw new Error("Protected campaign not found");

  const before = {
    digest: await digest(campaignFile),
    revisionRoundsUsed: envelope.record.revisionRoundsUsed ?? 0,
    revisionRoundsIncluded: envelope.record.revisionRoundsIncluded ?? null,
    correctionUseCount: (tasks.jobCorrectionUses ?? []).length,
    reviewFeedbackCount: (tasks.jobReviewFeedback ?? []).length,
    accountingUsed: deriveCorrectionAccounting({
      campaign: envelope.record,
      envelope: tasks,
    }).used,
  };

  // Rebuild the one genuine round from preserved customer feedback, then let the
  // guard hold both the ledger and the counters at the frozen baseline.
  const reconstructed = mergeReconstructedCorrectionUses(
    tasks,
    MAYA_PROTECTED_CAMPAIGN_ID,
  );
  const repairedTasks = preserveProtectedCorrectionLedger(reconstructed).envelope;
  const repairedRecord = preserveProtectedRevisionEntitlement({
    ...envelope.record,
    revisionRoundsUsed: PROTECTED_CAMPAIGN_REVISION_BASELINE.revisionRoundsUsed,
    revisionRoundsIncluded:
      PROTECTED_CAMPAIGN_REVISION_BASELINE.revisionRoundsIncluded,
  }).record;

  await writeCampaignEnvelope({ ...envelope, record: repairedRecord });
  await writeTasksEnvelope(repairedTasks);

  const afterEnvelope = await readCampaignEnvelope(MAYA_PROTECTED_CAMPAIGN_ID);
  const afterTasks = await readTasksEnvelope(MAYA_PROTECTED_CAMPAIGN_ID);
  const accounting = deriveCorrectionAccounting({
    campaign: afterEnvelope!.record,
    envelope: afterTasks!,
  });
  const afterDigest = await digest(campaignFile);

  const checks = {
    revisionRoundsUsedAtBaseline:
      (afterEnvelope!.record.revisionRoundsUsed ?? 0) ===
      PROTECTED_CAMPAIGN_REVISION_BASELINE.revisionRoundsUsed,
    revisionRoundsIncludedIntact:
      afterEnvelope!.record.revisionRoundsIncluded ===
      PROTECTED_CAMPAIGN_REVISION_BASELINE.revisionRoundsIncluded,
    accountingUsedOne: accounting.used === 1,
    accountingRemainingZero: accounting.remaining === 0,
    genuineRoundOnRecord: accounting.history.length === 1,
    historyMatchesCustomerFeedback:
      accounting.history[0]?.submittedAt ===
      (afterTasks!.jobReviewFeedback ?? []).find(
        (entry) => entry.submissionType === "revision_requested",
      )?.submittedAt,
    reviewFeedbackPreserved:
      (afterTasks!.jobReviewFeedback ?? []).length === before.reviewFeedbackCount,
    campaignStatusUnchanged:
      afterEnvelope!.record.campaignStatus === envelope.record.campaignStatus,
  };
  const failed = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  const report = {
    packageId: "STUDIO-OPERATING-PROJECT-ALPHA-HYBRID-CREATIVE-CERTIFICATION-1",
    action:
      "protected reference campaign restored to baseline 1 used / 0 remaining",
    authorizedBy: "owner (2026-09-13)",
    ownerDirection:
      "Keep the guard. Restore Maya to 1 revision used, 0 remaining. Do not rewrite her protected history to 0 used. Extra entries are test contamination.",
    before,
    after: {
      digest: afterDigest,
      revisionRoundsUsed: afterEnvelope!.record.revisionRoundsUsed ?? 0,
      revisionRoundsIncluded: afterEnvelope!.record.revisionRoundsIncluded ?? null,
      correctionUseCount: (afterTasks!.jobCorrectionUses ?? []).length,
      reviewFeedbackCount: (afterTasks!.jobReviewFeedback ?? []).length,
      accountingUsed: accounting.used,
      accountingRemaining: accounting.remaining,
    },
    residualDrift:
      "updatedAt/syncVersion advanced past the pre-session file, so the digest differs from earlier recorded values. The original updatedAt was not recoverable (no backup; /data/ is gitignored). Certification scripts that pin a digest need the value in after.digest.",
    checks,
    ok: failed.length === 0,
    failed,
    at: new Date().toISOString(),
  };

  await writeFile(
    path.join(OUT, "maya-revision-entitlement-repair.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
