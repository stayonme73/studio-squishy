/**
 * Builder-QA — read-only integrity inspection of the protected Maya record.
 * Prints counts and statuses only. No identifiers, no creative content, no writes.
 * Usage: npx tsx scripts/maya-integrity-inspect.mts
 */
import { MAYA_PROTECTED_CAMPAIGN_ID } from "../src/config/studio-production-team-workforce-v1";
import { readCampaignEnvelope } from "../src/lib/campaign-store/store";
import { readTasksEnvelope } from "../src/lib/campaign-tasks/store";
import { deriveCorrectionAccounting } from "../src/lib/job-control/correction-round-ledger";

async function main() {
  const envelope = await readCampaignEnvelope(MAYA_PROTECTED_CAMPAIGN_ID);
  const tasks = await readTasksEnvelope(MAYA_PROTECTED_CAMPAIGN_ID);
  if (!envelope || !tasks) {
    console.log(JSON.stringify({ found: false }, null, 2));
    return;
  }
  const accounting = deriveCorrectionAccounting({
    campaign: envelope.record,
    envelope: tasks,
  });
  console.log(
    JSON.stringify(
      {
        found: true,
        campaignStatus: envelope.record.campaignStatus,
        revisionRoundsUsed: envelope.record.revisionRoundsUsed ?? 0,
        revisionRoundsIncluded: envelope.record.revisionRoundsIncluded ?? null,
        accounting: {
          included: accounting.included,
          used: accounting.used,
          remaining: accounting.remaining,
          historyLength: accounting.history.length,
        },
        correctionUseCount: (tasks.jobCorrectionUses ?? []).length,
        reviewFeedback: (tasks.jobReviewFeedback ?? []).map((entry) => ({
          submissionType: entry.submissionType,
          submittedAt: entry.submittedAt,
          stickyNoteCount: entry.stickyNotes.length,
        })),
        jobs: (tasks.jobRecords ?? []).map((job) => ({
          skuId: job.skuId,
          spineStatus: job.spineStatus,
          setBy: (job.spineStatusSetBy as { role?: string } | undefined)?.role ?? null,
        })),
        recordUpdatedAt: envelope.record.updatedAt ?? null,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
