/**
 * The protected reference campaign's revision entitlement is frozen at 1 used /
 * 0 remaining. These tests pin the storage-layer guard that holds it there when
 * some other path — ledger reconciliation, backfill, or a test sharing the real
 * data tree — tries to spend it, or tries to erase her genuine round.
 */
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

import {
  PROTECTED_CAMPAIGN_REVISION_BASELINE,
  isGenuineProtectedCorrectionUse,
  preserveProtectedCorrectionLedger,
  preserveProtectedRevisionEntitlement,
} from "./protected-campaign-guard";

function campaign(
  campaignId: string,
  revisionRoundsUsed: number,
  revisionRoundsIncluded = 1,
): CampaignRecord {
  return {
    campaignId,
    revisionRoundsUsed,
    revisionRoundsIncluded,
  } as unknown as CampaignRecord;
}

type LedgerRow = {
  id: string;
  campaignId: string;
  idempotencyKey: string;
  submittedAt: string;
};

/** Her one real row, by pinned identity. */
function genuineRow(): LedgerRow {
  return {
    id: `correction-use:${PROTECTED_CAMPAIGN_REVISION_BASELINE.genuineCorrectionUseIdempotencyKey}`,
    campaignId: MAYA_PROTECTED_CAMPAIGN_ID,
    idempotencyKey:
      PROTECTED_CAMPAIGN_REVISION_BASELINE.genuineCorrectionUseIdempotencyKey,
    submittedAt:
      PROTECTED_CAMPAIGN_REVISION_BASELINE.genuineCorrectionUseSubmittedAt,
  };
}

/** Anything else, whenever it claims to have happened. */
function contaminatingRow(submittedAt: string): LedgerRow {
  return {
    id: `correction-use:contamination:${submittedAt}`,
    campaignId: MAYA_PROTECTED_CAMPAIGN_ID,
    idempotencyKey: `${MAYA_PROTECTED_CAMPAIGN_ID}:v2-rtu-flyer:${submittedAt}`,
    submittedAt,
  };
}

function envelopeWithRows(
  campaignId: string,
  rows: LedgerRow[],
  feedbackCount = 1,
): ServerTasksEnvelope {
  return {
    campaignId,
    jobCorrectionUses: rows,
    jobReviewFeedback: Array.from({ length: feedbackCount }, (_, index) => ({
      packageId: `pkg:${index}`,
      submissionType: "revision_requested",
    })),
  } as unknown as ServerTasksEnvelope;
}

function tasks(
  campaignId: string,
  useCount: number,
  feedbackCount = 1,
): ServerTasksEnvelope {
  const rows = [
    genuineRow(),
    ...Array.from({ length: Math.max(0, useCount - 1) }, (_, index) =>
      contaminatingRow(`2026-09-2${index}T00:00:00.000Z`),
    ),
  ].slice(0, useCount);
  return envelopeWithRows(campaignId, rows, feedbackCount);
}

describe("protected reference campaign guard", () => {
  it("freezes the protected baseline at one used and none remaining", () => {
    expect(PROTECTED_CAMPAIGN_REVISION_BASELINE.revisionRoundsUsed).toBe(1);
    expect(PROTECTED_CAMPAIGN_REVISION_BASELINE.revisionRoundsIncluded).toBe(1);
  });

  it("refuses to let a second round be spent on the protected campaign", () => {
    const result = preserveProtectedRevisionEntitlement(
      campaign(MAYA_PROTECTED_CAMPAIGN_ID, 2),
    );
    expect(result.preserved).toBe(true);
    expect(result.record.revisionRoundsUsed).toBe(1);
    expect(result.record.revisionRoundsIncluded).toBe(1);
  });

  it("refuses to erase the genuine round the customer already spent", () => {
    const result = preserveProtectedRevisionEntitlement(
      campaign(MAYA_PROTECTED_CAMPAIGN_ID, 0),
    );
    expect(result.preserved).toBe(true);
    expect(result.record.revisionRoundsUsed).toBe(1);
  });

  it("refuses to let the included allowance be reduced either", () => {
    const result = preserveProtectedRevisionEntitlement(
      campaign(MAYA_PROTECTED_CAMPAIGN_ID, 1, 0),
    );
    expect(result.preserved).toBe(true);
    expect(result.record.revisionRoundsIncluded).toBe(1);
  });

  it("reports no change when the protected campaign is already at baseline", () => {
    const result = preserveProtectedRevisionEntitlement(
      campaign(MAYA_PROTECTED_CAMPAIGN_ID, 1),
    );
    expect(result.preserved).toBe(false);
    expect(result.record.revisionRoundsUsed).toBe(1);
  });

  it("leaves every other campaign's revision counters alone", () => {
    const other = campaign("some-other-campaign", 2, 3);
    const result = preserveProtectedRevisionEntitlement(other);
    expect(result.preserved).toBe(false);
    expect(result.record).toBe(other);
    expect(result.record.revisionRoundsUsed).toBe(2);
  });

  it("keeps the genuine correction-use row on the protected ledger", () => {
    const result = preserveProtectedCorrectionLedger(
      tasks(MAYA_PROTECTED_CAMPAIGN_ID, 1),
    );
    expect(result.preserved).toBe(false);
    expect(result.envelope.jobCorrectionUses).toHaveLength(1);
  });

  it("drops contaminating rows and keeps the genuine one", () => {
    const result = preserveProtectedCorrectionLedger(
      tasks(MAYA_PROTECTED_CAMPAIGN_ID, 3),
    );
    expect(result.preserved).toBe(true);
    expect(result.envelope.jobCorrectionUses).toHaveLength(1);
    expect(result.envelope.jobCorrectionUses?.[0]?.submittedAt).toBe(
      PROTECTED_CAMPAIGN_REVISION_BASELINE.genuineCorrectionUseSubmittedAt,
    );
    expect(result.genuineRowMissing).toBe(false);
  });

  it("keeps the genuine row even when contamination is dated earlier", () => {
    // Ordering was the old selector, and this is the case it got wrong: a
    // contaminating row dated before 2026-09-12 sorts first and would have been
    // mistaken for hers, silently rewriting which event spent her round.
    const result = preserveProtectedCorrectionLedger(
      envelopeWithRows(MAYA_PROTECTED_CAMPAIGN_ID, [
        contaminatingRow("2026-08-01T00:00:00.000Z"),
        genuineRow(),
      ]),
    );
    expect(result.preserved).toBe(true);
    expect(result.envelope.jobCorrectionUses).toHaveLength(1);
    expect(result.envelope.jobCorrectionUses?.[0]?.idempotencyKey).toBe(
      PROTECTED_CAMPAIGN_REVISION_BASELINE.genuineCorrectionUseIdempotencyKey,
    );
  });

  it("rejects a single contaminating row that stands in for the genuine one", () => {
    // Row count looked correct here, which is exactly why counting was the wrong
    // test: one row is still wrong when it is not her row.
    const result = preserveProtectedCorrectionLedger(
      envelopeWithRows(MAYA_PROTECTED_CAMPAIGN_ID, [
        contaminatingRow("2026-09-13T00:00:00.000Z"),
      ]),
    );
    expect(result.preserved).toBe(true);
    expect(result.envelope.jobCorrectionUses).toHaveLength(0);
    // Raised so the caller can see the ledger no longer backs her counters.
    expect(result.genuineRowMissing).toBe(true);
  });

  it("refuses a row that reuses the genuine key with a different instant", () => {
    const result = preserveProtectedCorrectionLedger(
      envelopeWithRows(MAYA_PROTECTED_CAMPAIGN_ID, [
        {
          ...genuineRow(),
          submittedAt: "2026-09-12T05:39:44.690Z",
        },
      ]),
    );
    expect(result.envelope.jobCorrectionUses).toHaveLength(0);
    expect(result.genuineRowMissing).toBe(true);
  });

  it("collapses duplicates of the genuine row to a single use", () => {
    const result = preserveProtectedCorrectionLedger(
      envelopeWithRows(MAYA_PROTECTED_CAMPAIGN_ID, [
        genuineRow(),
        genuineRow(),
      ]),
    );
    expect(result.preserved).toBe(true);
    expect(result.envelope.jobCorrectionUses).toHaveLength(1);
    expect(result.genuineRowMissing).toBe(false);
  });

  it("reports an empty protected ledger as missing her genuine row", () => {
    const result = preserveProtectedCorrectionLedger(
      envelopeWithRows(MAYA_PROTECTED_CAMPAIGN_ID, []),
    );
    expect(result.genuineRowMissing).toBe(true);
  });

  it("pins the genuine row to the 2026-09-12 walkthrough submission", () => {
    expect(
      PROTECTED_CAMPAIGN_REVISION_BASELINE.genuineCorrectionUseSubmittedAt,
    ).toBe("2026-09-12T05:39:44.689Z");
    expect(
      PROTECTED_CAMPAIGN_REVISION_BASELINE.genuineCorrectionUseIdempotencyKey,
    ).toBe(`${MAYA_PROTECTED_CAMPAIGN_ID}:v2-rtu-flyer:2026-09-12T05:39:44.689Z`);
  });

  it("keeps the customer's review feedback while capping the derived rows", () => {
    const result = preserveProtectedCorrectionLedger(
      tasks(MAYA_PROTECTED_CAMPAIGN_ID, 3, 2),
    );
    expect(result.envelope.jobReviewFeedback).toHaveLength(2);
  });

  it("requires campaign, key, and instant to all match before calling a row genuine", () => {
    expect(isGenuineProtectedCorrectionUse(genuineRow())).toBe(true);
    expect(
      isGenuineProtectedCorrectionUse({ ...genuineRow(), campaignId: "other" }),
    ).toBe(false);
    expect(
      isGenuineProtectedCorrectionUse({
        ...genuineRow(),
        idempotencyKey: "something-else",
      }),
    ).toBe(false);
    expect(isGenuineProtectedCorrectionUse({})).toBe(false);
  });

  it("leaves another campaign's correction ledger alone", () => {
    const envelope = tasks("some-other-campaign", 3);
    const result = preserveProtectedCorrectionLedger(envelope);
    expect(result.preserved).toBe(false);
    expect(result.envelope).toBe(envelope);
    expect(result.envelope.jobCorrectionUses).toHaveLength(3);
  });
});
